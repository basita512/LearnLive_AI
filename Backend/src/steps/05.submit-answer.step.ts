import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '05.submit-answer',
    type: 'api',
    path: '/submit-answer',
    method: 'POST',
    emits: ['answer.submitted', 'rag.retrieval.requested'],
    flows: ['learnlive-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[05.submit-answer] Started processing request:', ctx.id);
    const { transcript, question, studentId } = ctx.body;
    const requestId = ctx.id;

    // 1. Request RAG Retrieval for the question
    ctx.logger.info(`[05.submit-answer] Requesting RAG context for question: ${question}`);

    const ragRequestId = `oral-${requestId}`;
    await ctx.emit('rag.retrieval.requested', {
        requestId: ragRequestId,
        query: question
    });

    // 2. Wait for RAG context (reference answer from PDF)
    const ragResult = await ctx.waitFor('rag.retrieval.completed', {
        filter: (e: any) => e.requestId === ragRequestId,
        timeout: 15000 // 15 seconds
    });

    const referenceContext = ragResult.context || "No reference material found.";
    ctx.logger.info(`[05.submit-answer] Retrieved reference from ${ragResult.source || 'RAG'}`);

    // 3. Emit to Python AI for evaluation with RAG context
    await ctx.emit('answer.submitted', {
        requestId,
        studentId,
        transcript,
        question,
        referenceContext: referenceContext,
        referenceSource: ragResult.source
    });

    // 4. Durable Wait: Wait for AI evaluation
    const evaluation = await ctx.waitFor('answer.evaluated', {
        filter: (e: any) => e.requestId === requestId,
        timeout: 45000 // 45s wait
    });

    // 5. Return result to frontend
    return {
        success: true,
        feedback: evaluation.feedback,
        score: evaluation.score,
        speakableResponse: evaluation.speakableResponse,
        metadata: {
            referenceSource: ragResult.source || 'No source',
            evaluatedBy: 'Gemini 1.5 Flash (Python)'
        }
    };
};
