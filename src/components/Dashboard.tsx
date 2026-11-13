// src/components/Dashboard.tsx
import React, { useState } from 'react';
import { 
  Mic2, 
  MessageSquare, 
  ArrowRight, 
  ShieldCheck, 
  RotateCcw,
  Users,
  Wand2,
  Activity
} from 'lucide-react';
import type { AppViewMode, RehearsalScenario } from '../services/types.ts';
import { REHEARSAL_SCENARIOS } from '../services/rehearsalEngine.ts';
import { EMOTION_METADATA } from '../services/emotionEngine.ts';
import './Dashboard.css';

interface DashboardProps {
  onNavigate: (view: AppViewMode) => void;
  onSelectScenario: (scenario: RehearsalScenario) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onSelectScenario
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredScenarios = selectedCategory === 'all'
    ? REHEARSAL_SCENARIOS
    : REHEARSAL_SCENARIOS.filter(s => s.category === selectedCategory);

  const categories = ['all', 'conflict', 'work', 'boundaries', 'personal'];

  // Color indicators for emotions instead of emojis
  const emotionPillColors: Record<string, string> = {
    Happy: '#E5C378',
    Sad: '#9AA7C1',
    Angry: '#E06D6D',
    Anxious: '#E09F67',
    Frustrated: '#D47E65',
    Confused: '#A892BF',
    Neutral: '#7E91A8'
  };

  return (
    <div className="echo-dashboard-clean slide-up">
      {/* 1. EDITORIAL LUXURY HERO (No AI Cliché, Big Playfair Display Italic) */}
      <section className="dash-hero-editorial glass-panel">
        <div className="hero-top-eyebrow">
          <span className="eyebrow-accent-dot" />
          <span>Affective Intelligence Studio</span>
        </div>

        <div className="hero-typography-group">
          <h1 className="hero-headline font-editorial">
            Understand emotion. <br />
            <span className="hero-headline-italic">Master difficult conversation.</span>
          </h1>
          <p className="hero-subtext">
            An interactive simulator to practice high-stakes real-world dialogue, receive live coaching feedback, and articulate clear personal boundaries.
          </p>
        </div>

        {/* Clean Action Cluster */}
        <div className="hero-actions-cluster">
          <button 
            type="button" 
            className="btn-editorial-primary"
            onClick={() => onNavigate('rehearsal')}
          >
            <Mic2 size={15} />
            <span>Enter Rehearsal Room</span>
            <ArrowRight size={13} className="btn-arrow" />
          </button>

          <button 
            type="button" 
            className="btn-editorial-secondary"
            onClick={() => onNavigate('companion')}
          >
            <MessageSquare size={15} />
            <span>Emotion Companion</span>
          </button>

          <button 
            type="button" 
            className="btn-editorial-tertiary"
            onClick={() => onNavigate('say_it_better')}
          >
            <Wand2 size={15} />
            <span>Say It Better</span>
          </button>
        </div>

        {/* Editorial Metrics Banner (Minimalist, concise) */}
        <div className="hero-metrics-strip">
          <div className="metric-pill">
            <span className="metric-value">7</span>
            <span className="metric-caption">Scenarios</span>
          </div>
          <div className="metric-divider" />
          <div className="metric-pill">
            <span className="metric-value">5</span>
            <span className="metric-caption">EQ Competencies</span>
          </div>
          <div className="metric-divider" />
          <div className="metric-pill">
            <span className="metric-value">100%</span>
            <span className="metric-caption">Private In-Memory</span>
          </div>
        </div>
      </section>

      {/* 2. REHEARSAL MODE CURATED CATALOG */}
      <section className="dash-rehearsal-section slide-up-delayed">
        <div className="section-head-bar">
          <div>
            <div className="section-eyebrow">Rehearsal Catalog</div>
            <h2 className="section-heading font-editorial">
              Choose your <em>conversation</em>
            </h2>
          </div>

          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`cat-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="scenarios-compact-grid">
          {filteredScenarios.map((scenario: RehearsalScenario) => (
            <div 
              key={scenario.id} 
              className="scenario-item-card glass-panel"
              onClick={() => onSelectScenario(scenario)}
            >
              <div className="scenario-item-top">
                <span className="item-category-tag">{scenario.category}</span>
                <span className="item-partner-pill">
                  <Users size={12} />
                  <span>{scenario.partnerName}</span>
                </span>
              </div>

              <h3 className="item-title font-editorial">{scenario.title}</h3>
              <p className="item-tagline">{scenario.tagline}</p>

              <div className="item-partner-meta">
                <span className="partner-role">{scenario.partnerRole}</span>
                <span className="meta-bullet">•</span>
                <span className="partner-attitude">{scenario.partnerAttitude}</span>
              </div>

              <div className="item-action-footer">
                <span>Begin practice turn</span>
                <ArrowRight size={13} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. MINIMAL EMOTION ARCHITECTURE (No Emojis, Clean Colored Status Dots) */}
      <section className="dash-emotion-summary glass-panel slide-up-delayed-2">
        <div className="summary-header">
          <div className="summary-title-group">
            <Activity size={14} className="icon-activity" />
            <span className="summary-title">Calibrated Affective Sensing Spectrum</span>
          </div>
          <span className="summary-note">Syntactic text analysis • Zero biometric overreach</span>
        </div>

        <div className="emotion-badges-row">
          {(Object.keys(EMOTION_METADATA) as Array<keyof typeof EMOTION_METADATA>).map(emo => {
            const dotColor = emotionPillColors[emo] || '#94A3B8';
            return (
              <div key={emo} className="emotion-mini-badge">
                <span className="status-dot" style={{ backgroundColor: dotColor }} />
                <span className="mini-badge-name">{emo}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. PRIVACY & ARCHITECTURE STRIP */}
      <footer className="dash-activity-strip glass-panel">
        <div className="activity-item">
          <ShieldCheck size={14} className="icon-gold" />
          <span>Ephemeral Session Architecture — Zero permanent transcription storage</span>
        </div>
        <div className="activity-item">
          <RotateCcw size={14} className="icon-slate" />
          <span>Dual Engine Fallback — Offline deterministic intelligence + LLM</span>
        </div>
      </footer>
    </div>
  );
};
