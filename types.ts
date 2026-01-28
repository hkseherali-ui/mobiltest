
export type Role = 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  role: Role;
  name: string;
  surname: string;
  username: string;
}

export interface Student extends User {
  schoolNo: string;
  classGroup: string;
  passwordHash: string;
  createdAt: number;
}

export interface Teacher extends User {
  passwordHash: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  optionImages?: (string | null)[];
  correctAnswerIndex: number;
  imageUrl?: string;
}

export interface Exam {
  id: string;
  title: string;
  passPercentage: number;
  difficultyPoints: number;
  durationMinutes: number;
  questions: Question[];
  targetClasses: string[];
  createdAt: number;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  isPassed: boolean;
  completedAt: number;
  pointsEarned: number;
  answers?: Record<string, number>;
}
