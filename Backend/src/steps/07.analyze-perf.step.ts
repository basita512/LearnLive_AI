import { StepConfig, StepHandler } from 'motia';
import { Database } from '../../lib/db';

export const config: StepConfig = {
    name: '07.analyze-perf',
    type: 'event',
    subscribes: ['test.completed'],
    emits: ['performance.analyzed', 'roadmap.generated'],
    flows: ['analytics-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[07.analyze-perf] Analyzing performance for student:', ctx.payload.studentId);
    const { studentId, testId, score, total } = ctx.payload;

    // 1. Calculate metrics
    const percentage = (score / total) * 100;
    const passed = percentage >= 70;

    // 2. Update cached analytics state (Distributed State)
    const currentStats = await ctx.getState(`stats:${studentId}`) || { tests: 0, avgScore: 0 };
    const newTests = currentStats.tests + 1;
    const newAvg = ((currentStats.avgScore * currentStats.tests) + percentage) / newTests;

    await ctx.setState(`stats:${studentId}`, {
        tests: newTests,
        avgScore: newAvg
    });

    // 3. Emit analysis event
    await ctx.emit('performance.analyzed', {
        studentId,
        testId,
        passed,
        newAvg
    });

    // 4. Generate new roadmap/recommendations based on performance
    // (In real app, this might call another AI Service)
    const recommendation = passed
        ? "Advance to Next Module"
        : "Review Module 1 & 2";

    await ctx.emit('roadmap.generated', {
        studentId,
        recommendation,
        generatedAt: Date.now()
    });

    return { processed: true, newAvg };
};
