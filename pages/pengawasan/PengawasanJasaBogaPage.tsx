/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  ClipboardCheck, 
  MapPin, 
  User, 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  Printer, 
  Building2,
  Users,
  Utensils,
  Zap,
  Info,
  Lightbulb,
  Edit3,
  Camera,
  X,
  FileText,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { IKL_JASA_BOGA_DATA } from "./dataJasaBoga";
import { useFirebaseSessionJasaBoga } from "./firebaseHooksJasaBoga";
import { exportToWordJasaBoga, exportToExcelJasaBoga } from "./exportUtilsJasaBoga";
import { useNavigate } from "react-router-dom";

function Input({ label, icon, value, onChange, type = "text", options }: any) {
  return (
    <div className="flex flex-col gap-2 relative">
      <label className="text-xs font-bold uppercase tracking-wider text-[#9e9e9e] flex items-center gap-2 font-mono">
        {icon} {label}
      </label>
      {options ? (
        <select 
          className="bg-[#fcfcfc] border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] transition-all outline-none appearance-none font-semibold text-gray-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
          value={value} 
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>Pilih {label}...</option>
          {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input 
          type={type} 
          className="bg-[#fcfcfc] border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] transition-all outline-none font-semibold text-gray-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          placeholder={`Masukkan ${label}...`}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, sub }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-[#e5e5e5] shadow-sm flex flex-col gap-3 group hover:border-[#1a1a1a] transition-colors relative overflow-hidden">
      <div className="flex items-center justify-between text-[#9e9e9e]">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-3xl font-light tracking-tight text-[#1a1a1a]">{value}</div>
      <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{sub}</div>
      <div className="absolute -bottom-4 -right-4 text-gray-50 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110">
        {React.cloneElement(icon, { size: 64 })}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-dashed border-gray-200 pb-3 last:border-0 last:pb-0">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-gray-800 leading-snug">{value}</span>
    </div>
  );
}

function Lobby({ onJoin, onCreate, error, loading, setError, onBack }: any) {
  const [code, setCode] = useState("");
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4 text-[#1a1a1a] font-sans relative">
      <button 
        onClick={onBack} 
        className="absolute top-6 left-6 p-2.5 text-gray-600 hover:bg-white hover:shadow-md rounded-xl flex items-center gap-2 transition-all font-bold text-sm bg-gray-100 border border-gray-200"
      >
        <ChevronLeft size={18} /> Kembali ke Dashboard
      </button>
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md border border-[#e5e5e5]">
        <div className="flex justify-center mb-6">
          <div className="bg-orange-500 p-4 rounded-2xl text-white shadow-lg shadow-orange-500/20">
            <ClipboardCheck size={40} />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-center mb-2 tracking-tight uppercase">Inspeksi Jasa Boga</h1>
        <p className="text-center text-gray-500 text-sm font-medium mb-10">Mulai atau gabung sesi inspeksi (Permen 17 2024)</p>
        
        {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold flex items-start gap-3"><AlertCircle size={18} className="shrink-0 mt-0.5" />{error}</div>}
        
        <div className="space-y-6">
          <button onClick={onCreate} disabled={loading} className="w-full bg-[#1a1a1a] text-white rounded-xl py-4 font-black uppercase tracking-widest hover:bg-black transition-all hover:scale-[1.02] shadow-xl shadow-black/10 flex items-center justify-center gap-2">
            {loading ? "Memproses..." : <><Building2 size={18}/> Buat Sesi Baru</>}
          </button>
          
          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-black uppercase tracking-widest">Atau Gabung Sesi</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 text-center">Masukkan Kode Akses Sesi</label>
            <input 
              value={code} 
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }} 
              placeholder="JB-XXXXX" 
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 font-mono font-black text-xl text-center tracking-widest outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all uppercase" 
            />
            <button onClick={() => onJoin(code)} disabled={loading || !code} className="w-full bg-orange-500 text-white rounded-xl py-4 mt-4 font-black uppercase tracking-widest hover:bg-orange-600 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
              {loading ? "Menghubungkan..." : <><Users size={18}/> Gabung Sesi</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PengawasanJasaBogaPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [viewingPhoto, setViewingPhoto] = useState<{criteriaId: string, index: number} | null>(null);
  
  const {
    sessionId, data, loading, error, setError,
    createSession, joinSession, leaveSession, setInfo, 
    setCatatan, setIklSuggestions, toggleIkl, uploadPhoto, deletePhoto
  } = useFirebaseSessionJasaBoga();
  
  const [showExportMenu, setShowExportMenu] = useState(false);

  const { info, iklAnswers, catatan, iklSuggestions, iklPhotos } = data;

  const resetForm = () => {
    leaveSession();
  };

  const totalMaxScore = 412; // Sesuai dengan hasil hitungan akhir (termasuk sub-kriteria)

  const totalPointsLost = useMemo(() => {
    let lost = 0;
    Object.keys(iklAnswers).forEach((criteriaId) => {
      const criteria = IKL_JASA_BOGA_DATA.find(c => c.id === criteriaId);
      if (criteria && iklAnswers[criteriaId]) {
        lost += criteria.score;
      }
    });
    return lost;
  }, [iklAnswers]);

  const iklScore = useMemo(() => {
    const score = 100 - ((totalPointsLost / totalMaxScore) * 100);
    return Math.max(0, parseFloat(score.toFixed(2)));
  }, [totalPointsLost, totalMaxScore]);

  const categoryAnalysis = useMemo(() => {
    const analysis: Record<string, number> = {};
    Object.keys(iklAnswers).forEach((criteriaId) => {
      const criteria = IKL_JASA_BOGA_DATA.find(c => c.id === criteriaId);
      if (criteria && iklAnswers[criteriaId]) {
        const cat = criteria.category || "Kriteria Umum";
        analysis[cat] = (analysis[cat] || 0) + criteria.score;
      }
    });
    return Object.entries(analysis).sort((a, b) => b[1] - a[1]);
  }, [iklAnswers]);

  const handlePhotoUpload = (criteriaId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        uploadPhoto(criteriaId, dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!sessionId) return <Lobby onJoin={joinSession} onCreate={createSession} error={error} loading={loading} setError={setError} onBack={() => navigate('/admin/dashboard')} />;

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e5e5] sticky top-0 z-50 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 p-2 rounded-lg text-white">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight uppercase tracking-tight">Inspeksi Kesehatan Lingkungan</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-[#9e9e9e] font-medium tracking-wide">JASA BOGA / KATERING (Permen 17 2024)</p>
              <div 
                className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors" 
                title="Sesi ID - Klik untuk Copy" 
                onClick={() => {
                  navigator.clipboard.writeText(sessionId!);
                  alert("Kode Sesi disalin: " + sessionId);
                }}
              >
                <Zap size={10} />
                <span className="text-[10px] font-black uppercase tracking-widest">{sessionId}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 print:hidden">
          <div className="hidden lg:flex items-center gap-1 bg-gray-50 border border-[#e5e5e5] rounded-xl p-1.5 mr-4">
            {[
              { id: 1, icon: <User size={14} />, label: "Info" },
              { id: 2, icon: <ClipboardCheck size={14} />, label: "IKL" },
              { id: 3, icon: <Lightbulb size={14} />, label: "Saran" },
              { id: 4, icon: <CheckCircle2 size={14} />, label: "Hasil" }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${step === s.id ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#9e9e9e] hover:text-[#1a1a1a]"}`}
              >
                {s.icon}
                <span className={step === s.id ? "block" : "hidden group-hover:block"}>{s.label}</span>
              </button>
            ))}
          </div>

          <button 
            onClick={resetForm}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mr-2 flex items-center gap-2"
            title="Keluar / Akhiri Sesi"
          >
            <X size={20} /> <span className="text-xs font-bold uppercase hidden lg:block">Keluar</span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-5 py-2.5 bg-[#1a1a1a] text-white rounded-xl shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-black hover:scale-[1.02] transition-all"
            >
              <Download size={16} /> <span className="text-[11px] font-black uppercase tracking-widest hidden sm:block">Simpan</span>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                <div className="absolute right-0 mt-3 w-56 bg-white border border-[#e5e5e5] rounded-2xl shadow-xl overflow-hidden z-50 flex flex-col p-1.5 transform origin-top-right animate-in fade-in scale-in-95 duration-200">
                  <button onClick={() => { window.print(); setShowExportMenu(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3.5 text-sm hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors">
                    <Printer size={18} className="text-gray-500" /> Cetak / PDF
                  </button>
                  <button onClick={() => { exportToWordJasaBoga("report-content", `Laporan_JasaBoga_${info.nama || 'Draft'}.doc`); setShowExportMenu(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3.5 text-sm hover:bg-blue-50 text-blue-700 font-semibold rounded-xl transition-colors">
                    <FileText size={18} className="text-blue-500" /> Format Word
                  </button>
                  <button onClick={() => { exportToExcelJasaBoga({ info, iklAnswers, iklSuggestions, iklScore, totalMaxScore, totalPointsLost }); setShowExportMenu(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3.5 text-sm hover:bg-green-50 text-green-700 font-semibold rounded-xl transition-colors">
                    <FileSpreadsheet size={18} className="text-green-500" /> Data Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8">
        {/* Progress Bar (Floating) */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-8 text-sm font-medium text-[#9e9e9e]">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${iklScore >= 70 ? 'bg-green-500' : 'bg-orange-500'}`}></span>
              Skor IKL: <span className="text-[#1a1a1a] font-bold">{iklScore}</span>
            </div>
            <div className="flex items-center gap-2">
              Kehilangan: <span className="text-[#1a1a1a] font-bold">-{totalPointsLost} Poin</span>
            </div>
          </div>
          
          <div className="w-full md:w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 transition-all duration-500" 
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e5e5e5] overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 md:p-10"
              >
                <div className="mb-8 border-b border-[#f5f5f5] pb-6 flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Informasi Jasa Boga</h2>
                    <p className="text-sm text-gray-400">Lengkapi data dasar Jasa Boga yang akan diinspeksi.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <Input 
                    label="Nama Jasa Boga/Katering" 
                    icon={<Building2 size={16}/>} 
                    value={info.nama} 
                    onChange={(v: string) => setInfo({...info, nama: v})} 
                  />
                  <Input 
                    label="Nama Pemeriksa" 
                    icon={<User size={16}/>} 
                    value={info.namaPemeriksa} 
                    onChange={(v: string) => setInfo({...info, namaPemeriksa: v})} 
                    options={["MULYADI", "ABDUL KADIR", "SAWWIR", "SYARIFA AINUN", "AKHMAD HOLILI FAUZAN", "ISNAINI"]}
                  />
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#9e9e9e] mb-2 font-mono">Alamat Lengkap</label>
                    <textarea 
                      className="w-full bg-[#fcfcfc] border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] transition-all min-h-[100px] outline-none"
                      value={info.alamat}
                      onChange={e => setInfo({...info, alamat: e.target.value})}
                      placeholder="Masukkan alamat lengkap..."
                    />
                  </div>
                  <Input 
                    label="Penanggung Jawab" 
                    icon={<User size={16}/>} 
                    value={info.penanggungJawab} 
                    onChange={(v: string) => setInfo({...info, penanggungJawab: v})} 
                  />
                  <Input 
                    label="Tanggal Pemeriksaan" 
                    type="date"
                    value={info.tanggalPemeriksaan} 
                    onChange={(v: string) => setInfo({...info, tanggalPemeriksaan: v})} 
                  />

                  <Input 
                    label="Jumlah Hari Berjualan / Bulan" 
                    icon={<Zap size={16}/>} 
                    value={info.hariBerjualan} 
                    onChange={(v: string) => setInfo({...info, hariBerjualan: v})} 
                  />
                  <Input 
                    label="Jumlah Porsi Harian" 
                    icon={<Utensils size={16}/>} 
                    value={info.porsiHarian} 
                    onChange={(v: string) => setInfo({...info, porsiHarian: v})} 
                  />
                  <Input 
                    label="Pangan Didistribusikan Ke" 
                    icon={<MapPin size={16}/>} 
                    value={info.distribusiKe} 
                    onChange={(v: string) => setInfo({...info, distribusiKe: v})} 
                  />
                  <Input 
                    label="Total Penjamah Pangan" 
                    icon={<Users size={16}/>} 
                    value={info.totalPenjamah} 
                    onChange={(v: string) => setInfo({...info, totalPenjamah: v})} 
                  />
                  <Input 
                    label="Penjamah Bersertifikat" 
                    icon={<CheckCircle2 size={16}/>} 
                    value={info.penjamahBersertifikat} 
                    onChange={(v: string) => setInfo({...info, penjamahBersertifikat: v})} 
                  />
                  <div className="md:col-span-2">
                    <Input 
                      label="Menu Pangan Berisiko yang Dijual" 
                      icon={<AlertCircle size={16}/>} 
                      value={info.menuBerisiko} 
                      onChange={(v: string) => setInfo({...info, menuBerisiko: v})} 
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 md:p-10"
              >
                <div className="mb-6 border-b border-[#f5f5f5] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white z-10 pt-2">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight">Kriteria Penilaian IKL Jasa Boga</h2>
                      <p className="text-sm text-gray-400 italic">Tekan tombol TMS (Tidak Memenuhi Syarat) jika persyaratan TIDAK terpenuhi.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  {IKL_JASA_BOGA_DATA.map((item, idx) => {
                    const isSelected = !!iklAnswers[item.id];

                    return (
                      <div key={item.id} className="pb-8 border-b border-[#f5f5f5] last:border-0 last:pb-0">
                        <div className="flex gap-4 mb-4">
                          <span className="text-xs font-mono font-bold text-gray-300 mt-1">{String(idx + 1).padStart(2, '0')}</span>
                          <div className="flex-1">
                          {item.category && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-1 block">{item.category}</span>
                          )}
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm font-medium leading-relaxed">{item.text}</p>
                            <div className="flex shrink-0 gap-2">
                              <label className="p-2 bg-gray-50 text-gray-400 hover:bg-orange-50 hover:text-orange-500 rounded-lg cursor-pointer transition-colors shadow-sm border border-gray-100">
                                <Camera size={16} />
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*" 
                                  capture="environment"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePhotoUpload(item.id, file);
                                  }} 
                                />
                              </label>
                            </div>
                          </div>
                          
                          {iklPhotos[item.id]?.length > 0 && (
                            <div className="flex gap-3 mt-3">
                              {iklPhotos[item.id].map((base64, i) => (
                                <button 
                                  key={i} 
                                  onClick={() => setViewingPhoto({ criteriaId: item.id, index: i })}
                                  className="w-14 h-14 rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all p-0 focus:outline-none shadow-sm"
                                  title="Review Foto"
                                >
                                  <img src={base64} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 md:gap-3 ml-8">
                        <button
                          onClick={() => toggleIkl(item.id)}
                          className={`
                            px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-tight transition-all duration-300 flex items-center gap-2
                            ${isSelected 
                              ? "bg-red-50 border-red-200 text-red-600 shadow-[inset_0_1px_2px_rgba(220,38,38,0.1)]" 
                              : "bg-white border-[#e5e5e5] text-[#9e9e9e] hover:border-[#1a1a1a] hover:text-[#1a1a1a]"}
                          `}
                        >
                          <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-red-500 scale-125" : "bg-gray-200"}`}></span>
                          <span>TMS (TIDAK MEMENUHI)</span>
                          <span className={`transition-opacity font-mono ${isSelected ? "opacity-100 font-black text-red-700" : "opacity-40"}`}>
                            -{item.score}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 md:p-10"
              >
                <div className="mb-8 border-b border-[#f5f5f5] pb-6 flex items-start gap-4 sticky top-0 bg-white z-10 pt-2">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <Lightbulb size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Saran Perbaikan</h2>
                    <p className="text-sm text-gray-400 italic">Daftar temuan dan rekomendasi tindakan berdasarkan inspeksi.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {Object.keys(iklAnswers).length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 font-medium">Tidak ada ketidaksesuaian yang ditemukan pada penilaian IKL.</p>
                    </div>
                  ) : (
                    Object.keys(iklAnswers).map((criteriaId) => {
                      const criteria = IKL_JASA_BOGA_DATA.find(i => i.id === criteriaId);
                      if (!criteria || !iklAnswers[criteriaId]) return null;

                      return (
                        <div key={criteriaId} className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden shadow-sm">
                          <div className="bg-gray-50 px-6 py-3 border-b border-[#e5e5e5] flex justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{criteria.category || "Umum"}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Poin Hilang: -{criteria.score}</span>
                          </div>
                          <div className="p-6 flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-red-600">
                                <AlertCircle size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Temuan TMS:</span>
                              </div>
                              <p className="text-sm font-medium text-gray-700">
                                {criteria.text}
                              </p>
                            </div>
                            <div className="flex flex-col gap-3 p-4 bg-green-50 rounded-xl border border-green-100 group/edit">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-700">
                                  <CheckCircle2 size={16} />
                                  <span className="text-xs font-bold uppercase tracking-wider">Saran Perbaikan:</span>
                                </div>
                                <Edit3 size={14} className="text-green-300 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                              </div>
                              <textarea
                                className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-green-800 focus:ring-0 resize-none min-h-[60px]"
                                value={iklSuggestions[criteriaId] !== undefined ? iklSuggestions[criteriaId] : (criteria.suggestion || "")}
                                onChange={(e) => setIklSuggestions({ ...iklSuggestions, [criteriaId]: e.target.value })}
                                placeholder="Tuliskan saran perbaikan di sini..."
                                rows={2}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-12">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#9e9e9e] mb-4 font-mono">Catatan Lain, Kesimpulan dan Saran Tambahan:</label>
                  <textarea 
                    className="w-full bg-[#fcfcfc] border border-[#e5e5e5] rounded-2xl px-6 py-4 text-sm focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] transition-all min-h-[200px] outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                    value={catatan}
                    onChange={e => setCatatan(e.target.value)}
                    placeholder="Masukkan catatan tambahan di sini..."
                  />
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="p-6 md:p-10 bg-white"
                id="report-content"
              >
                {/* Print Header / Kop Surat */}
                <div className="hidden print:flex flex-col items-center text-center mb-8 border-b-2 border-black pb-6">
                  <h3 className="text-xl font-bold uppercase tracking-widest">Berita Acara Pemeriksaan</h3>
                  <h2 className="text-2xl font-black uppercase">Inspeksi Kesehatan Lingkungan</h2>
                  <p className="text-sm font-bold mt-1">JASA BOGA / KATERING</p>
                </div>

                <div className="mb-12 text-center print:hidden">
                  <div className="inline-flex p-4 bg-orange-50 text-orange-600 rounded-2xl mb-4">
                    <Calculator size={32} />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">Ringkasan Hasil Inspeksi Jasa Boga</h2>
                  <p className="text-sm text-gray-400 mt-2">Ulas kembali hasil penilaian sebelum mencetak laporan resmi.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  <div className="bg-[#1a1a1a] text-white p-8 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl shadow-black/20">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Zap size={120} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-2">Skor Akhir (%)</span>
                    <div className="text-8xl font-light tracking-tighter mb-4">{iklScore}</div>
                    <div className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest ${iklScore >= 70 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {iklScore >= 70 ? 'MEMENUHI SYARAT (MS)' : 'TIDAK MEMENUHI SYARAT (TMS)'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <SummaryCard label="Total Poin Hilang" value={totalPointsLost} icon={<AlertCircle size={16}/>} sub={`Dari max ${totalMaxScore} poin`} />
                    <SummaryCard label="Total TMS" value={Object.keys(iklAnswers).length} icon={<AlertCircle size={16}/>} sub="Kriteria" />
                    <SummaryCard label="Item Diperiksa" value={`${IKL_JASA_BOGA_DATA.length}`} icon={<Info size={16}/>} sub="Progress IKL" />
                  </div>

                  <div className="p-8 bg-white border border-[#e5e5e5] rounded-3xl shadow-sm md:col-span-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9e9e9e] mb-6 font-mono flex items-center gap-2">
                       <Calculator size={14}/> Analisis Poin Hilang Per Kategori
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {categoryAnalysis.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Tidak ada poin yang hilang.</p>
                      ) : (
                        categoryAnalysis.map(([cat, lost]) => (
                          <div key={cat} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-[#1a1a1a]">{cat}</span>
                              <span className="font-black text-red-600">-{lost} Poin</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-red-500 rounded-full" 
                                style={{ width: `${Math.min(100, (lost / 30) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9e9e9e] mb-6 font-mono flex items-center gap-2">
                       <MapPin size={14}/> Informasi Jasa Boga & Pemeriksaan
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-12">
                       <DetailRow label="Nama Jasa Boga" value={info.nama || "-"} />
                       <DetailRow label="Penanggung Jawab" value={info.penanggungJawab || "-"} />
                       <DetailRow label="Alamat Lengkap" value={info.alamat || "-"} />
                       <DetailRow label="Pemeriksa (Sanitarian)" value={info.namaPemeriksa || "-"} />
                       <DetailRow label="Tanggal Pemeriksaan" value={info.tanggalPemeriksaan || "-"} />

                       <DetailRow label="Porsi Harian" value={info.porsiHarian || "-"} />
                    </div>
                  </div>

                  {Object.keys(iklAnswers).length > 0 && (
                    <div className="p-8 bg-white border border-[#e5e5e5] rounded-3xl shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9e9e9e] font-mono flex items-center gap-2">
                          <AlertCircle size={14}/> Temuan & Rekomendasi Perbaikan
                        </h3>
                        <div className="h-px flex-1 bg-gray-100 mx-4"></div>
                      </div>
                      <div className="flex flex-col gap-8">
                        {Object.keys(iklAnswers).map((criteriaId) => {
                          const criteria = IKL_JASA_BOGA_DATA.find(i => i.id === criteriaId);
                          if (!criteria || !iklAnswers[criteriaId]) return null;
                          const suggestion = iklSuggestions[criteriaId] !== undefined ? iklSuggestions[criteriaId] : criteria.suggestion;

                          return (
                            <div key={criteriaId} className="flex flex-col gap-3 border-l-2 border-red-500 pl-4 py-1">
                              <div className="flex gap-2 text-sm font-semibold text-gray-800">
                                <span>•</span>
                                <span>{criteria.text}</span>
                              </div>
                              <div className="flex items-start gap-2 bg-green-50 p-4 rounded-xl ml-4">
                                <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 block mb-1">Rekomendasi Tindakan:</span>
                                  <span className="text-sm text-green-900 font-medium">{suggestion || "Lakukan perbaikan sesuai standar."}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {catatan && (
                     <div className="p-8 bg-blue-50 border border-blue-100 rounded-3xl">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-4 font-mono flex items-center gap-2">
                          <FileText size={14}/> Catatan Tambahan / Kesimpulan
                        </h3>
                        <p className="text-sm font-medium text-blue-900 whitespace-pre-line leading-relaxed">{catatan}</p>
                     </div>
                  )}

                  <div className="pt-20 pb-10 flex justify-end">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-24">Pemeriksa / Sanitarian,</p>
                      <p className="font-bold text-lg text-[#1a1a1a] uppercase underline underline-offset-4">{info.namaPemeriksa || "( ..................................... )"}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Photo Viewer Modal */}
      <AnimatePresence>
        {viewingPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <button 
              onClick={() => setViewingPhoto(null)}
              className="absolute top-6 right-6 text-white hover:text-gray-300 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="max-w-4xl w-full flex flex-col items-center">
              <img 
                src={iklPhotos[viewingPhoto.criteriaId][viewingPhoto.index]} 
                alt="Foto Review" 
                className="max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
              <button 
                onClick={() => {
                  if(confirm("Hapus foto ini?")) {
                    deletePhoto(viewingPhoto.criteriaId, iklPhotos[viewingPhoto.criteriaId][viewingPhoto.index]);
                    setViewingPhoto(null);
                  }
                }}
                className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20"
              >
                Hapus Foto Ini
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
