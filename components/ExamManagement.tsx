import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Exam, Question, Student } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

declare const jspdf: any;

const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showPool, setShowPool] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [pool, setPool] = useState<Question[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFile, setAiFile] = useState<{data: string, mimeType: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
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
        const classes = Array.from(new Set(s.map((x: Student) => x.classGroup))).filter(Boolean).sort() as string[];
        setAvailableClasses(classes);
      }
    } catch (err) { console.error("Yükleme hatası:", err); }
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
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!editingExam) return;
    if (!editingExam.title.trim()) { alert("Lütfen sınav başlığı girin."); return; }
    if (editingExam.questions.length === 0) { alert("Soru ekleyin."); return; }
    if (!editingExam.targetClasses?.length) { alert("Sınıf seçin."); return; }
    
    await dbService.saveExam({
      ...editingExam,
      durationMinutes: editingExam.questions.length * 2
    });
    setEditingExam(null);
    refresh();
  };

  const exportPDF = (exam: Exam) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text(tr(exam.title).toUpperCase(), 105, 20, { align: 'center' });
    let y = 40;
    exam.questions.forEach((q, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}. ${tr(q.text)}`, 20, y);
      y += 10;
      q.options.forEach((opt, oi) => {
        doc.text(`${String.fromCharCode(65 + oi)}) ${tr(opt)}`, 30, y);
        y += 7;
      });
      y += 10;
    });
    doc.save(`${tr(exam.title)}.pdf`);
  };

  if (editingExam) {
    return (
      <div className="space-y-6 pb-32 p-4 animate-in fade-in">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-indigo-50 space-y-4">
          <input className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none" placeholder="Sınav Başlığı" value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})} />
          <div className="space-y-2">
            <span className="text-[10px] font-black text-gray-400 uppercase">Atanacak Sınıflar</span>
            <div className="flex flex-wrap gap-2">
              {availableClasses.map(cls => (
                <button key={cls} onClick={() => {
                  const cur = editingExam.targetClasses || [];
                  setEditingExam({...editingExam, targetClasses: cur.includes(cls) ? cur.filter(c => c !== cls) : [...cur, cls]});
                }} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${editingExam.targetClasses?.includes(cls) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}>{cls}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowPool(true)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px]">📂 HAVUZDAN SEÇ</button>
          <button onClick={() => setShowAIMenu(true)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px]">✨ AI SİHİRBAZI</button>
        </div>

        {editingExam.questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
             <div className="flex justify-between items-center">
                <span className="bg-indigo-600 text-white font-black px-4 py-1 rounded-full text-[9px]">SORU {idx + 1}</span>
                <button onClick={() => setEditingExam({...editingExam, questions: editingExam.questions.filter(x => x.id !== q.id)})} className="text-red-300">🗑️</button>
             </div>
             
             {q.imageUrl && <img src={q.imageUrl} className="w-full h-40 object-contain rounded-xl bg-gray-50" />}
             
             <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none" rows={3} placeholder="Soru metni..." value={q.text} onChange={e => {
                 const next = [...editingExam.questions]; next[idx].text = e.target.value; setEditingExam({...editingExam, questions: next});
             }} />

             <label className="block w-full py-2 bg-gray-100 text-center rounded-xl text-[9px] font-black cursor-pointer uppercase">🖼️ SORU GÖRSELİ EKLE
               <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, idx)} />
             </label>

             <div className="grid grid-cols-1 gap-3">
               {q.options.map((opt, oIdx) => (
                 <div key={oIdx} className="space-y-1">
                    <div className="flex gap-2">
                      <button onClick={() => {
                          const next = [...editingExam.questions]; next[idx].correctAnswerIndex = oIdx; setEditingExam({...editingExam, questions: next});
                      }} className={`w-10 h-10 rounded-xl font-black ${q.correctAnswerIndex === oIdx ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-300'}`}>{String.fromCharCode(65+oIdx)}</button>
                      <input className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none" value={opt} onChange={e => {
                          const next = [...editingExam.questions]; next[idx].options[oIdx] = e.target.value; setEditingExam({...editingExam, questions: next});
                      }} />
                      <label className="w-10 h-10 bg-indigo-50 flex items-center justify-center rounded-xl cursor-pointer text-indigo-600">📷
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, idx, oIdx)} />
                      </label>
                    </div>
                    {q.optionImages?.[oIdx] && <img src={q.optionImages[oIdx]!} className="h-20 object-contain ml-12 border rounded-lg" />}
                 </div>
               ))}
             </div>
          </div>
        ))}

        <button onClick={() => setEditingExam({...editingExam, questions: [...editingExam.questions, { id: crypto.randomUUID(), text: '', options: ['', '', '', ''], correctAnswerIndex: 0, optionImages: [null, null, null, null] }]})} className="w-full py-4 bg-white border-2 border-dashed border-indigo-100 text-indigo-300 rounded-2xl font-black text-[10px] uppercase">+ MANUEL SORU EKLE</button>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t flex gap-3 z-50">
          <button onClick={() => setEditingExam(null)} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-[10px]">İPTAL</button>
          <button onClick={handleSave} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] shadow-xl">KAYDET VE YAYINLA</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => setEditingExam({ id: crypto.randomUUID(), title: '', passPercentage: 50, difficultyPoints: 100, durationMinutes: 10, questions: [], targetClasses: [], createdAt: Date.now(), status: 'ACTIVE' })} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl">YENİ SINAV OLUŞTUR</button>
      <div className="space-y-3">
        {exams.map(e => (
          <div key={e.id} className="bg-white p-5 rounded-[2.5rem] border border-gray-50 flex items-center justify-between shadow-sm">
            <div className="flex-1 truncate">
              <h4 className="font-black text-gray-800 text-xs uppercase truncate">{e.title}</h4>
              <span className="text-[8px] font-black text-indigo-400">Sınıflar: {e.targetClasses?.join(', ') || 'Yok'}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => exportPDF(e)} className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black">PDF</button>
              <button onClick={() => setEditingExam(e)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">✏️</button>
              <button onClick={async () => { if(confirm("Silinsin mi?")) { await dbService.deleteExam(e.id); refresh(); } }} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamManagement;