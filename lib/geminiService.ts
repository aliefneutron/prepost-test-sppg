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

// === HELPER MULTI API KEY ===
export const getGeminiApiKeys = (): string[] => {
  const collectedKeys: string[] = [];

  // 1. Dari Environment Variables
  const envKey =
    (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEYS || process.env?.API_KEY || process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY)) ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GEMINI_API_KEYS || import.meta.env?.VITE_GEMINI_API_KEY || import.meta.env?.GEMINI_API_KEY)) ||
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

  // 6. Loop setiap API Key (Auto-fallback ke key berikutnya jika satu key limit/gagal)
  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const currentApiKey = apiKeys[keyIndex];
    const keyMasked = `${currentApiKey.slice(0, 6)}...${currentApiKey.slice(-4)}`;

    for (const model of models) {
      try {
        const result = await callGeminiVision(model, currentApiKey, base64Data, mimeType, signal);
        console.log(`[Gemini OCR] ✅ Berhasil menggunakan API Key #${keyIndex + 1} (${keyMasked}) dengan model ${model}`);
        return result;
      } catch (err: any) {
        const msg = err?.message?.toLowerCase() || '';

        // Jika error model 404/not supported, lanjutkan coba model berikutnya dengan API key yang sama
        if (msg.includes('not found') || msg.includes('404') || msg.includes('unsupported') || msg.includes('models/')) {
          console.warn(`[Gemini OCR] Model ${model} tidak didukung pada API Key #${keyIndex + 1}, mencoba model fallback...`);
          continue;
        }

        // Jika error terkait kuota/key/rate limit/429/permission:
        console.warn(`[Gemini OCR] ⚠️ API Key #${keyIndex + 1} (${keyMasked}) gagal: ${err.message}.`);
        lastKeyError = err;
        break; // Hentikan loop model, lanjut ke API key berikutnya
      }
    }
  }

  // Jika seluruh API key telah dicoba dan semuanya gagal
  throw new Error(
    `Seluruh (${apiKeys.length}) API Key Gemini gagal atau kehabisan kuota. Error terakhir: ${lastKeyError?.message || 'Error tidak diketahui'}`
  );
};
