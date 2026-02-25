from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

DATA_PATH = Path("ML/data/WELFake_Dataset.csv")
OUT_DIR = Path("ML/data/splits")
OUT_DIR.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(DATA_PATH).reset_index(drop=True)

if "row_id" not in df.columns:
    df["row_id"] = np.arange(len(df))
    df.to_csv(DATA_PATH, index=False)

labels = df["label"].to_numpy()
ids = df["row_id"].to_numpy()

# 80/10/10 split
train_ids, temp_ids, y_train, y_temp = train_test_split(
    ids, labels, test_size=0.2, random_state=42, stratify=labels
)
val_ids, test_ids, _, _ = train_test_split(
    temp_ids, y_temp, test_size=0.5, random_state=42, stratify=y_temp
)

# save as csv files
pd.DataFrame({"row_id": np.sort(train_ids)}).to_csv(OUT_DIR / "train_ids.csv", index=False)
pd.DataFrame({"row_id": np.sort(val_ids)}).to_csv(OUT_DIR / "val_ids.csv", index=False)
pd.DataFrame({"row_id": np.sort(test_ids)}).to_csv(OUT_DIR / "test_ids.csv", index=False)