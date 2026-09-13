import { KTPData } from '../types';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

// Helper pembersih & pemecah teks API Key (mendukung baris baru, koma, titik koma)
export const parseApiKeys = (input: string | string[] | undefined | null): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return Array.from(new Set(input.map(k => String(k).trim()).filter(Boolean)));
  }
  const keys = input
    .split(/[\n,;]+/)
    .map(k => k.trim())
    .filter(k => k.length > 5);
  return Array.from(new Set(keys));
};

/**
 * Format alamat KTP ke format terstandar:
 * Contoh: "DUSUN BUJAAN, RT/RW 003/001, DESA LAPA LAOK, KECAMATAN DUNGKEK"
 */
export const formatKTPAddress = (ktpData: Partial<KTPData>): string => {
  const parts: string[] = [];

  // 1. Alamat (Jalan / Dusun / No Rumah)
  if (ktpData.alamat?.trim()) {
    parts.push(ktpData.alamat.trim().toUpperCase());
  }

  // 2. RT/RW: prefix dengan "RT/RW " jika belum ada
  if (ktpData.rt_rw?.trim()) {
    let rtrw = ktpData.rt_rw.trim().toUpperCase();
    if (!rtrw.startsWith('RT') && !rtrw.startsWith('RW')) {
      rtrw = `RT/RW ${rtrw}`;
    }
    parts.push(rtrw);
  }

  // 3. Desa / Kelurahan: prefix dengan "DESA " jika belum ada
  if (ktpData.kel_desa?.trim()) {
    let kel = ktpData.kel_desa.trim().toUpperCase();
    if (!kel.startsWith('DESA') && !kel.startsWith('KEL') && !kel.startsWith('KELURAHAN')) {
      kel = `DESA ${kel}`;
    }
    parts.push(kel);
  }

  // 4. Kecamatan: prefix dengan "KECAMATAN " jika belum ada
  if (ktpData.kecamatan?.trim()) {
    let kec = ktpData.kecamatan.trim().toUpperCase();
    if (!kec.startsWith('KEC') && !kec.startsWith('KECAMATAN')) {
      kec = `KECAMATAN ${kec}`;
    }
    parts.push(kec);
  }

  return parts.filter(Boolean).join(', ');
};

// === HELPER MULTI API KEY ===
export const getGeminiApiKeys = (): string[] => {
  const collectedKeys: string[] = [];

  // 1. Dari Environment Variables
  const envKey =
    (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEYS || process.env?.API_KEY || process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY)) ||
    (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_GEMINI_API_KEYS || (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY)) ||
    '';
  if (envKey) {
    collectedKeys.push(...parseApiKeys(envKey));
  }

  // 2. Dari LocalStorage
  if (typeof localStorage !== 'undefined') {
    const localKeys = localStorage.getItem('GEMINI_API_KEYS') || localStorage.getItem('GEMINI_API_KEY') || localStorage.getItem('VITE_GEMINI_API_KEY');
    if (localKeys) {
      collectedKeys.push(...parseApiKeys(localKeys));
    }
  }

  return Array.from(new Set(collectedKeys));
};

export const getGeminiApiKey = (): string => {
  const keys = getGeminiApiKeys();
  return keys.length > 0 ? keys[0] : '';
};

export const setGeminiApiKey = (keyOrKeys: string | string[]) => {
  if (typeof localStorage !== 'undefined') {
    const keys = parseApiKeys(keyOrKeys);
    if (keys.length > 0) {
      localStorage.setItem('GEMINI_API_KEYS', keys.join('\n'));
      localStorage.setItem('GEMINI_API_KEY', keys[0]);
    } else {
      localStorage.removeItem('GEMINI_API_KEYS');
      localStorage.removeItem('GEMINI_API_KEY');
    }
  }
};

// === QUOTA & TIER HEALTH CHECKER ===
export interface KeyStatusResult {
  apiKey: string;
  status: 'active' | 'quota_exhausted' | 'invalid' | 'error';
  statusCode?: number;
  message: string;
  latencyMs?: number;
  checkedAt: number;
  modelUsed?: string;
}

export interface DailyUsageData {
  date: string;
  count: number;
  limit: number;
  remaining: number;
}

export const DAILY_LIMIT_FREE_TIER = 1500; // Standar Tier Gratis Google AI Studio: 1.500 RPD (Requests Per Day)

const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDailyUsage = (): DailyUsageData => {
  if (typeof localStorage === 'undefined') {
    return { date: getTodayString(), count: 0, limit: DAILY_LIMIT_FREE_TIER, remaining: DAILY_LIMIT_FREE_TIER };
  }
  const today = getTodayString();
  const raw = localStorage.getItem('GEMINI_DAILY_USAGE');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        const count = Number(parsed.count) || 0;
        return {
          date: today,
          count,
          limit: DAILY_LIMIT_FREE_TIER,
          remaining: Math.max(0, DAILY_LIMIT_FREE_TIER - count)
        };
      }
    } catch {
      // Abaikan jika corrupt
    }
  }
  const initial = { date: today, count: 0, limit: DAILY_LIMIT_FREE_TIER, remaining: DAILY_LIMIT_FREE_TIER };
  try {
    localStorage.setItem('GEMINI_DAILY_USAGE', JSON.stringify({ date: today, count: 0 }));
  } catch {
    // Abaikan
  }
  return initial;
};

export const incrementDailyUsage = (amount = 1): DailyUsageData => {
  if (typeof localStorage === 'undefined') {
    return { date: getTodayString(), count: amount, limit: DAILY_LIMIT_FREE_TIER, remaining: Math.max(0, DAILY_LIMIT_FREE_TIER - amount) };
  }
  const current = getDailyUsage();
  const newCount = current.count + amount;
  try {
    localStorage.setItem('GEMINI_DAILY_USAGE', JSON.stringify({ date: current.date, count: newCount }));
  } catch {
    // Abaikan
  }
  return {
    ...current,
    count: newCount,
    remaining: Math.max(0, DAILY_LIMIT_FREE_TIER - newCount)
  };
};

export const resetDailyUsage = (): DailyUsageData => {
  const today = getTodayString();
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('GEMINI_DAILY_USAGE', JSON.stringify({ date: today, count: 0 }));
    } catch {
      // Abaikan
    }
  }
  return { date: today, count: 0, limit: DAILY_LIMIT_FREE_TIER, remaining: DAILY_LIMIT_FREE_TIER };
};

export const getAllSavedKeyStatuses = (): Record<string, KeyStatusResult> => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem('GEMINI_KEYS_HEALTH_CACHE');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveKeyStatus = (apiKey: string, result: KeyStatusResult) => {
  if (typeof localStorage === 'undefined' || !apiKey) return;
  try {
    const all = getAllSavedKeyStatuses();
    all[apiKey] = result;
    localStorage.setItem('GEMINI_KEYS_HEALTH_CACHE', JSON.stringify(all));
  } catch {
    // Abaikan
  }
};

/**
 * Uji langsung status dan ketersediaan kuota suatu API Key Google Gemini
 */
export const checkSingleApiKey = async (apiKey: string): Promise<KeyStatusResult> => {
  if (!apiKey || apiKey.trim().length < 5) {
    const res: KeyStatusResult = {
      apiKey,
      status: 'invalid',
      message: 'Format kunci API tidak valid (terlalu pendek)',
      checkedAt: Date.now()
    };
    return res;
  }

  const cleanKey = apiKey.trim();
  const startTime = Date.now();

  try {
    // Gunakan probe request ringan ke Google API Models
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-goog-api-key': cleanKey
      }
    });

    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const modelCount = data?.models?.length || 0;
      const result: KeyStatusResult = {
        apiKey: cleanKey,
        status: 'active',
        statusCode: 200,
        message: `Kunci Aktif & Kuota Tersedia (${modelCount} model terdeteksi)`,
        latencyMs,
        checkedAt: Date.now()
      };
      saveKeyStatus(cleanKey, result);
      return result;
    }

    const errData = await res.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    const errReason = errData?.error?.details?.[0]?.reason || '';

    let status: 'quota_exhausted' | 'invalid' | 'error' = 'invalid';
    let userMessage = errMsg;

    if (
      res.status === 429 ||
      errMsg.toLowerCase().includes('quota') ||
      errMsg.toLowerCase().includes('resource_exhausted') ||
      errMsg.toLowerCase().includes('rate limit')
    ) {
      status = 'quota_exhausted';
      userMessage = 'Batas kuota tier gratis tercapai (HTTP 429). Tunggu 1 menit (jika batas 15 RPM) atau tunggu pukul 07:00 WIB (jika batas 1.500 RPD).';
    } else if (res.status === 401 || res.status === 403) {
      status = 'invalid';
      if (errReason === 'API_KEY_SERVICE_BLOCKED') {
        userMessage = 'Layanan Generative Language API belum diaktifkan di Google Cloud Console untuk project ini.';
      } else if (errReason === 'ACCESS_TOKEN_TYPE_UNSUPPORTED') {
        userMessage = 'Kunci ditolak Google (ACCESS_TOKEN_TYPE_UNSUPPORTED). Pastikan kunci aktif di Google AI Studio.';
      } else {
        userMessage = `Autentikasi gagal (${errMsg})`;
      }
    } else if (res.status === 400) {
      status = 'invalid';
      userMessage = 'Kunci API tidak valid (HTTP 400: API_KEY_INVALID). Silakan periksa kembali.';
    }

    const result: KeyStatusResult = {
      apiKey: cleanKey,
      status,
      statusCode: res.status,
      message: userMessage,
      latencyMs,
      checkedAt: Date.now()
    };
    saveKeyStatus(cleanKey, result);
    return result;
  } catch (netErr: any) {
    const latencyMs = Date.now() - startTime;
    const result: KeyStatusResult = {
      apiKey: cleanKey,
      status: 'error',
      message: `Gagal menghubungi Google API (${netErr.message || 'Koneksi timeout/jaringan offline'})`,
      latencyMs,
      checkedAt: Date.now()
    };
    return result;
  }
};

// === RESIZE & COMPRESS: Kurangi ukuran gambar sebelum dikirim ke Vision API ===
const resizeImage = (base64Image: string, maxSize = 1200): Promise<{ base64Data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
    const originalMime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const targetMime = originalMime === 'image/png' ? 'image/png' : 'image/jpeg';

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let scale = 1;
      if (img.width > maxSize || img.height > maxSize) {
        scale = Math.min(maxSize / img.width, maxSize / img.height);
      }
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2D context tidak tersedia'));

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL(targetMime, 0.88);
      const cleanBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve({ base64Data: cleanBase64, mimeType: targetMime });
    };

    img.onerror = () => reject(new Error('Gagal memproses gambar KTP'));
    img.src = base64Image;
  });
};

const KTP_SCHEMA = {
  type: "OBJECT",
  properties: {
    nik: { type: "STRING", description: "16 digit Nomor Induk Kependudukan (NIK)" },
    nama: { type: "STRING", description: "Nama lengkap pemilik KTP" },
    tempat_tgl_lahir: { type: "STRING", description: "Tempat dan tanggal lahir, contoh: JAKARTA, 01-01-1990" },
    jenis_kelamin: { type: "STRING", description: "LAKI-LAKI atau PEREMPUAN" },
    alamat: { type: "STRING", description: "Alamat jalan, nomor, RT/RW" },
    rt_rw: { type: "STRING", description: "RT / RW, contoh: 001/002" },
    kel_desa: { type: "STRING", description: "Kelurahan atau Desa" },
    kecamatan: { type: "STRING", description: "Kecamatan" },
    agama: { type: "STRING", description: "Agama" },
    status_perkawinan: { type: "STRING", description: "Status perkawinan" },
    pekerjaan: { type: "STRING", description: "Pekerjaan" },
    kewarganegaraan: { type: "STRING", description: "Kewarganegaraan (WNI / WNA)" },
    berlaku_hingga: { type: "STRING", description: "Masa berlaku KTP (contoh: SEUMUR HIDUP)" }
  },
  required: [
    "nik", "nama", "tempat_tgl_lahir", "jenis_kelamin",
    "alamat", "rt_rw", "kel_desa", "kecamatan",
    "agama", "status_perkawinan", "pekerjaan", "kewarganegaraan", "berlaku_hingga"
  ]
};

const PROMPT = `Kamu adalah sistem OCR AI presisi tinggi khusus membaca dokumen e-KTP (Kartu Tanda Penduduk) Republik Indonesia.
Tugasmu: Ekstrak seluruh data identitas dari gambar KTP ini secara lengkap dan akurat.

Petunjuk Ekstraksi:
- "nik": Ambil 16 digit angka NIK. Hilangkan spasi atau simbol.
- "nama": Nama lengkap sesuai KTP dalam huruf kapital.
- "tempat_tgl_lahir": Gabungkan tempat lahir dan tanggal lahir, format: "KOTA, DD-MM-YYYY".
- "jenis_kelamin": Nilai harus "LAKI-LAKI" atau "PEREMPUAN".
- "alamat": Alamat jalan / dusun / nomor rumah (tanpa RT/RW/Kel/Kec).
- "rt_rw": Format "XXX/YYY" contoh "001/002".
- "kel_desa": Nama Kelurahan atau Desa.
- "kecamatan": Nama Kecamatan.
- "agama": Agama pemilik KTP.
- "status_perkawinan": Status perkawinan.
- "pekerjaan": Pekerjaan yang tertera.
- "kewarganegaraan": WNI atau WNA.
- "berlaku_hingga": SEUMUR HIDUP atau tanggal masa berlaku.
- Jika field tidak terbaca atau buram, gunakan string kosong "".
- Kembalikan murni JSON terstruktur sesuai skema.`;

// === CALL GOOGLE GEMINI VISION API (gemini-3-flash-preview) ===
async function callGeminiVision(
  model: string,
  apiKey: string,
  base64Data: string,
  mimeType: string,
  signal?: AbortSignal
): Promise<KTPData> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: PROMPT
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: KTP_SCHEMA
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody),
    signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Google Gemini mengembalikan respon kosong');
  }

  const cleanedText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(cleanedText);

  return {
    nik: (parsed.nik || '').replace(/\D/g, '').trim(),
    nama: (parsed.nama || '').trim(),
    tempat_tgl_lahir: (parsed.tempat_tgl_lahir || '').trim(),
    jenis_kelamin: (parsed.jenis_kelamin || '').trim(),
    alamat: (parsed.alamat || '').trim(),
    rt_rw: (parsed.rt_rw || '').trim(),
    kel_desa: (parsed.kel_desa || '').trim(),
    kecamatan: (parsed.kecamatan || '').trim(),
    agama: (parsed.agama || '').trim(),
    status_perkawinan: (parsed.status_perkawinan || '').trim(),
    pekerjaan: (parsed.pekerjaan || '').trim(),
    kewarganegaraan: (parsed.kewarganegaraan || '').trim(),
    berlaku_hingga: (parsed.berlaku_hingga || '').trim()
  };
}

// === MAIN SERVICE: extractKTPData DENGAN MULTI API KEY & AUTO-FALLBACK ===
export const extractKTPData = async (
  base64Image: string,
  signal?: AbortSignal
): Promise<KTPData> => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  // 1. Kompres dan siapkan gambar dalam format base64 murni
  const { base64Data, mimeType } = await resizeImage(base64Image, 1200);

  // 2. Ambil seluruh Gemini API Key yang tersedia
  let apiKeys = getGeminiApiKeys();

  // 2b. Ambil juga dari Firestore settings/global jika belum ada atau untuk menambah cadangan
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    if (snap.exists()) {
      const data = snap.data();
      const firestoreKeys = [
        ...parseApiKeys(data?.geminiApiKeys),
        ...parseApiKeys(data?.geminiApiKey)
      ];
      if (firestoreKeys.length > 0) {
        apiKeys = Array.from(new Set([...apiKeys, ...firestoreKeys]));
      }
    }
  } catch {
    // Abaikan jika offline / permission error
  }

  // 3. Jika API key lokal belum ada, coba endpoint /api/ocr-ktp backend
  if (apiKeys.length === 0) {
    try {
      const response = await fetch('/api/ocr-ktp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: `data:${mimeType};base64,${base64Data}` }),
        signal,
      });

      if (response.ok) {
        incrementDailyUsage();
        return (await response.json()) as KTPData;
      }
    } catch {
      // Abaikan dan lempar error di bawah
    }

    throw new Error('Layanan OCR KTP belum dikonfigurasi oleh Administrator. Silakan isi data formulir secara manual.');
  }

  // 5. Model hierarchy: gemini-3-flash-preview sebagai prioritas utama
  const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastKeyError: Error | null = null;

  // 6. LOAD BALANCING (Distribusi Beban Acak):
  // Agar 30 peserta yang scan bersamaan tidak menumpuk di Key #1,
  // acak titik awal kunci sehingga beban scan terbagi merata ke seluruh key.
  const startIndex = Math.floor(Math.random() * apiKeys.length);
  const balancedKeys = [
    ...apiKeys.slice(startIndex),
    ...apiKeys.slice(0, startIndex)
  ];

  for (let keyIndex = 0; keyIndex < balancedKeys.length; keyIndex++) {
    const currentApiKey = balancedKeys[keyIndex];
    const keyMasked = `${currentApiKey.slice(0, 6)}...${currentApiKey.slice(-4)}`;

    for (const model of models) {
      try {
        const result = await callGeminiVision(model, currentApiKey, base64Data, mimeType, signal);
        console.log(`[Gemini OCR] ✅ Berhasil menggunakan API Key (${keyMasked}) dengan model ${model}`);
        
        // Catat statistik penggunaan sukses
        incrementDailyUsage();
        saveKeyStatus(currentApiKey, {
          apiKey: currentApiKey,
          status: 'active',
          statusCode: 200,
          message: `Sukses digunakan untuk OCR (${model})`,
          checkedAt: Date.now(),
          modelUsed: model
        });

        return result;
      } catch (err: any) {
        const msg = err?.message?.toLowerCase() || '';

        // Jika error model 404/not supported, lanjutkan coba model berikutnya dengan API key yang sama
        if (msg.includes('not found') || msg.includes('404') || msg.includes('unsupported') || msg.includes('models/')) {
          console.warn(`[Gemini OCR] Model ${model} tidak didukung pada API Key (${keyMasked}), mencoba model fallback...`);
          continue;
        }

        // Jika error terkait kuota/key/rate limit/429:
        if (
          err?.status === 429 ||
          msg.includes('429') ||
          msg.includes('quota') ||
          msg.includes('resource_exhausted') ||
          msg.includes('rate limit')
        ) {
          saveKeyStatus(currentApiKey, {
            apiKey: currentApiKey,
            status: 'quota_exhausted',
            statusCode: 429,
            message: `Batas kuota tier habis: ${err.message}`,
            checkedAt: Date.now()
          });
        }

        console.warn(`[Gemini OCR] ⚠️ API Key (${keyMasked}) gagal: ${err.message}. Beralih ke key berikutnya...`);
        lastKeyError = err;

        // Jitter jeda singkat (200-400ms) sebelum beralih ke key cadangan berikutnya
        // untuk mencegah benturan konkurensi (thundering herd) antar peserta
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));
        break; // Hentikan loop model, lanjut ke API key berikutnya
      }
    }
  }

  // Jika seluruh API key telah dicoba dan semuanya gagal
  throw new Error(
    `Seluruh (${apiKeys.length}) API Key Gemini gagal atau kehabisan kuota. Error terakhir: ${lastKeyError?.message || 'Error tidak diketahui'}`
  );
};
