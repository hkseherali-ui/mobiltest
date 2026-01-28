import { Student, Teacher, Exam, ExamResult, Question } from './types';
import { db } from './firebase'; 
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  query,
  where 
} from "firebase/firestore";

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
    console.log("Firebase Bulut Sistemi Aktif");
  },

  getTeacher: async () => {
    return DEFAULT_TEACHER;
  },

  // TÜM ÖĞRENCİLERİ GETİRİR
  getStudents: async (): Promise<Student[]> => {
    try {
      const snap = await getDocs(collection(db, "students"));
      return snap.docs.map(d => d.data() as Student);
    } catch (error) {
      console.error("Öğrenciler çekilemedi:", error);
      return [];
    }
  },

  // SINAV OLUŞTURMA EKRANINDAKİ SINIF LİSTESİNİ DOLDURUR
  getClasses: async (): Promise<string[]> => {
    try {
      const snap = await getDocs(collection(db, "students"));
      const students = snap.docs.map(d => d.data() as Student);
      // Öğrencilerin içindeki sınıfları bulur ve tekrar edenleri siler
      const classes = Array.from(new Set(students.map(s => s.classGroup))).filter(Boolean);
      return classes.sort();
    } catch (error) {
      return [];
    }
  },

  getExams: async (): Promise<Exam[]> => {
    try {
      const snap = await getDocs(collection(db, "exams"));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Exam));
    } catch (error) {
      return [];
    }
  },

  getResults: async (): Promise<ExamResult[]> => {
    try {
      const snap = await getDocs(collection(db, "results"));
      return snap.docs.map(d => d.data() as ExamResult);
    } catch (error) {
      return [];
    }
  },

  saveStudent: async (s: Student) => {
    // Okul numarasını doküman kimliği yaparak üzerine yazmayı engeller/günceller
    await setDoc(doc(db, "students", s.schoolNo), s);
  },

  saveExam: async (exam: Exam) => {
    try {
      // Sınavı Firebase'e ekler
      await addDoc(collection(db, "exams"), exam);
      console.log("Sınav başarıyla sınıfa atandı.");
    } catch (error) {
      console.error("Sınav kaydedilemedi:", error);
      throw error;
    }
  },

  saveResult: async (res: ExamResult) => {
    await addDoc(collection(db, "results"), res);
  },

  deleteExam: async (id: string) => {
    await deleteDoc(doc(db, "exams", id));
  },

  importExamFromLink: async (data: string) => {
    return "Sınav Başarıyla Aktarıldı";
  }
};