
import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Exam, ExamResult, Student, Question } from '../types';

declare const jspdf: any;

const AnalysisView: React.FC = () => {
  const [analysisMode, setAnalysisMode] = useState<'EXAM' | 'STUDENT' | 'CLASS'>('EXAM');
  const [selectedId, setSelectedId] = useState<string>('');
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [allResults, setAllResults] = useState<ExamResult[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [exs, res, sts] = await Promise.all([
        dbService.getExams(),
        dbService.getResults(),
        dbService.getStudents()
      ]);
      setExams(exs);
      setAllResults(res);
      setAllStudents(sts);
      setLoading(false);
    };
    fetchData();
  }, []);

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

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center font-black text-xs text-gray-400">YÜKLENİYOR...</div>;

  const availableClasses = Array.from(new Set(allStudents.map(s => s.classGroup))).sort();
  const selectedExam = exams.find(e => e.id === selectedId);

  // Question success analysis logic
  const getQuestionStats = () => {
    if (!selectedExam) return [];
    const examResults = allResults.filter(r => r.examId === selectedExam.id);
    if (examResults.length === 0) return [];

    return selectedExam.questions.map((q, idx) => {
      let correctCount = 0;
      examResults.forEach(res => {
        if (res.answers && res.answers[q.id] === q.correctAnswerIndex) {
          correctCount++;
        }
      });
      const successRate = Math.round((correctCount / examResults.length) * 100);
      return {
        id: q.id,
        index: idx + 1,
        text: q.text,
        successRate,
        correctCount,
        totalCount: examResults.length
      };
    });
  };

  const exportQuestionAnalysisPDF = () => {
    if (!selectedId || !selectedExam) return;
    const stats = getQuestionStats();
    if (stats.length === 0) { alert("Analiz edilecek veri bulunamadı."); return; }

    const doc = new jspdf.jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(tr(`${selectedExam.title} - SORU BASARI ANALIZI`), 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(tr(`Toplam Katilim: ${stats[0].totalCount} Ogrenci`), 14, 28);
    doc.text(tr(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`), 14, 33);

    const tableData = stats.map(s => [
      s.index,
      tr(s.text.substring(0, 60) + (s.text.length > 60 ? '...' : '')),
      s.correctCount,
      s.totalCount - s.correctCount,
      `%${s.successRate}`
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [['No', 'Soru Metni (Ilk 60 Karakter)', 'Dogru', 'Yanlis', 'Basari']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
      }
    });

    doc.save(`${tr(selectedExam.title)}_Soru_Analizi.pdf`);
  };

  const getClassAnalysis = () => {
    if (!selectedId) return [];
    const classStudents = allStudents.filter(s => s.classGroup === selectedId);
    const studentStats = classStudents.map(student => {
      const studentResults = allResults.filter(r => r.studentId === student.id);
      const totalCorrect = studentResults.reduce((acc, r) => acc + (r.correctCount || 0), 0);
      const totalWrong = studentResults.reduce((acc, r) => acc + (r.wrongCount || 0), 0);
      const totalXP = studentResults.reduce((acc, r) => acc + (r.pointsEarned || 0), 0);
      const examsTaken = studentResults.length;
      return { ...student, totalCorrect, totalWrong, totalXP, examsTaken };
    });
    return studentStats.sort((a, b) => b.totalCorrect - a.totalCorrect);
  };

  const exportClassPDF = () => {
    if (!selectedId) return;
    const doc = new jspdf.jsPDF();
    const stats = getClassAnalysis();
    doc.setFontSize(18);
    doc.text(tr(`${selectedId} SINIFI GENEL BASARI RAPORU`), 14, 22);
    doc.setFontSize(10);
    doc.text(tr(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`), 14, 30);
    const tableData = stats.map((s, idx) => [
      idx + 1,
      tr(`${s.name} ${s.surname}`),
      s.schoolNo,
      s.totalCorrect,
      s.totalWrong,
      `${s.totalXP} XP`
    ]);
    (doc as any).autoTable({
      startY: 40,
      head: [['Sıra', 'Öğrenci', 'No', 'D', 'Y', 'XP']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save(`${selectedId}_Sinif_Analizi.pdf`);
  };

  const exportExamResultsPDF = () => {
    if (!selectedId || !selectedExam) return;
    const doc = new jspdf.jsPDF();
    const results = allResults.filter(r => r.examId === selectedId);
    
    const tableData = results.map((r, idx) => {
      const student = allStudents.find(s => s.id === r.studentId);
      return [
        idx + 1,
        student ? tr(`${student.name} ${student.surname}`) : 'Bilinmiyor',
        student?.schoolNo || '-',
        r.correctCount,
        r.wrongCount,
        `%${r.score}`,
        `${r.pointsEarned} XP`
      ];
    }).sort((a, b) => parseInt(b[5].toString().replace('%','')) - parseInt(a[5].toString().replace('%','')));

    doc.setFontSize(16);
    doc.text(tr(`${selectedExam.title.toUpperCase()} SONUCLARI`), 14, 20);
    doc.setFontSize(10);
    doc.text(`Katilim Sayisi: ${results.length}`, 14, 28);

    (doc as any).autoTable({
      startY: 35,
      head: [['Sira', 'Ogrenci', 'No', 'D', 'Y', 'Puan', 'XP']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`${tr(selectedExam.title)}_Sonuclari.pdf`);
  };

  const exportReportCard = (result: ExamResult, student: Student, exam: Exam) => {
    const doc = new jspdf.jsPDF();
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 80);
    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229);
    doc.text(tr("SINAV SONUC KARNESI"), 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`${tr("Ogrenci:")} ${tr(student.name)} ${tr(student.surname)}`, 20, 40);
    doc.text(`${tr("Okul No:")} ${student.schoolNo}`, 20, 47);
    doc.text(`${tr("Sinav:")} ${tr(exam.title)}`, 20, 54);
    doc.line(20, 60, 190, 60);
    doc.setFontSize(12);
    doc.text(`${tr("Basari Puani:")} %${result.score}`, 20, 70);
    doc.text(`${tr("Dogru:")} ${result.correctCount}  |  ${tr("Yanlis:")} ${result.wrongCount}`, 20, 77);
    doc.text(`${tr("Kazandigi:")} ${result.pointsEarned} XP`, 150, 70);
    doc.save(`${student.schoolNo}_Karne.pdf`);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex bg-gray-100 rounded-2xl p-1">
        <button onClick={() => { setAnalysisMode('EXAM'); setSelectedId(''); }} className={`flex-1 py-3 text-[10px] font-black rounded-xl ${analysisMode === 'EXAM' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>SINAV</button>
        <button onClick={() => { setAnalysisMode('CLASS'); setSelectedId(''); }} className={`flex-1 py-3 text-[10px] font-black rounded-xl ${analysisMode === 'CLASS' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>SINIF</button>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">
          {analysisMode === 'EXAM' ? 'İncelenecek Sınav' : 'İncelenecek Sınıf'}
        </label>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-black text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="">Seçiniz...</option>
          {analysisMode === 'EXAM' ? exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>) : availableClasses.map(c => <option key={c} value={c}>{c} Sınıfı</option>)}
        </select>
      </div>

      {selectedId && analysisMode === 'CLASS' && (
        <div className="space-y-4 animate-in fade-in duration-500">
           <button onClick={exportClassPDF} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2">
             📥 SINIF ANALİZ PDF İNDİR
           </button>
           
           <div className="bg-indigo-50 p-4 rounded-3xl flex justify-around text-center border border-indigo-100">
              <div>
                <div className="text-[8px] font-black text-indigo-400 uppercase">Öğrenci</div>
                <div className="text-lg font-black text-indigo-900">{allStudents.filter(s => s.classGroup === selectedId).length}</div>
              </div>
              <div className="w-px h-8 bg-indigo-200"></div>
              <div>
                <div className="text-[8px] font-black text-indigo-400 uppercase">Katılım</div>
                <div className="text-lg font-black text-indigo-900">{allResults.filter(r => allStudents.find(s => s.id === r.studentId)?.classGroup === selectedId).length}</div>
              </div>
           </div>

           <div className="space-y-2">
             {getClassAnalysis().map((s, idx) => (
               <div key={s.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-black text-gray-800 text-xs uppercase">{s.name} {s.surname}</div>
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                        NO: {s.schoolNo} • {s.examsTaken} SINAV
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                       <div className="text-[10px] font-black text-emerald-500">{s.totalCorrect} D</div>
                       <div className="text-[10px] font-black text-red-400">{s.totalWrong} Y</div>
                    </div>
                    <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl text-[10px] font-black">
                      {s.totalXP} XP
                    </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {selectedId && analysisMode === 'EXAM' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={exportExamResultsPDF} className="py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2">
               📥 SONUÇLAR PDF
            </button>
            <button onClick={exportQuestionAnalysisPDF} className="py-4 bg-amber-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2">
               📥 ANALİZ PDF
            </button>
          </div>

          {/* Question Success Analysis Section */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Soru Başarı Analizi</h3>
              <span className="text-[8px] font-black bg-amber-50 text-amber-600 px-2 py-1 rounded-lg uppercase">Detaylı Grafik</span>
            </div>
            <div className="space-y-4">
              {getQuestionStats().map(qs => (
                <div key={qs.id} className="space-y-1.5">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-bold text-gray-600 truncate max-w-[200px]">
                      {qs.index}. {qs.text}
                    </span>
                    <span className={`text-[10px] font-black ${
                      qs.successRate > 70 ? 'text-emerald-500' : 
                      qs.successRate > 30 ? 'text-amber-500' : 'text-red-500'
                    }`}>%{qs.successRate}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        qs.successRate > 70 ? 'bg-emerald-400' : 
                        qs.successRate > 30 ? 'bg-amber-400' : 'bg-red-400'
                      }`} 
                      style={{ width: `${qs.successRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between px-1">
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">
                      {qs.correctCount} / {qs.totalCount} ÖĞRENCİ DOĞRU YAPTI
                    </span>
                    <span className="text-[8px] font-black text-gray-300 uppercase">
                      {qs.successRate > 70 ? 'KOLAY' : qs.successRate > 30 ? 'ORTA' : 'ZOR'}
                    </span>
                  </div>
                </div>
              ))}
              {getQuestionStats().length === 0 && (
                <div className="text-center py-4 text-[10px] font-black text-gray-300 uppercase italic">
                  Henüz Katılım Verisi Yok
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center px-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Öğrenci Sıralaması</h3>
            <span className="text-[10px] font-black text-indigo-600">{allResults.filter(r => r.examId === selectedId).length} Katılım</span>
          </div>
          
          <div className="space-y-3">
            {allResults.filter(r => r.examId === selectedId).sort((a,b) => b.score - a.score).map(r => {
              const student = allStudents.find(s => s.id === r.studentId);
              if (!student || !selectedExam) return null;
              return (
                <div key={r.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-[10px] ${r.isPassed ? 'bg-emerald-500' : 'bg-red-400'}`}>%{r.score}</div>
                    <div>
                        <div className="font-black text-gray-800 text-xs uppercase">{student.name} {student.surname}</div>
                        <div className="text-[9px] font-black text-gray-400 uppercase">{r.correctCount}D {r.wrongCount}Y • +{r.pointsEarned} XP</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => exportReportCard(r, student, selectedExam)}
                    className="p-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black active:scale-95 transition-all"
                  >
                    📄 KARNE
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisView;
