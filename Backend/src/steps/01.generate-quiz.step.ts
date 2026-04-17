import { StepConfig } from 'motia';

export const config: StepConfig = {
    name: '01.generate-quiz',
    type: 'api',
    path: '/generate-quiz',
    method: 'POST',
    emits: ['quiz.requested', 'rag.retrieval.requested'],
    flows: ['learnlive-flow']
};

export const handler = async (req: any, { logger, emit, state }: any) => {
    logger.info('[01.generate-quiz] Started processing');
    const { studentId, topic, difficulty, numQuestions } = req.body;
    const requestId = req.id;

    logger.info(`[01.generate-quiz] Requesting RAG context for topic: ${topic}`);

    // 1. Request RAG Retrieval for the topic
    const ragRequestId = `quiz-${requestId}`;
    await emit({
        topic: 'rag.retrieval.requested',
        data: {
            requestId: ragRequestId,
            query: topic
        }
    });

    // 2. Emit event to trigger Python AI Worker
    await emit({
        topic: 'quiz.requested',
        data: {
            requestId,
            studentId,
            topic,
            difficulty,
            numQuestions
        }
    });

    // 3. Poll state for results (event handlers will write here)
    // In Motia, event handlers write results to state, API polls state
    const maxAttempts = 60; // 60 seconds max wait
    let attempts = 0;

    while (attempts < maxAttempts) {
        const result = await state.get(`quiz:result:${requestId}`);
        if (result) {
            // Clean up state
            await state.delete(`quiz:result:${requestId}`);

            return {
                status: 200,
                body: {
                    success: true,
                    data: result.questions,
                    metadata: {
                        generatedBy: 'Gemini 1.5 Flash (Python)',
                        orchestratedBy: 'Motia (TypeScript)',
                        contextSource: result.contextSource || 'RAG'
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
            error: 'Quiz generation timed out'
        }
    };
};
