import { StepConfig, StepHandler } from 'motia';
import { Database } from '../lib/db';

export const config: StepConfig = {
    name: '09.daily-summary',
    type: 'cron',
    cron: '0 20 * * *', // Daily at 8 PM
    emits: ['summary.generated'],
    flows: ['learnlive-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[Cron] Checking for daily summaries...');

    // Fetch all students from database
    const students = await Database.getAllStudents();
    ctx.logger.info(`[09.daily-summary] Processing ${students.length} students`);

    // Generate summary for each student
    for (const student of students) {
        const analytics = await Database.getAnalytics(student.id);
        if (analytics) {
            ctx.logger.info(`[09.daily-summary] Student ${student.name}: ${analytics.tests} tests, avg ${analytics.avgScore}%`);
        }
    }

    return { processed: students.length };
};
