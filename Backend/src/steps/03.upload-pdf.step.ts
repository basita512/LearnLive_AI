import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '03.upload-pdf',
    type: 'api',
    path: '/upload-pdf',
    method: 'POST',
    // streaming: true handled by ctx.stream()
    emits: ['pdf.uploaded'],
    flows: ['rag-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[03.upload-pdf] Started processing request:', ctx.id);
    const { fileName, fileContent } = ctx.body; // In real app, handle multipart/form-data
    const requestId = ctx.id;

    ctx.stream('Initializing upload...');

    // 1. Emit emit to Python RAG service
    ctx.stream('Sending to Python RAG Service...');
    await ctx.emit('pdf.uploaded', {
        requestId,
        fileName,
        content: fileContent // Passing raw content for demo (use S3 URL in prod)
    });

    // 2. Listen for progress updates from Python
    // This shows how we can stream real-time logs from backend to frontend
    let chunksProcessed = 0;
    const onChunk = (data: any) => {
        if (data.requestId === requestId) {
            chunksProcessed++;
            ctx.stream(`Processed chunk ${chunksProcessed}...`);
        }
    };

    // Note: Motia's event system allows subscribing dynamically or we just wait for final
    // For this demo, let's just wait for the final result while streaming generic updates
    ctx.stream('RAG Processing started...');

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
