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

async def handler(input_data, context):
    context.logger.info(f"[02.gen-quiz-ai] Received quiz request {input_data.get('requestId')}")
    
    # Configure Gemini API
    api_key = os.getenv("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    # Extract RAG context if available
    rag_context = input_data.get('ragContext', 'No context provided.')
    rag_source = input_data.get('ragSource', 'Unknown')
    
    context.logger.info(f"[02.gen-quiz-ai] Using RAG context from: {rag_source}")
    
    prompt = f"""
    You are an educational quiz generator. Use the following context from the knowledge base to generate relevant questions.
    
    CONTEXT FROM {rag_source}:
    {rag_context}
    
    TASK:
    Generate a {input_data['numQuestions']}-question quiz about {input_data['topic']} 
    at {input_data['difficulty']} level.
    
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
    
    # Write result to state for API to poll
    await context.state.set(f'quiz:result:{input_data["requestId"]}', {
        'questions': questions,
        'contextSource': rag_source
    })
    
    # Emit quiz generated
    await context.emit({
        'topic': 'quiz.generated',
        'data': {
            'requestId': input_data['requestId'],
            'questions': questions
        }
    })
    
    # Emit test completed for analytics
    await context.emit({
        'topic': 'test.completed',
        'data': {
            'studentId': input_data.get('studentId'),
            'testId': input_data['requestId'],
            'testType': 'quiz',
            'topic': input_data['topic'],
            'difficulty': input_data['difficulty'],
            'totalQuestions': len(questions)
        }
    })
    
    return {'generated_count': len(questions), 'context_used': rag_source}
