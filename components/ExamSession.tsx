
import React, { useState, useEffect, useMemo } from 'react';
import { Exam, Question, ExamResult, User } from '../types';
import { dbService } from '../db';

interface ExamSessionProps {
  exam: Exam;
  user: User;
  onComplete: () => void;
}

const ExamSession: React.FC<ExamSessionProps> = ({ exam, user, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60);
  const [resultSummary, setResultSummary] = useState<ExamResult | null>(null);

  const shuffledQuestions = useMemo(() => {
    return [...exam.questions].sort(() => Math.random() - 0.5);
  }, [exam.id]);

  useEffect(() => {
    if (resultSummary) return; 
    if (timeLeft <= 0) {
      handleFinish();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, resultSummary]);

  const handleFinish = () => {
    let correct = 0;
    exam.questions.forEach(q => { if (answers[q.id] === q.correctAnswerIndex) correct++; });
    const score = Math.round((correct / exam.questions.length) * 100);
    
    const earnedXP = Math.round((correct / exam.questions.length) * (exam.difficultyPoints || 100));

    const result: ExamResult = {
      id: crypto.randomUUID(),
      examId: exam.id,
      studentId: user.id,
      score,
      correctCount: correct,
      wrongCount: exam.questions.length - correct,
      isPassed: score >= exam.passPercentage,
      completedAt: Date.now(),
      pointsEarned: earnedXP,
      answers: answers // Analiz için tüm cevapları kaydet
    };
    dbService.saveResult(result);
    setResultSummary(result);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (resultSummary) {
    return (
      <div className="fixed inset-0 bg-white z-[200] flex flex-col max-w-md mx-auto h-screen items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-indigo-100 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-xl animate-bounce">
          {resultSummary.isPassed ? '🎉' : '📚'}
        </div>
        
        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-2">
          {resultSummary.isPassed ? 'TEBRİKLER!' : 'SINAV TAMAMLANDI'}
        </h2>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-8">
          {exam.title}
        </p>

        <div className="grid grid-cols-2 gap-4 w-full mb-8">
          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
            <div className="text-[10px] font-black text-emerald-600 uppercase mb-1">DOĞRU</div>
            <div className="text-3xl font-black text-emerald-700">{resultSummary.correctCount}</div>
          </div>
          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 shadow-sm">
            <div className="text-[10px] font-black text-red-600 uppercase mb-1">YANLIŞ</div>
            <div className="text-3xl font-black text-red-700">{resultSummary.wrongCount}</div>
          </div>
          <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 shadow-sm">
            <div className="text-[10px] font-black text-indigo-600 uppercase mb-1">PUAN</div>
            <div className="text-3xl font-black text-indigo-700">%{resultSummary.score}</div>
          </div>
          <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 shadow-sm">
            <div className="text-[10px] font-black text-amber-600 uppercase mb-1">XP KAZANCI</div>
            <div className="text-3xl font-black text-amber-700">+{resultSummary.pointsEarned}</div>
          </div>
        </div>

        <button 
          onClick={onComplete}
          className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all mt-auto"
        >
          ANASAYFAYA DÖN
        </button>
      </div>
    );
  }

  const q = shuffledQuestions[currentIndex];

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col max-w-md mx-auto h-screen">
      <header className="bg-indigo-600 p-4 text-white flex flex-col gap-2 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
             <h2 className="text-[9px] font-black uppercase tracking-widest opacity-60">KALAN SÜRE</h2>
             <span className={`text-xl font-black ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{formatTime(timeLeft)} ⏱️</span>
          </div>
          <div className="text-right">
             <h2 className="text-[9px] font-black uppercase tracking-widest opacity-60">SORU</h2>
             <span className="text-xl font-black">{currentIndex + 1} / {exam.questions.length}</span>
          </div>
        </div>
        <div className="w-full bg-indigo-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-emerald-400 h-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / exam.questions.length) * 100}%` }}></div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto bg-gray-50 hide-scrollbar">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
          {q.imageUrl && (
            <div className="w-full rounded-2xl overflow-hidden border bg-gray-50">
              <img src={q.imageUrl} className="w-full h-48 object-contain" alt="Soru görseli" />
            </div>
          )}
          <h3 className="text-lg font-black text-gray-800 leading-tight">{q.text}</h3>
          
          <div className="space-y-4">
            {q.options.map((opt, idx) => (
              <button 
                key={idx} 
                onClick={() => setAnswers({...answers, [q.id]: idx})} 
                className={`w-full p-4 rounded-3xl border-2 transition-all flex flex-col gap-3 active:scale-[0.98] group ${answers[q.id] === idx ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xl' : 'border-gray-50 bg-white text-gray-600'}`}
              >
                {q.optionImages?.[idx] && (
                  <div className="w-full h-40 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm p-2">
                    <img src={q.optionImages[idx]!} className="w-full h-full object-contain" alt={`${idx} seçeneği görseli`} />
                  </div>
                )}
                
                <div className="flex items-center gap-4 w-full">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${answers[q.id] === idx ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{String.fromCharCode(65+idx)}</span>
                  <span className={`font-bold text-sm text-left flex-1 ${answers[q.id] === idx ? 'text-indigo-900' : 'text-gray-600'}`}>{opt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="p-4 bg-white/80 backdrop-blur-xl border-t flex gap-3 shadow-2xl">
        <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] disabled:opacity-20 active:scale-95 transition-all">GERİ</button>
        {currentIndex === shuffledQuestions.length - 1 ? (
          <button onClick={() => setShowConfirm(true)} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all">SINAVI BİTİR 🏁</button>
        ) : (
          <button onClick={() => setCurrentIndex(prev => prev + 1)} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all">SONRAKİ ➡️</button>
        )}
      </footer>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-end p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full animate-in slide-in-from-bottom duration-500 shadow-2xl text-center">
            <h3 className="text-xl font-black mb-6 uppercase">Bitirmek İstediğine Emin Misin?</h3>
            <div className="flex flex-col gap-3">
              <button onClick={handleFinish} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95">EVET, GÖNDER ✨</button>
              <button onClick={() => setShowConfirm(false)} className="w-full py-5 bg-gray-100 text-gray-400 rounded-[2rem] font-black uppercase tracking-widest text-xs active:scale-95">HENÜZ DEĞİL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSession;
