import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer

class BernoulliNaiveBayes:
    def __init__(self, min_df=2, max_features=20000):
        self.vectorizer = CountVectorizer(binary=True, min_df=min_df, max_features=max_features)
        self.log_class_ratio_ = None   # shape (2,)
        self.log_feature_prob_ = None  # shape (2, n_features)
        self.neg_log_feature_prob_ = None # shape (2, n_features)

    def load_data(self, csv_path):
        df = pd.read_csv(csv_path) # read dataset
        texts = (df["title"].fillna("") + " " + df["text"].fillna("")).to_numpy() # combine title and text, convert missing data to empty string
        y = df["label"].to_numpy().astype(int) # create vector of labels as integers
        return texts, y

    def fit(self, texts, y):
        X = self.vectorizer.fit_transform(texts) # transform texts to feature vectors
        y = np.asarray(y).astype(int) # ensure y is numpy array of integers

        _, n_features = X.shape # number of features

        # class counts - number of samples in each class
        class_counts = np.array([(y==c).sum() for c in [0, 1]], dtype=np.float64) # returns array with number of samples in each class

        # feature counts per class - number of articles in each class where each feature is present
        feature_counts = np.zeros((2, n_features), dtype=np.float64) # initialize feature counts array
    
        # for each class, count the number of times each feature appears in that class
        for c in [0, 1]:
            X_c = X[y == c]
            feature_counts[c, :] = X_c.sum(axis=0).ravel()

        # Apply Laplace smoothing
        # p_(c,j) = (N_(c,j)+ alpha) / (N_c + 2*alpha)
        # take alpha = 1
        denominator = class_counts[:, None] + 2.0
        smoothed = (feature_counts + 1.0) / denominator

        # compute log probabilities
        self.log_class_ratio_ = np.log(class_counts / class_counts.sum())

        # compute log probabilities for features given class
        self.log_feature_prob_ = np.log(smoothed)
        self.neg_log_feature_prob_ = np.log(1.0 - smoothed)

        return self

    def _joint_log_likelihood(self, X):
        # joint log likelihood is X * (log(P(j|c)) - log(1 - P(j|c))) + log(P(c)) + sum(log(1 - P(j|c)))
        joint_log_prob = X @ (self.log_feature_prob_ - self.neg_log_feature_prob_).T # X * (log(P(j|c)) - log(1 - P(j|c)))
        joint_log_prob = np.asarray(joint_log_prob) # convert to array
        joint_log_prob += self.log_class_ratio_ + self.neg_log_feature_prob_.sum(axis=1) # add log(P(c)) + sum(log(1 - P(j|c)))
        return joint_log_prob

    def predict(self, texts):
        X = self.vectorizer.transform(texts) # transform texts to feature vectors
        joint_log_prob = self._joint_log_likelihood(X) # calculate joint log likelihood
        return joint_log_prob.argmax(axis=1) # return class with highest log likelihood

    def predict_prob(self, texts):
        X = self.vectorizer.transform(texts) # transform texts to feature vectors
        joint_log_prob = self._joint_log_likelihood(X) # calculate joint log likelihood
        log_probs = joint_log_prob - joint_log_prob.max(axis=1, keepdims=True) # for numerical stability
        probs = np.exp(log_probs) # exponentiate log probabilities
        probs /= probs.sum(axis=1, keepdims=True) # acquire probabilities
        return probs

# ChatGPT generated test code
if __name__ == "__main__":
    import os
    import numpy as np
    import pandas as pd
    from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

    csv_path = "ML/data/WELFake_Dataset.csv"

    # output folder for evaluate_all.py
    preds_dir = "ML/artifacts/preds"
    os.makedirs(preds_dir, exist_ok=True)

    model = BernoulliNaiveBayes(min_df=2, max_features=20000)

    # load full df so we can apply frozen splits
    df = pd.read_csv(csv_path).reset_index(drop=True)

    # ensure stable row_id exists
    if "row_id" not in df.columns:
        df["row_id"] = np.arange(len(df))
        df.to_csv(csv_path, index=False)  # optional but keeps it stable for future runs

    # load frozen splits
    train_ids = pd.read_csv("ML/data/splits/train_ids.csv")["row_id"].to_numpy()
    test_ids = pd.read_csv("ML/data/splits/test_ids.csv")["row_id"].to_numpy()

    # select rows by row_id
    df = df.set_index("row_id", drop=False)
    train_df = df.loc[train_ids]
    test_df = df.loc[test_ids]

    # build texts the same way as load_data(): title + text
    X_train_texts = (train_df["title"].fillna("") + " " + train_df["text"].fillna("")).to_numpy()
    y_train = train_df["label"].to_numpy().astype(int)

    X_test_texts = (test_df["title"].fillna("") + " " + test_df["text"].fillna("")).to_numpy()
    y_test = test_df["label"].to_numpy().astype(int)

    # train + predict
    model.fit(X_train_texts, y_train)
    y_pred = model.predict(X_test_texts)

    # probability for "fake" (assumes label 1 = fake)
    probs = model.predict_prob(X_test_texts)  # shape (n, 2)
    prob_fake = probs[:, 1].astype(float)

    # map to evaluate_all labels
    true_label = np.where(y_test == 1, "fake", "real")
    pred_label = np.where(y_pred == 1, "fake", "real")

    # write predictions file
    pred_df = pd.DataFrame({
        "row_id": test_df["row_id"].to_numpy(),
        "true_label": true_label,
        "pred_label": pred_label,
        "prob_fake": prob_fake,
    })
    pred_df.to_csv(os.path.join(preds_dir, "nb_test_preds.csv"), index=False)
    print("Saved:", os.path.join(preds_dir, "nb_test_preds.csv"))

    # optional: print metrics
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("Confusion matrix:\n", confusion_matrix(y_test, y_pred))
    print(classification_report(y_test, y_pred, digits=4))