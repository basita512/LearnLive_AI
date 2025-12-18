import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '11.weekly-report',
    type: 'cron',
    cron: '0 9 * * 1', // Every Monday at 9 AM
    emits: ['report.generated'],
    flows: ['maintenance-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[11.weekly-report] Generating weekly reports');
    ctx.logger.info('[Cron] Generating weekly progress reports...');
    return { reportsGenerated: 10 };
};
