
import { Student, Teacher, Exam, ExamResult, Question } from './types';

const DB_KEYS = {
  STUDENTS: 'eduexam_students',
  TEACHER: 'eduexam_teacher',
  EXAMS: 'eduexam_exams',
  RESULTS: 'eduexam_results',
  POOL: 'eduexam_pool'
};

const DEFAULT_TEACHER: Teacher = {
  id: 'teacher-1',
  role: 'TEACHER',
  name: 'Admin',
  surname: 'Öğretmen',
  username: 'admin',
  passwordHash: 'admin123'
};

export const dbService = {
  initialize: () => {
    if (!localStorage.getItem(DB_KEYS.TEACHER)) {
      localStorage.setItem(DB_KEYS.TEACHER, JSON.stringify(DEFAULT_TEACHER));
    }
    [DB_KEYS.STUDENTS, DB_KEYS.EXAMS, DB_KEYS.RESULTS, DB_KEYS.POOL].forEach(key => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([]));
    });
  },

  _get: <T>(key: string): T => JSON.parse(localStorage.getItem(key) || '[]'),
  _set: (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val)),

  getStudents: async () => dbService._get<Student[]>(DB_KEYS.STUDENTS),
  getExams: async () => dbService._get<Exam[]>(DB_KEYS.EXAMS),
  getResults: async () => dbService._get<ExamResult[]>(DB_KEYS.RESULTS),
  getQuestionPool: async () => dbService._get<Question[]>(DB_KEYS.POOL),
  getTeacher: async () => JSON.parse(localStorage.getItem(DB_KEYS.TEACHER) || JSON.stringify(DEFAULT_TEACHER)),

  saveStudent: async (s: Student) => {
    const list = dbService._get<Student[]>(DB_KEYS.STUDENTS);
    const idx = list.findIndex(item => item.schoolNo === s.schoolNo);
    if (idx >= 0) list[idx] = s; else list.push(s);
    dbService._set(DB_KEYS.STUDENTS, list);
  },

  deleteStudent: async (no: string) => {
    const list = dbService._get<Student[]>(DB_KEYS.STUDENTS).filter(s => s.schoolNo !== no);
    dbService._set(DB_KEYS.STUDENTS, list);
  },

  saveExam: async (exam: Exam) => {
    const list = dbService._get<Exam[]>(DB_KEYS.EXAMS);
    const idx = list.findIndex(e => e.id === exam.id);
    if (idx >= 0) list[idx] = exam; else list.push(exam);
    dbService._set(DB_KEYS.EXAMS, list);

    // Soruları havuza da ekle
    const pool = dbService._get<Question[]>(DB_KEYS.POOL);
    exam.questions.forEach(q => {
      if (!pool.some(pq => pq.text === q.text)) pool.push(q);
    });
    dbService._set(DB_KEYS.POOL, pool);
  },

  deleteExam: async (id: string) => {
    const list = dbService._get<Exam[]>(DB_KEYS.EXAMS).filter(e => e.id !== id);
    dbService._set(DB_KEYS.EXAMS, list);
  },

  saveResult: async (res: ExamResult) => {
    const list = dbService._get<ExamResult[]>(DB_KEYS.RESULTS);
    list.push(res);
    dbService._set(DB_KEYS.RESULTS, list);
  },

  // Fix: Implemented importExamFromLink to handle shared exam data from URL parameters
  importExamFromLink: async (data: string) => {
    try {
      // Decode the base64 encoded string from the URL and parse as Exam object
      const jsonStr = atob(data);
      const exam = JSON.parse(jsonStr) as Exam;
      await dbService.saveExam(exam);
      return exam.title;
    } catch (e) {
      console.error('Failed to import exam from link:', e);
      return null;
    }
  }
};
