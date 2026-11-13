"""
ECHO - Emotionally Intelligent Voice Companion
Module: evaluate.py
Purpose: Standalone Model Evaluation Script
Evaluates the saved model and vectorizer on the test split.
Generates:
- Classification report (Accuracy, Precision, Recall, F1)
- Confusion Matrix
- Metrics summaries
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'dataset')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
RESULTS_DIR = os.path.join(BASE_DIR, 'results')

LABEL_NAMES = ['sadness', 'joy', 'love', 'anger', 'fear', 'surprise']


def run_evaluation():
    print("==================================================")
    print("     ECHO: Emotion Classifier Model Evaluation    ")
    print("==================================================")

    model_path = os.path.join(MODELS_DIR, 'emotion_classifier.joblib')
    vec_path = os.path.join(MODELS_DIR, 'tfidf_vectorizer.joblib')
    test_path = os.path.join(DATA_DIR, 'test.csv')

    if not os.path.exists(model_path) or not os.path.exists(vec_path):
        raise FileNotFoundError("Trained model or vectorizer not found in models/ directory. Run train_model.py first.")

    if not os.path.exists(test_path):
        raise FileNotFoundError(f"Test dataset not found at {test_path}. Run train_model.py first.")

    print("[1/4] Loading trained model, vectorizer, and test set...")
    classifier = joblib.load(model_path)
    vectorizer = joblib.load(vec_path)
    df_test = pd.read_csv(test_path)

    print(f"       -> Test samples count: {len(df_test):,}")

    print("[2/4] Vectorizing test text...")
    X_test = vectorizer.transform(df_test['text'].astype(str))
    y_test = df_test['label'].values

    print("[3/4] Computing model predictions and performance metrics...")
    y_pred = classifier.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(y_test, y_pred, average='macro')
    prec_weighted, rec_weighted, f1_weighted, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')

    print("\n" + "=" * 50)
    print(f"  Test Accuracy:     {acc * 100:.2f}%")
    print(f"  Macro Precision:   {prec_macro * 100:.2f}%")
    print(f"  Macro Recall:      {rec_macro * 100:.2f}%")
    print(f"  Macro F1-Score:    {f1_macro * 100:.2f}%")
    print(f"  Weighted F1-Score: {f1_weighted * 100:.2f}%")
    print("=" * 50 + "\n")

    report = classification_report(y_test, y_pred, target_names=LABEL_NAMES, digits=4)
    print("Classification Report:\n", report)

    print("[4/4] Generating and saving evaluation charts...")
    cm = confusion_matrix(y_test, y_pred)

    # Confusion matrix
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Purples', xticklabels=LABEL_NAMES, yticklabels=LABEL_NAMES)
    plt.title('ECHO Emotion Classification - Test Confusion Matrix', fontsize=13, pad=12, fontweight='bold')
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')
    plt.tight_layout()
    cm_out = os.path.join(RESULTS_DIR, 'confusion_matrix.png')
    plt.savefig(cm_out, dpi=300)
    plt.close()
    print(f"       -> Saved confusion matrix to {cm_out}")

    print("\nEvaluation successfully completed.\n")


if __name__ == '__main__':
    run_evaluation()

