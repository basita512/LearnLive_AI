import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '14.system-events',
    type: 'event',
    subscribes: [
        'performance.analyzed',
        'notification.sent',
        'review.scheduled',
        'report.generated',
        'summary.generated'
    ],
    emits: [],
    flows: ['analytics-flow', 'maintenance-flow']
};

export const handler = async (ctx: any) => {
    const eventName = ctx.topic;
    const payload = ctx.payload;

    ctx.logger.info(`[14.system-events] Received Event: ${eventName}`);

    switch (eventName) {
        case 'performance.analyzed':
            ctx.logger.info('-> Performance analysis completed for student:', payload.studentId);
            break;
        case 'notification.sent':
            ctx.logger.info('-> Notification cycle complete. Channel:', payload.channel);
            break;
        case 'review.scheduled':
            ctx.logger.info('-> Spaced repetition review scheduled. Count:', payload.scheduled);
            break;
        case 'report.generated':
            ctx.logger.info('-> Weekly reports generated. Count:', payload.reportsGenerated);
            break;
        case 'summary.generated':
            ctx.logger.info('-> Daily summaries processed. Count:', payload.processed);
            break;
        default:
            ctx.logger.info('-> Unhandled payload:', payload);
    }

    return { handled: true, event: eventName };
};
