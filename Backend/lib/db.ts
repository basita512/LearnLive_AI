export class Database {
    private static data: Record<string, any[]> = {
        students: [
            { id: 'student_1', name: 'Alice', email: 'alice@example.com' },
            { id: 'student_2', name: 'Bob', email: 'bob@example.com' }
        ],
        tests: [],
        analytics_summaries: [],
        chat_history: []
    };

    static async query(sql: string, params: any[] = []): Promise<any[]> {
        // Mock query parser for demo purposes
        // In production, this would use 'pg' or similar
        console.log(`[DB] Executing: ${sql}`, params);

        const command = sql.trim().toUpperCase().split(' ')[0];

        if (command === 'SELECT') {
            if (sql.includes('students')) return this.data.students;
            if (sql.includes('tests')) return this.data.tests;
        }

        if (command === 'INSERT') {
            if (sql.includes('analytics_summaries')) {
                this.data.analytics_summaries.push(JSON.parse(params[2] || '{}'));
            }
            return [];
        }

        return [];
    }
}
