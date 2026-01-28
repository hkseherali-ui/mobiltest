
import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Student } from '../types';

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ schoolNo: '', name: '', surname: '', classGroup: '', password: '' });

  useEffect(() => { refresh(); }, []);
  const refresh = async () => setStudents(await dbService.getStudents());

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let text = event.target?.result as string;
        text = text.replace(/^\uFEFF/, "");

        const lines = text.split(/\r?\n/);
        let count = 0;
        
        for (const line of lines) {
          if (!line.trim()) continue;

          const delimiter = line.includes(';') ? ';' : ',';
          const parts = line.split(delimiter).map(x => x.trim());

          if (parts.length >= 4) {
            const [no, name, surname, cls, pwd] = parts;
            
            if (no.toLowerCase().includes("no") || name.toLowerCase().includes("ad")) continue;

            await dbService.saveStudent({
              id: crypto.randomUUID(),
              role: 'STUDENT',
              schoolNo: no,
              name: name,
              surname: surname,
              classGroup: cls.toUpperCase(),
              username: no,
              passwordHash: pwd || no, 
              createdAt: Date.now()
            } as Student);
            count++;
          }
        }

        if (count > 0) {
          alert(`${count} öğrenci başarıyla eklendi.`);
        } else {
          alert("Uygun formatta veri bulunamadı.");
        }
        refresh();
      } catch (err) {
        console.error(err);
        alert("Dosya okunurken bir hata oluştu.");
      }
      e.target.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

  const classes = students.reduce((acc: any, s) => {
    if (!acc[s.classGroup]) acc[s.classGroup] = [];
    acc[s.classGroup].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Toplam Öğrenci Sayısı Özeti */}
      <div className="bg-indigo-50 p-5 rounded-[2rem] border border-indigo-100 flex items-center justify-between shadow-sm animate-in fade-in duration-700">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Sisteme Kayıtlı</span>
          <span className="text-xl font-black text-indigo-900 uppercase">Toplam Öğrenci</span>
        </div>
        <div className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-200">
          {students.length}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <button onClick={() => setIsAdding(!isAdding)} className="flex-1 py-4 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all">
            {isAdding ? 'İPTAL' : '+ MANUEL EKLE'}
          </button>
          <label className="flex-1 py-4 bg-emerald-600 text-white rounded-3xl font-black uppercase text-[10px] shadow-xl text-center cursor-pointer active:scale-95 transition-all">
            📂 EXCEL (CSV) YÜKLE
            <input type="file" accept=".csv" onChange={handleExcelImport} className="hidden" />
          </label>
        </div>
        <p className="text-[9px] text-gray-400 font-bold text-center px-4 uppercase tracking-tighter">
          CSV Formatı: <span className="text-indigo-500">No, Ad, Soyad, Sınıf, Şifre(Opsiyonel)</span>
        </p>
      </div>

      {isAdding && (
        <form onSubmit={async (e) => {
          e.preventDefault();
          if(!formData.schoolNo || !formData.name || !formData.password) {
            alert("Lütfen okul no, ad ve şifre alanlarını doldurun.");
            return;
          }
          await dbService.saveStudent({ 
            id: crypto.randomUUID(), 
            role: 'STUDENT', 
            name: formData.name,
            surname: formData.surname,
            schoolNo: formData.schoolNo,
            classGroup: formData.classGroup,
            username: formData.schoolNo, 
            passwordHash: formData.password, 
            createdAt: Date.now() 
          } as Student);
          setFormData({ schoolNo: '', name: '', surname: '', classGroup: '', password: '' });
          setIsAdding(false);
          refresh();
        }} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-indigo-50 space-y-4 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-2 gap-3">
            <input className="p-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Okul No" required value={formData.schoolNo} onChange={e => setFormData({...formData, schoolNo: e.target.value})} />
            <input className="p-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Sınıf (Örn: 9-A)" required value={formData.classGroup} onChange={e => setFormData({...formData, classGroup: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="p-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ad" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input className="p-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Soyad" required value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} />
          </div>
          <div className="relative">
            <input 
              type="text"
              className="w-full p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 font-black text-indigo-600 placeholder-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="Öğrenci Giriş Şifresi" 
              required 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-300 uppercase">Giriş Anahtarı</span>
          </div>
          <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all">ÖĞRENCİYİ KAYDET</button>
        </form>
      )}

      <div className="space-y-6">
        {Object.keys(classes).length === 0 ? (
          <div className="text-center py-10 opacity-20 font-black uppercase text-xs tracking-widest">Kayıtlı Öğrenci Yok</div>
        ) : (
          Object.keys(classes).sort().map(c => (
            <div key={c} className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{c} SINIFI</h4>
                <span className="bg-gray-100 text-gray-400 text-[9px] font-black px-2 py-0.5 rounded-md">{classes[c].length} ÖĞRENCİ</span>
              </div>
              {classes[c].map((s: Student) => (
                <div key={s.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex justify-between items-center shadow-sm">
                  <div className="flex flex-col">
                    <div className="font-black text-gray-800 text-sm uppercase">{s.name} {s.surname}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-[9px] font-black text-gray-400 uppercase">NO: {s.schoolNo}</div>
                      <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                      <div className="text-[9px] font-black text-indigo-400 uppercase">ŞİFRE: {s.passwordHash}</div>
                    </div>
                  </div>
                  <button onClick={async () => { if(confirm(`${s.name} silinsin mi?`)) { await dbService.deleteStudent(s.schoolNo); refresh(); } }} className="w-10 h-10 bg-red-50 text-red-400 rounded-xl flex items-center justify-center active:scale-90 transition-all">🗑️</button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentManagement;
