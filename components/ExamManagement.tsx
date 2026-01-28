import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Exam, Question } from '../types';

const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  // Sayfa açıldığında verileri çek
  useEffect(() => { 
    refresh(); 
  }, []);

  const refresh = async () => {
    try {
      // Hem sınavları hem öğrencileri çekiyoruz
      const [allExams, allStudents] = await Promise.all([
        dbService.getExams(),
        dbService.getStudents()
      ]);
      
      setExams(allExams || []);

      // Öğrencilerin içindeki sınıf bilgilerini (classGroup) ayıklayıp listeye ekle
      if (allStudents && allStudents.length > 0) {
        const classes = Array.from(new Set(allStudents.map(s => s.classGroup)))
          .filter(Boolean)
          .sort() as string[];
        setAvailableClasses(classes);
      }
    } catch (err) {
      console.error("Veriler yüklenirken hata oluştu:", err);
    }
  };

  const handleSave = async () => {
    if (!editingExam) return;
    if (!editingExam.title.trim()) { alert("Başlık girin."); return; }
    if (!editingExam.targetClasses || editingExam.targetClasses.length === 0) {
      alert("Lütfen en az bir sınıf seçin!");
      return;
    }
    
    await dbService.saveExam(editingExam);
    await refresh();
    setEditingExam(null);
  };

  if (editingExam) {
    return (
      <div className="space-y-6 pb-32 p-4">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-indigo-50">
          <input 
            className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none mb-4" 
            placeholder="Sınav Başlığı" 
            value={editingExam.title} 
            onChange={e => setEditingExam({...editingExam, title: e.target.value})} 
          />
          
          <div className="space-y-2">
            <span className="text-[10px] font-black text-gray-400 uppercase">Atanacak Sınıflar</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableClasses.length > 0 ? (
                availableClasses.map(cls => (
                  <button 
                    key={cls}
                    type="button"
                    onClick={() => {
                      const cur = editingExam.targetClasses || [];
                      const next = cur.includes(cls) ? cur.filter(c => c !== cls) : [...cur, cls];
                      setEditingExam({...editingExam, targetClasses: next});
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${
                      editingExam.targetClasses?.includes(cls) 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                        : 'bg-white text-gray-400 border-gray-100'
                    }`}
                  >
                    {cls}
                  </button>
                ))
              ) : (
                <p className="text-[10px] text-amber-500 font-bold">Önce öğrenci eklemelisiniz!</p>
              )}
            </div>
          </div>
        </div>

        {/* Soru ekleme butonu ve diğer kısımlar buraya gelecek */}
        <button 
          onClick={() => setEditingExam({...editingExam, questions: [...editingExam.questions, { id: crypto.randomUUID(), text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]})}
          className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px]"
        >
          + SORU EKLE
        </button>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t flex gap-3 z-50">
          <button onClick={() => setEditingExam(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px]">İPTAL</button>
          <button onClick={handleSave} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] shadow-xl">KAYDET VE YAYINLA</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <button 
        onClick={() => {
          refresh();
          setEditingExam({ id: crypto.randomUUID(), title: '', passPercentage: 50, difficultyPoints: 100, durationMinutes: 10, questions: [], targetClasses: [], createdAt: Date.now(), status: 'ACTIVE' });
        }} 
        className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl"
      >
        YENİ SINAV OLUŞTUR
      </button>

      {exams.map(e => (
        <div key={e.id} className="bg-white p-5 rounded-[2.5rem] border border-gray-50 flex justify-between items-center shadow-sm">
          <div>
            <h4 className="font-black text-gray-800 text-xs uppercase">{e.title}</h4>
            <span className="text-[8px] font-black text-indigo-400">SINIFLAR: {e.targetClasses?.join(', ') || 'Atanmadı'}</span>
          </div>
          <button onClick={() => setEditingExam(e)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl">✏️</button>
        </div>
      ))}
    </div>
  );
};

export default ExamManagement;