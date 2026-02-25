# Chat GPT generated script to evaluate models and record performance metrics

from pathlib import Path
import glob
import numpy as np
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    f1_score,
    confusion_matrix,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
)

import matplotlib.pyplot as plt


PRED_DIR = Path("ML/artifacts/preds")
OUT_METRICS_DIR = Path("ML/artifacts/metrics")
OUT_PLOTS_DIR = Path("ML/artifacts/plots")

OUT_METRICS_DIR.mkdir(parents=True, exist_ok=True)
OUT_PLOTS_DIR.mkdir(parents=True, exist_ok=True)

def _to_binary(labels: pd.Series) -> np.ndarray:
    """fake -> 1, real -> 0"""
    s = labels.astype(str).str.lower().str.strip()
    return (s == "fake").astype(int).to_numpy()

def _safe_auc(y_true: np.ndarray, scores: np.ndarray):
    # roc_auc_score throws if only one class present
    if len(np.unique(y_true)) < 2:
        return np.nan
    return roc_auc_score(y_true, scores)

def _safe_prauc(y_true: np.ndarray, scores: np.ndarray):
    if len(np.unique(y_true)) < 2:
        return np.nan
    return average_precision_score(y_true, scores)

def evaluate_file(path: Path) -> dict:
    d = pd.read_csv(path)

    required = {"row_id", "true_label", "pred_label", "prob_fake"}
    missing = required - set(d.columns)
    if missing:
        raise ValueError(f"{path.name} missing columns: {sorted(missing)}")

    y_true = _to_binary(d["true_label"])
    y_pred = _to_binary(d["pred_label"])
    prob_fake = d["prob_fake"].astype(float).to_numpy()

    acc = accuracy_score(y_true, y_pred)

    # per-class precision/recall/f1; class 1 is "fake"
    prec, rec, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=[0, 1], zero_division=0
    )
    # indices: 0 -> real, 1 -> fake
    real_precision, fake_precision = prec[0], prec[1]
    real_recall, fake_recall = rec[0], rec[1]
    real_f1, fake_f1 = f1[0], f1[1]

    macro_f1 = f1_score(y_true, y_pred, average="macro")
    weighted_f1 = f1_score(y_true, y_pred, average="weighted")

    roc_auc = _safe_auc(y_true, prob_fake)
    pr_auc = _safe_prauc(y_true, prob_fake)

    # calibration-ish metric
    brier = brier_score_loss(y_true, prob_fake)

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

    model_name = path.stem.replace("_test_preds", "")

    return {
        "model": model_name,
        "n": len(d),
        "accuracy": acc,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "fake_precision": fake_precision,
        "fake_recall": fake_recall,
        "fake_f1": fake_f1,
        "real_precision": real_precision,
        "real_recall": real_recall,
        "real_f1": real_f1,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "brier": brier,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "tp": tp,
    }

def plot_model_comparison(metrics_df: pd.DataFrame):
    # Sort by macro F1 (good default for imbalanced tasks)
    m = metrics_df.sort_values("macro_f1", ascending=False)

    # Bar: macro_f1
    plt.figure()
    plt.bar(m["model"], m["macro_f1"])
    plt.xticks(rotation=30, ha="right")
    plt.ylabel("Macro F1")
    plt.title("Macro F1 by Model")
    plt.tight_layout()
    plt.savefig(OUT_PLOTS_DIR / "macro_f1_comparison.png", dpi=200)
    plt.close()

    # Bar: accuracy
    plt.figure()
    plt.bar(m["model"], m["accuracy"])
    plt.xticks(rotation=30, ha="right")
    plt.ylabel("Accuracy")
    plt.title("Accuracy by Model")
    plt.tight_layout()
    plt.savefig(OUT_PLOTS_DIR / "accuracy_comparison.png", dpi=200)
    plt.close()

    # Bar: fake recall
    plt.figure()
    plt.bar(m["model"], m["fake_recall"])
    plt.xticks(rotation=30, ha="right")
    plt.ylabel("Recall (Fake)")
    plt.title("Fake Recall by Model")
    plt.tight_layout()
    plt.savefig(OUT_PLOTS_DIR / "fake_recall_comparison.png", dpi=200)
    plt.close()

def plot_confusion_matrices(metrics_df: pd.DataFrame):
    # Saves a small text + simple heatmap style plot per model
    for _, row in metrics_df.iterrows():
        tn, fp, fn, tp = int(row["tn"]), int(row["fp"]), int(row["fn"]), int(row["tp"])
        cm = np.array([[tn, fp], [fn, tp]])

        plt.figure()
        plt.imshow(cm)
        plt.xticks([0, 1], ["Pred Real", "Pred Fake"])
        plt.yticks([0, 1], ["True Real", "True Fake"])
        plt.title(f"Confusion Matrix: {row['model']}")
        for (i, j), v in np.ndenumerate(cm):
            plt.text(j, i, str(v), ha="center", va="center")
        plt.tight_layout()
        plt.savefig(OUT_PLOTS_DIR / f"{row['model']}_confusion.png", dpi=200)
        plt.close()


def plot_roc_pr_curves(pred_files):
    # One combined ROC and PR plot across models (if scores are valid)
    # ROC
    plt.figure()
    any_roc = False
    for path in pred_files:
        d = pd.read_csv(path)
        y_true = _to_binary(d["true_label"])
        prob_fake = d["prob_fake"].astype(float).to_numpy()
        if len(np.unique(y_true)) < 2:
            continue
        from sklearn.metrics import roc_curve, precision_recall_curve

        model_name = path.stem.replace("_test_preds", "")

        fpr, tpr, _ = roc_curve(y_true, prob_fake)
        plt.plot(fpr, tpr, label=model_name)
        any_roc = True

    if any_roc:
        plt.plot([0, 1], [0, 1], linestyle="--")
        plt.xlabel("False Positive Rate")
        plt.ylabel("True Positive Rate")
        plt.title("ROC Curves")
        plt.legend()
        plt.tight_layout()
        plt.savefig(OUT_PLOTS_DIR / "roc_curves.png", dpi=200)
    plt.close()

    # PR
    plt.figure()
    any_pr = False
    for path in pred_files:
        d = pd.read_csv(path)
        y_true = _to_binary(d["true_label"])
        prob_fake = d["prob_fake"].astype(float).to_numpy()
        if len(np.unique(y_true)) < 2:
            continue

        from sklearn.metrics import precision_recall_curve

        model_name = path.stem.replace("_test_preds", "")

        p, r, _ = precision_recall_curve(y_true, prob_fake)
        plt.plot(r, p, label=model_name)
        any_pr = True

    if any_pr:
        plt.xlabel("Recall")
        plt.ylabel("Precision")
        plt.title("Precision–Recall Curves")
        plt.legend()
        plt.tight_layout()
        plt.savefig(OUT_PLOTS_DIR / "pr_curves.png", dpi=200)
    plt.close()

if __name__ == "__main__":
    pred_files = [Path(p) for p in glob.glob(str(PRED_DIR / "*_test_preds.csv"))]
    if not pred_files:
        raise SystemExit(f"No prediction files found in {PRED_DIR}. Expected *_test_preds.csv")

    rows = []
    for path in pred_files:
        rows.append(evaluate_file(path))

    metrics_df = pd.DataFrame(rows).sort_values("macro_f1", ascending=False)
    metrics_path = OUT_METRICS_DIR / "metrics_summary.csv"
    metrics_df.to_csv(metrics_path, index=False)

    # plots
    plot_model_comparison(metrics_df)
    plot_confusion_matrices(metrics_df)
    plot_roc_pr_curves(pred_files)

    print(f"Saved metrics: {metrics_path}")
    print(f"Saved plots to: {OUT_PLOTS_DIR}")
    print(metrics_df[["model", "accuracy", "macro_f1", "fake_precision", "fake_recall", "roc_auc", "pr_auc", "brier"]])