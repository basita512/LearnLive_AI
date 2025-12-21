import { StepConfig } from 'motia';

export const config: StepConfig = {
    name: '14.system-events',
    type: 'event',
    subscribes: [
        'user.created',
        'user.deleted',
        'payment.received',
        'error.occurred',
        // Workflow completion events
        'quiz.generated',
        'answer.evaluated',
        'pdf.processed',
        'pdf.chunk.processed',
        'rag.retrieval.completed',
        // Analytics & Maintenance events
        'performance.analyzed',
        'summary.generated'
    ],
    emits: [],
    flows: ['learnlive-flow']
};

export const handler = async (ctx: any) => {
    const event = ctx.payload;

    ctx.logger.info(`[14.system-events] System event captured: ${ctx.topic}`);

    // Log different event types
    switch (ctx.topic) {
        case 'user.created':
            ctx.logger.info(`[14.system-events] New user created: ${event.userId}`);
            break;
        case 'quiz.generated':
            ctx.logger.info(`[14.system-events] Quiz generated: ${event.requestId}`);
            break;
        case 'answer.evaluated':
            ctx.logger.info(`[14.system-events] Answer evaluated: ${event.requestId}, score: ${event.score}`);
            break;
        case 'pdf.processed':
            ctx.logger.info(`[14.system-events] PDF processed: ${event.docId}, chunks: ${event.chunkCount}`);
            break;
        case 'rag.retrieval.completed':
            ctx.logger.info(`[14.system-events] RAG retrieval completed: ${event.requestId}`);
            break;
        case 'performance.analyzed':
            ctx.logger.info(`[14.system-events] Performance analyzed for student: ${event.studentId}`);
            break;
        case 'summary.generated':
            ctx.logger.info(`[14.system-events] Daily summaries generated: ${event.processed} processed`);
            break;
        case 'error.occurred':
            ctx.logger.info(`[14.system-events] Error captured: ${event.message}`);
            break;
        default:
            ctx.logger.info(`[14.system-events] Unhandled event type: ${ctx.topic}`);
    }

    // In production, you'd store these in a database or send to monitoring service
    return { logged: true };
};
