import { StepConfig } from 'motia';

export const config: StepConfig = {
    name: '03b.upload-status',
    type: 'api',
    path: '/upload-status',
    method: 'GET',
    emits: [],
    flows: ['learnlive-flow']
};

export const handler = async (req: any, { logger, state }: any) => {
    // In Motia, query parameters are in req.queryParams, not req.query
    const requestId = req.queryParams?.requestId;

    logger.info(`[03b.upload-status] Checking status for requestId: ${requestId}`);

    if (!requestId) {
        logger.info('[03b.upload-status] Missing requestId parameter');
        return {
            status: 400,
            body: {
                success: false,
                error: 'Missing requestId parameter'
            }
        };
    }

    // Check if processing is complete
    const result = await state.get('pdf-result', requestId);

    if (result) {
        logger.info(`[03b.upload-status] Processing complete for ${requestId}`);

        // Clean up state after retrieval
        await state.delete('pdf-result', requestId);

        // Unwrap data if Motia wrapped it
        const actualResult = result.data || result;

        return {
            status: 200,
            body: {
                status: 'complete',
                success: true,
                docId: actualResult.docId,
                chunkCount: actualResult.chunkCount,
                suggestedTopics: actualResult.suggestedTopics || ['General Knowledge']
            }
        };
    }

    // Still processing
    logger.info(`[03b.upload-status] Still processing for ${requestId}`);
    return {
        status: 200,
        body: {
            status: 'processing',
            message: 'PDF is being processed. Please check again shortly.'
        }
    };
};
