import json
import os
import requests

config = {
    "type": "event",
    "name": "06.eval-answer",
    "subscribes": ["answer.submitted"],
    "emits": ["answer.evaluated", "test.completed"],
    "flows": ["learnlive-flow"]
}

async def handler(ctx):
    ctx.logger.info(f"[06.eval-answer] Evaluating answer for request {ctx.payload.get('requestId')}")
    data = ctx.payload
    
    # Configure Gemini API
    api_key = os.getenv("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    # Extract reference context if available
    reference_context = data.get('referenceContext', 'No reference material available.')
    reference_source = data.get('referenceSource', 'Unknown')
    
    ctx.logger.info(f"[06.eval-answer] Using reference from: {reference_source}")
    
    prompt = f"""
    You are an oral examiner evaluating a student's answer against reference material from their curriculum.
    
    REFERENCE MATERIAL FROM {reference_source}:
    {reference_context}
    
    QUESTION: "{data['question']}"
    STUDENT ANSWER (Transcript): "{data['transcript']}"
    
    Evaluate the student's answer by comparing it to the reference material above.
    - Award points based on accuracy and completeness relative to the reference
    - Provide constructive feedback based on what the reference material says
    
    Return JSON with:
    - score (1-10, based on how well the answer matches the reference)
    - feedback (short constructive feedback comparing to reference)
    - speakableResponse (a natural, conversational response. E.g. "Good! You mentioned X from the textbook. However, the material also emphasizes Y.")
    """
    
    response = requests.post(url, json={
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    })
    
    result = response.json()
    text = result['candidates'][0]['content']['parts'][0]['text']
    text = text.replace("```json", "").replace("```", "").strip()
    evaluation = json.loads(text)
    
    # Emit answer evaluation
    await ctx.emit('answer.evaluated', {
        'requestId': data['requestId'],
        'feedback': evaluation['feedback'],
        'score': evaluation['score'],
        'speakableResponse': evaluation['speakableResponse']
    })
    
    # Emit test completed for analytics
    await ctx.emit('test.completed', {
        'studentId': data.get('studentId'),
        'testId': data['requestId'],
        'testType': 'oral-test',
        'question': data['question'],
        'score': evaluation['score'],
        'total': 10,  # Oral tests are out of 10
        'referenceSource': reference_source
    })
    
    return {'status': 'evaluated', 'score': evaluation['score'], 'reference_used': reference_source}
