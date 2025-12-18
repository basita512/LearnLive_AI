import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '01.generate-quiz',
    type: 'api',
    path: '/generate-quiz',
    method: 'POST',
    emits: ['quiz.requested'],
    flows: ['quiz-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[01.generate-quiz] Started processing request:', ctx.id);
    const { studentId, topic, difficulty, numQuestions } = ctx.body;
    const requestId = ctx.id;

    // 1. Emit event to trigger Python AI Worker
    await ctx.emit('quiz.requested', {
        requestId,
        studentId,
        topic,
        difficulty,
        numQuestions
    });

    // 2. Durable Wait: Pause execution until Python replies
    // If server restarts, this waits indefinitely until the event arrives
    const result = await ctx.waitFor('quiz.generated', {
        filter: (e: any) => e.requestId === requestId,
        timeout: 60000 // 1 minute timeout
    });

    return {
        success: true,
        data: result.questions,
        metadata: {
            generatedBy: 'Gemini 1.5 Flash (Python)',
            orchestratedBy: 'Motia (TypeScript)',
            latency: Date.now() - ctx.startTime
        }
    };
};
