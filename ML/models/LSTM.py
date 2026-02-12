import torch
import torch.nn as nn
import torch.optim as optim
import pytorch_lightning as pl
import pandas as pd
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from collections import Counter
import numpy as np
from sklearn.metrics import classification_report
import json


class LSTMModel(pl.LightningModule):
    def __init__(self, vocab_size, embedding_dim, hidden_dim):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, 1)
        self.criterion = nn.BCEWithLogitsLoss()

    def forward(self, x):
        embedded = self.embedding(x)
        out, (h_n, c_n) = self.lstm(embedded)
        last_hidden = h_n[-1]
        return self.fc(last_hidden).squeeze(1)
    
    def training_step(self, batch):
        x, y = batch
        logits = self(x).view(-1)
        loss = self.criterion(logits, y.float())
        self.log("train_loss", loss)
        return loss
    
    def validation_step(self, batch):
        x, y = batch
        logits = self(x).view(-1)
        loss = self.criterion(logits, y.float())
        self.log("val_loss", loss, prog_bar=True, on_step=True)
        return loss
    
    def configure_optimizers(self):
        return optim.Adam(self.parameters(), lr=1e-3)

# load data
df = pd.read_csv("ML/data/WELFake_Dataset.csv")

# Preprocess Data
df['title'] = df['title'].fillna("")
df['text'] = df['text'].fillna("")
df['content'] = df['title'] + " " + df['text']

# encode labels (already integers in this dataset)
y = torch.from_numpy(df['label'].values.astype(np.float32))

# build vocabulary
all_words = " ".join(df["content"]).lower().split()
word_counts = Counter(all_words)

# limit vocab size to top 10000 words
vocab = {word: i+2 for i, (word, _) in enumerate(word_counts.most_common(10000))}
# add special tokens
vocab["<PAD>"] = 0
vocab["<UNK>"] = 1

# function to convert texts to sequences of integers
def text_to_sequence(text):
    return [vocab.get(word, 1) for word in str(text).lower().split()]

# apply text to sequence conversion
df["sequences"] = df["content"].apply(text_to_sequence)

# function to pad sequences
def pad_sequence(sequence, max_len=200):
    if len(sequence) < max_len:
        return sequence + [0] * (max_len - len(sequence))
    else:
        return sequence[:max_len]

# apply padding
df["padded"] = df["sequences"].apply(pad_sequence)

# convert to tensors
X = torch.from_numpy(np.array(df['padded'].tolist(), dtype=np.int64))

# 80/10/10 split (training/validation/testing)
X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y.numpy())
X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42, stratify=y_temp.numpy())

# create dataloaders
train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=64, shuffle=True, num_workers=0)
val_loader   = DataLoader(TensorDataset(X_val, y_val), batch_size=64, num_workers=0)
test_loader  = DataLoader(TensorDataset(X_test, y_test), batch_size=64, num_workers=0)

# initialize and train model
model = LSTMModel(vocab_size=len(vocab), embedding_dim=128, hidden_dim=256)
early_stopping = pl.callbacks.EarlyStopping(monitor="val_loss", stopping_threshold=0.05, mode="min")
trainer = pl.Trainer(max_epochs=10, accelerator="auto", callbacks=[early_stopping])
trainer.fit(model, train_loader, val_loader)

# set model to evaluation mode
model.eval()

# save weights
torch.save(model.state_dict(), "lstm_classifier.pt")

# save vocab
with open("vocab.json", "w") as f:
    json.dump(vocab, f)

# --- chatgpt generated test evaluation code ---

# evaluate on test set
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

# containers for predictions and true labels
all_preds = []
all_true = []

# loop over test data
with torch.no_grad():
    for x, y in test_loader:
        x = x.to(device)
        logits = model(x).view(-1)
        probs = torch.sigmoid(logits)
        preds = (probs >= 0.5).long().cpu().numpy()

        all_preds.append(preds)
        all_true.append(y.long().cpu().numpy())

# concatenate all predictions and true labels
y_pred = np.concatenate(all_preds)
y_true = np.concatenate(all_true)

# print classification report
print(classification_report(y_true, y_pred, target_names=["real", "fake"]))