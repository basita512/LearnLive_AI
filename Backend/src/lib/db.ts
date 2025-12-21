
// Enhanced Mock Database for Demo Purposes
// In production, replace with Prisma, Drizzle, or pg
export const Database = {
  // In-memory storage (simulates database tables)
  students: [
    { id: 'student-1', name: 'Alice', email: 'alice@example.com', createdAt: new Date() },
    { id: 'student-2', name: 'Bob', email: 'bob@example.com', createdAt: new Date() }
  ] as any[],

  tests: [] as any[],
  analytics: [] as any[],
  roadmaps: [] as any[],

  // ========== STUDENT CRUD ==========
  async getStudent(studentId: string) {
    return this.students.find(s => s.id === studentId);
  },

  async getAllStudents() {
    return this.students;
  },

  async createStudent(student: any) {
    const newStudent = { id: `student-${Date.now()}`, createdAt: new Date(), ...student };
    this.students.push(newStudent);
    return newStudent;
  },

  // ========== TEST CRUD ==========
  async createTest(test: any) {
    const newTest = {
      id: `test-${Date.now()}`,
      createdAt: new Date(),
      ...test
    };
    this.tests.push(newTest);
    return newTest;
  },

  async getTestsByStudent(studentId: string) {
    return this.tests.filter(t => t.studentId === studentId);
  },

  async getRecentTests(studentId: string, limit: number = 10) {
    return this.tests
      .filter(t => t.studentId === studentId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },

  // ========== ANALYTICS CRUD ==========
  async saveAnalytics(analytics: any) {
    const existing = this.analytics.findIndex(a => a.studentId === analytics.studentId);
    if (existing >= 0) {
      this.analytics[existing] = { ...this.analytics[existing], ...analytics, updatedAt: new Date() };
      return this.analytics[existing];
    } else {
      const newAnalytics = { id: `analytics-${Date.now()}`, createdAt: new Date(), ...analytics };
      this.analytics.push(newAnalytics);
      return newAnalytics;
    }
  },

  async getAnalytics(studentId: string) {
    return this.analytics.find(a => a.studentId === studentId);
  },

  // ========== ROADMAP CRUD ==========
  async saveRoadmap(roadmap: any) {
    const existing = this.roadmaps.findIndex(r => r.studentId === roadmap.studentId);
    if (existing >= 0) {
      this.roadmaps[existing] = { ...roadmap, updatedAt: new Date() };
      return this.roadmaps[existing];
    } else {
      const newRoadmap = { id: `roadmap-${Date.now()}`, createdAt: new Date(), ...roadmap };
      this.roadmaps.push(newRoadmap);
      return newRoadmap;
    }
  },

  async getRoadmap(studentId: string) {
    return this.roadmaps.find(r => r.studentId === studentId);
  },

  // ========== LEGACY QUERY METHOD ==========
  async query(sql: string, params?: any[]) {
    console.log(`[DB] Executing: ${sql}`, params);

    if (sql.includes('SELECT') && sql.includes('students')) {
      return this.students;
    }

    if (sql.includes('INSERT INTO tests')) {
      return [await this.createTest(params)];
    }

    return [];
  }
};
