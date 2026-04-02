# AI generated with Claude — database integration, Cognito JWT auth, CORS, /history endpoint, DELETE /account
import os
import sys

# make API/ importable as a flat package regardless of where uvicorn is launched from
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

import json
import pickle
import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from typing import Optional

import boto3
import numpy as np
import pandas as pd
import pytorch_lightning as pl
import torch
import torch.nn as nn
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import trafilatura
from newspaper import Article
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth import REGION, get_current_user, get_current_user_optional
from database import Base, engine, get_db
from models import Check, User

# ---------------------------------------------------------------------------
# Model setup
# ---------------------------------------------------------------------------

_HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_HERE, "model", "gru_vocab.json"), "r") as f:
    vocab = json.load(f)


class GRUModel(pl.LightningModule):
    def __init__(self, vocab_size, embedding_dim, hidden_dim):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.gru = nn.GRU(embedding_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, 1)
        self.criterion = nn.BCEWithLogitsLoss()

    def forward(self, x):
        embedded = self.embedding(x)
        out, h_n = self.gru(embedded)
        last_hidden = h_n[-1]
        return self.fc(last_hidden).squeeze(1)


gru_model = GRUModel(vocab_size=len(vocab), embedding_dim=128, hidden_dim=256)
gru_model.load_state_dict(torch.load(os.path.join(_HERE, "model", "gru_classifier.pt"), weights_only=True))
gru_model.eval()

# ---------------------------------------------------------------------------
# Ensemble models (LSTM + NB + MLP meta-learner)
# Falls back to GRU-only if artifacts are missing.
# Run ML/stacking/export_api_models.py to generate the required files.
# ---------------------------------------------------------------------------

class LSTMModel(pl.LightningModule):
    def __init__(self, vocab_size, embedding_dim, hidden_dim):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, 1)
        self.criterion = nn.BCEWithLogitsLoss()

    def forward(self, x):
        embedded = self.embedding(x)
        _, (h_n, _) = self.lstm(embedded)
        return self.fc(h_n[-1]).squeeze(1)


class MLPMetaLearner(nn.Module):
    def __init__(self, input_size=5, hidden1=64, hidden2=32, dropout=0.05):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_size, hidden1), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(hidden1, hidden2),   nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(hidden2, 1),         nn.Sigmoid(),
        )

    def forward(self, x):
        return self.net(x).squeeze(1)


_ENSEMBLE_READY = False
try:
    from sklearn.feature_extraction.text import CountVectorizer  # noqa: F401

    with open(os.path.join(_HERE, "model", "lstm_vocab.json")) as f:
        _lstm_vocab = json.load(f)
    _lstm_model = LSTMModel(vocab_size=len(_lstm_vocab), embedding_dim=128, hidden_dim=256)
    _lstm_model.load_state_dict(torch.load(
        os.path.join(_HERE, "model", "lstm_classifier.pt"), weights_only=True
    ))
    _lstm_model.eval()

    with open(os.path.join(_HERE, "model", "nb_vectorizer.pkl"), "rb") as f:
        _nb_vectorizer = pickle.load(f)
    _nb_p = np.load(os.path.join(_HERE, "model", "nb_params.npz"))
    _nb_log_class_ratio      = _nb_p["log_class_ratio"]
    _nb_log_feature_prob     = _nb_p["log_feature_prob"]
    _nb_neg_log_feature_prob = _nb_p["neg_log_feature_prob"]

    with open(os.path.join(_HERE, "model", "mlp_scaler.pkl"), "rb") as f:
        _mlp_scaler = pickle.load(f)
    _mlp_model = MLPMetaLearner()
    _mlp_model.load_state_dict(torch.load(
        os.path.join(_HERE, "model", "mlp_best.pt"), map_location="cpu", weights_only=True
    ))
    _mlp_model.eval()

    _ENSEMBLE_READY = True
    print("[ensemble] All models loaded — using stacking ensemble.", flush=True)
except FileNotFoundError as _e:
    print(f"[ensemble] Missing file ({_e}) — using GRU only. "
          "Run ML/stacking/export_api_models.py to enable ensemble.", flush=True)

# ---------------------------------------------------------------------------
# FastAPI app with lifespan (creates DB tables on startup + runs migrations)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Idempotent migration: add fact_check column if it doesn't exist yet
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE checks ADD COLUMN IF NOT EXISTS fact_check TEXT"
        ))
        conn.commit()
    yield

app = FastAPI(lifespan=lifespan)

_extra_origins = [o.strip() for o in os.environ.get("EXTRA_CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "chrome-extension://*"] + _extra_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Bedrock helpers
# ---------------------------------------------------------------------------

def _bedrock_call(prompt: str, api_key: str, max_tokens: int = 512) -> str | None:
    """POST a prompt to Claude via AWS Bedrock. Returns the text content or None on failure."""
    model_id = os.environ.get("BEDROCK_MODEL", "us.anthropic.claude-sonnet-4-6")
    url = f"https://bedrock-runtime.{REGION}.amazonaws.com/model/{model_id}/invoke"
    try:
        response = httpx.post(
            url,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()["content"][0]["text"]
    except httpx.HTTPStatusError as e:
        print(f"[Bedrock] HTTP {e.response.status_code}: {e.response.text}", flush=True)
        return None
    except Exception as e:
        print(f"[Bedrock] error: {e}", flush=True)
        return None


def generate_gru_analysis(text: str, title: str | None, prob: float = 0.0) -> str | None:
    """Call Claude to describe writing/stylistic credibility signals in the article.
    Does not mention the model, the score, or any factual claims."""
    api_key = os.environ.get("AWS_BEARER_TOKEN_BEDROCK", "")
    if not api_key:
        print("[Bedrock] AWS_BEARER_TOKEN_BEDROCK not set, skipping analysis", flush=True)
        return None
    if not text or len(text.split()) < 20:
        print(f"[Bedrock] skipping — text too short ({len(text.split()) if text else 0} words)", flush=True)
        return None
    print(f"[Bedrock] generating GRU analysis, text_words={len(text.split())}", flush=True)

    concern = 1.0 - prob  # prob is p(real); concern is p(fake)
    if concern < 0.25:
        direction = (
            "This article has been assessed as credible. "
            "In 3-4 concise bullet points, highlight the writing and stylistic features "
            "that support its credibility. Focus on positive signals such as:"
            "\n• Measured, neutral tone"
            "\n• Clear attribution and sourcing language"
            "\n• Objective, balanced framing"
            "\n• Professional writing style"
        )
    elif concern <= 0.60:
        direction = (
            "This article has shown mixed credibility signals. "
            "In 3-4 concise bullet points, describe the writing and stylistic features "
            "that produce this uncertainty — both reassuring signals and concerning ones. Focus on:"
            "\n• Tone (neutral vs. emotionally charged passages)"
            "\n• Attribution strength (clear sourcing vs. vague references)"
            "\n• Balanced vs. one-sided framing"
            "\n• Writing style consistency"
        )
    else:
        direction = (
            "This article has been flagged for credibility concerns. "
            "In 3-4 concise bullet points, explain the writing and stylistic features "
            "that raise those concerns. Focus on:"
            "\n• Alarmist, sensationalist, or emotionally manipulative tone"
            "\n• Bias indicators and loaded or partisan phrasing"
            "\n• Structural red flags (vague attribution, lack of named sources, excessive hedging)"
            "\n• Writing style patterns (clickbait structure, urgency cues, unusual punctuation)"
        )

    prompt = (
        f"You are a writing-style analyst reviewing an article for credibility signals.\n\n"
        "IMPORTANT CONTEXT ABOUT THE TEXT:\n"
        "- The text below has been automatically extracted and preprocessed: it has been lowercased and "
        "normalised for machine analysis. Do NOT treat the lack of capitalisation as a credibility signal.\n"
        "- The text is limited to the first 400 words of the article and may end mid-sentence. "
        "Do NOT treat truncation as a credibility signal.\n\n"
        f"Article title: {title or 'Unknown'}\n"
        f"Article text (first 400 words):\n{text}\n\n"
        f"{direction}\n\n"
        "CRITICAL RULES:\n"
        "- Do NOT mention any model, score, or percentage.\n"
        "- Do NOT comment on capitalisation, lowercasing, or truncation — these are preprocessing artefacts.\n"
        "- Do NOT make any factual claims about the article's subject matter.\n"
        "- Do NOT verify or comment on whether any claims in the article are true or false.\n"
        "- Do NOT mention specific people, places, events, or dates from the article.\n"
        "- Do NOT give disclaimers or caveats about your analysis."
    )
    return _bedrock_call(prompt, api_key, max_tokens=512)


def invoke_fact_check_lambda(text: str, title: str | None) -> list | None:
    """Invoke the fact-check Lambda via its Function URL. Returns a list of claim objects or None on any failure."""
    url = os.environ.get("LAMBDA_FUNCTION_URL", "")
    secret = os.environ.get("LAMBDA_SECRET", "")
    if not url:
        print("[Lambda] LAMBDA_FUNCTION_URL not set, skipping fact check", flush=True)
        return None
    print(f"[Lambda] invoking function URL", flush=True)
    try:
        response = httpx.post(
            url,
            headers={"X-Secret-Token": secret, "Content-Type": "application/json"},
            json={"text": text, "title": title},
            timeout=60,
        )
        response.raise_for_status()
        result = response.json()
        fact_check = result.get("fact_check")
        if fact_check:
            print(f"[Lambda] got {len(fact_check)} claims", flush=True)
        else:
            print(f"[Lambda] no fact_check in response: {result.get('error')}", flush=True)
        return fact_check
    except Exception as e:
        print(f"[Lambda] invocation failed: {e}", flush=True)
        return None


# ---------------------------------------------------------------------------
# Text preprocessing
# ---------------------------------------------------------------------------

def text_to_sequence(text, max_len=400):
    words = str(text).lower().split()
    return [vocab.get(w, vocab.get("<UNK>", 1)) for w in words]

def pad_sequence(seq, max_len=400):
    if len(seq) < max_len:
        return seq + [vocab.get("<PAD>", 0)] * (max_len - len(seq))
    return seq[:max_len]

def clean(text: str) -> str:
    text = "" if pd.isna(text) else str(text)
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u00a0", " ").replace("\ufeff", "").replace("\u200b", "")
    text = "".join(ch for ch in text if unicodedata.category(ch)[0] != "C" or ch in ("\t", "\n", "\r"))
    text = re.sub(r"\s+", " ", text).strip()
    return text

# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------

def _gru_prob(text: str) -> float:
    seq    = text_to_sequence(text)
    padded = pad_sequence(seq)
    with torch.no_grad():
        logits = gru_model(torch.tensor([padded], dtype=torch.long)).view(-1)
    return torch.sigmoid(logits).item()


def predict_ensemble(text: str) -> float:
    """Run GRU + LSTM + NB through the MLP meta-learner. Returns P(fake)."""
    gru_prob = _gru_prob(text)

    # LSTM (own vocab)
    words      = str(text).lower().split()
    lstm_seq   = [_lstm_vocab.get(w, _lstm_vocab.get("<UNK>", 1)) for w in words]
    lstm_pad   = lstm_seq[:400] + [0] * max(0, 400 - len(lstm_seq))
    with torch.no_grad():
        logits = _lstm_model(torch.tensor([lstm_pad], dtype=torch.long)).view(-1)
    lstm_prob = torch.sigmoid(logits).item()

    # NB
    X     = _nb_vectorizer.transform([text])
    joint = np.asarray(X @ (_nb_log_feature_prob - _nb_neg_log_feature_prob).T)
    joint += _nb_log_class_ratio + _nb_neg_log_feature_prob.sum(axis=1)
    log_p  = joint - joint.max(axis=1, keepdims=True)
    probs  = np.exp(log_p); probs /= probs.sum(axis=1, keepdims=True)
    nb_prob = float(probs[0, 1])

    # MLP meta-learner
    raw    = np.array([[gru_prob, lstm_prob, nb_prob]], dtype=np.float64)
    scaled = _mlp_scaler.transform(raw).astype(np.float32)
    std    = float(scaled.std(axis=1)[0])
    spread = float(scaled.max(axis=1)[0] - scaled.min(axis=1)[0])
    feat   = torch.tensor([[scaled[0, 0], scaled[0, 1], scaled[0, 2], std, spread]])
    with torch.no_grad():
        return _mlp_model(feat).item()


# ---------------------------------------------------------------------------
# Helper: get or create a User row from Cognito claims
# ---------------------------------------------------------------------------

def get_or_create_user(claims: dict, db: Session) -> User:
    sub = claims["sub"]
    user = db.query(User).filter(User.cognito_sub == sub).first()
    if user is None:
        user = User(
            cognito_sub=sub,
            username=claims.get("cognito:username"),
            email=claims.get("email"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

class PredictUrlRequest(BaseModel):
    url: str


@app.post("/predict_url")
def predict_url(
    req: PredictUrlRequest,
    db: Session = Depends(get_db),
    claims: Optional[dict] = Depends(get_current_user_optional),
):
    # extract article — trafilatura for body text, newspaper4k for title
    downloaded = trafilatura.fetch_url(req.url)
    text = clean(trafilatura.extract(downloaded) or "") if downloaded else ""

    # fallback to newspaper4k if trafilatura got nothing
    if not text:
        article = Article(req.url, language="en")
        article.download()
        article.parse()
        text = clean(article.text) or ""
        title = article.title or None
    else:
        # get title cheaply from newspaper4k metadata (no re-download needed)
        try:
            article = Article(req.url, language="en")
            article.download()
            article.parse()
            title = article.title or None
        except Exception:
            title = None

    print(f"[predict] extracted {len(text.split())} words, title={title!r}", flush=True)

    # limit to first 400 words
    words = text.lower().split()[:400]
    text = " ".join(words)

    # run ensemble (or GRU fallback)
    prob  = predict_ensemble(text) if _ENSEMBLE_READY else _gru_prob(text)
    label = "real" if prob >= 0.5 else "fake"

    # run GRU analysis and fact-check Lambda in parallel
    with ThreadPoolExecutor(max_workers=2) as pool:
        fut_analysis  = pool.submit(generate_gru_analysis, text, title, prob)
        fut_factcheck = pool.submit(invoke_fact_check_lambda, text, title)
        explanation      = fut_analysis.result()
        fact_check_list  = fut_factcheck.result()

    fact_check_json = json.dumps(fact_check_list) if fact_check_list else None

    # if the request came from a logged-in user, persist the check
    if claims is not None:
        user = get_or_create_user(claims, db)
        db.add(Check(
            user_id=user.id,
            url=req.url,
            title=title,
            label=label,
            probability=prob,
            explanation=explanation,
            fact_check=fact_check_json,
        ))
        db.commit()

    return {
        "url": req.url,
        "title": title,
        "extracted_chars": len(text),
        "probability": prob,
        "label": label,
        "explanation": explanation,
        "fact_check": fact_check_list,
    }


class DeleteAccountRequest(BaseModel):
    access_token: str


@app.delete("/account")
def delete_account(
    req: DeleteAccountRequest,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    """Delete the authenticated user from Cognito and from our database."""
    # delete from Cognito using the user's own access token (no admin credentials needed)
    try:
        cognito = boto3.client("cognito-idp", region_name=REGION)
        cognito.delete_user(AccessToken=req.access_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cognito deletion failed: {e}")

    # delete from our database (cascade removes their checks too)
    user = db.query(User).filter(User.cognito_sub == claims["sub"]).first()
    if user:
        db.delete(user)
        db.commit()

    return {"detail": "Account deleted"}


@app.delete("/history/{check_id}")
def delete_check(
    check_id: str,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    """Delete a single check belonging to the authenticated user."""
    import uuid as _uuid
    user = db.query(User).filter(User.cognito_sub == claims["sub"]).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        check_uuid = _uuid.UUID(check_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid check ID")
    check = db.query(Check).filter(Check.id == check_uuid, Check.user_id == user.id).first()
    if check is None:
        raise HTTPException(status_code=404, detail="Check not found")
    db.delete(check)
    db.commit()
    return {"detail": "Deleted"}


@app.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    """Return aggregate stats for the authenticated user."""
    user = db.query(User).filter(User.cognito_sub == claims["sub"]).first()
    if user is None:
        return {"total_checks": 0}
    total = db.query(Check).filter(Check.user_id == user.id).count()
    return {"total_checks": total}


@app.get("/history")
def get_history(
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user),
):
    """Return the authenticated user's 50 most recent checks, newest first."""
    user = db.query(User).filter(User.cognito_sub == claims["sub"]).first()
    if user is None:
        return []

    rows = (
        db.query(Check)
        .filter(Check.user_id == user.id)
        .order_by(Check.checked_at.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": str(r.id),
            "url": r.url,
            "title": r.title,
            "label": r.label,
            "probability": r.probability,
            "explanation": r.explanation,
            "fact_check": json.loads(r.fact_check) if r.fact_check else None,
            "checked_at": r.checked_at.isoformat(),
        }
        for r in rows
    ]
