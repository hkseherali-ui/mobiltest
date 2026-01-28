
import React, { useState } from 'react';
import { Role } from '../types';
import { dbService } from '../db';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<Role>('STUDENT');
  const [identifier, setIdentifier] = useState(''); // schoolNo or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Added async to handle promise from dbService
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === 'TEACHER') {
      // Fix: Await the promise from getTeacher() to access its properties correctly
      const teacher = await dbService.getTeacher();
      if (identifier === teacher.username && password === teacher.passwordHash) {
        onLoginSuccess(teacher);
      } else {
        setError('Hatalı kullanıcı adı veya şifre');
      }
    } else {
      // Correctly await the student list promise
      const students = await dbService.getStudents();
      const student = students.find(s => s.schoolNo === identifier && s.passwordHash === password);
      if (student) {
        onLoginSuccess(student);
      } else {
        setError('Okul numarası veya şifre hatalı');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden border border-indigo-100">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm0 0V20" />
            </svg>
          </div>
          <h2 className="text-white text-2xl font-bold">EduExam Online</h2>
          <p className="text-indigo-100 text-sm mt-1 opacity-80">Sınav ve Analiz Portalı</p>
        </div>

        <div className="p-8">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => setRole('STUDENT')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${role === 'STUDENT' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500'}`}
            >
              Öğrenci
            </button>
            <button
              onClick={() => setRole('TEACHER')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${role === 'TEACHER' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500'}`}
            >
              Öğretmen
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                {role === 'STUDENT' ? 'Okul Numarası' : 'Kullanıcı Adı'}
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === 'STUDENT' ? 'örn: 1234' : 'örn: admin'}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Şifre
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm font-medium animate-pulse">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all mt-4"
            >
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
