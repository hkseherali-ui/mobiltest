import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Exam, Question } from '../types';

declare const jspdf: any;

const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [pool, setPool] = useState<Question[]>([]);
  const [showPool, setShowPool] = useState(false);

  useEffect(() => { refresh(); }, []);

  const refresh = async () => {
    try {
      const [e, s, p] = await Promise.all([
        dbService.getExams(),
        dbService.getStudents(),
        dbService.getQuestionPool()
      ]);
      setExams(e || []);
      setPool(p || []);
      if (s) {
        const classes = Array.from(new Set(s.map(x => x.classGroup))).filter(Boolean).sort() as string[];
        setAvailableClasses(classes);
      }
    } catch (err) { console.error("Yükleme hatası:", err); }
  };

  const exportPDF = (exam: Exam) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    doc.text(exam.title.toUpperCase(), 105, 20, { align: 'center' });
    let y = 40;
    exam.questions.forEach((q, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}. ${q.text}`, 20, y);
      y += 10;
      q.options.forEach((opt, oi) => {
        doc.text(`${String.fromCharCode(65 + oi)}) ${opt}`, 30, y);
        y += 7;
      });
      y += 5;
    });
    doc.save(`${exam.title}.pdf`);
  };

  const handleSave = async () => {
    if (!editingExam) return;
    if (!editingExam.targetClasses?.length) { alert("Lütfen sınıf seçin!"); return; }
    await dbService.saveExam(editingExam);
    setEditingExam(null);
    refresh();
  };

  if (editingExam) {
    return (
      <div className="p-4 space-y-4 pb-32">
        <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-indigo-50">
          <input className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none mb-4" placeholder="Sınav Başlığı" value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})} />
          <div className="text-[10px] font-black text-gray-400 mb-2">ATANACAK SINIFLAR</div>
          <div className="flex flex-wrap gap-2">
            {availableClasses.map(cls => (
              <button key={cls} onClick={() => {
                const cur = editingExam.targetClasses || [];
                setEditingExam({...editingExam, targetClasses: cur.includes(cls) ? cur.filter(c => c !== cls) : [...cur, cls]});
              }} className={`px-4 py-2 rounded-xl text-[10px] font-black border ${editingExam.targetClasses?.includes(cls) ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400'}`}>{cls}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowPool(true)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px]">📂 HAVUZ</button>
          <button onClick={() => setEditingExam({...editingExam, questions: [...editingExam.questions, { id: crypto.randomUUID(), text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]})} className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px]">+ SORU</button>
        </div>

        {editingExam.questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-4 rounded-[2rem] border border-gray-100">
            <textarea className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold outline-none" rows={2} value={q.text} onChange={e => {
              const next = [...editingExam.questions]; next[idx].text = e.target.value; setEditingExam({...editingExam, questions: next});
            }} />
          </div>
        ))}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 border-t flex gap-2">
          <button onClick={() => setEditingExam(null)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold">İPTAL</button>
          <button onClick={handleSave} className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-bold">KAYDET</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => setEditingExam({ id: crypto.randomUUID(), title: '', passPercentage: 50, difficultyPoints: 100, durationMinutes: 10, questions: [], targetClasses: [], createdAt: Date.now(), status: 'ACTIVE' })} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl">YENİ SINAV</button>
      {exams.map(e => (
        <div key={e.id} className="bg-white p-4 rounded-[2rem] border flex justify-between items-center">
          <span className="font-bold text-xs">{e.title}</span>
          <div className="flex gap-2">
            <button onClick={() => exportPDF(e)} className="p-2 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold">PDF</button>
            <button onClick={() => setEditingExam(e)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">✏️</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExamManagement;