"""
ECHO - Emotionally Intelligent Voice Companion
Module: eda.py
Purpose: Exploratory Data Analysis (EDA) on the DAIR.AI Emotion Dataset
Generates:
1. Emotion distribution bar chart
2. Word-frequency analysis per emotion / overall
3. Dataset statistics summary
"""

import os
import re
from collections import Counter
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'dataset')
ANALYSIS_DIR = os.path.join(BASE_DIR, 'analysis')
RESULTS_DIR = os.path.join(BASE_DIR, 'results')

os.makedirs(ANALYSIS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

LABEL_NAMES = ['sadness', 'joy', 'love', 'anger', 'fear', 'surprise']
LABEL_MAP = {idx: name for idx, name in enumerate(LABEL_NAMES)}
EMOTION_COLORS = {
    'sadness': '#3b82f6',
    'joy': '#f59e0b',
    'love': '#ec4899',
    'anger': '#ef4444',
    'fear': '#8b5cf6',
    'surprise': '#06b6d4'
}

# Standard English stopwords for lexical analysis
STOPWORDS = {
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've", "you'll", "you'd",
    'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', "she's", 'her', 'hers',
    'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
    'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
    'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
    'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', "don't", 'should',
    "should've", 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn', 'hadn',
    'hasn', 'haven', 'isn', 'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn',
    'feel', 'feeling', 'im', 'like'
}


def load_all_data():
    splits = {}
    for split in ['train', 'validation', 'test']:
        path = os.path.join(DATA_DIR, f'{split}.csv')
        if os.path.exists(path):
            df = pd.read_csv(path)
            df['split'] = split
            df['emotion'] = df['label'].map(LABEL_MAP)
            splits[split] = df
        else:
            raise FileNotFoundError(f"Missing {path}. Run train_model.py first.")
    df_all = pd.concat(splits.values(), ignore_index=True)
    return splits, df_all


def plot_emotion_distribution(df_all):
    plt.figure(figsize=(10, 6))
    counts = df_all['emotion'].value_counts()[LABEL_NAMES]
    colors = [EMOTION_COLORS[e] for e in LABEL_NAMES]
    
    bars = plt.bar(LABEL_NAMES, counts.values, color=colors, edgecolor='none', width=0.6, alpha=0.9)
    plt.title('DAIR.AI Emotion Dataset - Overall Class Distribution', fontsize=14, pad=15, fontweight='bold')
    plt.xlabel('Emotion Category', fontsize=12)
    plt.ylabel('Number of Samples', fontsize=12)
    plt.grid(axis='y', linestyle='--', alpha=0.4)
    
    # Add count and percentage labels above bars
    total = len(df_all)
    for bar in bars:
        h = bar.get_height()
        pct = (h / total) * 100
        plt.text(bar.get_x() + bar.get_width() / 2, h + 80, f"{h:,}\n({pct:.1f}%)", ha='center', va='bottom', fontsize=10)

    plt.ylim(0, max(counts.values) * 1.15)
    plt.tight_layout()
    
    save_path1 = os.path.join(RESULTS_DIR, 'emotion_distribution.png')
    save_path2 = os.path.join(ANALYSIS_DIR, 'emotion_distribution.png')
    plt.savefig(save_path1, dpi=300)
    plt.savefig(save_path2, dpi=300)
    plt.close()
    print(f"       -> Saved emotion distribution chart to {save_path1}")


def plot_word_frequencies(df_all):
    """Plot top frequent informative words per emotion."""
    fig, axes = plt.subplots(2, 3, figsize=(16, 10))
    axes = axes.flatten()

    for idx, emotion in enumerate(LABEL_NAMES):
        ax = axes[idx]
        subset = df_all[df_all['emotion'] == emotion]['text']
        
        words = []
        for text in subset:
            cleaned = re.findall(r'\b[a-z]{3,}\b', str(text).lower())
            words.extend([w for w in cleaned if w not in STOPWORDS])
            
        counter = Counter(words)
        common = counter.most_common(10)
        
        if common:
            words_top, freqs = zip(*common)
        else:
            words_top, freqs = [], []

        ax.barh(words_top[::-1], freqs[::-1], color=EMOTION_COLORS[emotion], alpha=0.85)
        ax.set_title(f"Top Words: {emotion.capitalize()}", fontsize=12, fontweight='bold')
        ax.set_xlabel('Frequency', fontsize=10)
        ax.grid(axis='x', linestyle='--', alpha=0.3)

    plt.suptitle('Lexical Cues: Top Descriptive Words by Emotion Category', fontsize=16, y=0.99, fontweight='bold')
    plt.tight_layout()
    
    save_path1 = os.path.join(RESULTS_DIR, 'word_frequencies.png')
    save_path2 = os.path.join(ANALYSIS_DIR, 'word_frequencies.png')
    plt.savefig(save_path1, dpi=300)
    plt.savefig(save_path2, dpi=300)
    plt.close()
    print(f"       -> Saved word frequencies chart to {save_path1}")


def generate_dataset_statistics(splits, df_all):
    stats = {
        'total_records': len(df_all),
        'splits': {
            'train': len(splits['train']),
            'validation': len(splits['validation']),
            'test': len(splits['test'])
        },
        'class_distribution': df_all['emotion'].value_counts().to_dict(),
        'text_length_stats': {
            'mean_words': float(np.mean(df_all['text'].apply(lambda x: len(str(x).split())))),
            'median_words': float(np.median(df_all['text'].apply(lambda x: len(str(x).split())))),
            'max_words': int(np.max(df_all['text'].apply(lambda x: len(str(x).split())))),
            'min_words': int(np.min(df_all['text'].apply(lambda x: len(str(x).split()))))
        }
    }

    stats_path = os.path.join(ANALYSIS_DIR, 'dataset_statistics.json')
    import json
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2)
    print(f"       -> Saved dataset statistics JSON to {stats_path}")

    # Output text summary
    summary_path = os.path.join(ANALYSIS_DIR, 'dataset_summary.txt')
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write("==================================================\n")
        f.write("      DAIR.AI EMOTION DATASET STATISTICAL SUMMARY\n")
        f.write("==================================================\n\n")
        f.write(f"Total Records: {stats['total_records']:,}\n")
        f.write(f"  - Train Split:      {stats['splits']['train']:,} ({stats['splits']['train']/stats['total_records']*100:.1f}%)\n")
        f.write(f"  - Validation Split: {stats['splits']['validation']:,} ({stats['splits']['validation']/stats['total_records']*100:.1f}%)\n")
        f.write(f"  - Test Split:       {stats['splits']['test']:,} ({stats['splits']['test']/stats['total_records']*100:.1f}%)\n\n")
        f.write("Class Breakdown across Total Dataset:\n")
        for em in LABEL_NAMES:
            c = stats['class_distribution'].get(em, 0)
            f.write(f"  - {em.capitalize():<10}: {c:>6} ({c/stats['total_records']*100:.2f}%)\n")
        f.write("\nText Length Metrics (in words):\n")
        f.write(f"  - Mean length:   {stats['text_length_stats']['mean_words']:.2f} words\n")
        f.write(f"  - Median length: {stats['text_length_stats']['median_words']:.1f} words\n")
        f.write(f"  - Min / Max:     {stats['text_length_stats']['min_words']} / {stats['text_length_stats']['max_words']} words\n")
    print(f"       -> Saved dataset summary text to {summary_path}")


def run_eda():
    print("==================================================")
    print("      ECHO: Exploratory Data Analysis (EDA)       ")
    print("==================================================")
    splits, df_all = load_all_data()
    print(f"[1/3] Plotting emotion distribution across {len(df_all):,} records...")
    plot_emotion_distribution(df_all)
    print("[2/3] Analyzing linguistic markers & word frequencies...")
    plot_word_frequencies(df_all)
    print("[3/3] Generating comprehensive dataset statistics...")
    generate_dataset_statistics(splits, df_all)
    print("\nEDA execution complete! All plots and statistics saved to results/ and analysis/.\n")


if __name__ == '__main__':
    run_eda()

