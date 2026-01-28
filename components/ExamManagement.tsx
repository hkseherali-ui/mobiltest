import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Exam, Question } from '../types';

declare const jspdf: any;

const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showPool, setShowPool] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [pool, setPool] = useState<Question[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  useEffect(() => { refresh(); }, []);

  const refresh = async () => {
    try {
      // image_7d023c.png'deki hatayı önlemek için opsiyonel zincirleme kullanıldı
      const [e, p, s] = await Promise.all([
        dbService.getExams(), 
        dbService.getQuestionPool ? dbService.getQuestionPool() : Promise.resolve([]), 
        dbService.getStudents()
      ]);
      setExams(e || []);
      setPool(p || []);
      if (s) {
        const classes = Array.from(new Set(s.map(x => x.classGroup))).filter(Boolean).sort() as string[];
        setAvailableClasses(classes);
      }
    } catch (err) { console.error("Veri yuklenemedi:", err); }
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

  const handleSave = async () => {
    if (!editingExam) return;
    if (!editingExam.title.trim()) { alert("Lutfen baslik girin."); return; }
    await dbService.saveExam(editingExam);
    setEditingExam(null);
    refresh();
  };

  const exportPDF = (exam: Exam) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const m = 20; // image_7c8697.png'deki margin hatası giderildi
    doc.setFont("helvetica", "bold");
    doc.text(tr(exam.title).toUpperCase(), 105, 20, { align: 'center' });
    let y = 40;
    exam.questions.forEach((q, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}. ${tr(q.text)}`, m, y);
      y += 15;
    });
    doc.save(`${tr(exam.title)}.pdf`);
  };

  if (editingExam) {
    return (
      <div className="space-y-6 pb-32 p-4">
        {/* image_7d0e58.png ve image_7d0694.png'deki ust panel tasarimi */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-indigo-50">
          <input className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none" value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})} placeholder="Sinav Basligi" />
          <div className="mt-4">
            <span className="text-[10px] font-black text-gray-400 uppercase">Atanacak Siniflar</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableClasses.map(cls => (
                <button key={cls} onClick={() => {
                  const cur = editingExam.targetClasses || [];
                  setEditingExam({...editingExam, targetClasses: cur.includes(cls) ? cur.filter(c => c !== cls) : [...cur, cls]});
                }} className={`w-10 h-10 rounded-xl text-[10px] font-black border transition-all ${editingExam.targetClasses.includes(cls) ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 border-gray-100'}`}>{cls}</button>
              ))}
            </div>
          </div>
        </div>

        {/* image_7c8e3b.png'deki Havuz ve AI Butonlari */}
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowPool(true)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-3xl font-black text-[10px] uppercase">📂 HAVUZDAN SEC</button>
          <button type="button" onClick={() => setShowAIMenu(true)} className="flex-1 py-4 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase">✨ AI SIHIRBAZI</button>
        </div>

        {editingExam.questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
             <div className="flex justify-between">
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black">SORU {idx + 1}</span>
                <button onClick={() => setEditingExam({...editingExam, questions: editingExam.questions.filter(x => x.id !== q.id)})} className="text-gray-400">🗑️</button>
             </div>
             {q.imageUrl && <img src={q.imageUrl} className="w-full h-40 object-contain rounded-xl" />}
             <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold" value={q.text} onChange={e => {
                 const next = [...editingExam.questions]; next[idx].text = e.target.value; setEditingExam({...editingExam, questions: next});
             }} />
             <label className="block text-center py-2 bg-gray-100 rounded-xl text-[9px] font-black cursor-pointer">🖼️ SORUYA GORSEL EKLE
               <input type="file" className="hidden" onChange={e => handleImageUpload(e, idx)} />
             </label>
          </div>
        ))}

        <button onClick={() => setEditingExam({...editingExam, questions: [...editingExam.questions, { id: crypto.randomUUID(), text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]})} className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase">+ SORU EKLE</button>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t flex gap-2 z-50">
          <button onClick={() => setEditingExam(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-[10px]">IPTAL</button>
          <button onClick={handleSave} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px]">KAYDET VE YAYINLA</button>
        </div>

        {/* image_7c8371.png'deki yarim kalan Havuz Modali tamamlandi */}
        {showPool && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-6 max-h-[80vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-xs uppercase">Soru Havuzu</h3>
                  <button onClick={() => setShowPool(false)} className="text-xl">×</button>
               </div>
               {pool.map(pq => (
                 <div key={pq.id} onClick={() => {
                   setEditingExam({...editingExam, questions: [...editingExam.questions, {...pq, id: crypto.randomUUID()}]});
                   setShowPool(false);
                 }} className="p-4 border-b hover:bg-gray-50 cursor-pointer">
                    <p className="text-xs font-bold">{pq.text}</p>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => setEditingExam({ id: crypto.randomUUID(), title: '', questions: [], targetClasses: [], createdAt: Date.now(), status: 'ACTIVE' })} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs">YENI SINAV OLUSTUR</button>
      {exams.map(e => (
        <div key={e.id} className="bg-white p-5 rounded-[2.5rem] border flex justify-between items-center shadow-sm">
          <div className="truncate">
            <h4 className="font-black text-xs uppercase">{e.title}</h4>
            <span className="text-[8px] text-indigo-400 font-bold">Siniflar: {e.targetClasses?.join(', ')}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportPDF(e)} className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black">PDF</button>
            <button onClick={() => setEditingExam(e)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl">✏️</button>
            <button onClick={async () => { if(confirm("Silinsin mi?")) { await dbService.deleteExam(e.id); refresh(); } }} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl">🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExamManagement;