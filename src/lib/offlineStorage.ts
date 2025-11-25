import localforage from 'localforage';

// Initialize storage instances
const coursesStore = localforage.createInstance({
  name: 'learnchain',
  storeName: 'courses'
});

const enrollmentsStore = localforage.createInstance({
  name: 'learnchain',
  storeName: 'enrollments'
});

const chaptersStore = localforage.createInstance({
  name: 'learnchain',
  storeName: 'chapters'
});

const quizzesStore = localforage.createInstance({
  name: 'learnchain',
  storeName: 'quizzes'
});

const pendingTransactionsStore = localforage.createInstance({
  name: 'learnchain',
  storeName: 'pendingTransactions'
});

export interface OfflineCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty?: string;
  chapters: any[];
  cached_at: number;
}

export interface PendingTransaction {
  id: string;
  type: string;
  data: any;
  created_at: number;
}

export const offlineStorage = {
  // Courses
  async saveCourse(course: OfflineCourse) {
    await coursesStore.setItem(course.id, { ...course, cached_at: Date.now() });
  },

  async getCourse(courseId: string): Promise<OfflineCourse | null> {
    return await coursesStore.getItem(courseId);
  },

  async getAllCourses(): Promise<OfflineCourse[]> {
    const courses: OfflineCourse[] = [];
    await coursesStore.iterate((value: OfflineCourse) => {
      courses.push(value);
    });
    return courses;
  },

  async removeCourse(courseId: string) {
    await coursesStore.removeItem(courseId);
  },

  // Enrollments
  async saveEnrollment(enrollment: any) {
    await enrollmentsStore.setItem(enrollment.id, enrollment);
  },

  async getEnrollment(enrollmentId: string) {
    return await enrollmentsStore.getItem(enrollmentId);
  },

  async getAllEnrollments() {
    const enrollments: any[] = [];
    await enrollmentsStore.iterate((value: any) => {
      enrollments.push(value);
    });
    return enrollments;
  },

  // Chapters
  async saveChapter(chapter: any) {
    await chaptersStore.setItem(chapter.id, chapter);
  },

  async getChapter(chapterId: string) {
    return await chaptersStore.getItem(chapterId);
  },

  // Quizzes
  async saveQuiz(quiz: any) {
    await quizzesStore.setItem(quiz.id, quiz);
  },

  async getQuiz(quizId: string) {
    return await quizzesStore.getItem(quizId);
  },

  // Pending Transactions
  async addPendingTransaction(transaction: PendingTransaction) {
    await pendingTransactionsStore.setItem(transaction.id, transaction);
  },

  async getPendingTransactions(): Promise<PendingTransaction[]> {
    const transactions: PendingTransaction[] = [];
    await pendingTransactionsStore.iterate((value: PendingTransaction) => {
      transactions.push(value);
    });
    return transactions;
  },

  async removePendingTransaction(transactionId: string) {
    await pendingTransactionsStore.removeItem(transactionId);
  },

  async clearAllPendingTransactions() {
    await pendingTransactionsStore.clear();
  },

  // Storage info
  async getStorageSize(): Promise<{ courses: number; total: number }> {
    const courses = await coursesStore.length();
    const enrollments = await enrollmentsStore.length();
    const chapters = await chaptersStore.length();
    const quizzes = await quizzesStore.length();
    const pending = await pendingTransactionsStore.length();
    
    return {
      courses,
      total: courses + enrollments + chapters + quizzes + pending
    };
  },

  async clearAll() {
    await coursesStore.clear();
    await enrollmentsStore.clear();
    await chaptersStore.clear();
    await quizzesStore.clear();
    await pendingTransactionsStore.clear();
  }
};
