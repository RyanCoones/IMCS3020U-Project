import json
import torch
import torch.nn as nn
from fastapi import FastAPI
import pytorch_lightning as pl
from pydantic import BaseModel
from newspaper import Article

# load the vocabulary
with open("API/model/gru_vocab.json", "r") as f:
    vocab = json.load(f)

# need to redefine the model class to create a model instance, then, we can load the saved weights into the model instance.
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

# create the model instance and load the saved weights
model = GRUModel(vocab_size=len(vocab), embedding_dim=128, hidden_dim=256)
model.load_state_dict(torch.load("API/model/gru_classifier.pt"))
model.eval()

# create the FastAPI app
app = FastAPI()

# text preprocessing functions
def text_to_sequence(text, max_len=400):
    words = str(text).lower().split()
    return [vocab.get(w, vocab.get("<UNK>", 1)) for w in words]

def pad_sequence(seq, max_len=400):
    if len(seq) < max_len:
        return seq + [vocab.get("<PAD>", 0)] * (max_len - len(seq))
    return seq[:max_len]

# define the request form for the API
class PredictUrlRequest(BaseModel):
    url: str

# handle the prediction request
@app.post("/predict_url")
def predict_url(req: PredictUrlRequest):
    # extract text from the URL using newspaper4k
    article = Article(req.url, language="en")
    article.download()
    article.parse()
    text = article.text or ""

    # limit the text to the first 1200 characters to avoid excessively long inputs
    words = text.lower().split()
    words = words[:400]
    text = " ".join(words)

    # preprocess the text and convert to tensor
    seq = text_to_sequence(text)
    padded_seq = pad_sequence(seq, max_len=400)
    input_tensor = torch.tensor([padded_seq], dtype=torch.long)

    # make prediction with the model
    with torch.no_grad():
        logits = model(input_tensor).view(-1)
        prob = torch.sigmoid(logits).item()

    # determine label based on probability
    label = "real" if prob >= 0.5 else "fake"

    # return the prediction result as json
    return {
        "url": req.url,
        "extracted_chars": len(text),
        "probability": prob,
        "label": label
    }
