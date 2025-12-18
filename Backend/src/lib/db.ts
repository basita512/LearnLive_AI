
// Simple Mock Database for Demo Purposes
export const Database = {
  users: [
    { id: 'student-1', name: 'Alice', email: 'alice@example.com' },
    { id: 'student-2', name: 'Bob', email: 'bob@example.com' }
  ],
  
  tests: [] as any[],
  analytics: [] as any[],
  
  async query(sql: string, params?: any[]) {
    // Mock query execution - usually you'd use pg or prisma here
    console.log(`[DB] Executing: ${sql}`, params);
    
    if (sql.includes('SELECT id FROM students')) {
      return this.users;
    }
    
    if (sql.includes('INSERT INTO tests')) {
      const test = { id: `test-${Date.now()}`, ...params };
      this.tests.push(test);
      return [test];
    }
    
    return [];
  }
};
