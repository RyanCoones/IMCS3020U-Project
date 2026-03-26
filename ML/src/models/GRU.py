import torch
import torch.nn as nn
import torch.optim as optim
import pytorch_lightning as pl
import pandas as pd
from torch.utils.data import DataLoader, TensorDataset
from collections import Counter
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
import json
import matplotlib.pyplot as plt
from pathlib import Path
from pytorch_lightning.loggers import CSVLogger
from ML.src.processing import *

artifacts_dir = Path("ML/artifacts")
artifacts_dir.mkdir(parents=True, exist_ok=True)

models_dir = artifacts_dir / "models"
vocabs_dir = artifacts_dir / "vocabs"
preds_dir  = artifacts_dir / "preds"
for d in (models_dir, vocabs_dir, preds_dir):
    d.mkdir(parents=True, exist_ok=True)

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

    def training_step(self, batch):
        x, y = batch
        logits = self(x).view(-1)
        loss = self.criterion(logits, y.float())
        preds = (torch.sigmoid(logits) >= 0.5).float()
        acc = (preds == y).float().mean()
        self.log("train_loss", loss, on_epoch=True)
        self.log("train_acc", acc, on_epoch=True)
        return loss

    def validation_step(self, batch):
        x, y = batch
        logits = self(x).view(-1)
        loss = self.criterion(logits, y.float())
        preds = (torch.sigmoid(logits) >= 0.5).float()
        acc = (preds == y).float().mean()
        self.log("val_loss", loss, on_epoch=True, prog_bar=True)
        self.log("val_acc", acc, on_epoch=True, prog_bar=True)
        return loss

    def configure_optimizers(self):
        return optim.Adam(self.parameters(), lr=1e-3)


# load data
df = pd.read_csv("ML/data/WELFake_Dataset.csv").reset_index(drop=True)

if "row_id" not in df.columns:
    df["row_id"] = np.arange(len(df))

df = df.set_index("row_id", drop=False)

# preprocess data
df["title"] = df["title"].fillna("").apply(clean)
df["text"] = df["text"].fillna("").apply(clean)
df["content"] = df["title"] + " " + df["text"]

# encode labels (already integers in this dataset)
y_array = df["label"].values.astype(np.int64)
y = torch.from_numpy(y_array.astype(np.float32))
row_indices = np.arange(len(df))

# load the data splits
train_ids = pd.read_csv("ML/data/splits/train_ids.csv")["row_id"].to_numpy()
val_ids   = pd.read_csv("ML/data/splits/val_ids.csv")["row_id"].to_numpy()
test_ids  = pd.read_csv("ML/data/splits/test_ids.csv")["row_id"].to_numpy()

# gather dataframes 
train_df = df.loc[train_ids]
val_df   = df.loc[val_ids]
test_df  = df.loc[test_ids]

# vocabulary (top 5k words, excluding politically charged / named entity terms)
_EXCLUDE = {
    "trump", "clinton", "obama", "putin", "biden", "hillary", "zelensky",
    "zionist", "extremist", "radical", "elites", "shariah", "sharia",
    "propaganda", "israel", "iran", "syria", "isis", "hamas", "idf",
}
all_words = " ".join(train_df["content"].astype(str)).lower().split()  # ONLY BUILD VOCAB ON TRAIN DATA
word_counts = Counter(all_words)
# over-fetch so we still land at exactly 5k after exclusions
filtered_words = [(w, c) for w, c in word_counts.most_common(5000 + len(_EXCLUDE)) if w not in _EXCLUDE][:5000]
vocab = {word: i + 2 for i, (word, _) in enumerate(filtered_words)}
vocab["<PAD>"] = 0
vocab["<UNK>"] = 1

# encode split data into tensors
X_train, y_train, _       = encode_split(train_df, vocab)
X_val,   y_val,   _       = encode_split(val_df, vocab)
X_test,  y_test,  test_rid = encode_split(test_df, vocab)

# create dataloaders
train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=64, shuffle=True, num_workers=0)
val_loader   = DataLoader(TensorDataset(X_val, y_val), batch_size=64, num_workers=0)
test_loader  = DataLoader(TensorDataset(X_test, y_test, test_rid), batch_size=64, num_workers=0)

# initialize model
model = GRUModel(vocab_size=len(vocab), embedding_dim=128, hidden_dim=256)

# create paths
model_path = models_dir / "gru_classifier5000.pt"
vocab_path = vocabs_dir / "gru_vocab5000.json"

# if the model has already been trained, load the weights, if not, train
if model_path.exists() and vocab_path.exists():
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
else:
    early_stopping = pl.callbacks.EarlyStopping(monitor="val_loss", stopping_threshold=0.035, mode="min")
    logger = CSVLogger("ML/lightning_logs", name="gru5000")
    trainer = pl.Trainer(max_epochs=10, accelerator="auto", callbacks=[early_stopping], logger=logger)
    trainer.fit(model, train_loader, val_loader)

    torch.save(model.state_dict(), model_path)
    with open(vocab_path, "w") as f:
        json.dump(vocab, f)

# --------------- chatgpt generated evaluation code --------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
model.eval()

all_preds = []
all_true = []
all_probs = []
all_indices = []

with torch.no_grad():
    for x, y_batch, idx_batch in test_loader:
        x = x.to(device)
        logits = model(x).view(-1)
        probs = torch.sigmoid(logits).cpu().numpy()
        preds = (probs >= 0.5).astype(int)
        all_preds.append(preds)
        all_true.append(y_batch.long().cpu().numpy())
        all_probs.append(probs)
        all_indices.append(idx_batch.numpy())

y_pred = np.concatenate(all_preds)
y_true = np.concatenate(all_true)
prob_fake = 1.0 - np.concatenate(all_probs)  # sigmoid = P(real); invert to get P(fake)
test_row_ids = np.concatenate(all_indices)
test_accuracy = float((y_pred == y_true).mean())

test_preds = pd.DataFrame({
    "row_id": test_row_ids,
    "true_label": np.where(y_true == 1, "real", "fake"),  # WELFake: 1=real, 0=fake
    "pred_label": np.where(y_pred == 1, "real", "fake"),
    "prob_fake": prob_fake,
})
test_preds.to_csv(preds_dir / "gru5000_test_preds.csv", index=False)

print(f"Test accuracy: {test_accuracy:.4f}")
print(classification_report(y_true, y_pred, target_names=["fake", "real"]))  # WELFake: 0=fake, 1=real
print("Confusion matrix [ [TN, FP], [FN, TP] ]:")
print(confusion_matrix(y_true, y_pred))

mis_mask = y_pred != y_true
misclassified = pd.DataFrame(
    {
        "row_id": test_row_ids[mis_mask],
        "true_label": np.where(y_true[mis_mask] == 1, "real", "fake"),  # WELFake: 1=real, 0=fake
        "pred_label": np.where(y_pred[mis_mask] == 1, "real", "fake"),
        "prob_fake": prob_fake[mis_mask],
    }
)
misclassified["title"] = df.loc[misclassified["row_id"], "title"].values
misclassified["text_snippet"] = df.loc[misclassified["row_id"], "text"].str.slice(0, 400).values

print(f"Misclassified: {len(misclassified)} of {len(y_true)} samples ({mis_mask.mean()*100:.2f}% error rate)")
print("First 20 misclassified rows (full list saved to ML/artifacts/gru5000_misclassified.csv):")
print(misclassified.head(20).to_string(index=False))

# save full errors for inspection
misclassified.to_csv("ML/artifacts/gru5000_misclassified.csv", index=False)