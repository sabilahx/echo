# Aura EI — Emotionally Intelligent Voice Companion

An affective computing and emotional intelligence (EQ) voice AI architecture built with **React 19, TypeScript, and Vite**.

Unlike standard voice assistants that prioritize transactional queries (e.g., weather, search, commands), **Aura EI** is specifically engineered for **affective attunement, active listening, psychological safety, and somatic grounding**.

---

## 🧠 Core Architecture: 4-Stage Affective Pipeline

```
[ User Audio / Speech / Text ]
              │
              ▼
  1. Speech Recognition (STT / Deepgram)
              │
              ▼
  2. EQ & Acoustic Prosody Analysis Layer
     • Detected Emotion (Burnout, Anxiety, Vulnerability, Grief, Joy)
     • Affective Valence (-1.0 to +1.0) & Intensity (0–100%)
     • Acoustic Cues (Cadence, pauses, jitter, strain, sigh markers)
     • Empathy Strategy (Validation, De-escalation, Reframe, Presence)
              │
              ▼
  3. Empathetic LLM Reasoning (Groq / Llama-3 / Gemini)
     • Reflective active listening (Validates feelings first before advice)
     • CBT-informed non-judgmental dialogue
     • Somatic grounding detection (Offers pacing / box breathing when nervous system is overloaded)
              │
              ▼
  4. Emotionally-Attuned Voice Modulation (Cartesia / ElevenLabs)
     • Pacing modulation (0.8x slow-grounded to 1.05x bright-resonant)
     • Vocal timbre adjustments (Warm, holding, soothing, stabilizing)
```

---

## 🌟 Key Features

1. **Emotional Resonance Orb**:
   - Dynamic pulsing aura that shifts hues dynamically based on the user's emotional state (Warm blue for burnout, soft amber for anxiety, rose for vulnerability, golden for quiet joy).
2. **Interactive Somatic Grounding Tool**:
   - Built-in 4-4-4-4 Box Breathing visual guide (Inhale $\rightarrow$ Hold $\rightarrow$ Exhale $\rightarrow$ Rest) with animated pacing.
3. **Dual Input Mode**:
   - Simulated voice input with 6 real-world emotional dilemmas (Burnout, Impostor Syndrome, Panic/Tight Chest, Loneliness, Relational Guilt, Hopeful Milestone).
   - Custom real-time text input that passes any user thought through the live EQ analyzer.
4. **Affective Metadata Badges**:
   - User messages display detected emotional intensity and acoustic cues.
   - Assistant responses display the specific clinical empathy strategy and voice modulation parameters used.

---

## 🛠️ Project Structure

- `src/services/aiPipeline.ts` — Core emotional classification, prosody simulation, empathy synthesis, and scenario data.
- `src/components/EmotionalVisualizer.tsx` — Resonance orb visualizer and interactive somatic box breathing guide.
- `src/components/PipelineStatus.tsx` — 4-stage affective pipeline state tracker.
- `src/components/MessageList.tsx` — Conversation stream with emotional badges and empathy metadata.
- `src/components/InputController.tsx` — Voice mic button, quick emotional scenario chips, and custom input.
- `src/components/VoiceAssistant.tsx` — Main application orchestrator.

---

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Production build
npm run build
```
