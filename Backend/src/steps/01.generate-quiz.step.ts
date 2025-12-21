import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '01.generate-quiz',
    type: 'api',
    path: '/generate-quiz',
    method: 'POST',
    emits: ['quiz.requested', 'rag.retrieval.requested'],
    flows: ['learnlive-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[01.generate-quiz] Started processing request:', ctx.id);
    const { studentId, topic, difficulty, numQuestions } = ctx.body;
    const requestId = ctx.id;

    // 1. Request RAG Retrieval for the topic
    ctx.logger.info(`[01.generate-quiz] Requesting RAG context for topic: ${topic}`);

    const ragRequestId = `quiz-${requestId}`;
    await ctx.emit('rag.retrieval.requested', {
        requestId: ragRequestId,
        query: topic
    });

    // 2. Wait for RAG context
    const ragResult = await ctx.waitFor('rag.retrieval.completed', {
        filter: (e: any) => e.requestId === ragRequestId,
        timeout: 15000 // 15 seconds
    });

    const context = ragResult.context || "No context available from knowledge base.";
    ctx.logger.info(`[01.generate-quiz] Retrieved context from ${ragResult.source || 'RAG'}`);

    // 3. Emit event to trigger Python AI Worker with RAG context
    await ctx.emit('quiz.requested', {
        requestId,
        studentId,
        topic,
        difficulty,
        numQuestions,
        ragContext: context,
        ragSource: ragResult.source
    });

    // 4. Durable Wait: Pause execution until Python replies
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
            contextSource: ragResult.source || 'No source',
            latency: Date.now() - ctx.startTime
        }
    };
};
