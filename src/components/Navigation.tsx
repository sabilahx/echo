// src/components/Navigation.tsx
import React from 'react';
import { Sparkles, MessageSquare, Mic2, Wand2, RotateCcw, ShieldCheck, LayoutDashboard } from 'lucide-react';
import type { AppViewMode } from '../services/types.ts';
import './Navigation.css';

interface NavigationProps {
  currentView: AppViewMode;
  onNavigate: (view: AppViewMode) => void;
  onResetSession: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  onResetSession
}) => {
  return (
    <header className="echo-navbar glass-panel">
      <div className="navbar-brand" onClick={() => onNavigate('dashboard')}>
        <div className="brand-logo-icon">
          <Sparkles size={18} />
        </div>
        <div className="brand-text">
          <span className="brand-title">ECHO</span>
          <span className="brand-subtitle">Communication Coach</span>
        </div>
      </div>

      <nav className="navbar-tabs">
        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn highlight ${['rehearsal', 'rehearsal_active', 'rehearsal_feedback'].includes(currentView) ? 'active' : ''}`}
          onClick={() => onNavigate('rehearsal')}
        >
          <Mic2 size={15} />
          <span>Rehearsal Mode</span>
          <span className="badge-signature">Signature</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'companion' ? 'active' : ''}`}
          onClick={() => onNavigate('companion')}
        >
          <MessageSquare size={15} />
          <span>Emotion Companion</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'say_it_better' ? 'active' : ''}`}
          onClick={() => onNavigate('say_it_better')}
        >
          <Wand2 size={15} />
          <span>Say It Better</span>
        </button>
      </nav>

      <div className="navbar-actions">
        <button
          type="button"
          className="reset-session-pill"
          onClick={onResetSession}
          title="Reset current in-memory practice session"
        >
          <RotateCcw size={13} />
          <span>Reset Session</span>
        </button>

        <div className="privacy-pill" title="Private local session (in-memory only)">
          <ShieldCheck size={13} />
          <span>Private</span>
        </div>
      </div>
    </header>
  );
};

