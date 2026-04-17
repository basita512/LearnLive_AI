import { StepConfig } from 'motia';

export const config: StepConfig = {
    name: '03.upload-pdf',
    type: 'api',
    path: '/upload-pdf',
    method: 'POST',
    emits: ['pdf.uploaded'],
    flows: ['learnlive-flow']
};

export const handler = async (req: any, { logger, emit, state, traceId }: any) => {
    // Check if this is a chunked upload
    const { content, fileName, chunk, chunkIndex, totalChunks, requestId: clientRequestId } = req.body;

    // Use client provided requestId if available (for chunk grouping), otherwise fallback
    // Priority: Client Request ID (critical for chunks) > Motia IDs
    const requestId = clientRequestId || req.id || req.requestId || req.traceId || traceId;

    if (!requestId) {
        return {
            status: 500,
            body: { success: false, error: 'Internal error: no request ID' }
        };
    }

    // CASE 1: Chunked Upload
    if (chunk !== undefined && chunkIndex !== undefined && totalChunks !== undefined) {
        logger.info(`[03.upload-pdf] Received chunk ${chunkIndex + 1}/${totalChunks} for ${requestId}`);

        // Store the chunk
        await state.set('pdf-chunk', `${requestId}:${chunkIndex}`, { chunk });

        // If this is the last chunk, reassemble and trigger processing
        if (chunkIndex + 1 === totalChunks) {
            logger.info(`[03.upload-pdf] All ${totalChunks} chunks received. Reassembling...`);

            let fullContent = '';

            // Reassemble chunks
            for (let i = 0; i < totalChunks; i++) {
                // Try getting chunk with a simple retry for immediate consistency
                let chunkData = await state.get('pdf-chunk', `${requestId}:${i}`);

                if (!chunkData || !chunkData.chunk) {
                    await new Promise(r => setTimeout(r, 100)); // Brief wait
                    chunkData = await state.get('pdf-chunk', `${requestId}:${i}`);
                }

                if (!chunkData || !chunkData.chunk) {
                    logger.info(`[03.upload-pdf] ERROR: Missing chunk ${i} during reassembly`);
                    return {
                        status: 500,
                        body: { success: false, error: `Missing chunk ${i}` }
                    };
                }
                fullContent += chunkData.chunk;
            }

            logger.info(`[03.upload-pdf] Reassembly complete. Total size: ${fullContent.length} chars`);

            // Store full content in main state
            await state.set('pdf-upload', requestId, {
                content: fullContent,
                fileName,
                requestId
            });

            // Emit event for background processing
            await emit({
                topic: 'pdf.uploaded',
                data: { requestId, fileName }
            });

            // Clean up chunks (fire and forget to save time)
            // Ideally this would be done by a cleanup job, but simple loop works if fast enough
            // skipping explicitly to ensure invalidation doesn't race 

            return {
                status: 202,
                body: {
                    success: true,
                    requestId,
                    message: 'Upload complete. Processing started.',
                    status: 'processing'
                }
            };
        }

        // Not the last chunk
        return {
            status: 200,
            body: { success: true, message: 'Chunk received' }
        };
    }

    // CASE 2: Legacy Single Request Upload (Fallback)
    logger.info('[03.upload-pdf] Legacy single-request upload started');

    logger.info(`[03.upload-pdf] Processing full payload: ${fileName}, content length: ${content?.length || 0} chars`);

    // Check if content is too large (likely to cause ENAMETOOLONG if spawned, but we check here)
    const MAX_CONTENT_SIZE = 500000;
    if (content && content.length > MAX_CONTENT_SIZE) {
        return {
            status: 413,
            body: {
                success: false,
                error: `Content too large (${Math.round(content.length / 1000)}KB). Please use chunked upload.`
            }
        };
    }

    await state.set('pdf-upload', requestId, { content, fileName, requestId });
    await emit({ topic: 'pdf.uploaded', data: { requestId, fileName } });

    return {
        status: 202,
        body: { success: true, requestId, message: 'Processing started', status: 'processing' }
    };
};
