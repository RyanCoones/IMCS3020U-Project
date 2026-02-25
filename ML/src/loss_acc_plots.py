# Chat GPT generated script to generate loss and accuracy plots given the logs in ML/lightning_logs

from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

LOGS_DIR = Path("ML/lightning_logs")
OUT_DIR = Path("ML/artifacts/plots")
OUT_DIR.mkdir(parents=True, exist_ok=True)

def find_latest_version_dir(model_name: str) -> Path:
    model_dir = LOGS_DIR / model_name
    if not model_dir.exists():
        raise FileNotFoundError(f"No logs folder found for {model_name}: {model_dir}")

    versions = []
    for v in model_dir.glob("version_*"):
        try:
            n = int(v.name.split("_")[1])
            versions.append((n, v))
        except:
            pass

    if not versions:
        raise FileNotFoundError(f"No version_* folders found in {model_dir}")

    versions.sort(key=lambda x: x[0])
    return versions[-1][1]  # latest

def plot_metric_over_epoch(df: pd.DataFrame, col: str, title: str, outpath: Path):
    if col not in df.columns:
        return False

    # Prefer epoch-level rows if present (Lightning often logs step+epoch; epoch rows usually have step==0 for that epoch)
    d = df[["epoch", col]].dropna()
    if d.empty:
        return False

    # Aggregate to one point per epoch (handles multiple logs per epoch)
    d = d.groupby("epoch", as_index=False)[col].mean().sort_values("epoch")

    plt.figure()
    plt.plot(d["epoch"], d[col])
    plt.xlabel("Epoch")
    plt.ylabel(col)
    plt.title(title)
    plt.tight_layout()
    plt.savefig(outpath, dpi=200)
    plt.close()
    return True    

if __name__ == "__main__":
    # Add whatever models you logged with Lightning
    model_names = ["bilstm", "rnn", "gru", "lstm"]

    for name in model_names:
        vdir = find_latest_version_dir(name)
        metrics_path = vdir / "metrics.csv"
        if not metrics_path.exists():
            print(f"Skipping {name}: no metrics.csv at {metrics_path}")
            continue

        df = pd.read_csv(metrics_path)

        # Common Lightning column names vary by what you log.
        # Your logs usually include some subset of these.
        candidates = [
            ("train_loss", "Train Loss"),
            ("val_loss", "Val Loss"),
            ("loss", "Loss"),
            ("train_acc", "Train Accuracy"),
            ("val_acc", "Val Accuracy"),
            ("acc", "Accuracy"),
            ("train_accuracy", "Train Accuracy"),
            ("val_accuracy", "Val Accuracy"),
        ]

        for col, label in candidates:
            ok = plot_metric_over_epoch(
                df,
                col=col,
                title=f"{label} vs Epoch ({name}, {vdir.name})",
                outpath=OUT_DIR / f"{name}_{col}_vs_epoch.png",
            )
            # silent if missing; your logged column names determine what you get

        print(f"Plotted {name} from {metrics_path}")