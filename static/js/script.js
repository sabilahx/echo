/**
 * ECHO 2.0 – Emotionally Intelligent Voice Companion
 * Module: script.js
 * Frontend Controller implementing:
 * - Module A: Self-Awareness (Linguistic cues XAI & real-time user emotion confirmation)
 * - Module B: Self-Regulation (Interactive 4-second Box Breathing modal)
 * - Module C: Empathy & Voice (Web Speech STT with en-IN locale & SpeechSynthesis TTS)
 * - Module D: Social Skills (Say It Better in Polite, Professional, Friendly styles)
 * - Multi-turn conversational memory & Session Insights
 */

document.addEventListener('DOMContentLoaded', () => {
    // Generate or retrieve session ID for multi-turn conversational context
    let sessionId = sessionStorage.getItem('echo_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        sessionStorage.setItem('echo_session_id', sessionId);
    }

    // DOM Elements - Voice & Text Input
    const micBtn = document.getElementById('micBtn');
    const micStateLabel = document.getElementById('micStateLabel');
    const transcriptInput = document.getElementById('transcriptInput');
    const transcriptHint = document.getElementById('transcriptHint');
    const userTextInput = document.getElementById('userTextInput');
    const btnSend = document.getElementById('btnSend');
    const conversationStream = document.getElementById('conversationStream');
    const btnClearHistory = document.getElementById('btnClearHistory');
    const browserAlert = document.getElementById('browserAlert');
    const alertMessage = document.getElementById('alertMessage');
    const btnCloseAlert = document.getElementById('btnCloseAlert');
    const crisisBanner = document.getElementById('crisisBanner');
    const btnCloseCrisis = document.getElementById('btnCloseCrisis');

    // DOM Elements - Module A: Emotion Insight Card
    const emotionPlaceholder = document.getElementById('emotionPlaceholder');
    const activeEmotionView = document.getElementById('activeEmotionView');
    const dominantPill = document.getElementById('dominantPill');
    const emotionIconAvatar = document.getElementById('emotionIconAvatar');
    const detectedEmotionName = document.getElementById('detectedEmotionName');
    const confidenceBadge = document.getElementById('confidenceBadge');
    const emotionSummaryText = document.getElementById('emotionSummaryText');
    const cuesTagsWrap = document.getElementById('cuesTagsWrap');
    const altChipsWrap = document.getElementById('altChipsWrap');
    const distributionBars = document.getElementById('distributionBars');
    const disclaimerText = document.getElementById('disclaimerText');
    const confirmationPromptText = document.getElementById('confirmationPromptText');
    const btnFeedbackYes = document.getElementById('btnFeedbackYes');
    const btnFeedbackNo = document.getElementById('btnFeedbackNo');
    const correctionDropdownWrap = document.getElementById('correctionDropdownWrap');
    const feedbackAckText = document.getElementById('feedbackAckText');

    // DOM Elements - Module C: Empathetic Response & TTS
    const empathyText = document.getElementById('empathyText');
    const btnAudioPlay = document.getElementById('btnAudioPlay');
    const audioIcon = document.getElementById('audioIcon');
    const audioLabel = document.getElementById('audioLabel');
    const ttsWaveform = document.getElementById('ttsWaveform');
    const btnCopyResponse = document.getElementById('btnCopyResponse');

    // DOM Elements - Module B: Self-Regulation Callout & Box Breathing
    const selfRegCallout = document.getElementById('selfRegCallout');
    const btnTriggerBreathing = document.getElementById('btnTriggerBreathing');
    const btnOpenBreathing = document.getElementById('btnOpenBreathing');
    const modalBreathing = document.getElementById('modalBreathing');
    const btnCloseBreathing = document.getElementById('btnCloseBreathing');
    const breathingCircle = document.getElementById('breathingCircle');
    const breathingInstruction = document.getElementById('breathingInstruction');
    const breathingTimer = document.getElementById('breathingTimer');
    const btnStartBreathing = document.getElementById('btnStartBreathing');
    const btnStopBreathing = document.getElementById('btnStopBreathing');

    // DOM Elements - Module D: Say It Better
    const sayBetterOriginal = document.getElementById('sayBetterOriginal');
    const sayBetterSuggested = document.getElementById('sayBetterSuggested');
    const styleVersionTag = document.getElementById('styleVersionTag');
    const strategyTag = document.getElementById('strategyTag');
    const eiPrincipleText = document.getElementById('eiPrincipleText');
    const btnCopyConstructive = document.getElementById('btnCopyConstructive');
    const styleTabBtns = document.querySelectorAll('.style-tab-btn');

    // DOM Elements - Reflection Moment
    const reflectionQuestion = document.getElementById('reflectionQuestion');

    // DOM Elements - Modals
    const btnToggleStats = document.getElementById('btnToggleStats');
    const modalStats = document.getElementById('modalStats');
    const btnCloseStats = document.getElementById('btnCloseStats');
    const btnDismissStats = document.getElementById('btnDismissStats');
    const statTotalAnalyzed = document.getElementById('statTotalAnalyzed');
    const statDominantEmotion = document.getElementById('statDominantEmotion');
    const statFeedbackCount = document.getElementById('statFeedbackCount');
    const sessionBreakdownItems = document.getElementById('sessionBreakdownItems');
    const userConfirmedItems = document.getElementById('userConfirmedItems');

    const btnOpenDiagnostics = document.getElementById('btnOpenDiagnostics');
    const modalDiagnostics = document.getElementById('modalDiagnostics');
    const btnCloseDiagnostics = document.getElementById('btnCloseDiagnostics');
    const btnDismissDiagnostics = document.getElementById('btnDismissDiagnostics');

    // Emotion Color and Icon Mapping
    const EMOTION_META = {
        'sadness': { icon: '🌧️', color: '#3b82f6', name: 'Sadness' },
        'joy': { icon: '✨', color: '#f59e0b', name: 'Joy' },
        'love': { icon: '💖', color: '#ec4899', name: 'Love' },
        'anger': { icon: '🔥', color: '#ef4444', name: 'Anger' },
        'fear': { icon: '⚡', color: '#8b5cf6', name: 'Fear' },
        'surprise': { icon: '🌟', color: '#06b6d4', name: 'Surprise' }
    };

    // State Variables
    let recognition = null;
    let isRecording = false;
    let currentTtsText = "";
    let isSpeaking = false;
    let preferredVoice = null;
    let lastAnalyzedText = "";
    let lastPredictedEmotion = "";
    let activeSayBetterStyles = {};
    let breathingInterval = null;

    /* ==========================================================================
       1. WEB SPEECH API (Speech-to-Text) with en-IN Locale
       ========================================================================== */
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Default initial locale: English (India)

        recognition.onstart = () => {
            isRecording = true;
            micBtn.classList.add('recording');
            micStateLabel.textContent = "Listening (en-IN)...";
            transcriptHint.textContent = "Speech detected in real-time...";
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            const current = finalTranscript || interimTranscript;
            transcriptInput.value = current;
            userTextInput.value = current;
        };

        recognition.onerror = (event) => {
            console.warn("Speech recognition notice:", event.error);
            isRecording = false;
            micBtn.classList.remove('recording');
            micStateLabel.textContent = "Tap to speak naturally";
            transcriptHint.textContent = "Listening stopped.";

            if (event.error === 'not-allowed') {
                showAlert("Microphone permission was denied. Please allow microphone access in your browser or type your message below.", "warning");
            } else if (event.error === 'no-speech') {
                transcriptHint.textContent = "No speech detected. Tap mic to try again.";
            } else {
                showAlert(`Voice note: ${event.error}. You can also type directly in the text field.`, "info");
            }
        };

        recognition.onend = () => {
            isRecording = false;
            micBtn.classList.remove('recording');
            micStateLabel.textContent = "Tap to speak naturally";
            transcriptHint.textContent = "Ready. Edit transcript or click Send.";
        };
    } else {
        showAlert("Web Speech API is not supported in this browser. Please use Chrome, Edge, Brave, or Safari, or type your message directly.", "info");
        micBtn.title = "Voice recognition not supported in this browser. Please type.";
        micStateLabel.textContent = "Voice input unavailable";
    }

    micBtn.addEventListener('click', () => {
        if (!recognition) {
            showAlert("Speech recognition is not supported in this browser. Please use the text field below.", "info");
            userTextInput.focus();
            return;
        }

        if (isRecording) {
            recognition.stop();
        } else {
            try {
                stopTts();
                transcriptInput.value = "";
                userTextInput.value = "";
                recognition.start();
            } catch (err) {
                console.error("Speech recognition start failed:", err);
            }
        }
    });

    /* ==========================================================================
       2. SPEECH SYNTHESIS API (Text-to-Speech)
       ========================================================================== */
    function initVoices() {
        if (!('speechSynthesis' in window)) return;

        const updateVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (!voices || voices.length === 0) return;

            // Prioritize Indian English (en-IN), or natural expressive English voices
            preferredVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India') || v.name.includes('Heera') || v.name.includes('Ravi')) ||
                             voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google UK English Female') || v.name.includes('Samantha') || v.name.includes('Zira'))) ||
                             voices.find(v => v.lang.startsWith('en')) ||
                             voices[0];
        };

        updateVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }
    }
    initVoices();

    function speakText(text) {
        if (!('speechSynthesis' in window)) return;

        if (isSpeaking) {
            stopTts();
            return;
        }

        window.speechSynthesis.cancel();
        if (!text || !text.trim()) return;

        const utterance = new SpeechSynthesisUtterance(text);
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        utterance.rate = 0.95; // Gentle, empathetic cadence
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            isSpeaking = true;
            btnAudioPlay.classList.add('playing');
            audioIcon.textContent = "⏹️";
            audioLabel.textContent = "Stop";
            ttsWaveform.style.display = 'flex';
        };

        utterance.onend = () => {
            stopTts();
        };

        utterance.onerror = (e) => {
            console.warn("TTS Error:", e);
            stopTts();
        };

        window.speechSynthesis.speak(utterance);
    }

    function stopTts() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        isSpeaking = false;
        btnAudioPlay.classList.remove('playing');
        audioIcon.textContent = "🔊";
        audioLabel.textContent = "Speak";
        ttsWaveform.style.display = 'none';
    }

    btnAudioPlay.addEventListener('click', () => {
        if (isSpeaking) {
            stopTts();
        } else {
            speakText(currentTtsText || empathyText.textContent);
        }
    });

    /* ==========================================================================
       3. CONVERSATION SUBMISSION & MULTI-TURN PIPELINE
       ========================================================================== */
    async function handleMessageSubmit() {
        let text = userTextInput.value.trim();
        if (!text) {
            text = transcriptInput.value.trim();
        }

        if (!text) {
            userTextInput.focus();
            return;
        }

        if (isRecording && recognition) {
            recognition.stop();
        }

        lastAnalyzedText = text;
        appendUserMessage(text);

        userTextInput.value = "";
        transcriptInput.value = "";

        btnSend.disabled = true;
        btnSend.innerHTML = `<span>Analyzing...</span>`;

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    session_id: sessionId
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Analysis failed");
            }

            // Render all 4 EI Modules
            renderAnalysisResults(data);

            // Append ECHO's reply in the conversation stream
            appendEchoMessage(data.response, data.emotion);

            // Crisis check
            if (data.is_crisis) {
                crisisBanner.style.display = 'flex';
            }

            // Auto-speak empathetic response
            currentTtsText = data.tts_text || data.response;
            speakText(currentTtsText);

        } catch (err) {
            console.error("Submission error:", err);
            appendEchoMessage(
                `I encountered an issue analyzing the emotional cues: ${err.message}. Please check if the model is trained.`,
                null
            );
        } finally {
            btnSend.disabled = false;
            btnSend.innerHTML = `
                <span>Send</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            `;
        }
    }

    btnSend.addEventListener('click', handleMessageSubmit);
    userTextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleMessageSubmit();
        }
    });

    /* ==========================================================================
       4. UI RENDERING: THE FOUR EMOTIONAL INTELLIGENCE MODULES
       ========================================================================== */
    function renderAnalysisResults(data) {
        lastPredictedEmotion = data.emotion;
        const meta = EMOTION_META[data.emotion] || { icon: '✨', color: '#6366f1', name: data.emotion };

        emotionPlaceholder.style.display = 'none';
        activeEmotionView.style.display = 'block';

        // Dominant Header & Badge
        dominantPill.textContent = meta.name;
        dominantPill.style.backgroundColor = `${meta.color}25`;
        dominantPill.style.color = meta.color;
        dominantPill.style.border = `1px solid ${meta.color}50`;

        emotionIconAvatar.textContent = meta.icon;
        emotionIconAvatar.style.borderColor = meta.color;
        emotionIconAvatar.style.backgroundColor = `${meta.color}15`;
        detectedEmotionName.textContent = meta.name;
        detectedEmotionName.style.color = meta.color;

        confidenceBadge.textContent = `${data.confidence_percentage} Confidence`;
        confidenceBadge.style.backgroundColor = `${meta.color}20`;
        confidenceBadge.style.color = meta.color;
        confidenceBadge.style.borderColor = `${meta.color}40`;

        if (data.is_low_confidence) {
            emotionSummaryText.textContent = "Ambiguous or mixed linguistic markers detected. ECHO is clarifying rather than assuming.";
        } else {
            emotionSummaryText.textContent = `Linguistic markers align with ${meta.name.toLowerCase()} cues.`;
        }

        // Render Influential Linguistic Cues (XAI)
        cuesTagsWrap.innerHTML = '';
        if (data.linguistic_cues && data.linguistic_cues.length > 0) {
            data.linguistic_cues.forEach(cue => {
                const tag = document.createElement('span');
                tag.className = 'cue-tag';
                tag.textContent = cue;
                cuesTagsWrap.appendChild(tag);
            });
        } else {
            cuesTagsWrap.innerHTML = `<span class="text-muted" style="font-size:11px;">Sentence context cues</span>`;
        }

        // Render Top Alternatives
        altChipsWrap.innerHTML = '';
        if (data.alternatives && data.alternatives.length > 0) {
            data.alternatives.forEach(alt => {
                const chip = document.createElement('span');
                chip.className = 'alt-chip';
                chip.textContent = `${alt.display_name}: ${alt.percentage}`;
                altChipsWrap.appendChild(chip);
            });
        } else {
            altChipsWrap.innerHTML = `<span class="text-muted" style="font-size:11px;">None</span>`;
        }

        // Reset User Feedback Buttons
        feedbackAckText.style.display = 'none';
        correctionDropdownWrap.style.display = 'none';
        confirmationPromptText.textContent = data.confirmation_prompt || `Linguistic cues suggest ${meta.name}. Does that describe how you're feeling?`;

        // Render Probability Distribution Bars
        distributionBars.innerHTML = '';
        const scores = data.prediction ? data.prediction.all_scores : {};
        const sortedEntries = Object.entries(scores).sort((a, b) => b[1] - a[1]);

        sortedEntries.forEach(([emotionKey, scoreVal]) => {
            const eMeta = EMOTION_META[emotionKey] || { color: '#6366f1' };
            const row = document.createElement('div');
            row.className = 'dist-row';
            row.innerHTML = `
                <span class="dist-label">${emotionKey}</span>
                <div class="dist-bar-track">
                    <div class="dist-bar-fill" style="width: ${scoreVal}%; background-color: ${eMeta.color};"></div>
                </div>
                <span class="dist-pct">${scoreVal}%</span>
            `;
            distributionBars.appendChild(row);
        });

        // Empathetic Response (Module C)
        empathyText.textContent = data.response;

        // Module B: Self-Regulation Callout
        if (data.suggest_breathing) {
            selfRegCallout.style.display = 'block';
        } else {
            selfRegCallout.style.display = 'none';
        }

        // Module D: Say It Better
        if (data.say_it_better) {
            activeSayBetterStyles = data.say_it_better.all_styles || {};
            sayBetterOriginal.textContent = `"${data.say_it_better.original_text}"`;
            strategyTag.textContent = data.say_it_better.strategy || "Constructive Reframe";
            eiPrincipleText.textContent = data.say_it_better.ei_principle || "Focuses on constructive communication.";

            // Reset to Polite tab by default
            styleTabBtns.forEach(b => b.classList.remove('active'));
            const politeBtn = document.querySelector('.style-tab-btn[data-style="polite"]');
            if (politeBtn) politeBtn.classList.add('active');
            updateSayBetterStyle('polite');
        }

        // Reflection Moment
        if (data.reflection) {
            reflectionQuestion.textContent = data.reflection;
        }

        // Disclaimer
        if (data.disclaimer) {
            disclaimerText.textContent = data.disclaimer;
        }
    }

    /* ==========================================================================
       5. USER CONFIRMATION & FEEDBACK (MODULE A)
       ========================================================================== */
    btnFeedbackYes.addEventListener('click', async () => {
        try {
            await fetch('/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    predicted_emotion: lastPredictedEmotion,
                    user_confirmed_emotion: lastPredictedEmotion,
                    is_accurate: true
                })
            });
            feedbackAckText.textContent = "✓ Noted! Thank you for confirming.";
            feedbackAckText.style.display = 'block';
            correctionDropdownWrap.style.display = 'none';
        } catch (e) {
            console.error("Feedback error:", e);
        }
    });

    btnFeedbackNo.addEventListener('click', () => {
        correctionDropdownWrap.style.display = 'block';
    });

    document.querySelectorAll('.btn-correct-chip').forEach(btn => {
        btn.addEventListener('click', async () => {
            const chosenEmotion = btn.getAttribute('data-emotion');
            try {
                await fetch('/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: sessionId,
                        predicted_emotion: lastPredictedEmotion,
                        user_confirmed_emotion: chosenEmotion,
                        is_accurate: false
                    })
                });

                const meta = EMOTION_META[chosenEmotion];
                detectedEmotionName.textContent = `${meta.name} (User Confirmed)`;
                detectedEmotionName.style.color = meta.color;
                feedbackAckText.textContent = `✓ Updated! Registered as ${meta.name}.`;
                feedbackAckText.style.display = 'block';
                correctionDropdownWrap.style.display = 'none';
            } catch (e) {
                console.error("Correction error:", e);
            }
        });
    });

    /* ==========================================================================
       6. MODULE D: SAY IT BETTER STYLE SWITCHING
       ========================================================================== */
    styleTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            styleTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const style = btn.getAttribute('data-style');
            updateSayBetterStyle(style);
        });
    });

    function updateSayBetterStyle(style) {
        styleVersionTag.textContent = `${style.charAt(0).toUpperCase() + style.slice(1)} Style`;
        if (activeSayBetterStyles[style]) {
            sayBetterSuggested.textContent = `"${activeSayBetterStyles[style]}"`;
        }
    }

    /* ==========================================================================
       7. MODULE B: INTERACTIVE BOX BREATHING EXERCISE
       ========================================================================== */
    function openBreathingModal() {
        modalBreathing.style.display = 'flex';
        resetBreathingState();
    }

    function resetBreathingState() {
        if (breathingInterval) clearInterval(breathingInterval);
        breathingCircle.className = 'breathing-circle';
        breathingInstruction.textContent = 'Ready';
        breathingTimer.textContent = '4';
        btnStartBreathing.style.display = 'inline-flex';
        btnStopBreathing.style.display = 'none';
    }

    function startBoxBreathing() {
        btnStartBreathing.style.display = 'none';
        btnStopBreathing.style.display = 'inline-flex';

        const phases = [
            { name: 'Inhale', class: 'inhale', time: 4 },
            { name: 'Hold', class: 'hold', time: 4 },
            { name: 'Exhale', class: 'exhale', time: 4 },
            { name: 'Hold', class: 'hold-empty', time: 4 }
        ];

        let phaseIndex = 0;
        let countdown = 4;

        const updatePhase = () => {
            const p = phases[phaseIndex];
            breathingInstruction.textContent = p.name;
            breathingTimer.textContent = countdown;
            breathingCircle.className = `breathing-circle ${p.class}`;

            countdown--;
            if (countdown < 0) {
                phaseIndex = (phaseIndex + 1) % phases.length;
                countdown = 4;
            }
        };

        updatePhase();
        breathingInterval = setInterval(updatePhase, 1000);
    }

    btnOpenBreathing.addEventListener('click', openBreathingModal);
    btnTriggerBreathing.addEventListener('click', openBreathingModal);
    btnCloseBreathing.addEventListener('click', () => {
        modalBreathing.style.display = 'none';
        resetBreathingState();
    });
    btnStartBreathing.addEventListener('click', startBoxBreathing);
    btnStopBreathing.addEventListener('click', resetBreathingState);

    /* ==========================================================================
       8. CHAT STREAM BUBBLE HELPERS
       ========================================================================== */
    function appendUserMessage(text) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble user-bubble';
        bubble.innerHTML = `
            <div class="bubble-avatar">👤</div>
            <div class="bubble-body">
                <div class="bubble-sender">You</div>
                <p class="bubble-text">${escapeHtml(text)}</p>
            </div>
        `;
        conversationStream.appendChild(bubble);
        conversationStream.scrollTop = conversationStream.scrollHeight;
    }

    function appendEchoMessage(text, emotionKey) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble echo-bubble';

        let tagHtml = '';
        if (emotionKey && EMOTION_META[emotionKey]) {
            const meta = EMOTION_META[emotionKey];
            tagHtml = `<span class="emotion-tag-bubble" style="background: ${meta.color}25; color: ${meta.color}; border: 1px solid ${meta.color}50;">${meta.icon} ${meta.name}</span>`;
        }

        bubble.innerHTML = `
            <div class="bubble-avatar">✨</div>
            <div class="bubble-body">
                <div class="bubble-sender">
                    ECHO Companion
                    ${tagHtml}
                </div>
                <p class="bubble-text">${escapeHtml(text)}</p>
            </div>
        `;
        conversationStream.appendChild(bubble);
        conversationStream.scrollTop = conversationStream.scrollHeight;
    }

    /* ==========================================================================
       9. SAMPLE CHIPS INTERACTION
       ========================================================================== */
    document.querySelectorAll('.sample-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const sampleText = chip.getAttribute('data-sample');
            userTextInput.value = sampleText;
            transcriptInput.value = sampleText;
            handleMessageSubmit();
        });
    });

    /* ==========================================================================
       10. SESSION INSIGHTS MODAL
       ========================================================================== */
    btnToggleStats.addEventListener('click', async () => {
        modalStats.style.display = 'flex';
        try {
            const resp = await fetch(`/session/insights?session_id=${sessionId}`);
            const data = await resp.json();
            if (data.status === 'success') {
                const ins = data.insights;
                statTotalAnalyzed.textContent = ins.total_messages_analyzed;
                statDominantEmotion.textContent = ins.dominant_predicted_emotion !== "None" ? 
                    ins.dominant_predicted_emotion.charAt(0).toUpperCase() + ins.dominant_predicted_emotion.slice(1) : "None";
                statFeedbackCount.textContent = `${ins.feedback_count} logged`;

                // Predicted Distribution
                sessionBreakdownItems.innerHTML = '';
                for (const [em, count] of Object.entries(ins.predicted_distribution)) {
                    const meta = EMOTION_META[em];
                    const pct = ins.total_messages_analyzed > 0 ? ((count / ins.total_messages_analyzed) * 100).toFixed(0) : 0;
                    const row = document.createElement('div');
                    row.className = 'session-stat-row';
                    row.innerHTML = `
                        <span>${meta.icon} <strong>${meta.name}</strong></span>
                        <span>${count} times (${pct}%)</span>
                    `;
                    sessionBreakdownItems.appendChild(row);
                }

                // Confirmed Distribution
                userConfirmedItems.innerHTML = '';
                let hasConfirmed = false;
                for (const [em, count] of Object.entries(ins.user_confirmed_distribution)) {
                    if (count > 0) {
                        hasConfirmed = true;
                        const meta = EMOTION_META[em];
                        const row = document.createElement('div');
                        row.className = 'session-stat-row';
                        row.innerHTML = `
                            <span>${meta.icon} <strong>${meta.name}</strong></span>
                            <span>${count} confirmed</span>
                        `;
                        userConfirmedItems.appendChild(row);
                    }
                }
                if (!hasConfirmed) {
                    userConfirmedItems.innerHTML = `<p class="text-muted">No emotion corrections recorded yet in this session.</p>`;
                }
            }
        } catch (e) {
            console.error("Session insights fetch error:", e);
        }
    });

    [btnCloseStats, btnDismissStats].forEach(btn => {
        btn.addEventListener('click', () => {
            modalStats.style.display = 'none';
        });
    });

    /* ==========================================================================
       11. EVALUATION & MODEL DIAGNOSTICS MODAL
       ========================================================================== */
    btnOpenDiagnostics.addEventListener('click', () => {
        modalDiagnostics.style.display = 'flex';
    });

    [btnCloseDiagnostics, btnDismissDiagnostics].forEach(btn => {
        btn.addEventListener('click', () => {
            modalDiagnostics.style.display = 'none';
        });
    });

    const tabButtons = document.querySelectorAll('.eval-tabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = (content.id === targetId) ? 'block' : 'none';
            });
        });
    });

    /* ==========================================================================
       12. RESET / CLEAR SESSION CONTEXT
       ========================================================================== */
    btnClearHistory.addEventListener('click', async () => {
        if (confirm("Reset current conversation memory and session insights?")) {
            stopTts();
            try {
                await fetch('/session/reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sessionId })
                });
            } catch (e) {
                console.error("Session reset failed:", e);
            }

            conversationStream.innerHTML = `
                <div class="chat-bubble echo-bubble">
                    <div class="bubble-avatar">✨</div>
                    <div class="bubble-body">
                        <div class="bubble-sender">ECHO Companion</div>
                        <p class="bubble-text">
                            Session memory and context have been reset. Feel free to speak or type whenever you are ready.
                        </p>
                    </div>
                </div>
            `;

            activeEmotionView.style.display = 'none';
            emotionPlaceholder.style.display = 'block';
            dominantPill.textContent = "Awaiting Input";
            dominantPill.style = "";
            empathyText.textContent = "ECHO's empathetic response will appear here after analyzing your message.";
            crisisBanner.style.display = 'none';
        }
    });

    /* ==========================================================================
       13. UTILITIES & COPY BUTTONS
       ========================================================================== */
    btnCopyResponse.addEventListener('click', () => {
        copyToClipboard(empathyText.textContent, btnCopyResponse, "Copied!");
    });

    btnCopyConstructive.addEventListener('click', () => {
        const textToCopy = sayBetterSuggested.textContent.replace(/^"|"$/g, '');
        copyToClipboard(textToCopy, btnCopyConstructive, "Copied!");
    });

    function copyToClipboard(text, buttonElement, successLabel) {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = successLabel;
            setTimeout(() => {
                buttonElement.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error("Copy failed:", err);
        });
    }

    function showAlert(msg, type = "info") {
        alertMessage.textContent = msg;
        browserAlert.style.display = 'flex';
        if (type === "warning") {
            browserAlert.style.background = "rgba(245, 158, 11, 0.15)";
            browserAlert.style.borderColor = "rgba(245, 158, 11, 0.4)";
            browserAlert.style.color = "#fef3c7";
        }
    }

    btnCloseAlert.addEventListener('click', () => {
        browserAlert.style.display = 'none';
    });

    btnCloseCrisis.addEventListener('click', () => {
        crisisBanner.style.display = 'none';
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modalStats) modalStats.style.display = 'none';
        if (e.target === modalDiagnostics) modalDiagnostics.style.display = 'none';
        if (e.target === modalBreathing) {
            modalBreathing.style.display = 'none';
            resetBreathingState();
        }
    });

    function escapeHtml(string) {
        return String(string)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
});

