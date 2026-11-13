"""
ECHO 2.0 - Emotionally Intelligent Voice Companion
Module: evaluation.py
Purpose: Comprehensive Machine Learning Model Evaluation & Benchmark Diagnostics.
Calculates Accuracy, Macro/Weighted Precision, Recall, F1, Per-Class Scores,
and generates Confusion Matrix plots.
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

os.makedirs(RESULTS_DIR, exist_ok=True)
LABEL_NAMES = ['sadness', 'joy', 'love', 'anger', 'fear', 'surprise']


def run_comprehensive_evaluation():
    print("========================================================")
    print("      ECHO 2.0: ML CLASSIFIER BENCHMARK EVALUATION      ")
    print("========================================================")

    model_path = os.path.join(MODELS_DIR, 'emotion_classifier.joblib')
    vec_path = os.path.join(MODELS_DIR, 'tfidf_vectorizer.joblib')
    test_path = os.path.join(DATA_DIR, 'test.csv')

    if not os.path.exists(model_path) or not os.path.exists(vec_path):
        raise FileNotFoundError("Model artifacts not found in models/ directory. Run train_model.py first.")
    if not os.path.exists(test_path):
        raise FileNotFoundError(f"Test dataset not found at {test_path}. Run train_model.py first.")

    print("\n[1/4] Loading trained model, TF-IDF vectorizer, and test set...")
    classifier = joblib.load(model_path)
    vectorizer = joblib.load(vec_path)
    df_test = pd.read_csv(test_path)
    print(f"       -> Test samples count: {len(df_test):,}")

    print("\n[2/4] Transforming test texts into TF-IDF feature space...")
    X_test = vectorizer.transform(df_test['text'].astype(str))
    y_test = df_test['label'].values

    print("\n[3/4] Evaluating multi-class predictions...")
    y_pred = classifier.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(y_test, y_pred, average='macro')
    prec_weighted, rec_weighted, f1_weighted, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')

    print("\n" + "=" * 54)
    print(f"  Test Accuracy:     {acc * 100:.2f}%")
    print(f"  Macro Precision:   {prec_macro * 100:.2f}%")
    print(f"  Macro Recall:      {rec_macro * 100:.2f}%")
    print(f"  Macro F1-Score:    {f1_macro * 100:.2f}%")
    print(f"  Weighted F1-Score: {f1_weighted * 100:.2f}%")
    print("=" * 54 + "\n")

    report_str = classification_report(y_test, y_pred, target_names=LABEL_NAMES, digits=4)
    report_dict = classification_report(y_test, y_pred, target_names=LABEL_NAMES, output_dict=True)
    print("Classification Report:\n", report_str)

    print("\n[4/4] Generating and saving evaluation charts...")
    cm = confusion_matrix(y_test, y_pred)

    # Confusion matrix heatmap
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt='d',
        cmap='Purples',
        xticklabels=LABEL_NAMES,
        yticklabels=LABEL_NAMES,
        cbar=True
    )
    plt.title('ECHO 2.0 Emotion Classifier - Test Confusion Matrix', fontsize=13, pad=12, fontweight='bold')
    plt.xlabel('Predicted Emotion Label', fontsize=11)
    plt.ylabel('True Ground Truth Label', fontsize=11)
    plt.tight_layout()
    cm_path = os.path.join(RESULTS_DIR, 'confusion_matrix.png')
    plt.savefig(cm_path, dpi=300)
    plt.close()
    print(f"       -> Saved confusion matrix to {cm_path}")

    # Save metrics JSON
    metrics_summary = {
        'accuracy': float(acc),
        'macro_precision': float(prec_macro),
        'macro_recall': float(rec_macro),
        'macro_f1': float(f1_macro),
        'weighted_f1': float(f1_weighted),
        'classification_report': report_dict,
        'label_names': LABEL_NAMES,
        'test_samples_count': int(len(df_test))
    }
    metrics_json_path = os.path.join(RESULTS_DIR, 'evaluation_metrics.json')
    with open(metrics_json_path, 'w', encoding='utf-8') as f:
        json.dump(metrics_summary, f, indent=2)
    print(f"       -> Saved metrics JSON to {metrics_json_path}")

    print("\nEvaluation completed successfully!\n")
    return metrics_summary


if __name__ == '__main__':
    run_comprehensive_evaluation()

