import { StepConfig } from 'motia';

export const config: StepConfig = {
    name: '11.system-events',
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

export const handler = async (input: any, context: any) => {
    context.logger.info(`[11.system-events] Received event for: ${JSON.stringify(input).substring(0, 100)}`);

    // Log system event for monitoring
    // In production, this could write to analytics, monitoring systems, etc.

    return { logged: true };
};
