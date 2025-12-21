import { StepConfig, StepHandler } from 'motia';
import { Database } from '../lib/db';

export const config: StepConfig = {
    name: '07.analyze-perf',
    type: 'event',
    subscribes: ['test.completed'],
    emits: ['performance.analyzed', 'roadmap.generated'],
    flows: ['learnlive-flow']
};

export const handler = async (ctx: any) => {
    ctx.logger.info('[07.analyze-perf] Analyzing performance for student:', ctx.payload.studentId);
    const { studentId, testId, score, total, testType, topic, question } = ctx.payload;

    // 1. Calculate percentage for this test
    const percentage = total ? (score / total) * 100 : score * 10; // Oral tests are 1-10, convert to percentage
    const passed = percentage >= 70;

    // 2. Update aggregated stats
    const currentStats = await ctx.getState(`stats:${studentId}`) || {
        tests: 0,
        avgScore: 0,
        quizzesTaken: 0,
        oralTestsTaken: 0,
        topicScores: {}
    };

    const newTests = currentStats.tests + 1;
    const newAvg = ((currentStats.avgScore * currentStats.tests) + percentage) / newTests;

    // Track test types separately
    const quizzesTaken = testType === 'quiz' ? currentStats.quizzesTaken + 1 : currentStats.quizzesTaken;
    const oralTestsTaken = testType === 'oral-test' ? currentStats.oralTestsTaken + 1 : currentStats.oralTestsTaken;

    // Track topic-level performance
    const topicScores = currentStats.topicScores || {};
    const topicKey = topic || question?.substring(0, 30);
    if (topicKey) {
        topicScores[topicKey] = topicScores[topicKey] || { scores: [], count: 0 };
        topicScores[topicKey].scores.push(percentage);
        topicScores[topicKey].count++;
        topicScores[topicKey].avg = topicScores[topicKey].scores.reduce((a: number, b: number) => a + b, 0) / topicScores[topicKey].count;
    }

    await ctx.setState(`stats:${studentId}`, {
        tests: newTests,
        avgScore: newAvg,
        quizzesTaken,
        oralTestsTaken,
        topicScores
    });

    // 3. Store test in history
    const tests = await ctx.getState(`tests:${studentId}`) || [];
    tests.push({ testId, testType, topic, question, score, total, percentage, timestamp: Date.now() });
    await ctx.setState(`tests:${studentId}`, tests);

    // 4. Identify weak and strong topics
    const weakTopics = Object.entries(topicScores)
        .filter(([_, data]: [string, any]) => data.avg < 60)
        .map(([topic, _]) => topic);

    const strongTopics = Object.entries(topicScores)
        .filter(([_, data]: [string, any]) => data.avg >= 80)
        .map(([topic, _]) => topic);

    // 5. Generate personalized roadmap
    const recommendation = newAvg >= 80
        ? "Excellent work! You're ready to advance to more challenging topics."
        : newAvg >= 60
            ? `Good progress! Focus on improving: ${weakTopics.slice(0, 3).join(', ')}`
            : `Let's strengthen your foundation. Review: ${weakTopics.slice(0, 3).join(', ')}`;

    const roadmap = {
        recommendation,
        weakTopics,
        strongTopics,
        suggestedActions: [
            weakTopics.length > 0 ? `Review materials on: ${weakTopics[0]}` : 'Keep practicing',
            quizzesTaken < 3 ? 'Take more quizzes to identify patterns' : null,
            oralTestsTaken < 2 ? 'Practice oral tests to build confidence' : null
        ].filter(Boolean)
    };

    await ctx.setState(`roadmap:${studentId}`, roadmap);

    // Store notification flag directly (no need for separate step)
    await ctx.setState(`notification:${studentId}`, {
        hasNewRoadmap: true,
        lastUpdated: Date.now(),
        message: 'Your personalized learning roadmap is ready!'
    });

    // Save to database for persistence and querying
    await Database.saveAnalytics({
        studentId,
        tests: newTests,
        avgScore: newAvg,
        quizzesTaken,
        oralTestsTaken,
        topicScores
    });

    await Database.saveRoadmap({
        studentId,
        ...roadmap
    });

    // Emit analysis event
    await ctx.emit('performance.analyzed', {
        studentId,
        testId,
        passed,
        newAvg,
        weakTopics,
        strongTopics
    });

    return { processed: true, newAvg, testsAnalyzed: newTests };
};
