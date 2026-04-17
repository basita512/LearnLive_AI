import os
import json

config = {
    "type": "event",
    "name": "06.eval-answer",
    "subscribes": ["answer.submitted"],
    "emits": ["answer.evaluated", "test.completed"],
    "flows": ["learnlive-flow"]
}

async def handler(input_data, context):
    context.logger.info(f"[06.eval-answer] Evaluating answer for request {input_data.get('requestId')}")
    
    # Configure Gemini API
    api_key = os.getenv("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    # Extract reference context if available
    reference_context = input_data.get('referenceContext', 'No reference material available.')
    reference_source = input_data.get('referenceSource', 'Unknown')
    
    context.logger.info(f"[06.eval-answer] Using reference from: {reference_source}")
    
    prompt = f"""
    You are an oral examiner evaluating a student's answer against reference material from their curriculum.
    
    REFERENCE MATERIAL FROM {reference_source}:
    {reference_context}
    
    QUESTION: {input_data['question']}
    STUDENT'S ANSWER: {input_data['userAnswer']}
    
    Evaluate the answer based on accuracy, completeness, and clarity.
    
    Return ONLY a JSON object with keys: score (0-10), feedback (brief text), speakableResponse (natural oral feedback).
    Example: {{"score": 8, "feedback": "Good explanation, but missed point X.", "speakableResponse": "Well done! You covered the main concepts..."}}
    """
    
    import requests
    response = requests.post(url, json={
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    })
    
    result = response.json()
    text = result['candidates'][0]['content']['parts'][0]['text']
    
    # Cleanup
    text = text.replace("```json", "").replace("```", "").strip()
    evaluation = json.loads(text)
    
    request_id = input_data.get('requestId')
    
    # Write to state for API polling
    await context.state.set('answer-result', request_id, {
        'feedback': evaluation.get('feedback', ''),
        'score': evaluation.get('score', 0),
        'speakableResponse': evaluation.get('speakableResponse', '')
    })
    
    # Emit events
    await context.emit({
        'topic': 'answer.evaluated',
        'data': {
            'requestId': request_id,
            'score': evaluation['score'],
            'feedback': evaluation['feedback']
        }
    })
    
    # Emit test completed for analytics
    await context.emit({
        'topic': 'test.completed',
        'data': {
            'studentId': input_data.get('studentId'),
            'testId': request_id,
            'testType': 'oral',
            'question': input_data.get('question'),
            'score': evaluation['score'],
            'total': 10
        }
    })
    
    return {'evaluated': True, 'score': evaluation['score']}
