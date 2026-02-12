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
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
    from sklearn.naive_bayes import BernoulliNB

    csv_path = "data/WELFake_Dataset.csv"

    model = BernoulliNaiveBayes(min_df=2, max_features=20000)

    texts, y = model.load_data(csv_path)

    X_train_texts, X_test_texts, y_train, y_test = train_test_split(
        texts, y, test_size=0.2, random_state=42, stratify=y
    )

    model.fit(X_train_texts, y_train)

    y_pred = model.predict(X_test_texts)

    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("Confusion matrix:\n", confusion_matrix(y_test, y_pred))
    print(classification_report(y_test, y_pred, digits=4))

    # Compare with sklearn's BernoulliNB

    X_all = model.vectorizer.fit_transform(texts)

    X_train, X_test, y_train, y_test = train_test_split(
        X_all, y, test_size=0.2, random_state=42, stratify=y
    )

    sk = BernoulliNB(alpha=1.0)
    sk.fit(X_train, y_train)
    sk_pred = sk.predict(X_test)

    print("sklearn Accuracy:", accuracy_score(y_test, sk_pred))
    print(classification_report(y_test, sk_pred, digits=4))