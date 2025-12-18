import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '08.notify-users',
    type: 'event',
    subscribes: ['roadmap.generated'],
    emits: ['notification.sent'],
    flows: ['analytics-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[08.notify-users] Notification requested for:', ctx.payload.studentId);
    const { studentId, recommendation } = ctx.payload;

    ctx.logger.info(`[Notification] Sending email to ${studentId}: New Roadmap Ready!`);
    ctx.logger.info(`Content: ${recommendation}`);

    // Simulate email sending
    await new Promise(r => setTimeout(r, 500));

    await ctx.emit('notification.sent', {
        studentId,
        channel: 'email',
        status: 'sent'
    });

    return { sent: true };
};
