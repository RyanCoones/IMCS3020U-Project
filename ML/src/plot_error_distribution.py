# Chat GPT generated code to produce plots, analyzing the errors of the different models.

import pandas as pd
import matplotlib.pyplot as plt

# Error agreement across models
df = pd.read_csv("ML/artifacts/error_analysis/error_master.csv")

plt.figure()
df["num_models_wrong"].value_counts().sort_index().plot(kind="bar")

plt.xlabel("Number of models that misclassified the article")
plt.ylabel("Number of articles")
plt.title("Error Agreement Across Models")

plt.tight_layout()
plt.savefig("ML/artifacts/plots/error_analysis/error_overlap_distribution.png", dpi=200)


# Error direction by model
df = pd.read_csv("ML/artifacts/error_analysis/error_summary_by_model.csv")

plt.figure()

x = range(len(df))
plt.bar(x, df["real_to_fake"], label="Real → Fake")
plt.bar(x, df["fake_to_real"], bottom=df["real_to_fake"], label="Fake → Real")

plt.xticks(x, df["model"], rotation=30)
plt.ylabel("Number of Errors")
plt.title("Error Direction by Model")
plt.legend()

plt.tight_layout()
plt.savefig("ML/artifacts/plots/error_analysis/error_direction.png", dpi=200)


# political bias
df = pd.read_csv("ML/artifacts/error_analysis/error_master.csv")

models = [c.replace("wrong_pred_", "") for c in df.columns if c.startswith("wrong_pred_")]

rates = []

for m in models:
    wrong_col = f"wrong_pred_{m}"

    wrong_df = df[df[wrong_col] == 1]
    total_wrong = len(wrong_df)

    if total_wrong == 0:
        ratio = 0.0
    else:
        ratio = (wrong_df["political"] == True).mean()  # political / total misclassified

    rates.append((m, ratio))

plot_df = pd.DataFrame(rates, columns=["model", "political_ratio"]).sort_values("political_ratio", ascending=False)

plt.figure()
x = range(len(plot_df))

plt.bar(x, plot_df["political_ratio"])

plt.xticks(x, plot_df["model"], rotation=30)
plt.ylabel("Political / Total Misclassified")
plt.title("Share of Misclassifications that are Political")

plt.tight_layout()
plt.savefig("ML/artifacts/plots/error_analysis/political_misclass_share.png", dpi=200)