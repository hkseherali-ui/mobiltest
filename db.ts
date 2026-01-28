import { Student, Teacher, Exam, ExamResult, Question } from './types';
import { db } from './firebase'; 
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

const DEFAULT_TEACHER: Teacher = {
  id: 'teacher-1', role: 'TEACHER', name: 'Admin', surname: 'Öğretmen', username: 'admin', passwordHash: 'admin123'
};

export const dbService = {
  initialize: () => { console.log("Firebase Aktif"); },
  getTeacher: async () => DEFAULT_TEACHER,
  getStudents: async (): Promise<Student[]> => {
    const snap = await getDocs(collection(db, "students"));
    return snap.docs.map(d => d.data() as Student);
  },
  getExams: async (): Promise<Exam[]> => {
    const snap = await getDocs(collection(db, "exams"));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Exam));
  },
  getResults: async (): Promise<ExamResult[]> => {
    const snap = await getDocs(collection(db, "results"));
    return snap.docs.map(d => d.data() as ExamResult);
  },
  // HATA VEREN EKSİK FONKSİYON BURADA:
  getQuestionPool: async (): Promise<Question[]> => {
    const snap = await getDocs(collection(db, "questionPool"));
    return snap.docs.map(d => d.data() as Question);
  },
  saveStudent: async (s: Student) => { await setDoc(doc(db, "students", s.schoolNo), s); },
  saveExam: async (exam: Exam) => { await addDoc(collection(db, "exams"), exam); },
  saveResult: async (res: ExamResult) => { await addDoc(collection(db, "results"), res); },
  deleteExam: async (id: string) => { await deleteDoc(doc(db, "exams", id)); }
};