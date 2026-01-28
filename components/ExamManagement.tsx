import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Exam, Question } from '../types';

declare const jspdf: any;

const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showPool, setShowPool] = useState(false);
  const [pool, setPool] = useState<Question[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  useEffect(() => { refresh(); }, []);

  const refresh = async () => {
    try {
      const [e, p, s] = await Promise.all([
        dbService.getExams(),
        dbService.getQuestionPool ? dbService.getQuestionPool() : Promise.resolve([]),
        dbService.getStudents()
      ]);
      setExams(e || []);
      setPool(p || []);
      if (s) {
        const classes = Array.from(new Set(s.map((x: any) => x.classGroup))).filter(Boolean).sort() as string[];
        setAvailableClasses(classes);
      }
    } catch (err) { console.error("Veri hatası:", err); }
  };

  const tr = (text: string) => {
    if (!text) return "";
    return text.replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U')
               .replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ı/g, 'i').replace(/İ/g, 'I')
               .replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C');
  };

  const exportPDF = (exam: Exam) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const margin = 20; // image_7c8697.png'deki hata giderildi
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - (margin * 2);
    doc.setFont("helvetica", "bold");
    doc.text(tr(exam.title).toUpperCase(), pageWidth / 2, 20, { align: 'center' });
    let y = 40;
    exam.questions.forEach((q, i) => {
      // PDF Taşma sorununu çözen kısım:
      const splitText = doc.splitTextToSize(`${i + 1}. ${tr(q.text)}`, maxWidth);
      if (y + (splitText.length * 7) > 280) { doc.addPage(); y = 20; }
      doc.text(splitText, margin, y);
      y += (splitText.length * 7) + 10;
    });
    doc.save(`${tr(exam.title)}.pdf`);
  };

  const addManualQuestion = () => {
    if (!editingExam) return;
    const newQ: Question = { id: crypto.randomUUID(), text: '', options: ['', '', '', ''], correctAnswerIndex: 0 };
    setEditingExam({ ...editingExam, questions: [...editingExam.questions, newQ] });
  };
  if (editingExam) {
    return (
      <div className="p-4 pb-32 space-y-4">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-gray-100">
          <input className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})} placeholder="Sınav Adı" />
          <div className="flex flex-wrap gap-2 mt-4">
            {availableClasses.map(cls => (
              <button key={cls} onClick={() => {
                const cur = editingExam.targetClasses || [];
                setEditingExam({...editingExam, targetClasses: cur.includes(cls) ? cur.filter(c => c !== cls) : [...cur, cls]});
              }} className={`px-4 py-2 rounded-xl text-[10px] font-black border ${editingExam.targetClasses.includes(cls) ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400'}`}>{cls}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowPool(true)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px]">📂 HAVUZDAN SEÇ</button>
          <button onClick={addManualQuestion} className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px]">➕ SORU EKLE</button>
        </div>

        {editingExam.questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-4 rounded-3xl border border-gray-100 space-y-2">
            <textarea className="w-full p-3 bg-gray-50 rounded-xl text-sm" value={q.text} onChange={e => {
              const next = [...editingExam.questions]; next[idx].text = e.target.value; setEditingExam({...editingExam, questions: next});
            }} placeholder="Soru metni..." />
            <button onClick={() => setEditingExam({...editingExam, questions: editingExam.questions.filter(x => x.id !== q.id)})} className="text-red-400 text-[10px] font-bold">SORUYU SİL</button>
          </div>
        ))}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-2 z-50">
          <button onClick={() => setEditingExam(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">İPTAL</button>
          <button onClick={async () => { await dbService.saveExam(editingExam); setEditingExam(null); refresh(); }} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold">KAYDET</button>
        </div>

        {showPool && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full rounded-3xl p-6 max-h-[70vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between mb-4"><b className="text-xs">SORU HAVUZU</b><button onClick={() => setShowPool(false)}>×</button></div>
              {pool.map(pq => (
                <div key={pq.id} onClick={() => { setEditingExam({...editingExam, questions: [...editingExam.questions, {...pq, id: crypto.randomUUID()}]}); setShowPool(false); }} className="p-3 border-b text-[10px] cursor-pointer hover:bg-indigo-50">{pq.text}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => setEditingExam({ id: crypto.randomUUID(), title: '', questions: [], targetClasses: [], createdAt: Date.now(), status: 'ACTIVE' })} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-bold">YENİ SINAV OLUŞTUR</button>
      {exams.map(e => (
        <div key={e.id} className="bg-white p-4 rounded-3xl border flex justify-between items-center shadow-sm">
          <div className="truncate flex-1 font-bold text-xs">{e.title}</div>
          <div className="flex gap-2">
            <button onClick={() => exportPDF(e)} className="p-2 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black">PDF</button>
            <button onClick={() => setEditingExam(e)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black">✏️</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExamManagement;