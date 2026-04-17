import { StepConfig } from 'motia';

export const config: StepConfig = {
    name: '05.submit-answer',
    type: 'api',
    path: '/submit-answer',
    method: 'POST',
    emits: ['answer.submitted', 'rag.retrieval.requested'],
    flows: ['learnlive-flow']
};

export const handler = async (req: any, { logger, emit, state }: any) => {
    logger.info('[05.submit-answer] Processing answer');
    const { transcript, question, studentId } = req.body;
    const requestId = req.id;

    logger.info(`[05.submit-answer] Requesting RAG context for question: ${question}`);

    // 1. Request RAG Retrieval for the question
    const ragRequestId = `oral-${requestId}`;
    await emit({
        topic: 'rag.retrieval.requested',
        data: {
            requestId: ragRequestId,
            query: question
        }
    });

    // 2. Emit to Python AI for evaluation
    await emit({
        topic: 'answer.submitted',
        data: {
            requestId,
            studentId,
            transcript,
            question
        }
    });

    // 3. Poll state for results from Python worker
    const maxAttempts = 45; // 45 seconds max wait
    let attempts = 0;

    while (attempts < maxAttempts) {
        const result = await state.get(`answer:result:${requestId}`);
        if (result) {
            // Clean up state
            await state.delete(`answer:result:${requestId}`);

            return {
                status: 200,
                body: {
                    success: true,
                    feedback: result.feedback,
                    score: result.score,
                    speakableResponse: result.speakableResponse,
                    metadata: {
                        referenceSource: result.referenceSource || 'No source',
                        evaluatedBy: 'Gemini 1.5 Flash (Python)'
                    }
                }
            };
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
    }

    // Timeout
    return {
        status: 408,
        body: {
            success: false,
            error: 'Answer evaluation timed out'
        }
    };
};
