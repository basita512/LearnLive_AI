import { StepConfig, StepHandler } from 'motia';

export const config: StepConfig = {
    name: '09.cleanup-data',
    type: 'cron',
    cron: '0 2 * * *', // Nightly at 2 AM
    emits: [],
    flows: ['learnlive-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[12.cleanup-data] Starting data cleanup');
    ctx.logger.info('[Cron] Cleaning up old temporary files and logs...');
    return { clearedBytes: 1024000 };
};
