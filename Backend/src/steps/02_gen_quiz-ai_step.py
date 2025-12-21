import json
import os
import requests

config = {
    "type": "event",
    "name": "02.gen-quiz-ai",
    "subscribes": ["quiz.requested"],
    "emits": ["quiz.generated", "test.completed"],
    "flows": ["learnlive-flow"]
}

async def handler(ctx):
    ctx.logger.info(f"[02.gen-quiz-ai] Received quiz request {ctx.payload.get('requestId')}")
    data = ctx.payload
    
    # Configure Gemini API
    api_key = os.getenv("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    # Extract RAG context if available
    rag_context = data.get('ragContext', 'No context provided.')
    rag_source = data.get('ragSource', 'Unknown')
    
    ctx.logger.info(f"[02.gen-quiz-ai] Using RAG context from: {rag_source}")
    
    prompt = f"""
    You are an educational quiz generator. Use the following context from the knowledge base to generate relevant questions.
    
    CONTEXT FROM {rag_source}:
    {rag_context}
    
    TASK:
    Generate a {data['numQuestions']}-question quiz about {data['topic']} 
    at {data['difficulty']} level.
    
    Base your questions on the provided context above. Make sure the questions are relevant to the material.
    
    Return ONLY a JSON array of objects with keys: question, options (list of 4 options), correct_answer.
    Example: [{{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": "A"}}]
    """
    
    response = requests.post(url, json={
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    })
    
    result = response.json()
    text = result['candidates'][0]['content']['parts'][0]['text']
    
    # Simple cleanup to ensure JSON
    text = text.replace("```json", "").replace("```", "").strip()
    questions = json.loads(text)
    
    # Emit quiz generated
    await ctx.emit('quiz.generated', {
        'requestId': data['requestId'],
        'questions': questions
    })
    
    # Emit test completed for analytics (assuming quiz will be taken)
    # Note: In production, this should be emitted when student SUBMITS quiz answers
    await ctx.emit('test.completed', {
        'studentId': data.get('studentId'),
        'testId': data['requestId'],
        'testType': 'quiz',
        'topic': data['topic'],
        'difficulty': data['difficulty'],
        'totalQuestions': len(questions),
        'generatedAt': ctx.utils.dates.now().isoformat() if hasattr(ctx, 'utils') else None
    })
    
    return {'generated_count': len(questions), 'context_used': rag_source}
