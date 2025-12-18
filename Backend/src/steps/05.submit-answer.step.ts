import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '05.submit-answer',
    type: 'api',
    path: '/submit-answer',
    method: 'POST',
    emits: ['answer.submitted'],
    flows: ['oral-test-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[05.submit-answer] Started processing request:', ctx.id);
    // Input: Text transcript from Web Speech API (Frontend)
    const { transcript, question, studentId } = ctx.body;
    const requestId = ctx.id;

    // 1. Emit to Python AI for evaluation
    await ctx.emit('answer.submitted', {
        requestId,
        studentId,
        transcript,
        question
    });

    // 2. Durable Wait: Wait for AI evaluation
    const evaluation = await ctx.waitFor('answer.evaluated', {
        filter: (e: any) => e.requestId === requestId,
        timeout: 45000 // 45s wait
    });

    // 3. Return result to frontend
    // Frontend will use 'speakableResponse' with window.speechSynthesis
    return {
        success: true,
        feedback: evaluation.feedback,
        score: evaluation.score,
        speakableResponse: evaluation.speakableResponse
    };
};
