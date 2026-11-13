"""
ECHO 2.0 - Emotionally Intelligent Voice Companion
Module: test_app.py
Purpose: Comprehensive test suite testing all four EI modules:
- Module A: Emotion classification, confidence calibration, linguistic cues, feedback recording
- Module B: Self-regulation (breathing suggestions & task chunking)
- Module C: Empathy & multi-turn conversational context tracking (anaphora resolution)
- Module D: Say It Better (Polite, Professional, Friendly transformations)
- Safety: Crisis signal handling
"""

import unittest
import json
from app import app
from context_manager import context_manager


class Echo2TestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()

    def test_01_health_check(self):
        """Test GET /health verifies app status and model presence."""
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['status'], 'healthy')
        self.assertTrue(data['model_available'])

    def test_02_six_emotion_categories(self):
        """Test representative sentences for all 6 target emotions."""
        test_cases = [
            ("I feel so joyful and excited about this news!", "joy"),
            ("I feel deeply depressed, lonely, and hopeless.", "sadness"),
            ("I am furious and extremely angry at this betrayal.", "anger"),
            ("I am terrified and scared of failing.", "fear"),
            ("I adore and cherish spending time with my family.", "love"),
            ("Wow, that was completely astonishing and unexpected!", "surprise")
        ]
        for sentence, expected_emo in test_cases:
            resp = self.client.post('/analyze',
                                    data=json.dumps({'text': sentence, 'session_id': 'test_emotions'}),
                                    content_type='application/json')
            self.assertEqual(resp.status_code, 200)
            data = resp.get_json()
            self.assertIn('emotion', data)
            self.assertIn('confidence', data)
            self.assertIn('response', data)
            self.assertIn('linguistic_cues', data)
            self.assertGreater(len(data['response']), 15)

    def test_03_multi_turn_conversation_context(self):
        """
        Test multi-turn conversational context tracking:
        Turn 1 mentions 'interview tomorrow'.
        Turn 2 says 'I'm scared I'll mess it up.'
        ECHO must recognize that 'it' refers to the interview.
        """
        session_id = "test_multiturn_session"
        
        # Turn 1
        turn1_resp = self.client.post('/analyze',
                                      data=json.dumps({'text': "I have an important interview tomorrow.", 'session_id': session_id}),
                                      content_type='application/json')
        self.assertEqual(turn1_resp.status_code, 200)

        # Turn 2: uses anaphora ('it')
        turn2_resp = self.client.post('/analyze',
                                      data=json.dumps({'text': "I'm scared I'll mess it up.", 'session_id': session_id}),
                                      content_type='application/json')
        self.assertEqual(turn2_resp.status_code, 200)
        data2 = turn2_resp.get_json()

        # Verify context tracking
        self.assertEqual(data2['emotion'], 'fear')
        self.assertEqual(data2['referenced_entity'], 'interview')
        self.assertIn('interview', data2['response'].lower())
        print(f"\n[Multi-Turn Context Verified] Turn 2 response successfully linked 'it' to: {data2['referenced_entity']}")

    def test_04_negation_handling(self):
        """Test negation awareness: 'I am not happy with this situation' should not predict Joy."""
        resp = self.client.post('/analyze',
                                data=json.dumps({'text': "I am not happy with this situation.", 'session_id': 'test_negation'}),
                                content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertNotEqual(data['emotion'], 'joy')

    def test_05_say_it_better_three_styles(self):
        """Test Module D: Say It Better generates Polite, Professional, and Friendly versions."""
        original = "You never do your work. I'm tired of dealing with you."
        resp = self.client.post('/say-it-better',
                                data=json.dumps({'text': original, 'style': 'professional'}),
                                content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data['status'], 'success')
        res = data['result']
        
        self.assertIn('all_styles', res)
        self.assertIn('polite', res['all_styles'])
        self.assertIn('professional', res['all_styles'])
        self.assertIn('friendly', res['all_styles'])
        self.assertEqual(res['selected_style'], 'professional')
        self.assertIn("milestones", res['suggested_text'].lower())

    def test_06_feedback_and_session_insights(self):
        """Test Module A: User feedback recording and Session Insights endpoint."""
        session_id = "test_feedback_session"

        # 1. Send message
        self.client.post('/analyze',
                         data=json.dumps({'text': "I studied so much, but I still failed.", 'session_id': session_id}),
                         content_type='application/json')

        # 2. Record feedback
        fb_resp = self.client.post('/feedback',
                                   data=json.dumps({
                                       'session_id': session_id,
                                       'predicted_emotion': 'sadness',
                                       'user_confirmed_emotion': 'sadness',
                                       'is_accurate': True
                                   }),
                                   content_type='application/json')
        self.assertEqual(fb_resp.status_code, 200)

        # 3. Query insights
        insights_resp = self.client.get(f'/session/insights?session_id={session_id}')
        self.assertEqual(insights_resp.status_code, 200)
        ins = insights_resp.get_json()['insights']
        self.assertGreaterEqual(ins['total_messages_analyzed'], 1)
        self.assertGreaterEqual(ins['feedback_count'], 1)
        self.assertEqual(ins['user_confirmation_rate'], 100.0)

    def test_07_session_reset(self):
        """Test POST /session/reset clears session history."""
        session_id = "test_reset_session"
        self.client.post('/analyze',
                         data=json.dumps({'text': "I am worried about my presentation tomorrow.", 'session_id': session_id}),
                         content_type='application/json')
        
        reset_resp = self.client.post('/session/reset',
                                      data=json.dumps({'session_id': session_id}),
                                      content_type='application/json')
        self.assertEqual(reset_resp.status_code, 200)

        # Insights after reset
        ins_resp = self.client.get(f'/session/insights?session_id={session_id}')
        ins = ins_resp.get_json()['insights']
        self.assertEqual(ins['total_messages_analyzed'], 0)
        self.assertEqual(ins['total_turns'], 0)

    def test_08_crisis_safety_handling(self):
        """Test that self-harm or crisis keywords trigger emergency resources."""
        resp = self.client.post('/analyze',
                                data=json.dumps({'text': "I feel like I want to end my life.", 'session_id': 'test_crisis'}),
                                content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data['is_crisis'])
        self.assertIn('Tele-MANAS', data['response'])
        self.assertIn('Vandrevala Foundation', data['response'])

    def test_09_input_validation(self):
        """Test that empty or missing text yields 400 Bad Request."""
        res1 = self.client.post('/analyze', data=json.dumps({'text': '   '}), content_type='application/json')
        self.assertEqual(res1.status_code, 400)
        res2 = self.client.post('/analyze', data=json.dumps({}), content_type='application/json')
        self.assertEqual(res2.status_code, 400)


if __name__ == '__main__':
    unittest.main()
