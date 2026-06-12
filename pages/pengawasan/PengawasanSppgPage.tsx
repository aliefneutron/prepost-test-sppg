/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, type ReactNode } from "react";
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
  Save,
  Trash2,
  Building2,
  Users,
  Utensils,
  Droplets,
  Zap,
  Info,
  Lightbulb,
  Edit3,
  Camera,
  Image as ImageIcon,
  X,
  FileText,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AREAS, IKL_DATA, SPECIAL_REQUIREMENTS, AreaKey } from "./data";
import { useFirebaseSession } from "./firebaseHooks";
import { exportToWord, exportToExcel } from "./exportUtils";

// --- Types ---
interface SPPGInfo {
  nama: string;
  alamat: string;
  penanggungJawab: string;
  porsiHarian: string;
  distribusiKe: string;
  totalPenjamah: string;
  penjamahBersertifikat: string;
  namaPemeriksa: string;
  tanggalPemeriksaan: string;
}

type IKLAnswer = Record<string, AreaKey[]>; // CriteriaID -> Array of selected non-compliant area keys



function Lobby({ onJoin, onCreate, error, loading, setError }: any) {
  const [code, setCode] = useState("");
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4 text-[#1a1a1a] font-sans">
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md border border-[#e5e5e5]">
        <div className="flex justify-center mb-6">
          <div className="bg-orange-500 p-4 rounded-2xl text-white shadow-lg shadow-orange-500/20">
            <ClipboardCheck size={40} />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-center mb-2 tracking-tight uppercase">Inspeksi SPPG</h1>
        <p className="text-center text-gray-500 text-sm font-medium mb-10">Mulai atau gabung sesi inspeksi kolaboratif</p>
        
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
              placeholder="SPPG-XXXXX" 
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

function AreaSelector({ onSelect, claimed, deviceId }: any) {
  const [selected, setSelected] = useState<AreaKey[]>(() => {
    const pre: AreaKey[] = [];
    Object.keys(claimed || {}).forEach(k => {
      if (claimed[k] === deviceId) pre.push(k as AreaKey);
    });
    return pre;
  });
  
  const handleStart = () => {
    if (selected.length === 0) return alert("Pilih minimal 1 area agar Anda dapat mengisi kuesioner.");
    onSelect(selected);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4 pb-20 text-[#1a1a1a] font-sans">
      <div className="bg-white p-6 md:p-12 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-5xl border border-[#e5e5e5]">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black mb-3 tracking-tight uppercase">Pilih Area Tugas Anda</h2>
          <p className="text-gray-500 text-sm font-medium max-w-md mx-auto">Tentukan area mana saja yang akan menjadi tanggung jawab pengecekan Anda saat ini.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {(Object.keys(AREAS) as AreaKey[]).map(key => {
            const isSelected = selected.includes(key);
            const isClaimedByOther = claimed && claimed[key] && claimed[key] !== deviceId;
            
            return (
              <button 
                key={key} 
                disabled={isClaimedByOther}
                onClick={() => setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
                className={`p-5 rounded-2xl text-left border-2 transition-all flex flex-col gap-3 group relative overflow-hidden 
                  ${isClaimedByOther ? "opacity-50 grayscale cursor-not-allowed bg-gray-50 border-gray-100" :
                    isSelected ? "border-orange-500 bg-orange-50 shadow-md transform scale-[1.02]" : "border-gray-100 hover:border-orange-200 bg-white hover:bg-gray-50"}`}
              >
                <div className="flex items-start justify-between w-full">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isClaimedByOther ? "text-gray-400" : isSelected ? "text-orange-600" : "text-gray-400 group-hover:text-orange-400"}`}>
                    AREA {key}
                  </span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors 
                    ${isClaimedByOther ? "border-gray-300 text-gray-300" : isSelected ? "border-orange-500 bg-orange-500 text-white" : "border-gray-200 text-transparent"}`}>
                    <CheckCircle2 size={14} />
                  </div>
                </div>
                <span className={`font-bold text-sm leading-snug ${isClaimedByOther ? "text-gray-400" : isSelected ? "text-orange-900" : "text-[#1a1a1a]"}`}>
                  {AREAS[key]} 
                  {isClaimedByOther && <span className="block text-[10px] text-red-500 mt-1 uppercase font-black tracking-widest">DIambil Tim Lain</span>}
                </span>
              </button>
            );
          })}
        </div>
        
        <div className="flex justify-center">
          <button onClick={handleStart} className="px-12 py-4 bg-[#1a1a1a] text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-[1.02] hover:bg-black transition-all flex items-center gap-3">
            Mulai Inspeksi Area <ChevronRight size={18}/>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const {
    deviceId, sessionId, assignedAreas, claimAreas, data, loading, error, setError,
    createSession, joinSession, leaveSession, setInfo, setSpecialAnswers,
    setCatatan, setIklSuggestions, toggleIkl, uploadPhoto
  } = useFirebaseSession();
  
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAreaLegend, setShowAreaLegend] = useState(false);

  const { info, iklAnswers, specialAnswers, catatan, iklSuggestions, iklPhotos } = data;

  const resetForm = () => {
    leaveSession();
  };

  const totalPointsLost = useMemo(() => {
    let lost = 0;
    Object.entries(iklAnswers).forEach(([criteriaId, areas]) => {
      const criteria = IKL_DATA.find(c => c.id === criteriaId);
      if (criteria) {
        (areas as AreaKey[]).forEach(areaKey => {
          const score = criteria.scores[areaKey];
          if (typeof score === "number") lost += score;
        });
      }
    });
    return lost;
  }, [iklAnswers]);

  const iklScore = useMemo(() => {
    const score = 100 - ((totalPointsLost / 507) * 100);
    return Math.max(0, parseFloat(score.toFixed(2)));
  }, [totalPointsLost]);

  const categoryAnalysis = useMemo(() => {
    const analysis: Record<string, number> = {};
    Object.entries(iklAnswers).forEach(([criteriaId, areas]) => {
      const criteria = IKL_DATA.find(c => c.id === criteriaId);
      if (criteria) {
        const cat = criteria.category || "Kriteria Umum";
        let lost = 0;
        (areas as AreaKey[]).forEach(areaKey => {
          const score = criteria.scores[areaKey];
          if (typeof score === "number") lost += score;
        });
        analysis[cat] = (analysis[cat] || 0) + lost;
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

  if (!sessionId) return <Lobby onJoin={joinSession} onCreate={createSession} error={error} loading={loading} setError={setError} />;
  if (assignedAreas.length === 0) return <AreaSelector onSelect={claimAreas} claimed={data.claimedAreas} deviceId={deviceId} />;

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
              <p className="text-xs text-[#9e9e9e] font-medium tracking-wide">SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)</p>
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
              { id: 3, icon: <Zap size={14} />, label: "Khusus" },
              { id: 4, icon: <Lightbulb size={14} />, label: "Saran" },
              { id: 5, icon: <CheckCircle2 size={14} />, label: "Hasil" }
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
            <X size={20} /> <span className="text-xs font-bold uppercase hidden lg:block">Keluar Sesi</span>
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
                  <button onClick={() => { exportToWord("report-content", `Laporan_SPPG_${info.nama || 'Draft'}.doc`); setShowExportMenu(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3.5 text-sm hover:bg-blue-50 text-blue-700 font-semibold rounded-xl transition-colors">
                    <FileText size={18} className="text-blue-500" /> Format Word
                  </button>
                  <button onClick={() => { exportToExcel({ info, iklAnswers, iklSuggestions, specialAnswers, iklScore }); setShowExportMenu(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3.5 text-sm hover:bg-green-50 text-green-700 font-semibold rounded-xl transition-colors">
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
              Kehilangan: <span className="text-[#1a1a1a] font-bold">-{totalPointsLost}</span>
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
                    <h2 className="text-xl font-semibold tracking-tight">Informasi Satuan Pelayanan</h2>
                    <p className="text-sm text-gray-400">Lengkapi data dasar SPPG yang akan diinspeksi.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <Input 
                    label="Nama SPPG" 
                    icon={<Building2 size={16}/>} 
                    value={info.nama} 
                    onChange={v => setInfo({...info, nama: v})} 
                  />
                  <Input 
                    label="Nama Pemeriksa" 
                    icon={<User size={16}/>} 
                    value={info.namaPemeriksa} 
                    onChange={v => setInfo({...info, namaPemeriksa: v})} 
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
                    label="Penanggung Jawab & Kontak" 
                    icon={<User size={16}/>} 
                    value={info.penanggungJawab} 
                    onChange={v => setInfo({...info, penanggungJawab: v})} 
                  />
                  <Input 
                    label="Tanggal Pemeriksaan" 
                    type="date"
                    value={info.tanggalPemeriksaan} 
                    onChange={v => setInfo({...info, tanggalPemeriksaan: v})} 
                  />
                  <Input 
                    label="Jumlah Porsi Harian" 
                    icon={<Utensils size={16}/>} 
                    value={info.porsiHarian} 
                    onChange={v => setInfo({...info, porsiHarian: v})} 
                  />
                  <Input 
                    label="Pangan Didistribusikan Ke" 
                    icon={<MapPin size={16}/>} 
                    value={info.distribusiKe} 
                    onChange={v => setInfo({...info, distribusiKe: v})} 
                  />
                  <Input 
                    label="Total Penjamah" 
                    icon={<Users size={16}/>} 
                    value={info.totalPenjamah} 
                    onChange={v => setInfo({...info, totalPenjamah: v})} 
                  />
                  <Input 
                    label="Penjamah Bersertifikat" 
                    icon={<CheckCircle2 size={16}/>} 
                    value={info.penjamahBersertifikat} 
                    onChange={v => setInfo({...info, penjamahBersertifikat: v})} 
                  />
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
                      <h2 className="text-xl font-semibold tracking-tight">Kriteria Penilaian IKL</h2>
                      <p className="text-sm text-gray-400 italic">Pilih area (A-H) jika kriteria tersebut TIDAK terpenuhi.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAreaLegend(!showAreaLegend)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-100 transition-colors self-start md:self-center"
                  >
                    <Info size={14} /> {showAreaLegend ? "Sembunyikan Keterangan Area" : "Lihat Keterangan Area"}
                  </button>
                </div>

                <AnimatePresence>
                  {showAreaLegend && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-8"
                    >
                      <div className="bg-orange-50/50 rounded-2xl p-6 border border-orange-100 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                        {Object.entries(AREAS).map(([key, label]) => (
                          <div key={key} className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-[#1a1a1a] text-white rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{key}</span>
                            <span className="text-xs font-semibold text-gray-700">{label}</span>
                          </div>
                        ))}
                        <div className="sm:col-span-2 mt-4 pt-4 border-t border-orange-100/50">
                          <p className="text-[10px] text-orange-400 italic font-medium">Tip: Di HP, tekan area (A-H) untuk melihat info atau memberikan tanda tidak memenuhi syarat.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col gap-8">
                  {IKL_DATA.map((item, idx) => {
                    const isRelevant = assignedAreas.some(area => item.scores[area] !== "NA");
                    if (!isRelevant) return null;

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
                              {iklPhotos[item.id]?.length > 0 && (
                                <div className="flex -space-x-2">
                                  {iklPhotos[item.id].map((_, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-green-500 flex items-center justify-center text-[8px] text-white font-bold">
                                      {i + 1}
                                    </div>
                                  ))}
                                </div>
                              )}
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
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 md:gap-3 ml-8">
                        {(Object.keys(AREAS) as AreaKey[]).map(key => {
                          const score = item.scores[key];
                          if (score === "NA") return null;
                          const isSelected = iklAnswers[item.id]?.includes(key);
                          const isAssigned = assignedAreas.includes(key);
                          
                          return (
                            <button
                              key={key}
                              disabled={!isAssigned}
                              onClick={() => toggleIkl(item.id, key)}
                              className={`
                                group relative px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-tight transition-all duration-300 flex items-center gap-2
                                ${!isAssigned 
                                  ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-300 grayscale select-none" 
                                  : isSelected 
                                    ? "bg-red-50 border-red-200 text-red-600 shadow-[inset_0_1px_2px_rgba(220,38,38,0.1)]" 
                                    : "bg-white border-[#e5e5e5] text-[#9e9e9e] hover:border-[#1a1a1a] hover:text-[#1a1a1a]"}
                              `}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-red-500 scale-125" : "bg-gray-200"}`}></span>
                              <span>{key}</span>
                              <span className={`transition-opacity ${isSelected ? "opacity-100" : "opacity-40"}`}>({score})</span>
                              
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#1a1a1a] text-white rounded text-[10px] font-medium leading-tight opacity-0 pointer-events-none group-hover:opacity-100 group-active:opacity-100 transition-opacity z-20 normal-case tracking-normal shadow-xl">
                                {AREAS[key]} {isAssigned ? "" : "(Bukan Tugas Anda)"}
                              </div>
                            </button>
                          );
                        })}
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
                <div className="mb-8 border-b border-[#f5f5f5] pb-6 flex items-start gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Persyaratan Khusus</h2>
                    <p className="text-sm text-gray-400 italic">Nilai otomatis 1 jika ada/sesuai, 0 jika tidak.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {SPECIAL_REQUIREMENTS.map((req, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSpecialAnswers({ ...specialAnswers, [idx]: !specialAnswers[idx] })}
                      className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                        specialAnswers[idx]
                          ? "bg-purple-50 border-purple-200 text-purple-700 shadow-sm"
                          : "bg-white border-[#e5e5e5] text-gray-600 hover:border-purple-200"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                        specialAnswers[idx] ? "bg-purple-500 border-purple-500 text-white" : "border-gray-200"
                      }`}>
                        {specialAnswers[idx] && <CheckCircle2 size={14} />}
                      </div>
                      <span className="text-sm font-medium leading-relaxed">{req}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-12">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#9e9e9e] mb-4 font-mono">Catatan Lain, Kesimpulan dan Saran:</label>
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
                    Object.entries(iklAnswers).map(([criteriaId, areas]) => {
                      const criteria = IKL_DATA.find(i => i.id === criteriaId);
                      if (!criteria || (areas as AreaKey[]).length === 0) return null;

                      return (
                        <div key={criteriaId} className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden shadow-sm">
                          <div className="bg-gray-50 px-6 py-3 border-b border-[#e5e5e5]">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{criteria.category || "Kriteria Umum"}</span>
                          </div>
                          <div className="p-6 flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-red-600">
                                <AlertCircle size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Temuan:</span>
                              </div>
                              <p className="text-sm font-medium text-gray-700">
                                {criteria.text} di area: <span className="font-bold text-red-700">{(areas as AreaKey[]).map(k => AREAS[k]).join(", ")}</span>
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
              </motion.div>
            )}

            {step === 5 && (
              <motion.div 
                key="step5"
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
                  <p className="text-sm font-bold mt-1">SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)</p>
                </div>

                <div className="mb-12 text-center print:hidden">
                  <div className="inline-flex p-4 bg-orange-50 text-orange-600 rounded-2xl mb-4">
                    <Calculator size={32} />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">Ringkasan Hasil Inspeksi</h2>
                  <p className="text-sm text-gray-400 mt-2">Ulas kembali hasil penilaian sebelum mencetak laporan resmi.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  <div className="bg-[#1a1a1a] text-white p-8 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl shadow-black/20">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Zap size={120} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-2">Nilai Akhir Inspeksi</span>
                    <div className="text-8xl font-light tracking-tighter mb-4">{iklScore}</div>
                    <div className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest ${iklScore >= 70 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {iklScore >= 70 ? 'MEMENUHI SYARAT (MS)' : 'TIDAK MEMENUHI SYARAT (TMS)'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <SummaryCard label="Total Poin Hilang" value={totalPointsLost} icon={<AlertCircle size={16}/>} sub="Dari total poin standar" />
                    <SummaryCard label="Syarat Khusus" value={`${Object.values(specialAnswers).filter(Boolean).length}/${SPECIAL_REQUIREMENTS.length}`} icon={<CheckCircle2 size={16}/>} sub="Kriteria Terpenuhi" />
                    <SummaryCard label="Item Diperiksa" value={`${Object.keys(iklAnswers).length}/${IKL_DATA.length}`} icon={<Info size={16}/>} sub="Progress IKL" />
                  </div>

                  <div className="p-8 bg-white border border-[#e5e5e5] rounded-3xl shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9e9e9e] mb-6 font-mono flex items-center gap-2">
                       <Calculator size={14}/> Analisis Poin Hilang Per Kategori
                    </h3>
                    <div className="space-y-4">
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
                                style={{ width: `${Math.min(100, (lost / 50) * 100)}%` }}
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
                       <MapPin size={14}/> Informasi Fasilitas & Pemeriksaan
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-12">
                       <DetailRow label="Nama SPPG" value={info.nama || "-"} />
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
                        {Object.entries(iklAnswers).map(([criteriaId, areas]) => {
                          const criteria = IKL_DATA.find(i => i.id === criteriaId);
                          if (!criteria || (areas as AreaKey[]).length === 0) return null;
                          const suggestion = iklSuggestions[criteriaId] !== undefined ? iklSuggestions[criteriaId] : criteria.suggestion;

                          return (
                            <div key={criteriaId} className="flex flex-col gap-3 group">
                              <div className="flex items-start gap-4">
                                <div className="p-2 bg-red-50 text-red-500 rounded-lg shrink-0 mt-1">
                                  <AlertCircle size={18} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Temuan Ketidaksesuaian</p>
                                  <p className="text-sm font-semibold text-gray-800 leading-relaxed">
                                    {criteria.text}
                                  </p>
                                  <p className="text-[10px] font-bold text-gray-400 mt-1 italic">
                                    Ditemukan di area: {(areas as AreaKey[]).map(k => AREAS[k]).join(", ")}
                                  </p>
                                </div>
                              </div>

                              {iklPhotos[criteriaId]?.length > 0 && (
                                <div className="ml-12 flex flex-wrap gap-4 mt-1 no-print-break">
                                  {iklPhotos[criteriaId].map((photo, i) => (
                                    <div key={i} className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm transition-transform hover:scale-[1.02]">
                                      <img src={photo} className="w-full h-full object-cover" alt="Documentation Evidence" />
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="ml-12 p-5 bg-green-50/50 rounded-2xl border border-green-100/50 relative">
                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Saran Perbaikan / Rekomendasi</p>
                                <p className="text-sm font-bold text-green-900 leading-relaxed italic">
                                  {suggestion || "Segera tindak lanjuti ketidaksesuaian di area tersebut sesuai standar sanitasi SPPG."}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {catatan && (
                    <div className="p-8 bg-orange-50/30 rounded-3xl border border-orange-100">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 mb-4 font-mono">Kesimpulan Akhir & Catatan Tambahan</h3>
                      <p className="text-sm font-medium text-[#1a1a1a] whitespace-pre-wrap leading-relaxed italic">{catatan}</p>
                    </div>
                  )}
                </div>

                {/* Final Signatures */}
                <div className="hidden print:grid grid-cols-2 gap-32 mt-24">
                  <div className="text-center">
                    <p className="text-sm font-black mb-24 uppercase tracking-widest">Petugas Pemeriksa</p>
                    <div className="w-64 h-px bg-black mx-auto mb-2"></div>
                    <p className="text-sm font-bold">({info.namaPemeriksa || ".........................."})</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black mb-24 uppercase tracking-widest">Penanggung Jawab SPPG</p>
                    <div className="w-64 h-px bg-black mx-auto mb-2"></div>
                    <p className="text-sm font-bold">({info.penanggungJawab || ".........................."})</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Footer Navigation */}
        <div className="mt-8 flex justify-between items-center gap-4 print:hidden">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${step === 1 ? 'opacity-20 cursor-not-allowed' : 'bg-white border border-[#e5e5e5] hover:bg-gray-50'}`}
          >
            <ChevronLeft size={18} />
            Sebelumnya
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep(s => Math.min(5, s + 1))}
              className="flex items-center gap-2 px-8 py-3 bg-[#1a1a1a] text-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg shadow-black/10 hover:translate-y-[-2px] transition-all"
            >
              Selanjutnya
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
               onClick={() => window.print()}
               className="flex items-center gap-3 px-8 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg shadow-orange-500/20 hover:scale-105 transition-all"
            >
              <Printer size={18} />
              Cetak PDF
            </button>
          )}
        </div>
      </main>

      {/* Styled Print Component Overlay (Only during print) */}
      <style>{`
        @media print {
          body { background: white !important; font-size: 12pt; }
          .print\\:hidden { display: none !important; }
          main { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          section { border: none !important; box-shadow: none !important; }
          h1, h2, h3 { color: black !important; }
          .bg-gray-50, .bg-\\#1a1a1a { background-color: transparent !important; color: black !important; border: 1px solid #eee !important; }
          header { border-bottom: 2px solid black !important; padding-bottom: 2rem !important; margin-bottom: 2rem !important; }
          .rounded-2xl, .rounded-3xl, .rounded-xl { border-radius: 0 !important; }
          .max-w-5xl { max-width: none !important; }
        }
      `}</style>
    </div>
  );
}

// --- Subcomponents ---

function Input({ label, value, onChange, type = "text", icon, options }: { label: string, value: string, onChange: (v: string) => void, type?: string, icon?: ReactNode, options?: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold uppercase tracking-wider text-[#9e9e9e] font-mono flex items-center gap-2">
        {icon} {label}
      </label>
      {options ? (
        <select
          className="bg-[#fcfcfc] border border-[#e5e5e5] h-12 px-4 rounded-xl text-sm focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] transition-all outline-none"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="" disabled>Pilih {label}</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input 
          type={type}
          className="bg-[#fcfcfc] border border-[#e5e5e5] h-12 px-4 rounded-xl text-sm focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] transition-all outline-none"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Masukkan ${label.toLowerCase()}...`}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, icon }: { label: string, value: string | number, sub: string, icon: ReactNode }) {
  return (
    <div className="bg-white border border-[#e5e5e5] p-5 rounded-2xl flex flex-col gap-0.5">
      <div className="flex items-center gap-2 text-[#9e9e9e] mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight text-[#1a1a1a]">{value}</div>
      <div className="text-[10px] font-medium text-[#9e9e9e] opacity-70">{sub}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-tighter">{label}:</span>
      <span className="text-sm font-medium text-[#1a1a1a]">{value}</span>
    </div>
  );
}

