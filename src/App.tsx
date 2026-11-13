// src/App.tsx
import React, { useState } from 'react';
import type { AppViewMode, RehearsalScenario, RehearsalFeedbackReport } from './services/types.ts';
import { aiPipeline } from './services/aiPipeline.ts';
import { Navigation } from './components/Navigation.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { RehearsalRoom } from './components/RehearsalRoom.tsx';
import { RehearsalFeedback } from './components/RehearsalFeedback.tsx';
import { VoiceAssistant } from './components/VoiceAssistant.tsx';
import { SayItBetterStudio } from './components/SayItBetterStudio.tsx';
import './App.css';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppViewMode>('dashboard');
  const [activeScenario, setActiveScenario] = useState<RehearsalScenario | null>(null);
  const [activeFeedbackReport, setActiveFeedbackReport] = useState<RehearsalFeedbackReport | null>(null);

  // Rehearsal Flow Handlers
  const handleSelectScenario = (scenario: RehearsalScenario) => {
    setActiveScenario(scenario);
    setCurrentView('rehearsal_active');
  };

  const handleBackToSelector = () => {
    setActiveScenario(null);
    setCurrentView('rehearsal');
  };

  const handleCompleteRehearsal = (report: RehearsalFeedbackReport) => {
    setActiveFeedbackReport(report);
    setCurrentView('rehearsal_feedback');
  };

  const handleRetryScenario = () => {
    if (activeFeedbackReport) {
      // Find the scenario and relaunch
      setCurrentView('rehearsal_active');
    } else {
      setCurrentView('rehearsal');
    }
  };

  // Reset in-memory session (No persistent storage)
  const handleResetSession = () => {
    aiPipeline.resetSession();
    setActiveScenario(null);
    setActiveFeedbackReport(null);
    setCurrentView('dashboard');
  };

  return (
    <div className="echo-app-root">
      <Navigation 
        currentView={currentView}
        onNavigate={setCurrentView}
        onResetSession={handleResetSession}
      />

      <main className="echo-main-content">
        {currentView === 'dashboard' && (
          <Dashboard 
            onNavigate={setCurrentView}
            onSelectScenario={handleSelectScenario}
          />
        )}

        {(currentView === 'rehearsal' || currentView === 'rehearsal_active') && (
          <RehearsalRoom 
            activeScenario={activeScenario}
            onSelectScenario={handleSelectScenario}
            onBackToSelector={handleBackToSelector}
            onCompleteRehearsal={handleCompleteRehearsal}
          />
        )}

        {currentView === 'rehearsal_feedback' && activeFeedbackReport && (
          <RehearsalFeedback 
            report={activeFeedbackReport}
            onRetryScenario={handleRetryScenario}
            onSelectAnotherScenario={handleBackToSelector}
          />
        )}

        {currentView === 'companion' && (
          <VoiceAssistant />
        )}

        {currentView === 'say_it_better' && (
          <SayItBetterStudio />
        )}
      </main>

      <footer className="echo-app-footer">
        <p className="footer-tagline">
          <strong>ECHO 2.0</strong> — Understand emotions. Practise conversations. Communicate better.
        </p>
        <p className="footer-privacy-note">
          Strict in-memory session management. Sensitive conversations and voice samples are never permanently logged or saved without explicit consent.
        </p>
      </footer>
    </div>
  );
};

export default App;
