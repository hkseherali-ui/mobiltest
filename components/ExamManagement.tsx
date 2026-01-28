
import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Exam, Question } from '../types';
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
    const [e, p, s] = await Promise.all([dbService.getExams(), dbService.getQuestionPool(), dbService.getStudents()]);
    setExams(e);
    setPool(p);
    setAvailableClasses(Array.from(new Set(s.map(x => x.classGroup))).sort());
  };

  const tr = (text: string) => {
    if (!text) return "";
    return text
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ç/g, 'c').replace(/Ç/g, 'C');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, qIdx: number, oIdx?: number) => {
    const file = e.target.files?.[0];
    if (!file || !editingExam) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      const next = { ...editingExam };
      if (oIdx !== undefined) {
        if (!next.questions[qIdx].optionImages) {
          next.questions[qIdx].optionImages = [null, null, null, null];
        }
        next.questions[qIdx].optionImages![oIdx] = base64;
      } else {
        next.questions[qIdx].imageUrl = base64;
      }
      setEditingExam(next);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeOptionImage = (qIdx: number, oIdx: number) => {
    if (!editingExam) return;
    const next = { ...editingExam };
    if (next.questions[qIdx].optionImages) {
      next.questions[qIdx].optionImages![oIdx] = null;
      setEditingExam(next);
    }
  };

  const handleAiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1];
      setAiFile({ data: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!editingExam) return;
    if (!editingExam.title.trim()) { alert("Lütfen bir sınav başlığı girin."); return; }
    if (editingExam.questions.length === 0) { alert("Sınava en az 1 soru eklemelisiniz."); return; }
    
    const finalExam: Exam = {
      ...editingExam,
      durationMinutes: editingExam.questions.length * 2,
      difficultyPoints: 100
    };
    await dbService.saveExam(finalExam);
    refresh();
    setEditingExam(null);
  };

  const handleAI = async () => {
    if (!aiPrompt && !aiFile) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [{
        text: `Sen uzman bir öğretmensin. ${aiFile ? 'Yüklediğim belgedeki veya görseldeki bilgileri kullanarak çoktan seçmeli sorular üret.' : 'Belirlediğim konu hakkında sorular üret.'} 
        Dil: Türkçe. Her soru tam olarak 4 şıklı olmalıdır. Doğru cevabın indexini (0-3 arası) mutlaka belirt.
        Talimat: ${aiPrompt || 'Kaliteli ve seviyeye uygun sorular üret.'}`
      }];
      
      if (aiFile) {
        parts.push({
          inlineData: {
            data: aiFile.data,
            mimeType: aiFile.mimeType
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
                correctAnswerIndex: { type: Type.INTEGER }
              },
              required: ["text", "options", "correctAnswerIndex"]
            }
          }
        }
      });
      
      const data = JSON.parse(response.text || "[]");
      if (editingExam) {
        const newQs = data.map((q: any) => ({
          ...q,
          id: crypto.randomUUID(),
          optionImages: [null, null, null, null]
        }));
        setEditingExam({ ...editingExam, questions: [...editingExam.questions, ...newQs] });
      }
      setShowAIMenu(false);
      setAiPrompt('');
      setAiFile(null);
    } catch (e) {
      console.error(e);
      alert("AI üretimi sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportPDF = (exam: Exam) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(tr(exam.title).toUpperCase(), pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(tr("Ad Soyad: ___________________________"), margin, 35);
    doc.text(tr(`Sure: ${exam.questions.length * 2} dk`), margin + 110, 35);
    doc.setLineWidth(0.5);
    doc.line(margin, 40, pageWidth - margin, 40);

    let y = 50;
    exam.questions.forEach((q, i) => {
      doc.setFont("helvetica", "bold");
      const questionLabel = `${i + 1}. `;
      const questionText = tr(q.text);
      const questionLines = doc.splitTextToSize(questionText, contentWidth - 10);
      let blockH = (questionLines.length * 6) + (q.options.length * 7) + 15;
      if (y + blockH > 270) { doc.addPage(); y = 20; }
      doc.text(questionLabel, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(questionLines, margin + 8, y);
      y += (questionLines.length * 6) + 4;
      q.options.forEach((opt, oi) => {
        doc.text(`${String.fromCharCode(65+oi)}) ${tr(opt)}`, margin + 10, y);
        y += 7;
      });
      y += 8;
    });
    doc.save(`${tr(exam.title).replace(/\s+/g, '_')}.pdf`);
  };

  if (editingExam) {
    return (
      <div className="space-y-6 pb-32 animate-in slide-in-from-bottom duration-500">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-indigo-50 space-y-4">
          <input className="w-full p-4 bg-gray-50 rounded-2xl border-none font-black text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Sınav Başlığı" value={editingExam.title} onChange={e => setEditingExam({...editingExam, title: e.target.value})} />
          <div className="flex gap-4">
             <div className="flex-1 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <div className="text-[8px] font-black text-amber-600 uppercase">Toplam Puan</div>
                <div className="text-xl font-black text-amber-700">100 XP</div>
             </div>
             <div className="flex-1 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                <div className="text-[8px] font-black text-indigo-600 uppercase">Toplam Süre</div>
                <div className="text-xl font-black text-indigo-700">{editingExam.questions.length * 2} Dakika</div>
             </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black text-gray-400 uppercase px-1">Atanacak Sınıflar</span>
            <div className="flex flex-wrap gap-2">
              {availableClasses.map(cls => (
                <button key={cls} onClick={() => {
                  const cur = editingExam.targetClasses || [];
                  setEditingExam({...editingExam, targetClasses: cur.includes(cls) ? cur.filter(c => c !== cls) : [...cur, cls]});
                }} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${editingExam.targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}>{cls}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-2">
          <button onClick={() => setShowPool(true)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-3xl text-[10px] font-black active:scale-95 transition-all shadow-sm">📂 HAVUZDAN SEÇ</button>
          <button onClick={() => setShowAIMenu(true)} className="flex-1 py-4 bg-indigo-600 text-white rounded-3xl text-[10px] font-black shadow-xl shadow-indigo-100 active:scale-95 transition-all">✨ AI SİHİRBAZI</button>
        </div>

        {editingExam.questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
             <div className="flex justify-between items-center">
                <span className="bg-indigo-600 text-white font-black px-4 py-1 rounded-full text-[9px]">SORU {idx + 1}</span>
                <button onClick={() => setEditingExam({...editingExam, questions: editingExam.questions.filter(x => x.id !== q.id)})} className="text-red-300 p-2 active:scale-90 transition-all">🗑️</button>
             </div>
             
             {q.imageUrl && (
               <div className="relative rounded-2xl overflow-hidden border bg-gray-50 group">
                 <img src={q.imageUrl} className="w-full h-40 object-contain" alt="soru" />
                 <button onClick={() => {
                    const next = [...editingExam.questions];
                    next[idx].imageUrl = undefined;
                    setEditingExam({...editingExam, questions: next});
                 }} className="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">×</button>
               </div>
             )}

             <textarea className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500" rows={3} placeholder="Soru metnini yazın..." value={q.text} onChange={e => {
                 const next = [...editingExam.questions];
                 next[idx].text = e.target.value;
                 setEditingExam({...editingExam, questions: next});
             }} />

             <label className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 hover:bg-gray-200 transition-colors rounded-2xl text-[9px] font-black cursor-pointer uppercase text-gray-500">
               🖼️ {q.imageUrl ? 'GÖRSELİ DEĞİŞTİR' : 'SORUYA GÖRSEL EKLE'}
               <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, idx)} />
             </label>

             <div className="grid grid-cols-1 gap-4 mt-2">
               {q.options.map((opt, oIdx) => (
                 <div key={oIdx} className="space-y-2 border-t pt-3 border-gray-50">
                   <div className="flex gap-2 items-center">
                      <button onClick={() => {
                          const next = [...editingExam.questions];
                          next[idx].correctAnswerIndex = oIdx;
                          setEditingExam({...editingExam, questions: next});
                      }} className={`w-10 h-10 rounded-xl font-black shrink-0 transition-all ${q.correctAnswerIndex === oIdx ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 text-gray-300'}`}>{String.fromCharCode(65+oIdx)}</button>
                      <input className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-bold border-none outline-none focus:ring-1 focus:ring-indigo-500" value={opt} placeholder={`${String.fromCharCode(65+oIdx)} Şıkkı metni...`} onChange={e => {
                          const next = [...editingExam.questions];
                          next[idx].options[oIdx] = e.target.value;
                          setEditingExam({...editingExam, questions: next});
                      }} />
                      <label className="w-10 h-10 bg-indigo-50 flex items-center justify-center rounded-xl cursor-pointer hover:bg-indigo-100 transition-all text-indigo-600 shadow-sm">
                        📷
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, idx, oIdx)} />
                      </label>
                   </div>
                   {q.optionImages?.[oIdx] && (
                     <div className="relative w-full h-32 bg-white rounded-xl overflow-hidden border border-indigo-50 shadow-inner group">
                       <img src={q.optionImages[oIdx]!} className="w-full h-full object-contain p-2" alt={`şık ${oIdx} görsel`} />
                       <button onClick={() => removeOptionImage(idx, oIdx)} className="absolute top-2 right-2 bg-red-500/80 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md transition-opacity">×</button>
                     </div>
                   )}
                 </div>
               ))}
             </div>
          </div>
        ))}

        <button onClick={() => setEditingExam({...editingExam, questions: [...editingExam.questions, { id: crypto.randomUUID(), text: '', options: ['', '', '', ''], correctAnswerIndex: 0, optionImages: [null, null, null, null] }]})} className="w-full py-5 bg-white border-2 border-dashed border-indigo-100 text-indigo-300 rounded-[2rem] font-black text-[10px] active:scale-98 transition-all">+ MANUEL SORU EKLE</button>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t flex gap-3 max-w-md mx-auto z-50">
          <button onClick={() => setEditingExam(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px]">İPTAL</button>
          <button onClick={handleSave} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">KAYDET VE YAYINLA</button>
        </div>

        {showAIMenu && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full rounded-[3rem] p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
              <div className="text-center space-y-2">
                <div className="text-3xl">✨</div>
                <h3 className="font-black text-xl text-gray-800 uppercase tracking-tight">AI Soru Sihirbazı</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Görselden veya metinden soru üretin</p>
              </div>
              <label className={`w-full h-32 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${aiFile ? 'border-emerald-500 bg-emerald-50' : 'border-indigo-100 hover:bg-indigo-50'}`}>
                {aiFile ? <span className="text-emerald-500 font-black text-xs">DOSYA HAZIR ✅</span> : <span className="text-indigo-300 font-black text-xs uppercase">PDF / RESİM YÜKLE</span>}
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleAiFileUpload} />
              </label>
              <textarea className="w-full p-5 bg-gray-50 rounded-3xl border-none text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Konu veya talimat yazın..." rows={3} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
              <div className="flex gap-3">
                <button onClick={() => setShowAIMenu(false)} className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[10px]">KAPAT</button>
                <button onClick={handleAI} disabled={isGenerating || (!aiPrompt && !aiFile)} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] shadow-lg flex items-center justify-center gap-2">
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ÜRETİLİYOR...
                    </div>
                  ) : "SİHİRBAZI ÇALIŞTIR"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showPool && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex flex-col p-4 animate-in fade-in duration-300">
            <div className="bg-white flex-1 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
               <header className="p-6 border-b flex justify-between items-center">
                  <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Soru Havuzu ({pool.length})</h3>
                  <button onClick={() => setShowPool(false)} className="w-10 h-10 bg-gray-100 rounded-full font-bold">×</button>
               </header>
               <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {pool.length === 0 ? (
                    <div className="py-20 text-center opacity-20 font-black text-[10px] uppercase">Henüz Soru Yok</div>
                  ) : (
                    pool.map(pq => (
                      <div key={pq.id} className="bg-white p-4 rounded-3xl border border-gray-100 space-y-3 group shadow-sm">
                        <p className="text-xs font-bold text-gray-700 leading-relaxed">{pq.text}</p>
                        <button 
                          onClick={() => {
                            setEditingExam({...editingExam, questions: [...editingExam.questions, { ...pq, id: crypto.randomUUID() }]});
                            setShowPool(false);
                          }}
                          className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all uppercase"
                        >
                          + SINAVA EKLE
                        </button>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setEditingExam({ id: crypto.randomUUID(), title: '', passPercentage: 50, difficultyPoints: 100, durationMinutes: 0, questions: [], targetClasses: [], createdAt: Date.now(), status: 'ACTIVE' })} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all">YENİ SINAV OLUŞTUR</button>
      <div className="space-y-3">
        {exams.map(e => (
          <div key={e.id} className="bg-white p-5 rounded-[2.5rem] border border-gray-50 flex items-center justify-between shadow-sm">
            <div className="flex-1 truncate pr-4">
              <h4 className="font-black text-gray-800 uppercase text-xs truncate tracking-tight">{e.title}</h4>
              <div className="flex gap-2 mt-1">
                <span className="text-[8px] font-black px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md uppercase">{e.difficultyPoints} XP</span>
                <span className="text-[8px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md uppercase">{e.questions.length * 2} DK</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => exportPDF(e)} className="w-12 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-[10px] font-black border border-amber-100">PDF</button>
              <button onClick={() => setEditingExam(e)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-sm active:scale-90 transition-all">✏️</button>
              <button onClick={async () => { if(confirm("Sınavı silmek istediğinize emin misiniz?")) { await dbService.deleteExam(e.id); refresh(); } }} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-sm active:scale-90 transition-all">🗑️</button>
            </div>
          </div>
        ))}
        {exams.length === 0 && <div className="py-20 text-center opacity-20 font-black uppercase text-[10px] tracking-widest">Sınav Bulunamadı</div>}
      </div>
    </div>
  );
};

export default ExamManagement;
