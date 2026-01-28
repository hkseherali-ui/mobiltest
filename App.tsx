
import React, { useState, useEffect } from 'react';
import { User, Exam, Student, ExamResult } from './types';
import { dbService } from './db';
import Login from './components/Login';
import Layout from './components/Layout';
import StudentManagement from './components/StudentManagement';
import ExamManagement from './components/ExamManagement';
import ExamSession from './components/ExamSession';
import AnalysisView from './components/AnalysisView';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'students' | 'exams' | 'reports'>('dashboard');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, exams: 0 });

  const updateStats = async () => {
    const [students, exams] = await Promise.all([
      dbService.getStudents(),
      dbService.getExams()
    ]);
    setStats({
      students: students.length,
      exams: exams.filter(e => e.status === 'ACTIVE').length
    });
  };

  useEffect(() => {
    const init = async () => {
      dbService.initialize();
      const urlParams = new URLSearchParams(window.location.search);
      const importData = urlParams.get('importExam');
      if (importData) {
        const title = await dbService.importExamFromLink(importData);
        if (title) alert(`Yeni sınav başarıyla eklendi: ${title}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      const savedUser = localStorage.getItem('eduexam_session');
      if (savedUser) setUser(JSON.parse(savedUser));
      await updateStats();
      setLoading(false);
    };
    init();
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('eduexam_session', JSON.stringify(userData));
    updateStats();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('eduexam_session');
    setView('dashboard');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-indigo-600 text-white font-black text-xs">YÜKLENİYOR...</div>;
  if (!user) return <Login onLoginSuccess={handleLoginSuccess} />;
  if (activeExam) return <ExamSession exam={activeExam} user={user} onComplete={() => { setActiveExam(null); updateStats(); }} />;

  return (
    <Layout 
      title={view === 'dashboard' ? (user.role === 'TEACHER' ? 'Öğretmen Paneli' : 'Öğrenci Portalı') : 'EduExam PRO'} 
      onLogout={handleLogout}
      showBack={view !== 'dashboard'}
      onBack={() => setView('dashboard')}
    >
      {user.role === 'TEACHER' ? (
        view === 'dashboard' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-premium relative overflow-hidden">
              <h2 className="text-2xl font-black tracking-tight">Hoş Geldiniz,</h2>
              <p className="text-indigo-100 font-bold opacity-90 mt-1 uppercase tracking-widest text-[10px]">{user.name} {user.surname}</p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20">
                  <div className="text-[10px] uppercase opacity-70 font-black tracking-widest">Öğrenciler</div>
                  <div className="text-3xl font-black mt-1">{stats.students}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20">
                  <div className="text-[10px] uppercase opacity-70 font-black tracking-widest">Sınavlar</div>
                  <div className="text-3xl font-black mt-1">{stats.exams}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => setView('students')} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center gap-5 active:scale-95 transition-all">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-2xl">👥</div>
                <div className="text-left">
                  <div className="font-black text-gray-800 text-lg uppercase">Öğrenci Yönetimi</div>
                  <div className="text-[9px] text-gray-400 font-black uppercase">Kayıt & Sınıf</div>
                </div>
              </button>
              <button onClick={() => setView('exams')} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center gap-5 active:scale-95 transition-all">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 text-2xl">📝</div>
                <div className="text-left">
                  <div className="font-black text-gray-800 text-lg uppercase">Sınav İşlemleri</div>
                  <div className="text-[9px] text-gray-400 font-black uppercase">Soru & AI Sihirbazı</div>
                </div>
              </button>
              <button onClick={() => setView('reports')} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center gap-5 active:scale-95 transition-all">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 text-2xl">📊</div>
                <div className="text-left">
                  <div className="font-black text-gray-800 text-lg uppercase">Analiz & Rapor</div>
                  <div className="text-[9px] text-gray-400 font-black uppercase">Sonuçlar & Karne</div>
                </div>
              </button>
            </div>
          </div>
        ) : view === 'students' ? <StudentManagement /> : view === 'exams' ? <ExamManagement /> : <AnalysisView />
      ) : (
        <StudentDashboard user={user} setActiveExam={setActiveExam} studentCount={stats.students} />
      )}
    </Layout>
  );
};

const StudentDashboard = ({ user, setActiveExam, studentCount }: any) => {
  const [data, setData] = useState<{ results: ExamResult[], exams: Exam[] }>({ results: [], exams: [] });

  useEffect(() => {
    const fetch = async () => {
      const [r, e] = await Promise.all([dbService.getResults(), dbService.getExams()]);
      setData({ results: r.filter(x => x.studentId === user.id), exams: e });
    };
    fetch();
  }, [user.id]);

  const totalXP = data.results.reduce((acc, r) => acc + (r.pointsEarned || 0), 0);
  const milestone = 500;
  const progressToBadge = (totalXP % milestone) / milestone * 100;
  const starsCount = Math.floor(totalXP / milestone);
  
  const getRank = (xp: number) => {
    if (xp < 500) return { title: 'Çaylak', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (xp < 1000) return { title: 'Asistan', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (xp < 1500) return { title: 'Uzman', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (xp < 2000) return { title: 'Üstat', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (xp < 2500) return { title: 'Efsane', color: 'text-rose-600', bg: 'bg-rose-100' };
    return { title: 'Şampiyon', color: 'text-amber-600', bg: 'bg-amber-100' };
  };

  const rank = getRank(totalXP);
  const availableExams = data.exams.filter(e => e.status === 'ACTIVE' && e.targetClasses.includes(user.classGroup));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-lg">
            {user.name[0]}
          </div>
          <div>
            <div className="font-black text-xl text-gray-800 uppercase leading-none">{user.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-lg font-black text-[8px] uppercase tracking-widest ${rank.bg} ${rank.color}`}>
                {rank.title}
              </span>
              <span className="text-[10px] font-black text-gray-300 uppercase">NO: {user.schoolNo}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 relative z-10">
          <div className="bg-amber-100 text-amber-700 font-black px-4 py-2 rounded-2xl text-sm flex items-center gap-2">
            <span>✨ {totalXP} XP</span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(starsCount, 5) }).map((_, i) => (
              <span key={i} className="text-xs">⭐</span>
            ))}
            {starsCount > 5 && <span className="text-[8px] font-black text-amber-500 self-center">+{starsCount - 5}</span>}
          </div>
        </div>
        {/* Dekoratif Arka Plan */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-2">
             <div className="text-[10px] font-black uppercase opacity-60 tracking-widest">Kariyer Yolculuğu</div>
             <div className="text-[10px] font-black uppercase bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                {starsCount} YILDIZ KAZANILDI
             </div>
          </div>
          <div className="text-2xl font-black mt-1 uppercase flex items-center gap-2">
            {rank.title} <span className="text-lg opacity-40">→</span> {getRank(totalXP + milestone).title}
          </div>
          <div className="mt-6 w-full bg-black/20 h-4 rounded-full overflow-hidden p-1">
             <div className="bg-gradient-to-r from-emerald-400 to-emerald-300 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(52,211,153,0.4)]" style={{ width: `${progressToBadge}%` }}></div>
          </div>
          <div className="mt-3 text-[9px] font-black uppercase opacity-60 flex justify-between tracking-tighter">
             <span>{totalXP} TOPLAM XP</span>
             <span>SONRAKİ HEDEF İÇİN {milestone - (totalXP % milestone)} XP</span>
          </div>
        </div>
        {/* Dekoratif Işıltı */}
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="font-black text-gray-800 uppercase text-[10px] tracking-widest opacity-50">Sınavların (Tek Giriş Hakkı)</h3>
          <span className="text-[8px] font-black text-indigo-400 uppercase bg-indigo-50 px-2 py-0.5 rounded-md">👥 {studentCount} ÖĞRENCİ AKTİF</span>
        </div>
        
        {availableExams.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
            <div className="text-3xl mb-2">🏖️</div>
            <div className="text-gray-300 font-black text-[10px] uppercase tracking-widest">Henüz Atanmış Sınav Yok</div>
          </div>
        ) : (
          availableExams.map(exam => {
            const result = data.results.find(r => r.examId === exam.id);
            return (
              <button 
                key={exam.id} 
                disabled={!!result} 
                onClick={() => setActiveExam(exam)} 
                className={`w-full bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex justify-between items-center active:scale-95 transition-all ${!!result ? 'bg-gray-50 opacity-80' : 'hover:border-indigo-200 shadow-md'}`}
              >
                <div className="text-left">
                  <div className={`font-black uppercase text-sm ${!!result ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{exam.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase">{exam.questions.length} SORU</span>
                    <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                    <span className="text-[9px] font-black text-indigo-400 uppercase">MAX +{exam.difficultyPoints || 100} XP</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-[1.5rem] flex items-center justify-center font-black ${!!result ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-600'}`}>
                  {!!result ? (
                    <div className="flex flex-col items-center">
                      <span className="text-xs">✅</span>
                      <span className="text-[7px] mt-0.5">BİTTİ</span>
                    </div>
                  ) : (
                    <span className="text-lg">▶️</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default App;
