import torch
import numpy as np
import unicodedata
import pandas as pd
import re

# function to convert texts to sequences of integers
def text_to_sequence(text, vocab):
    return [vocab.get(word, 1) for word in str(text).lower().split()]

# function to pad sequences
def pad_sequence(sequence, max_len=400):
    if len(sequence) < max_len:
        return sequence + [0] * (max_len - len(sequence))
    return sequence[:max_len]

# function to encode splits into tensors
def encode_split(split_df, vocab):
    padded = split_df["content"].apply(lambda t: pad_sequence(text_to_sequence(t, vocab)))
    X_split = torch.from_numpy(np.array(padded.tolist(), dtype=np.int64))
    y_split = torch.from_numpy(split_df["label"].to_numpy(dtype=np.float32))
    ids_split = torch.from_numpy(split_df["row_id"].to_numpy(dtype=np.int64))
    return X_split, y_split, ids_split

# text cleanup to fix odd characters/spacing without changing tone
def clean(text: str) -> str:
    text = "" if pd.isna(text) else str(text)
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u00a0", " ").replace("\ufeff", "").replace("\u200b", "")
    text = "".join(ch for ch in text if unicodedata.category(ch)[0] != "C" or ch in ("\t", "\n", "\r"))
    text = re.sub(r"\s+", " ", text).strip()
    return text