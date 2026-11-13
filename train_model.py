"""
ECHO - Emotionally Intelligent Voice Companion
Module: train_model.py
Purpose: Complete ML Training Pipeline for Emotion Classification
Dataset: DAIR.AI Emotion (sadness, joy, love, anger, fear, surprise)
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix
)

# Label Mapping according to DAIR.AI Emotion dataset
LABEL_NAMES = ['sadness', 'joy', 'love', 'anger', 'fear', 'surprise']
LABEL_MAP = {idx: name for idx, name in enumerate(LABEL_NAMES)}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'dataset')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
RESULTS_DIR = os.path.join(BASE_DIR, 'results')

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)


def load_data():
    """Load train, validation, and test sets from local CSVs or Hugging Face datasets."""
    train_path = os.path.join(DATA_DIR, 'train.csv')
    val_path = os.path.join(DATA_DIR, 'validation.csv')
    test_path = os.path.join(DATA_DIR, 'test.csv')

    if os.path.exists(train_path) and os.path.exists(test_path):
        print("[1/6] Loading dataset from local CSV files...")
        df_train = pd.read_csv(train_path)
        df_val = pd.read_csv(val_path) if os.path.exists(val_path) else pd.DataFrame()
        df_test = pd.read_csv(test_path)
    else:
        print("[1/6] Local CSV files not found. Loading via datasets library...")
        from datasets import load_dataset
        ds = load_dataset('dair-ai/emotion')
        df_train = ds['train'].to_pandas()
        df_val = ds['validation'].to_pandas()
        df_test = ds['test'].to_pandas()
        # Cache to local files
        os.makedirs(DATA_DIR, exist_ok=True)
        df_train.to_csv(train_path, index=False)
        df_val.to_csv(val_path, index=False)
        df_test.to_csv(test_path, index=False)

    return df_train, df_val, df_test


def inspect_and_clean(df, name="split"):
    """Inspect missing records and duplicates; clean text."""
    initial_len = len(df)
    missing = df.isnull().sum().to_dict()
    duplicates = int(df.duplicated(subset=['text']).sum())
    
    print(f"       -> {name.upper()}: {initial_len} records | Missing: {missing} | Duplicate texts: {duplicates}")
    
    # Drop missing values if any
    df = df.dropna(subset=['text', 'label']).copy()
    
    # Light preprocessing: strip extra whitespace and normalize string
    df['text'] = df['text'].astype(str).str.strip()
    
    return df


def plot_confusion_matrix(cm, labels, save_path):
    """Plot and save confusion matrix heatmap."""
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt='d',
        cmap='Purples',
        xticklabels=labels,
        yticklabels=labels,
        cbar=True
    )
    plt.title('ECHO Emotion Classifier - Confusion Matrix (Test Set)', fontsize=14, pad=15)
    plt.xlabel('Predicted Label', fontsize=12)
    plt.ylabel('True Label', fontsize=12)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"       -> Saved confusion matrix to {save_path}")


def plot_metrics_summary(report_dict, labels, save_path):
    """Plot precision, recall, and F1-score per emotion."""
    metrics_data = []
    for lbl in labels:
        if lbl in report_dict:
            metrics_data.append({
                'Emotion': lbl.capitalize(),
                'Precision': report_dict[lbl]['precision'],
                'Recall': report_dict[lbl]['recall'],
                'F1-Score': report_dict[lbl]['f1-score']
            })
    
    df_m = pd.DataFrame(metrics_data)
    df_melted = df_m.melt(id_vars='Emotion', var_name='Metric', value_name='Score')
    
    plt.figure(figsize=(10, 5))
    palette = {'Precision': '#6366f1', 'Recall': '#8b5cf6', 'F1-Score': '#ec4899'}
    sns.barplot(data=df_melted, x='Emotion', y='Score', hue='Metric', palette=palette)
    plt.title('ECHO Emotion Classification Metrics per Emotion', fontsize=14, pad=15)
    plt.ylim(0, 1.05)
    plt.ylabel('Score', fontsize=12)
    plt.xlabel('Emotion Category', fontsize=12)
    plt.legend(loc='lower right')
    plt.grid(axis='y', linestyle='--', alpha=0.5)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"       -> Saved metrics summary plot to {save_path}")


def train_and_evaluate():
    print("==================================================")
    print("  ECHO: Emotion Classifier Training & Evaluation  ")
    print("==================================================")

    # 1. Load Data
    df_train, df_val, df_test = load_data()

    # 2. Inspect & Clean
    print("\n[2/6] Inspecting and preprocessing datasets...")
    df_train = inspect_and_clean(df_train, "train")
    df_val = inspect_and_clean(df_val, "val")
    df_test = inspect_and_clean(df_test, "test")

    # Combine train + validation for maximum training representation
    df_full_train = pd.concat([df_train, df_val], ignore_index=True)
    print(f"       -> Combined training samples (train + val): {len(df_full_train)}")

    # 3. Text Representation via TF-IDF
    print("\n[3/6] Vectorizing text with TF-IDF...")
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=12000,
        sublinear_tf=True,
        min_df=2,
        stop_words=None  # Emotional cues often live in pronouns/function words (e.g., 'i', 'myself')
    )
    
    X_train = vectorizer.fit_transform(df_full_train['text'])
    y_train = df_full_train['label'].values

    X_test = vectorizer.transform(df_test['text'])
    y_test = df_test['label'].values

    print(f"       -> Vocabulary size: {len(vectorizer.vocabulary_)} features")
    print(f"       -> Train feature matrix shape: {X_train.shape}")
    print(f"       -> Test feature matrix shape: {X_test.shape}")

    # 4. Train Multiclass Logistic Regression Classifier
    print("\n[4/6] Training Logistic Regression classifier (multiclass)...")
    classifier = LogisticRegression(
        C=2.5,
        max_iter=1000,
        solver='lbfgs',
        class_weight='balanced',
        random_state=42
    )
    classifier.fit(X_train, y_train)
    print("       -> Training completed successfully!")

    # 5. Evaluate on Official Test Split
    print("\n[5/6] Evaluating model on official test split (2,000 samples)...")
    y_pred = classifier.predict(X_test)
    y_pred_proba = classifier.predict_proba(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(y_test, y_pred, average='macro')
    prec_weighted, rec_weighted, f1_weighted, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')

    print(f"\n================ MODEL PERFORMANCE ================")
    print(f"  Test Accuracy:        {acc * 100:.2f}%")
    print(f"  Macro Precision:      {prec_macro * 100:.2f}%")
    print(f"  Macro Recall:         {rec_macro * 100:.2f}%")
    print(f"  Macro F1-Score:       {f1_macro * 100:.2f}%")
    print(f"  Weighted F1-Score:    {f1_weighted * 100:.2f}%")
    print("===================================================\n")

    report_str = classification_report(y_test, y_pred, target_names=LABEL_NAMES, digits=4)
    report_dict = classification_report(y_test, y_pred, target_names=LABEL_NAMES, output_dict=True)
    print("Classification Report:\n", report_str)

    cm = confusion_matrix(y_test, y_pred)

    # Save visualisations
    cm_path = os.path.join(RESULTS_DIR, 'confusion_matrix.png')
    plot_confusion_matrix(cm, LABEL_NAMES, cm_path)

    metrics_plot_path = os.path.join(RESULTS_DIR, 'metrics_summary.png')
    plot_metrics_summary(report_dict, LABEL_NAMES, metrics_plot_path)

    # Save metrics JSON
    metrics_summary = {
        'accuracy': float(acc),
        'macro_precision': float(prec_macro),
        'macro_recall': float(rec_macro),
        'macro_f1': float(f1_macro),
        'weighted_f1': float(f1_weighted),
        'classification_report': report_dict,
        'label_mapping': LABEL_MAP,
        'num_train_samples': int(len(df_full_train)),
        'num_test_samples': int(len(df_test)),
        'vocab_size': int(len(vectorizer.vocabulary_))
    }
    metrics_json_path = os.path.join(RESULTS_DIR, 'evaluation_metrics.json')
    with open(metrics_json_path, 'w', encoding='utf-8') as f:
        json.dump(metrics_summary, f, indent=2)
    print(f"       -> Saved metrics JSON to {metrics_json_path}")

    # 6. Save Artifacts with Joblib
    print("\n[6/6] Saving trained model and TF-IDF vectorizer...")
    model_path = os.path.join(MODELS_DIR, 'emotion_classifier.joblib')
    vectorizer_path = os.path.join(MODELS_DIR, 'tfidf_vectorizer.joblib')
    metadata_path = os.path.join(MODELS_DIR, 'model_metadata.json')

    joblib.dump(classifier, model_path)
    joblib.dump(vectorizer, vectorizer_path)

    metadata = {
        'model_type': 'LogisticRegression',
        'vectorizer_type': 'TfidfVectorizer',
        'label_names': LABEL_NAMES,
        'accuracy': float(acc),
        'f1_macro': float(f1_macro)
    }
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"       -> Model saved:      {model_path}")
    print(f"       -> Vectorizer saved: {vectorizer_path}")
    print(f"       -> Metadata saved:   {metadata_path}")
    print("\nPipeline execution complete! Model ready for ECHO inference.\n")


if __name__ == '__main__':
    train_and_evaluate()

