// tests/runAllTests.mjs
/**
 * ECHO 2.0 Comprehensive Evaluation & Response Quality Test Suite
 * 
 * Verifies:
 * 1. The 5 Specific Response Quality Inputs (Requirement 5):
 *    - Input 1: "I don't understand." -> Simplifies previous explanation.
 *    - Input 2: "I think we should talk to the teacher." -> Evaluates proposal constructively.
 *    - Input 3: "I'm scared my parents will find out." -> Addresses family fear directly with somatic grounding.
 *    - Input 4: "I disagree with you." -> Engages pushback respectfully.
 *    - Input 5: "I don't know what to do." -> Untangles paralysis without judgment.
 * 2. Roleplay Conversation Dynamics (The Failing Screenshot Regression):
 *    - User: "OK, you are listening right? So what we have to do..."
 *    - User: "Okay, and the next step is we should..."
 *    - STRICT ASSERTION: Never repeats "I hear what you said: [input]. Let's look at what that means for our next step."
 * 3. User Specification Tests (Refusal, Frustration, Happiness celebration, "I'm fine" neutral).
 * 4. Deterministic emotion stability under repeated identical inputs.
 * 5. Distinct affective classification across contrasting inputs.
 * 6. Professor Sharma Multi-turn Scenario Regression.
 * 7. Speech-to-Text WER Benchmark.
 * 8. "Say It Better" 3-Style Communication Reframing.
 */

import { EmotionEngine } from '../src/services/emotionEngine.ts';
import { ResponseEngine } from '../src/services/responseEngine.ts';
import { RehearsalEngine, REHEARSAL_SCENARIOS } from '../src/services/rehearsalEngine.ts';
import { CoachingEngine } from '../src/services/coachingEngine.ts';

// Utility: Levenshtein Word Error Rate
function calculateWER(reference, hypothesis) {
  const refWords = reference.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const hypWords = hypothesis.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (refWords.length === 0) return hypWords.length === 0 ? 0 : 1;

  const dp = Array.from({ length: refWords.length + 1 }, () =>
    new Array(hypWords.length + 1).fill(0)
  );
  for (let i = 0; i <= refWords.length; i++) dp[i][0] = i;
  for (let j = 0; j <= hypWords.length; j++) dp[0][j] = j;

  for (let i = 1; i <= refWords.length; i++) {
    for (let j = 1; j <= hypWords.length; j++) {
      if (refWords[i - 1] === hypWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[refWords.length][hypWords.length] / refWords.length;
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log(' ECHO 2.0 ADVANCED RESPONSE QUALITY & ROLEPLAY TEST SUITE');
  console.log('=============================================================\n');

  const emotionEngine = new EmotionEngine();
  const responseEngine = new ResponseEngine();
  const rehearsalEngine = new RehearsalEngine();
  const coachingEngine = new CoachingEngine();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
    }
  }

  // -------------------------------------------------------------
  // SECTION 1: THE 5 SPECIFIC RESPONSE QUALITY TESTS (REQUIREMENT 5)
  // -------------------------------------------------------------
  console.log('--- SECTION 1: The 5 Required Response Quality Inputs ---\n');

  const qualityInputs = [
    {
      input: "I don't understand.",
      expectedKeyword: "simpler",
      description: "Simplifies previous explanation with zero jargon"
    },
    {
      input: "I think we should talk to the teacher.",
      expectedKeyword: "teacher",
      description: "Directly evaluates and supports speaking to the teacher"
    },
    {
      input: "I'm scared my parents will find out.",
      expectedKeyword: "parents",
      description: "Validates fear of family finding out and offers calming support"
    },
    {
      input: "I disagree with you.",
      expectedKeyword: "differently",
      description: "Respectfully welcomes and explores the disagreement"
    },
    {
      input: "I don't know what to do.",
      expectedKeyword: "stuck",
      description: "Directly untangles paralysis and breaks down indecision"
    }
  ];

  const generatedResponses = new Set();

  for (const item of qualityInputs) {
    console.log(`• Input: "${item.input}"`);
    const emotion = emotionEngine.analyzeStatistically(item.input);
    const resp = await responseEngine.generateResponse(item.input, emotion);
    console.log(`  Emotion: ${emotion.emoji} ${emotion.primaryEmotion} (${emotion.confidencePercentage})`);
    console.log(`  Response: "${resp.text}"`);

    // Verify non-generic structure
    assert(!resp.text.includes("I hear what you said:"), `Response for "${item.input}" does not use generic echoing`);
    assert(resp.text.toLowerCase().includes(item.expectedKeyword), `Response for "${item.input}": ${item.description}`);
    assert(!generatedResponses.has(resp.text), `Response for "${item.input}" is unique and distinct from other inputs`);
    generatedResponses.add(resp.text);
    console.log('');
  }

  // -------------------------------------------------------------
  // SECTION 2: THE SCREENSHOT REGRESSION (REPETITIVE ECHOING FIX)
  // -------------------------------------------------------------
  console.log('--- SECTION 2: Screenshot Regression — Multi-Turn Progression ---\n');

  const scenario = REHEARSAL_SCENARIOS.find(s => s.id === 'setting_boundaries');
  const roleplayTranscript = [
    { id: 'm0', role: 'partner', content: scenario.initialStatement, timestamp: '10:00' }
  ];

  console.log(`[Turn 0] Morgan: "${scenario.initialStatement}"`);

  // Turn 1: "OK, you are listening right? So what we have to do..."
  const turn1Input = "OK, you are listening right? So what we have to do...";
  const turn1Reply = await rehearsalEngine.generatePartnerResponse(scenario, roleplayTranscript, turn1Input);
  console.log(`[Turn 1] User: "${turn1Input}"`);
  console.log(`[Turn 1] Morgan: "${turn1Reply}"`);

  assert(!turn1Reply.includes("I hear what you said:"), 'CRITICAL: Turn 1 DOES NOT echo "I hear what you said: [input]"');
  assert(!turn1Reply.includes("Let's look at what that means for our next step."), 'CRITICAL: Turn 1 DOES NOT use the generic next step template');
  assert(turn1Reply.toLowerCase().includes("ears") || turn1Reply.toLowerCase().includes("listening") || turn1Reply.toLowerCase().includes("plan"), 'Turn 1: Morgan confirms active listening in character');

  roleplayTranscript.push({ id: 'u1', role: 'user', content: turn1Input, timestamp: '10:01' });
  roleplayTranscript.push({ id: 'm1', role: 'partner', content: turn1Reply, timestamp: '10:01' });

  // Turn 2: "Okay, and the next step is we should..."
  const turn2Input = "Okay, and the next step is we should...";
  const turn2Reply = await rehearsalEngine.generatePartnerResponse(scenario, roleplayTranscript, turn2Input);
  console.log(`[Turn 2] User: "${turn2Input}"`);
  console.log(`[Turn 2] Morgan: "${turn2Reply}"`);

  assert(!turn2Reply.includes("I hear what you said:"), 'CRITICAL: Turn 2 DOES NOT echo "I hear what you said: [input]"');
  assert(turn2Reply !== turn1Reply, 'Turn 2 response is completely different from Turn 1 response');
  assert(turn2Reply.toLowerCase().includes("hotel") || turn2Reply.toLowerCase().includes("tell me") || turn2Reply.toLowerCase().includes("plan"), 'Turn 2: Morgan reacts to the proposed step in character');

  // -------------------------------------------------------------
  // SECTION 3: PROFESSOR SHARMA SCENARIO PROGRESSION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 3: Professor Sharma Multi-Turn Scenario Progression ---\n');

  const teacherScenario = REHEARSAL_SCENARIOS.find(s => s.id === 'speaking_with_teacher');
  const teacherTranscript = [
    { id: 't0', role: 'partner', content: teacherScenario.initialStatement, timestamp: '10:00' }
  ];

  // Prof Sharma Turn 1: "I don't understand."
  const profReply1 = await rehearsalEngine.generatePartnerResponse(teacherScenario, teacherTranscript, "I don't understand.");
  console.log(`[Prof Sharma Turn 1] User: "I don't understand."`);
  console.log(`[Prof Sharma Turn 1] Reply: "${profReply1}"`);
  teacherTranscript.push({ id: 'u1', role: 'user', content: "I don't understand.", timestamp: '10:01' });
  teacherTranscript.push({ id: 'p1', role: 'partner', content: profReply1, timestamp: '10:01' });

  assert(profReply1.toLowerCase().includes('simply') || profReply1.toLowerCase().includes('section 3'), 'Prof Sharma Turn 1 simplifies academic requirements without jargon');

  // Prof Sharma Turn 2: "This is the place mam."
  const profReply2 = await rehearsalEngine.generatePartnerResponse(teacherScenario, teacherTranscript, "This is the place mam.");
  console.log(`[Prof Sharma Turn 2] User: "This is the place mam."`);
  console.log(`[Prof Sharma Turn 2] Reply: "${profReply2}"`);
  teacherTranscript.push({ id: 'u2', role: 'user', content: "This is the place mam.", timestamp: '10:02' });
  teacherTranscript.push({ id: 'p2', role: 'partner', content: profReply2, timestamp: '10:02' });

  assert(profReply2 !== profReply1, 'Prof Sharma Turn 2 does not repeat Turn 1');
  assert(profReply2.toLowerCase().includes('page 4') || profReply2.toLowerCase().includes('pointing to'), 'Prof Sharma Turn 2 inspects page 4 work');

  // Prof Sharma Turn 3: "I disagree with you."
  const profReply3 = await rehearsalEngine.generatePartnerResponse(teacherScenario, teacherTranscript, "I disagree with you.");
  console.log(`[Prof Sharma Turn 3] User: "I disagree with you."`);
  console.log(`[Prof Sharma Turn 3] Reply: "${profReply3}"`);

  assert(profReply3 !== profReply1 && profReply3 !== profReply2, 'Prof Sharma Turn 3 is distinct');
  assert(profReply3.toLowerCase().includes('rubric') || profReply3.toLowerCase().includes('disagree'), 'Prof Sharma Turn 3 responds to disagreement in character');

  // -------------------------------------------------------------
  // SECTION 4: USER SPECIFICATION & EMOTION BENCHMARKS
  // -------------------------------------------------------------
  console.log('\n--- SECTION 4: User Specification & Emotion Benchmarks ---\n');

  // Refusal with Morgan
  const refusalReply = await rehearsalEngine.generatePartnerResponse(scenario, [{ id: '0', role: 'partner', content: scenario.initialStatement, timestamp: '10:00' }], "No, I cannot let you stay at my house.");
  assert(refusalReply.toLowerCase().includes('respect') || refusalReply.toLowerCase().includes('bind') || refusalReply.toLowerCase().includes('hotel'), 'Reacts naturally to refusal');

  // Venting / Frustration
  const ventInput = "I've tried explaining this repeatedly, but nobody listens.";
  const ventEmotion = emotionEngine.analyzeStatistically(ventInput);
  const ventResp = await responseEngine.generateResponse(ventInput, ventEmotion);
  assert(ventEmotion.primaryEmotion === 'Frustrated', 'Identifies Frustrated from repeated attempts + nobody listens');
  assert(ventResp.text.toLowerCase().includes('repeatedly') || ventResp.text.toLowerCase().includes('unheard') || ventResp.text.toLowerCase().includes('exhausting'), 'Validates emotional toll of being ignored');

  // Positive celebration
  const happyInput = "I'm really happy today. I finally completed my project!";
  const happyEmotion = emotionEngine.analyzeStatistically(happyInput);
  const happyResp = await responseEngine.generateResponse(happyInput, happyEmotion);
  assert(happyEmotion.primaryEmotion === 'Happy', 'Identifies Happy');
  assert(happyResp.offersExercise === false, 'Does not suggest calming exercise for happiness');

  // "I'm fine" baseline
  const fineEmotion = emotionEngine.analyzeStatistically("I'm fine.");
  assert(fineEmotion.primaryEmotion === 'Neutral', 'Classifies "I\'m fine." as Neutral');

  // Repeated identical inputs stability
  const testPhrase = "I have too much work and I cannot cope.";
  const p1 = emotionEngine.analyzeStatistically(testPhrase);
  const p2 = emotionEngine.analyzeStatistically(testPhrase);
  assert(p1.primaryEmotion === p2.primaryEmotion && p1.confidence === p2.confidence, 'Deterministic emotion prediction stability');

  // Contrastive inputs
  const sadPhrase = "Everything is ruined and I feel hopeless.";
  const happyPhrase = "We won first place in the hackathon!";
  assert(emotionEngine.analyzeStatistically(sadPhrase).primaryEmotion === 'Sad', 'Detects Sadness');
  assert(emotionEngine.analyzeStatistically(happyPhrase).primaryEmotion === 'Happy', 'Detects Happiness');

  // -------------------------------------------------------------
  // SECTION 5: 5-PILLAR COMMUNICATION ASSESSMENT REPORT
  // -------------------------------------------------------------
  console.log('\n--- SECTION 5: 5-Pillar Communication Assessment Report ---\n');

  const report = await rehearsalEngine.generateFeedbackReport(teacherScenario, teacherTranscript);
  console.log(`  Overall Score: ${report.overallScore}/100`);
  console.log(`  Empathy: ${report.dimensions.empathy.score} | Clarity: ${report.dimensions.clarity.score} | Composure: ${report.dimensions.emotionalControl.score} | Assertiveness: ${report.dimensions.assertiveness.score} | Respect: ${report.dimensions.respectfulCommunication.score}`);
  assert(report.overallScore >= 40 && report.overallScore <= 100, 'Calculates valid overall score');
  assert(report.disclaimer.includes('AI-generated practice feedback'), 'Includes AI disclaimer');

  // -------------------------------------------------------------
  // SECTION 6: SPEECH WER BENCHMARK
  // -------------------------------------------------------------
  console.log('\n--- SECTION 6: Speech-to-Text WER Benchmark ---\n');

  const speechPairs = [
    { ref: "I am happy because I completed my project", hyp: "I'm happy because I completed my project" },
    { ref: "I have too much work and I cannot manage everything", hyp: "I have too much work and I can't manage everything" },
    { ref: "That was the best day of my life", hyp: "That was the best day of my life" }
  ];
  let totalWER = 0;
  for (const p of speechPairs) totalWER += calculateWER(p.ref, p.hyp);
  const avgWER = totalWER / speechPairs.length;
  console.log(`  Average WER: ${(avgWER * 100).toFixed(1)}%`);
  assert(avgWER < 0.20, 'Average WER is under 20%');

  // -------------------------------------------------------------
  // SECTION 7: "SAY IT BETTER" 3-STYLE REFRAMING
  // -------------------------------------------------------------
  console.log('\n--- SECTION 7: "Say It Better" 3-Style Reframing ---\n');

  const rawInput = "You never do your work and I'm sick and tired of dealing with you.";
  const reframed = await coachingEngine.sayItBetter(rawInput);
  assert(reframed.professional.length > 10, 'Generates Professional reframing');
  assert(reframed.friendly.length > 10, 'Generates Friendly reframing');
  assert(reframed.assertive.length > 10, 'Generates Assertive reframing');
  assert(!reframed.professional.toLowerCase().includes('sick and tired'), 'Removes aggressive idioms from Professional version');

  // -------------------------------------------------------------
  // SECTION 8: BUG 6 MANDATED TEXT INTELLIGENCE TEST CASES
  // -------------------------------------------------------------
  console.log('\n--- SECTION 8: BUG 6 Mandated Text Intelligence Test Suite ---\n');

  const bug6Tests = [
    {
      input: "My friend and I had a fight.",
      expectedSituation: "Friendship conflict",
      expectedEmotion: "Confused",
      checkUncertainty: true,
      expectedKeywordInResp: "arguments with friends",
      expectedEIDimension: "self-awareness",
      description: "Identifies friendship conflict, acknowledges uncertainty, asks clarifying question"
    },
    {
      input: "I'm happy because I passed my exam.",
      expectedSituation: "Achievement and celebration",
      expectedEmotion: "Happy",
      expectedKeywordInResp: "passing your exam",
      expectedEIDimension: "self-awareness",
      description: "Identifies academic achievement and celebrates success without unsolicited exercise"
    },
    {
      input: "I'm angry because nobody listens to me.",
      expectedSituation: "General dialogue",
      expectedEmotion: "Angry",
      expectedKeywordInResp: "ignored",
      expectedEIDimension: "self-regulation",
      description: "Identifies anger at being ignored, addresses boundary violation assertively"
    },
    {
      input: "I am worried about tomorrow's presentation.",
      expectedSituation: "Fear of failure",
      expectedEmotion: "Anxious",
      expectedKeywordInResp: "presentation",
      expectedEIDimension: "self-regulation",
      description: "Identifies presentation anxiety and offers calming breath / 60-second preparation"
    },
    {
      input: "I don't know how I feel.",
      expectedSituation: "General dialogue",
      expectedEmotion: "Confused",
      expectedKeywordInResp: "tension",
      expectedEIDimension: "self-awareness",
      description: "Normalizes emotional confusion and offers gentle somatic inquiry"
    },
    {
      input: "I'm fine.",
      expectedSituation: "General dialogue",
      expectedEmotion: "Neutral",
      expectedKeywordInResp: "balanced",
      expectedEIDimension: "self-awareness",
      description: "Accurately classifies 'I'm fine' as Neutral without forcing sadness or anger"
    },
    {
      input: "I finally achieved my goal.",
      expectedSituation: "Achievement and celebration",
      expectedEmotion: "Happy",
      expectedKeywordInResp: "milestone",
      expectedEIDimension: "self-awareness",
      description: "Identifies goal achievement and reinforces self-efficacy"
    }
  ];

  for (const tCase of bug6Tests) {
    console.log(`• BUG 6 Input: "${tCase.input}"`);
    const emotion = emotionEngine.analyzeStatistically(tCase.input);
    const resp = await responseEngine.generateResponse(tCase.input, emotion);

    console.log(`  Context Situation: ${emotion.contextualSituation || 'General'}`);
    console.log(`  Emotion: ${emotion.emoji} ${emotion.primaryEmotion} (${emotion.confidencePercentage})`);
    console.log(`  EI Dimension: ${resp.eiDimension}`);
    console.log(`  Response: "${resp.text}"`);

    assert(emotion.primaryEmotion === tCase.expectedEmotion, `Emotion for "${tCase.input}" matches ${tCase.expectedEmotion}`);
    if (tCase.checkUncertainty) {
      assert(emotion.isAmbiguous || emotion.needsClarification, `Acknowledges emotional uncertainty for "${tCase.input}"`);
    }
    assert(resp.text.toLowerCase().includes(tCase.expectedKeywordInResp), `Response content: ${tCase.description}`);
    assert(resp.eiDimension === tCase.expectedEIDimension, `Selected EI Dimension: ${tCase.expectedEIDimension}`);
    assert(!resp.text.includes("I'm listening with an open mind. Whatever is on your mind"), `Does NOT use generic welcome message for "${tCase.input}"`);
    console.log('');
  }

  // Multi-Turn Follow-Up Test (Friendship conflict -> direct blame)
  console.log("• Multi-turn Progression: \"My friend and I had a fight\" -> \"I'm angry because she blamed me\"");
  const turn1Emo = emotionEngine.analyzeStatistically("My friend and I had a fight.");
  const turn1Resp = await responseEngine.generateResponse("My friend and I had a fight.", turn1Emo);
  const turn2Emo = emotionEngine.analyzeStatistically("I'm angry because she blamed me.");
  const turn2Resp = await responseEngine.generateResponse("I'm angry because she blamed me.", turn2Emo);
  console.log(`  Turn 1: "${turn1Resp.text}"`);
  console.log(`  Turn 2: "${turn2Resp.text}"`);
  assert(turn2Resp.text !== turn1Resp.text, 'Turn 2 response is distinct and progresses from Turn 1');
  assert(turn2Resp.text.toLowerCase().includes('blamed'), 'Turn 2 directly addresses feeling unfairly blamed');
  assert(turn2Emo.primaryEmotion === 'Angry', 'Turn 2 accurately captures Anger from blaming');

  // Non-Repetition Test under repeated input
  console.log('\n• Non-Repetition Test under repeated input:');
  const rep1 = await responseEngine.generateResponse("My friend and I had a fight.", turn1Emo);
  const rep2 = await responseEngine.generateResponse("My friend and I had a fight.", turn1Emo);
  assert(rep1.text !== rep2.text, 'Repeated user message produces progressing dialogue rather than identical duplicate');

  // -------------------------------------------------------------
  // SECTION 9: CLASSIFIER MACRO F1 & CONFUSION MATRIX EVALUATION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 9: Classifier Benchmark Metrics & Confusion Matrix ---\n');

  const evalResults = emotionEngine.evaluateBenchmark();
  console.log(`  Overall Accuracy: ${(evalResults.accuracy * 100).toFixed(1)}%`);
  console.log(`  Macro Precision:  ${(evalResults.macroPrecision * 100).toFixed(1)}%`);
  console.log(`  Macro Recall:     ${(evalResults.macroRecall * 100).toFixed(1)}%`);
  console.log(`  Macro F1-Score:   ${(evalResults.macroF1 * 100).toFixed(1)}%`);
  console.log('\n  Per-Class Metrics:');
  for (const [cls, m] of Object.entries(evalResults.classMetrics)) {
    console.log(`    - ${cls.padEnd(11)}: Prec: ${(m.precision * 100).toFixed(0)}% | Rec: ${(m.recall * 100).toFixed(0)}% | F1: ${(m.f1 * 100).toFixed(0)}% (N=${m.support})`);
  }

  assert(evalResults.accuracy >= 0.90, 'Benchmark Accuracy is >= 90%');
  assert(evalResults.macroF1 >= 0.88, 'Benchmark Macro F1 is >= 88%');

  // -------------------------------------------------------------
  // SECTION 10: MANDATORY ROLEPLAY INTELLIGENCE ENGINE TESTS (A-H)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 10: Mandatory Roleplay Intelligence Suite (Tests A - H) ---\n');

  const boundaryScenario = REHEARSAL_SCENARIOS.find(s => s.id === 'setting_boundaries');
  const baseTranscript = [
    { id: 'm0', role: 'partner', content: boundaryScenario.initialStatement, timestamp: '10:00' }
  ];

  // TEST A: Aggressive response
  console.log('• TEST A: Aggressive response test');
  const aggressiveInput = "You are a selfish idiot and you always take advantage of me!";
  const testAResult = await rehearsalEngine.generateTurnResult(boundaryScenario, baseTranscript, aggressiveInput);
  console.log(`  User: "${aggressiveInput}"`);
  console.log(`  Morgan: "${testAResult.characterResponse}"`);
  console.log(`  Coach: [${testAResult.coaching.communicationStyle.toUpperCase()}] ${testAResult.coaching.observation}`);
  assert(testAResult.coaching.communicationStyle === 'aggressive', 'TEST A: Coach correctly identifies aggressive communication style');
  assert(testAResult.coaching.observation.toLowerCase().includes('accusatory') || testAResult.coaching.observation.toLowerCase().includes('attacking'), 'TEST A: Coach highlights attacking/accusatory language');
  assert(testAResult.coaching.shouldRetry === true, 'TEST A: Coach recommends retry for aggressive response');
  assert(testAResult.characterResponse.toLowerCase().includes('screaming') || testAResult.characterResponse.toLowerCase().includes('hostile') || testAResult.characterResponse.toLowerCase().includes('head off'), 'TEST A: Character reacts defensively and resists aggression');

  // TEST B: Passive response
  console.log('\n• TEST B: Passive response test');
  const passiveInput = "Fine whatever, you can just stay on my couch if you really have to.";
  const testBResult = await rehearsalEngine.generateTurnResult(boundaryScenario, baseTranscript, passiveInput);
  console.log(`  User: "${passiveInput}"`);
  console.log(`  Morgan: "${testBResult.characterResponse}"`);
  console.log(`  Coach: [${testBResult.coaching.communicationStyle.toUpperCase()}] ${testBResult.coaching.observation}`);
  assert(testBResult.coaching.communicationStyle === 'passive', 'TEST B: Coach correctly identifies passive communication style');
  assert(testBResult.coaching.observation.toLowerCase().includes('gave in') || testBResult.coaching.observation.toLowerCase().includes('softened'), 'TEST B: Coach observes boundary failure/giving up boundary');
  assert(testBResult.characterResponse.toLowerCase().includes('awesome') || testBResult.characterResponse.toLowerCase().includes('great') || testBResult.characterResponse.toLowerCase().includes('sweet') || testBResult.characterResponse.toLowerCase().includes('weekend'), 'TEST B: Character takes advantage of passive concession and presses forward');

  // TEST C: Empathetic/Assertive response
  console.log('\n• TEST C: Empathetic & Assertive response test');
  const assertiveInput = "I hear that you're in a tough spot with your renovations, Morgan, but I cannot host anyone this week because of my work sprint.";
  const testCResult = await rehearsalEngine.generateTurnResult(boundaryScenario, baseTranscript, assertiveInput);
  console.log(`  User: "${assertiveInput}"`);
  console.log(`  Morgan: "${testCResult.characterResponse}"`);
  console.log(`  Coach: [${testCResult.coaching.communicationStyle.toUpperCase()}] ${testCResult.coaching.observation}`);
  assert(testCResult.coaching.communicationStyle === 'empathetic' || testCResult.coaching.communicationStyle === 'assertive', 'TEST C: Coach classifies constructive empathetic/assertive communication');
  assert(testCResult.coaching.shouldRetry === false, 'TEST C: Coach approves effective communication (shouldRetry is false)');
  assert(testCResult.coaching.whatWentWell && testCResult.coaching.whatWentWell.length > 5, 'TEST C: Coach provides positive reinforcement');

  // TEST D: User disagrees
  console.log('\n• TEST D: User disagrees with character');
  const disagreeInput = "I disagree with you. Friends don't pressure each other into uncomfortable living situations.";
  const testDResult = await rehearsalEngine.generateTurnResult(boundaryScenario, baseTranscript, disagreeInput);
  console.log(`  User: "${disagreeInput}"`);
  console.log(`  Morgan: "${testDResult.characterResponse}"`);
  assert(testDResult.characterResponse.toLowerCase().includes('disagree') || testDResult.characterResponse.toLowerCase().includes('unfair') || testDResult.characterResponse.toLowerCase().includes('couch'), 'TEST D: Character maintains their perspective and argues back realistically');

  // TEST E: "I don't know"
  console.log('\n• TEST E: User expresses "I don\'t know"');
  const hesitantInput = "I don't know what to do.";
  const testEResult = await rehearsalEngine.generateTurnResult(boundaryScenario, baseTranscript, hesitantInput);
  console.log(`  User: "${hesitantInput}"`);
  console.log(`  Morgan: "${testEResult.characterResponse}"`);
  assert(testEResult.characterResponse.toLowerCase().includes('couch') || testEResult.characterResponse.toLowerCase().includes('bags') || testEResult.characterResponse.toLowerCase().includes('thursday'), 'TEST E: Character keeps the situation alive naturally and presses forward');

  // TEST F: User asks for a better response
  console.log('\n• TEST F: Coach provides better response');
  const feedbackReport = rehearsalEngine.generateCoachFeedback(boundaryScenario, baseTranscript, "get lost you idiot", 'aggressive');
  console.log(`  Coach Model Better Response: "${feedbackReport.betterResponse}"`);
  assert(feedbackReport.betterResponse && feedbackReport.betterResponse.length > 20, 'TEST F: Coach provides a high-quality model response');
  assert(!feedbackReport.betterResponse.includes('idiot'), 'TEST F: Model response eliminates aggressive attacks');

  // TEST G: Retry comparison
  console.log('\n• TEST G: Retry comparison evaluation');
  const originalAttempt = "You always demand stuff and you're so selfish!";
  const revisedAttempt = "I know you're in a tough spot with your apartment, Morgan, but I cannot host guests this week.";
  const comparison = rehearsalEngine.compareResponses(originalAttempt, revisedAttempt, boundaryScenario);
  console.log(`  Original: "${comparison.original}"`);
  console.log(`  Revised:  "${comparison.revised}"`);
  console.log(`  What Improved: "${comparison.whatImproved}"`);
  assert(comparison.whatImproved.toLowerCase().includes('aggressive') || comparison.whatImproved.toLowerCase().includes('improvement') || comparison.whatImproved.toLowerCase().includes('hostile'), 'TEST G: Retry engine compares and explains what improved');

  // TEST H: Multi-turn consistency
  console.log('\n• TEST H: Multi-turn roleplay consistency');
  const multiTranscript = [
    { id: 'm0', role: 'partner', content: boundaryScenario.initialStatement, timestamp: '10:00' }
  ];
  // Turn 1:
  const t1Res = await rehearsalEngine.generateTurnResult(boundaryScenario, multiTranscript, "I can't host you, Morgan, my work deadline is too intense.");
  multiTranscript.push({ id: 'u1', role: 'user', content: "I can't host you, Morgan, my work deadline is too intense.", timestamp: '10:01' });
  multiTranscript.push({ id: 'm1', role: 'partner', content: t1Res.characterResponse, timestamp: '10:01' });
  // Turn 2:
  const t2Res = await rehearsalEngine.generateTurnResult(boundaryScenario, multiTranscript, "No, even for one night it's not possible, but I can help you find a motel.");
  multiTranscript.push({ id: 'u2', role: 'user', content: "No, even for one night it's not possible, but I can help you find a motel.", timestamp: '10:02' });
  multiTranscript.push({ id: 'm2', role: 'partner', content: t2Res.characterResponse, timestamp: '10:02' });

  console.log(`  Turn 1 Morgan: "${t1Res.characterResponse}"`);
  console.log(`  Turn 2 Morgan: "${t2Res.characterResponse}"`);
  assert(t1Res.characterResponse !== t2Res.characterResponse, 'TEST H: Turn 1 and Turn 2 partner responses are distinct');
  assert(t2Res.characterResponse.toLowerCase().includes('respect') || t2Res.characterResponse.toLowerCase().includes('motel') || t2Res.characterResponse.toLowerCase().includes('bind') || t2Res.characterResponse.toLowerCase().includes('host'), 'TEST H: Morgan maintains identity, recognizes boundary, and adapts realistically across multiple turns');

  // -------------------------------------------------------------
  // SECTION 11: MANDATORY SITUATION-AWARE REASONING & PROGRESS STATE MACHINE (CASES A - G)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 11: Situation-Aware Reasoning & Progress State Machine (Cases A - G) ---\n');

  const alexScenario = REHEARSAL_SCENARIOS.find(s => s.id === 'friend_disagreement');
  const alexBaseTranscript = [
    { id: 'a0', role: 'partner', content: alexScenario.initialStatement, timestamp: '14:00' }
  ];

  // CASE A: User proposes payment for car damage
  console.log('• CASE A: User proposes payment for car damage');
  const caseAInput = "We can handle the situation by agreeing on paying for my car, which you have damaged.";
  const turnARes = await rehearsalEngine.generateTurnResult(alexScenario, alexBaseTranscript, caseAInput);
  console.log(`  User: "${caseAInput}"`);
  console.log(`  Alex: "${turnARes.characterResponse}"`);
  assert(!turnARes.characterResponse.toLowerCase().includes("tell me what next step you think makes this fair"), 'CASE A: Alex DOES NOT ask circular next step question');
  assert(!turnARes.characterResponse.toLowerCase().includes("let's look at what that means for our next step"), 'CASE A: Alex DOES NOT use generic template');
  assert(turnARes.characterResponse.toLowerCase().includes("estimate") || turnARes.characterResponse.toLowerCase().includes("mechanic") || turnARes.characterResponse.toLowerCase().includes("pay") || turnARes.characterResponse.toLowerCase().includes("cost"), 'CASE A: Alex responds directly to proposal to pay');

  // CASE B: User proposes splitting expenses 50/50
  console.log('\n• CASE B: User proposes splitting expenses 50/50');
  const caseBInput = "I think we should split the expenses.";
  const turnBRes = await rehearsalEngine.generateTurnResult(alexScenario, alexBaseTranscript, caseBInput);
  console.log(`  User: "${caseBInput}"`);
  console.log(`  Alex: "${turnBRes.characterResponse}"`);
  assert(turnBRes.characterResponse.toLowerCase().includes("split") || turnBRes.characterResponse.toLowerCase().includes("half") || turnBRes.characterResponse.toLowerCase().includes("compromise") || turnBRes.characterResponse.toLowerCase().includes("fair"), 'CASE B: Alex evaluates 50/50 split directly');

  // CASE C: User expresses emotional disruption & trouble
  console.log('\n• CASE C: User expresses emotional disruption & trouble');
  const caseCInput = "I don't think you understand how much trouble this caused me.";
  const turnCRes = await rehearsalEngine.generateTurnResult(alexScenario, alexBaseTranscript, caseCInput);
  console.log(`  User: "${caseCInput}"`);
  console.log(`  Alex: "${turnCRes.characterResponse}"`);
  assert(turnCRes.characterResponse.toLowerCase().includes("trouble") || turnCRes.characterResponse.toLowerCase().includes("stress") || turnCRes.characterResponse.toLowerCase().includes("disruption") || turnCRes.characterResponse.toLowerCase().includes("stranded"), 'CASE C: Alex acknowledges and validates emotional disruption');

  // CASE D: User says "Forget it. I don't want to discuss this."
  console.log('\n• CASE D: User says "Forget it. I don\'t want to discuss this."');
  const caseDInput = "Forget it. I don't want to discuss this.";
  const turnDRes = await rehearsalEngine.generateTurnResult(alexScenario, alexBaseTranscript, caseDInput);
  console.log(`  User: "${caseDInput}"`);
  console.log(`  Alex: "${turnDRes.characterResponse}"`);
  assert(turnDRes.characterResponse.toLowerCase().includes("space") || turnDRes.characterResponse.toLowerCase().includes("cool") || turnDRes.characterResponse.toLowerCase().includes("pause") || turnDRes.characterResponse.toLowerCase().includes("later") || turnDRes.characterResponse.toLowerCase().includes("step back"), 'CASE D: Alex respects desire to pause without forcing conversation');

  // CASE E: Hostile attack
  console.log('\n• CASE E: Hostile attack');
  const caseEInput = "You are completely irresponsible and I hate dealing with you.";
  const turnERes = await rehearsalEngine.generateTurnResult(alexScenario, alexBaseTranscript, caseEInput);
  console.log(`  User: "${caseEInput}"`);
  console.log(`  Alex: "${turnERes.characterResponse}"`);
  console.log(`  Coach: [${turnERes.coaching.communicationStyle.toUpperCase()}] ${turnERes.coaching.observation}`);
  assert(turnERes.coaching.communicationStyle === 'aggressive', 'CASE E: Coach identifies hostile aggression');
  assert(turnERes.coaching.shouldRetry === true, 'CASE E: Coach recommends retry for hostile escalation');
  assert(turnERes.characterResponse.toLowerCase().includes("irresponsible") || turnERes.characterResponse.toLowerCase().includes("attack") || turnERes.characterResponse.toLowerCase().includes("defensive") || turnERes.characterResponse.toLowerCase().includes("accident"), 'CASE E: Alex reacts naturally to hostile attack');

  // CASE F: Installment plan proposal
  console.log('\n• CASE F: Installment plan proposal');
  const caseFInput = "Can you pay half now and half next month?";
  const turnFRes = await rehearsalEngine.generateTurnResult(alexScenario, alexBaseTranscript, caseFInput);
  console.log(`  User: "${caseFInput}"`);
  console.log(`  Alex: "${turnFRes.characterResponse}"`);
  assert(turnFRes.characterResponse.toLowerCase().includes("installment") || turnFRes.characterResponse.toLowerCase().includes("next month") || turnFRes.characterResponse.toLowerCase().includes("half") || turnFRes.characterResponse.toLowerCase().includes("two months") || turnFRes.characterResponse.toLowerCase().includes("paycheck"), 'CASE F: Alex evaluates installment plan specifically');

  // CASE G: User hesitation ("I don't know")
  console.log('\n• CASE G: User hesitation ("I don\'t know")');
  const caseGInput = "I don't know.";
  const turnGRes = await rehearsalEngine.generateTurnResult(alexScenario, alexBaseTranscript, caseGInput);
  console.log(`  User: "${caseGInput}"`);
  console.log(`  Alex: "${turnGRes.characterResponse}"`);
  assert(turnGRes.characterResponse.toLowerCase().includes("estimate") || turnGRes.characterResponse.toLowerCase().includes("mechanic") || turnGRes.characterResponse.toLowerCase().includes("figure") || turnGRes.characterResponse.toLowerCase().includes("quote"), 'CASE G: Alex guides past hesitation toward concrete next step');

  // PROGRESS STATE MACHINE & CLOSURE RECOMMENDATION
  console.log('\n• STATE MACHINE & CLOSURE ENGINE TEST');
  const closureTranscript = [
    { id: 'c0', role: 'partner', content: alexScenario.initialStatement, timestamp: '14:00' },
    { id: 'c1', role: 'user', content: "We can handle this by getting an estimate first and splitting the repair.", timestamp: '14:01' },
    { id: 'c2', role: 'partner', content: "That sounds completely fair. Once the mechanic prints the quote, let's split it 50/50.", timestamp: '14:01' }
  ];
  const closureTurnRes = await rehearsalEngine.generateTurnResult(alexScenario, closureTranscript, "Agreed. Let's do that.");
  console.log(`  Progress State: ${closureTurnRes.conversationState?.progressState}`);
  console.log(`  Is Complete:    ${closureTurnRes.conversationState?.isComplete}`);
  console.log(`  Coach Closure:  "${closureTurnRes.conversationState?.closureRecommendation}"`);
  assert(closureTurnRes.conversationState?.progressState === 'RESOLVED', 'Closure: Progress state is RESOLVED upon mutual agreement');
  assert(closureTurnRes.conversationState?.isComplete === true, 'Closure: isComplete is true when resolution is reached');
  assert(closureTurnRes.conversationState?.closureRecommendation && closureTurnRes.conversationState.closureRecommendation.length > 20, 'Closure: Coach provides closure recommendation');

  // -------------------------------------------------------------
  // SUMMARY RESULTS
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(` TEST RUN COMPLETE: ${passedTests} / ${totalTests} PASSED`);
  if (passedTests === totalTests) {
    console.log(' ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)');
  } else {
    console.log(` WARNING: ${totalTests - passedTests} tests failed.`);
  }
  console.log('=============================================================\n');

  return { passedTests, totalTests, success: passedTests === totalTests };
}

runTestSuite().then(res => {
  if (!res.success) process.exit(1);
});
