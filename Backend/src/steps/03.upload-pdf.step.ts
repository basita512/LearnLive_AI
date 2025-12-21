import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '03.upload-pdf',
    type: 'api',
    path: '/upload-pdf',
    method: 'POST',
    // streaming: true handled by ctx.stream()
    emits: ['pdf.uploaded'],
    flows: ['learnlive-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[03.upload-pdf] PDF upload started');
    const { content, fileName } = ctx.body;
    const requestId = ctx.id;

    // 1. Emit PDF to processing pipeline
    await ctx.emit('pdf.uploaded', {
        requestId,
        content,
        fileName
    });

    // 2. Wait for processing to complete
    const result = await ctx.waitFor('pdf.processed', {
        filter: (e: any) => e.requestId === requestId,
        timeout: 30000 // 30s timeout
    });

    ctx.stream('Indexing complete! ✓');
    ctx.stream('done'); // Signal frontend to close connection

    return {
        success: true,
        docId: result.docId,
        chunkCount: result.chunkCount
    };
};
