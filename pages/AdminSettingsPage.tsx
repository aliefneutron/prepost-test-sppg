import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { db, isFirebaseConfigured, connectedProjectId, saveFirebaseConfig } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  parseApiKeys, 
  setGeminiApiKey, 
  getGeminiApiKeys,
  checkSingleApiKey,
  getDailyUsage,
  resetDailyUsage,
  getAllSavedKeyStatuses,
  KeyStatusResult,
  DailyUsageData,
  DAILY_LIMIT_FREE_TIER
} from '../lib/geminiService';

const AdminSettingsPage: React.FC = () => {
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [isPreTestActive, setIsPreTestActive] = useState(true);
  const [isPostTestActive, setIsPostTestActive] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Gemini API Key Health & Tier Tracking
  const [keyStatuses, setKeyStatuses] = useState<Record<string, KeyStatusResult>>({});
  const [isTestingAllKeys, setIsTestingAllKeys] = useState(false);
  const [testingKeyMap, setTestingKeyMap] = useState<Record<string, boolean>>({});
  const [dailyUsage, setDailyUsage] = useState<DailyUsageData>({ date: '', count: 0, limit: DAILY_LIMIT_FREE_TIER, remaining: DAILY_LIMIT_FREE_TIER });
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    // Inisialisasi status cache dan kuota pemakaian harian
    setKeyStatuses(getAllSavedKeyStatuses());
    setDailyUsage(getDailyUsage());

    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Gabungkan keys dari firestore atau lokal
        const firestoreKeys = parseApiKeys(data.geminiApiKeys || data.geminiApiKey);
        const allKeys = firestoreKeys.length > 0 ? firestoreKeys : getGeminiApiKeys();
        setGeminiApiKeyInput(allKeys.join('\n'));

        if (data.isPreTestActive !== undefined) setIsPreTestActive(data.isPreTestActive);
        if (data.isPostTestActive !== undefined) setIsPostTestActive(data.isPostTestActive);
      } else {
        const localKeys = getGeminiApiKeys();
        if (localKeys.length > 0) {
          setGeminiApiKeyInput(localKeys.join('\n'));
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      const parsedKeys = parseApiKeys(geminiApiKeyInput);
      setGeminiApiKey(parsedKeys);

      await setDoc(doc(db, 'settings', 'global'), {
        geminiApiKey: parsedKeys[0] || '',
        geminiApiKeys: parsedKeys,
        isPreTestActive,
        isPostTestActive
      }, { merge: true });

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error("Error saving settings: ", error);
      alert("Failed to save settings.");
    }
  };

  const toggleTestAccess = async (testType: 'pre' | 'post', currentValue: boolean) => {
    const newValue = !currentValue;
    if (testType === 'pre') setIsPreTestActive(newValue);
    else setIsPostTestActive(newValue);
    
    try {
      const updateData = testType === 'pre' 
        ? { isPreTestActive: newValue } 
        : { isPostTestActive: newValue };
        
      await setDoc(doc(db, 'settings', 'global'), updateData, { merge: true });
    } catch (error) {
      console.error("Error updating test access:", error);
      // Revert on error
      if (testType === 'pre') setIsPreTestActive(currentValue);
      else setIsPostTestActive(currentValue);
    }
  };

  const handleTestKey = async (apiKey: string) => {
    setTestingKeyMap(prev => ({ ...prev, [apiKey]: true }));
    try {
      const result = await checkSingleApiKey(apiKey);
      setKeyStatuses(prev => ({ ...prev, [apiKey]: result }));
    } finally {
      setTestingKeyMap(prev => ({ ...prev, [apiKey]: false }));
    }
  };

  const handleTestAllKeys = async () => {
    const keys = parseApiKeys(geminiApiKeyInput);
    if (keys.length === 0) {
      alert('Tidak ada API Key yang dapat diuji. Silakan masukkan API Key terlebih dahulu.');
      return;
    }
    setIsTestingAllKeys(true);
    for (const key of keys) {
      setTestingKeyMap(prev => ({ ...prev, [key]: true }));
      try {
        const result = await checkSingleApiKey(key);
        setKeyStatuses(prev => ({ ...prev, [key]: result }));
      } catch (e) {
        console.error('Test key error:', e);
      } finally {
        setTestingKeyMap(prev => ({ ...prev, [key]: false }));
      }
      await new Promise(r => setTimeout(r, 400));
    }
    setIsTestingAllKeys(false);
  };

  const handleResetUsage = () => {
    if (window.confirm('Reset hitungan scan KTP harian kembali ke 0?')) {
      const updated = resetDailyUsage();
      setDailyUsage(updated);
    }
  };

  const handleCopyKey = (key: string, index: number) => {
    navigator.clipboard.writeText(key);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleKeyVisibility = (index: number) => {
    setVisibleKeys(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Ringkasan data untuk status card
  const registeredKeys = parseApiKeys(geminiApiKeyInput);
  const activeCount = registeredKeys.filter(k => keyStatuses[k]?.status === 'active').length;
  const quotaExhaustedCount = registeredKeys.filter(k => keyStatuses[k]?.status === 'quota_exhausted').length;
  const invalidCount = registeredKeys.filter(k => keyStatuses[k]?.status === 'invalid' || keyStatuses[k]?.status === 'error').length;
  const usagePercentage = Math.min(100, Math.round((dailyUsage.count / dailyUsage.limit) * 100));

  return (
    <AdminLayout title="Settings">
      <div className="max-w-4xl space-y-8">
        {/* SECTION GOOGLE GEMINI AI DENGAN INDIKATOR STATUS KUOTA & TIER CHECKER */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-800">Google Gemini AI (OCR KTP)</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${registeredKeys.length > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600'}`}>
                  {registeredKeys.length} Key Terdaftar
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">
                Kunci API Google Gemini untuk fitur Scan KTP dan Upload Dokumen (Model: <code>gemini-3-flash-preview</code>).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestAllKeys}
                disabled={isTestingAllKeys || registeredKeys.length === 0}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition ${
                  isTestingAllKeys
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isTestingAllKeys ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Sedang Menguji Semua...
                  </>
                ) : (
                  <>
                    <span>⚡</span> Uji Semua Status Key
                  </>
                )}
              </button>
            </div>
          </div>

          {/* DASBOR INDIKATOR KUOTA & KESEHATAN TIER */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* KARTU 1: STATUS KESIAPAN KUNCI */}
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50 border border-indigo-100 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status Kesiapan</span>
                <span className="text-base">
                  {activeCount > 0 ? '🟢' : registeredKeys.length === 0 ? '⚪' : quotaExhaustedCount > 0 ? '🟡' : '🔴'}
                </span>
              </div>
              <div className="text-lg font-bold text-gray-800 mb-1">
                {activeCount > 0 ? `${activeCount} Key Aktif & Siap` : registeredKeys.length === 0 ? 'Belum Ada Key' : 'Perlu Diuji / Dibenahi'}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 text-[11px]">
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                  {activeCount} Aktif
                </span>
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                  {quotaExhaustedCount} Limit 429
                </span>
                <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-medium">
                  {invalidCount} Bermasalah
                </span>
              </div>
            </div>

            {/* KARTU 2: ESTIMASI SISA KUOTA HARIAN (DAILY TRACKER) */}
            <div className="bg-gradient-to-br from-slate-50 to-emerald-50 border border-emerald-100 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pemakaian Hari Ini</span>
                <button
                  type="button"
                  onClick={handleResetUsage}
                  title="Reset hitungan harian"
                  className="text-[10px] text-gray-400 hover:text-emerald-700 underline"
                >
                  Reset
                </button>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-black text-emerald-700">{dailyUsage.count}</span>
                <span className="text-xs text-gray-500 font-medium">/ {dailyUsage.limit.toLocaleString('id-ID')} scan</span>
              </div>
              
              {/* Progress Bar Sisa Kuota */}
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1">
                <div 
                  className={`h-full transition-all duration-500 ${
                    usagePercentage > 90 ? 'bg-rose-500' : usagePercentage > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(4, usagePercentage)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-500">
                <span>Sisa perkiraan: <strong className="text-emerald-800">{dailyUsage.remaining.toLocaleString('id-ID')} scan</strong></span>
                <span>{usagePercentage}%</span>
              </div>
            </div>

            {/* KARTU 3: ATURAN BATAS TIER GRATIS GOOGLE */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Batas Tier Gratis</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">Google AI</span>
              </div>
              <div className="space-y-1 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">Batas Menit (RPM):</span>
                  <span className="font-semibold text-gray-800">15 scan / menit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Batas Harian (RPD):</span>
                  <span className="font-semibold text-gray-800">1.500 scan / hari</span>
                </div>
                <div className="flex justify-between text-[11px] text-blue-700 pt-1 border-t border-blue-100">
                  <span>Reset Harian:</span>
                  <span className="font-medium">Pukul 07:00 WIB</span>
                </div>
              </div>
            </div>
          </div>

          {/* DAFTAR KARTU INDIKATOR STATUS PER-KEY */}
          {registeredKeys.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">
                  Indikator Status Tiap Kunci ({registeredKeys.length} Kunci Terpasang)
                </h3>
                <span className="text-[11px] text-gray-500">
                  Sistem otomatis beralih ke kunci berikutnya jika satu kunci limit (HTTP 429)
                </span>
              </div>

              <div className="space-y-2.5">
                {registeredKeys.map((key, index) => {
                  const statusInfo = keyStatuses[key];
                  const isTesting = testingKeyMap[key] || false;
                  const isVisible = visibleKeys[index] || false;
                  const isCopied = copiedIndex === index;

                  const displayKey = isVisible
                    ? key
                    : `${key.slice(0, 8)}••••••••••••••••••••${key.slice(-4)}`;

                  return (
                    <div 
                      key={key + index} 
                      className={`p-3.5 rounded-lg border transition-all ${
                        statusInfo?.status === 'active'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : statusInfo?.status === 'quota_exhausted'
                          ? 'bg-amber-50/60 border-amber-300'
                          : statusInfo?.status === 'invalid' || statusInfo?.status === 'error'
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Identitas Kunci */}
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase shrink-0 ${
                            index === 0 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {index === 0 ? 'Key #1 (Utama)' : `Key #${index + 1} (Cadangan)`}
                          </span>

                          <div className="font-mono text-xs text-gray-800 truncate select-all bg-white px-2 py-1 rounded border border-gray-200">
                            {displayKey}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Tombol Mata (Intip Kunci) */}
                            <button
                              type="button"
                              onClick={() => toggleKeyVisibility(index)}
                              title={isVisible ? 'Sembunyikan Kunci' : 'Tampilkan Kunci Penuh'}
                              className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-white text-xs border border-transparent hover:border-gray-300 transition"
                            >
                              {isVisible ? '🙈' : '👁️'}
                            </button>

                            {/* Tombol Copy */}
                            <button
                              type="button"
                              onClick={() => handleCopyKey(key, index)}
                              title="Salin Kunci"
                              className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-white text-xs border border-transparent hover:border-gray-300 transition"
                            >
                              {isCopied ? '✅ Tersalin' : '📋'}
                            </button>
                          </div>
                        </div>

                        {/* Indikator Status & Tombol Uji Mandiri */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {/* Status Badge */}
                          {isTesting ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 animate-pulse">
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                              Sedang Menguji...
                            </span>
                          ) : statusInfo?.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                              🟢 Kuota Tersedia {statusInfo.latencyMs ? `(${statusInfo.latencyMs}ms)` : ''}
                            </span>
                          ) : statusInfo?.status === 'quota_exhausted' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              🟡 Batas Tier Habis (HTTP 429)
                            </span>
                          ) : statusInfo?.status === 'invalid' || statusInfo?.status === 'error' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              🔴 {statusInfo.statusCode ? `Error ${statusInfo.statusCode}` : 'Kunci Ditolak'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                              ⏳ Belum Diuji
                            </span>
                          )}

                          {/* Tombol Uji Tunggal */}
                          <button
                            type="button"
                            onClick={() => handleTestKey(key)}
                            disabled={isTesting || isTestingAllKeys}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 shadow-sm transition disabled:opacity-50"
                          >
                            ⚡ Uji Kunci
                          </button>
                        </div>
                      </div>

                      {/* Detail Keterangan Pengujian Terakhir */}
                      {statusInfo && (
                        <div className={`mt-2 pt-2 border-t text-[11px] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 ${
                          statusInfo.status === 'active'
                            ? 'border-emerald-200 text-emerald-900'
                            : statusInfo.status === 'quota_exhausted'
                            ? 'border-amber-200 text-amber-900 font-medium'
                            : 'border-rose-200 text-rose-800'
                        }`}>
                          <span>
                            {statusInfo.status === 'active' && '✅ '}
                            {statusInfo.status === 'quota_exhausted' && '⚠️ '}
                            {statusInfo.status === 'invalid' && '❌ '}
                            {statusInfo.message}
                          </span>
                          <span className="text-[10px] text-gray-500 shrink-0">
                            Diuji: {new Date(statusInfo.checkedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* INPUT AREA DAFTAR GOOGLE GEMINI API KEY */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Editor Daftar Google Gemini API Key</label>
              <span className="text-xs text-gray-500">1 baris = 1 API Key (atau pisahkan dengan koma)</span>
            </div>
            <textarea
              rows={4}
              value={geminiApiKeyInput}
              onChange={(e) => setGeminiApiKeyInput(e.target.value)}
              placeholder="AIzaSyKeyPertama...&#10;AQ.Ab8KeyKeduaCadangan...&#10;AIzaSyKeyKetigaCadangan..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm leading-relaxed"
            />
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded p-2.5 mt-2 text-xs leading-relaxed">
              💡 <strong>Tips Menghindari Batas Kuota Gratisan</strong>:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li><strong>15 RPM (Per Menit)</strong>: Jika puluhan peserta melakukan scan KTP dalam detik yang sama, sistem otomatis merotasi ke kunci cadangan agar tidak muncul error 429.</li>
                <li><strong>1.500 RPD (Per Hari)</strong>: Kuota harian gratis berlaku per akun Google AI Studio. Daftarkan 2 hingga 4 API Key cadangan dari project berbeda untuk mendapatkan kapasitas ribuan scan gratis per hari.</li>
                <li>Mendukung baik format klasik (<code>AIzaSy...</code>) maupun format auth key terbaru (<code>AQ.Ab8...</code>) dari <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-700 underline font-bold">Google AI Studio</a>.</li>
              </ul>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            className={`px-6 py-2 rounded-lg font-bold text-white transition-colors ${isSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isSaved ? 'Saved!' : 'Simpan Semua Gemini API Key'}
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Koneksi Database Firebase</h2>
            <span className={`px-3 py-1 rounded text-xs font-bold text-white ${isFirebaseConfigured ? 'bg-green-600' : 'bg-red-500'}`}>
              {isFirebaseConfigured ? 'Terhubung' : 'Belum Dikonfigurasi'}
            </span>
          </div>
          <p className="text-gray-600 mb-2 text-sm">
            Project Firebase yang aktif saat ini: <strong className="font-mono text-blue-600">{connectedProjectId}</strong>
          </p>
          <p className="text-gray-500 mb-4 text-xs">
            Data pertanyaan (soal), hasil ujian, dan jadwal tersimpan di Firebase Firestore. Jika database belum terhubung, Anda dapat menempelkan objek konfigurasi Firebase (atau mengisi file <code>.env.local</code>) di bawah ini.
          </p>

          <button
            type="button"
            onClick={() => {
              const input = window.prompt(
                'Paste objek konfigurasi Firebase Anda (JSON):\n\nContoh:\n{\n  "apiKey": "AIzaSy...",\n  "projectId": "nama-project",\n  "authDomain": "nama-project.firebaseapp.com",\n  "storageBucket": "nama-project.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "..."\n}'
              );
              if (input && input.trim()) {
                try {
                  const cleanJson = input.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
                  const parsed = JSON.parse(cleanJson);
                  if (parsed.projectId && parsed.apiKey) {
                    saveFirebaseConfig(parsed);
                    alert('Konfigurasi Firebase berhasil disimpan! Aplikasi akan dimuat ulang.');
                  } else {
                    alert('Format tidak valid. Pastikan ada properti "apiKey" dan "projectId".');
                  }
                } catch (err: any) {
                  alert('Gagal membaca JSON: ' + err.message);
                }
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-lg text-sm transition"
          >
            ⚙️ Hubungkan / Ganti Firebase Config
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Exam Access Control</h2>
          <p className="text-gray-600 mb-6">
            Enable or disable access to the Pre-Test and Post-Test menus globally. When disabled, participants cannot start the test.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-800">Pre-Test Access</h3>
                <p className="text-sm text-gray-500">Allow participants to take the Pre-Test</p>
              </div>
              <button
                onClick={() => toggleTestAccess('pre', isPreTestActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isPreTestActive ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPreTestActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-800">Post-Test Access</h3>
                <p className="text-sm text-gray-500">Allow participants to take the Post-Test</p>
              </div>
              <button
                onClick={() => toggleTestAccess('post', isPostTestActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isPostTestActive ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPostTestActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;