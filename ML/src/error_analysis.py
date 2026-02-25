# Chat GPT generated script for error analysis

# Builds a unified error-analysis table across ALL models,
# computes shared vs unique errors, and outputs useful summaries
# for presentation.
#
# Expected prediction files:
# ML/artifacts/preds/<model>_test_preds.csv
#
# Required columns in each preds file:
#   row_id, true_label, pred_label
# Optional:
#   prob_fake

from pathlib import Path
import glob
import numpy as np
import pandas as pd


# =========================
# PATHS
# =========================

DATA_PATH = Path("ML/data/WELFake_Dataset.csv")
PRED_DIR = Path("ML/artifacts/preds")
OUT_DIR = Path("ML/artifacts")
OUT_DIR.mkdir(parents=True, exist_ok=True)


# =========================
# LOAD DATASET
# =========================

df = pd.read_csv(DATA_PATH).reset_index(drop=True)

# ensure stable row_id
if "row_id" not in df.columns:
    df["row_id"] = np.arange(len(df))
    df.to_csv(DATA_PATH, index=False)

# normalize label → strings
if df["label"].dtype != object:
    df["true_label"] = df["label"].map({0: "real", 1: "fake"})
else:
    df["true_label"] = df["label"].astype(str).str.lower()

df["title"] = df["title"].fillna("") if "title" in df.columns else ""
df["text"] = df["text"].fillna("") if "text" in df.columns else ""


# =========================
# LOAD PREDICTIONS
# =========================

pred_files = glob.glob(str(PRED_DIR / "*_test_preds.csv"))

if not pred_files:
    raise SystemExit(f"No prediction files found in {PRED_DIR}")

# start master table
master = df[["row_id", "title", "text", "true_label"]].copy()

model_names = []

for f in pred_files:
    p = pd.read_csv(f)

    model = Path(f).stem.replace("_test_preds", "")
    model_names.append(model)

    # merge predicted label
    master = master.merge(
        p[["row_id", "pred_label"]],
        on="row_id",
        how="left"
    ).rename(columns={"pred_label": f"pred_{model}"})

    # merge probability if present
    if "prob_fake" in p.columns:
        master = master.merge(
            p[["row_id", "prob_fake"]],
            on="row_id",
            how="left"
        ).rename(columns={"prob_fake": f"prob_{model}"})


model_cols = [f"pred_{m}" for m in model_names]


# =========================
# ERROR FLAGS
# =========================

for col in model_cols:
    master[f"wrong_{col}"] = (
        master[col] != master["true_label"]
    ).astype(int)

wrong_cols = [f"wrong_{c}" for c in model_cols]

master["num_models_wrong"] = master[wrong_cols].sum(axis=1)


# =========================
# ERROR TYPE
# =========================

def classify_error(true_label, pred_label):
    if true_label == pred_label:
        return "correct"
    if true_label == "real":
        return "real→fake"
    return "fake→real"


for col in model_cols:
    master[f"type_{col}"] = master.apply(
        lambda r: classify_error(r["true_label"], r[col]),
        axis=1
    )


# =========================
# AUTO FEATURES
# =========================

master["article_len"] = master["text"].str.split().str.len()
master["title_len"] = master["title"].str.split().str.len()

# simple political keyword flag (quick bias check)
political_words = [
    "trump", "clinton", "election", "senate",
    "democrat", "republican", "biden", "vote"
]

master["political"] = master["text"].str.lower().apply(
    lambda t: any(w in t for w in political_words)
)


# =========================
# SAVE MASTER TABLE
# =========================

MASTER_PATH = OUT_DIR / "error_master.csv"
master.to_csv(MASTER_PATH, index=False)


# =========================
# SHARED ERROR TABLES
# =========================

n_models = len(model_cols)

shared_errors = master[
    master["num_models_wrong"] == n_models
].copy()

unique_errors = master[
    master["num_models_wrong"] == 1
].copy()

shared_errors.to_csv(OUT_DIR / "shared_errors.csv", index=False)
unique_errors.to_csv(OUT_DIR / "unique_errors.csv", index=False)


# =========================
# SUMMARY TABLE PER MODEL
# =========================

summary_rows = []

for m in model_names:
    pred_col = f"pred_{m}"
    wrong_col = f"wrong_{pred_col}"
    type_col = f"type_{pred_col}"

    subset = master

    total = len(subset)
    wrong = subset[wrong_col].sum()

    real_to_fake = (subset[type_col] == "real→fake").sum()
    fake_to_real = (subset[type_col] == "fake→real").sum()

    avg_len_wrong = subset.loc[
        subset[wrong_col] == 1, "article_len"
    ].mean()

    avg_len_correct = subset.loc[
        subset[wrong_col] == 0, "article_len"
    ].mean()

    political_error_rate = subset.groupby("political")[wrong_col].mean()

    summary_rows.append({
        "model": m,
        "n_samples": total,
        "n_wrong": int(wrong),
        "error_rate": wrong / total,
        "real_to_fake": int(real_to_fake),
        "fake_to_real": int(fake_to_real),
        "avg_len_wrong": avg_len_wrong,
        "avg_len_correct": avg_len_correct,
        "political_error_rate_true": political_error_rate.get(True, np.nan),
        "political_error_rate_false": political_error_rate.get(False, np.nan),
    })

summary_df = pd.DataFrame(summary_rows).sort_values("error_rate")
summary_df.to_csv(OUT_DIR / "error_summary_by_model.csv", index=False)


# =========================
# HIGH-CONFIDENCE ERRORS
# =========================

for m in model_names:
    prob_col = f"prob_{m}"
    wrong_col = f"wrong_pred_{m}"

    if prob_col not in master.columns:
        continue

    high_conf = master[
        (master[wrong_col] == 1) &
        (master[prob_col] > 0.95)
    ].copy()

    high_conf.to_csv(
        OUT_DIR / f"{m}_high_confidence_errors.csv",
        index=False
    )


# =========================
# CONSOLE OUTPUT
# =========================

print("\nSaved:")
print(" -", MASTER_PATH)
print(" -", OUT_DIR / "error_summary_by_model.csv")
print(" -", OUT_DIR / "shared_errors.csv")
print(" -", OUT_DIR / "unique_errors.csv")

print("\nModels detected:", model_names)
print("\nTop summary:")
print(summary_df)