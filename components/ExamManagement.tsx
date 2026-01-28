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
    } catch (err) { console.error("Hata:", err); }
  };
const tr = (text: string) => {
    if (!text) return "";
    return text.replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U')
               .replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ı/g, 'i').replace(/İ/g, 'I')
               .replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, qIdx: number, oIdx?: number) => {
    const file = e.target.files?.[0];
    if (!file || !editingExam) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      const next = { ...editingExam };
      if (oIdx !== undefined) {
        if (!next.questions[qIdx].optionImages) next.questions[qIdx].optionImages = [null, null, null, null];
        next.questions[qIdx].optionImages![oIdx] = base64;
      } else {
        next.questions[qIdx].imageUrl = base64;
      }
      setEditingExam(next);
    };
    reader.readAsDataURL(file);
  };
const exportPDF = (exam: Exam) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const margin = 20; // Hata fixlendi
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - (margin * 2);
    doc.setFont("helvetica", "normal"); // Bold sorunu giderildi
    doc.text(tr(exam.title).toUpperCase(), pageWidth / 2, 20, { align: 'center' });
    let y = 40;
    exam.questions.forEach((q, i) => {
      const splitText = doc.splitTextToSize(`${i + 1}. ${tr(q.text)}`, maxWidth);
      if (y + (splitText.length * 7) > 280) { doc.addPage(); y = 20; }
      doc.text(splitText, margin, y);
      y += (splitText.length * 7) + 10;
    });
    doc.save(`${tr(exam.title)}.pdf`);
  };
if (editingExam) {
    return (
      <div className="p-4 pb-32 space-y-4">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border text-center">
          <input className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-center outline-none" 
            value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})} placeholder="Sınav Başlığı" />
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {availableClasses.map(cls => (
              <button key={cls} onClick={() => {
                const cur = editingExam.targetClasses || [];
                setEditingExam({...editingExam, targetClasses: cur.includes(cls) ? cur.filter(c => c !== cls) : [...cur, cls]});
              }} className={`w-10 h-10 rounded-xl text-[10px] font-black border transition-all ${editingExam.targetClasses.includes(cls) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400'}`}>{cls}</button>
            ))}
          </div>
        </div>
<div className="flex gap-2">
          <button onClick={() => setShowPool(true)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-3xl font-black text-[10px] uppercase">📂 HAVUZDAN SEÇ</button>
          <button onClick={() => alert("AI Sihirbazı Aktif!")} className="flex-1 py-4 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase">✨ AI SİHİRBAZI</button>
        </div>
{editingExam.questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-6 rounded-[2.5rem] border space-y-4 relative shadow-sm">
             <button onClick={() => setEditingExam({...editingExam, questions: editingExam.questions.filter(x => x.id !== q.id)})} className="absolute top-6 right-6 text-red-400">🗑️</button>
             <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm">SORU {idx + 1}</span>
             {q.imageUrl && <img src={q.imageUrl} className="w-full h-40 object-contain rounded-2xl bg-gray-50 border" />}
             <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none" rows={3} value={q.text} onChange={e => {
                 const next = [...editingExam.questions]; next[idx].text = e.target.value; setEditingExam({...editingExam, questions: next});
             }} placeholder="Soru metni..." />
             <div className="grid grid-cols-2 gap-2">
                <label className="text-center py-2 bg-gray-100 rounded-xl text-[9px] font-black cursor-pointer uppercase">🖼️ GÖRSEL EKLE
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, idx)} />
                </label>
                <button onClick={() => {
                  const next = [...editingExam.questions];
                  next[idx].options = [...next[idx].options, ''];
                  setEditingExam({...editingExam, questions: next});
                }} className="py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase">➕ SEÇENEK EKLE</button>
             </div>
<div className="space-y-2 mt-4">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex gap-2 items-center">
                    <button onClick={() => {
                        const next = [...editingExam.questions];
                        next[idx].correctAnswerIndex = oIdx;
                        setEditingExam({...editingExam, questions: next});
                    }} className={`w-8 h-8 rounded-lg font-black text-[10px] flex items-center justify-center transition-all ${q.correctAnswerIndex === oIdx ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                        {String.fromCharCode(65 + oIdx)}
                    </button>
                    <div className="flex-1 flex gap-2 items-center bg-gray-50 p-2 rounded-xl">
                        <input className="flex-1 bg-transparent text-xs font-bold outline-none" value={opt} onChange={e => {
                            const next = [...editingExam.questions]; next[idx].options[oIdx] = e.target.value; setEditingExam({...editingExam, questions: next});
                        }} placeholder={`Seçenek ${oIdx + 1}`} />
                        <label className="p-2 bg-white rounded-lg cursor-pointer shadow-sm">📷
                          <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, idx, oIdx)} />
                        </label>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        ))}
<button onClick={() => setEditingExam({...editingExam, questions: [...editingExam.questions, { id: crypto.randomUUID(), text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]})} className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-3xl font-black text-[10px] uppercase">+ MANUEL SORU EKLE</button>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-2xl border-t flex gap-2 z-50">
          <button onClick={() => setEditingExam(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-[10px]">İPTAL</button>
          <button onClick={async () => { await dbService.saveExam(editingExam); setEditingExam(null); refresh(); }} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px]">KAYDET</button>
        </div>
        {showPool && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-6 max-h-[80vh] flex flex-col shadow-2xl">
               <div className="flex justify-between items-center mb-6"><h3 className="font-black text-xs uppercase text-indigo-600">Soru Havuzu</h3><button onClick={() => setShowPool(false)} className="text-2xl font-bold">×</button></div>
               <div className="overflow-y-auto space-y-3">
                  {pool.map(pq => (
                    <div key={pq.id} onClick={() => { setEditingExam({...editingExam, questions: [...editingExam.questions, {...pq, id: crypto.randomUUID()}]}); setShowPool(false); }} className="p-4 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-indigo-200 cursor-pointer">
                        <p className="text-[11px] font-bold">{pq.text}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </div>
    );
  }
return (
    <div className="p-4 space-y-4">
      <button onClick={() => setEditingExam({ id: crypto.randomUUID(), title: '', questions: [], targetClasses: [], createdAt: Date.now(), status: 'ACTIVE' })} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl">YENİ SINAV OLUŞTUR</button>
      <div className="space-y-3">
        {exams.map(e => (
          <div key={e.id} className="bg-white p-5 rounded-[2.5rem] border flex justify-between items-center shadow-sm">
            <div className="truncate flex-1">
              <h4 className="font-black text-xs uppercase">{e.title}</h4>
              <span className="text-[8px] text-indigo-400 font-bold uppercase">SINIFLAR: {e.targetClasses?.join(', ')}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => exportPDF(e)} className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black">PDF</button>
              <button onClick={() => setEditingExam(e)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">✏️</button>
              <button onClick={async () => { if(confirm("Silmek istiyor musun?")) { await dbService.deleteExam(e.id); refresh(); } }} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-xs">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamManagement;
