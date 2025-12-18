from motia import StepConfig, StepHandler
import google.generativeai as genai
import json
import os

config = StepConfig(
    name="06.eval-answer",
    type="event",
    subscribes=["answer.submitted"],
    emits=["answer.evaluated"],
    flows=["oral-test-flow"]
)

async def handler(ctx):
    ctx.logger.info(f"[06.eval-answer] Evaluating answer for request {ctx.payload.get('requestId')}")
    data = ctx.payload
    
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    You are an oral examiner.
    Question: "{data['question']}"
    Student Answer (Transcript): "{data['transcript']}"
    
    Evaluate the answer.
    Return JSON with:
    - score (1-10)
    - feedback (short constructive feedback)
    - speakableResponse (a natural, conversational response you would say back to the student. E.g. "That was a good point about X, but consider Y.")
    """
    
    response = model.generate_content(prompt)
    text = response.text.replace("```json", "").replace("```", "").strip()
    result = json.loads(text)
    
    await ctx.emit('answer.evaluated', {
        'requestId': data['requestId'],
        'feedback': result['feedback'],
        'score': result['score'],
        'speakableResponse': result['speakableResponse']
    })
    
    return {'status': 'evaluated', 'score': result['score']}
