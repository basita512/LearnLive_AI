from motia import StepConfig, StepHandler
import google.generativeai as genai
import json
import os

config = StepConfig(
    name="02.gen-quiz-ai",
    type="event",
    subscribes=["quiz.requested"],
    emits=["quiz.generated"],
    flows=["quiz-flow"]
)

async def handler(ctx):
    ctx.logger.info(f"[02.gen-quiz-ai] Received quiz request {ctx.payload.get('requestId')}")
    data = ctx.payload
    
    # Configure Gemini
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    Generate a {data['numQuestions']}-question quiz about {data['topic']} 
    at {data['difficulty']} level.
    Return ONLY a JSON array of objects with keys: question, options (list), correct_answer.
    Example: [{{"question": "...", "options": ["..."], "correct_answer": "..."}}]
    """
    
    response = model.generate_content(prompt)
    
    # Simple cleanup to ensure JSON
    text = response.text.replace("```json", "").replace("```", "").strip()
    questions = json.loads(text)
    
    # Emit back to TypeScript API
    await ctx.emit('quiz.generated', {
        'requestId': data['requestId'],
        'questions': questions
    })
    
    return {'generated_count': len(questions)}
