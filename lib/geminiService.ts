import { GoogleGenAI } from "@google/genai";
import { KTPData } from "../types";

const PROMPT = `Kamu adalah mesin OCR khusus untuk KTP (Kartu Tanda Penduduk) Indonesia.
Ekstrak SEMUA data dari gambar KTP ini dengan sangat teliti.
Kembalikan HANYA objek JSON yang valid tanpa teks tambahan, tanpa markdown, tanpa code block.

Gunakan struktur JSON berikut PERSIS:
{"nik":"","nama":"","tempat_tgl_lahir":"","jenis_kelamin":"","alamat":"","rt_rw":"","kel_desa":"","kecamatan":"","agama":"","status_perkawinan":"","pekerjaan":"","kewarganegaraan":"","berlaku_hingga":""}

Petunjuk:
- "nik" adalah 16 digit angka NIK di KTP
- "nama" adalah nama lengkap pemilik KTP
- "tempat_tgl_lahir" contoh: "JAKARTA, 01-01-1990"
- "jenis_kelamin" adalah LAKI-LAKI atau PEREMPUAN
- "rt_rw" format: "001/002"
- Jika field tidak terbaca, gunakan string kosong ""
- Hanya kembalikan JSON, tidak ada teks lain`;

// === RESIZE IMAGE - Seimbang antara kualitas dan ukuran payload ===
const resizeImage = (base64Image: string, maxSize = 900): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = img.width > maxSize ? maxSize / img.width : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context not available'));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64Image;
  });
};

// Ekstrak base64 murni (tanpa prefix data:image/...)
const getBase64Data = (base64Image: string): string =>
  base64Image.startsWith('data:') ? base64Image.split(',')[1] : base64Image;

// === GEMINI Vision OCR (Primary - Paling Akurat untuk KTP) ===
const extractWithGemini = async (base64Image: string): Promise<KTPData> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) throw new Error('Gemini API key tidak ditemukan');

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = getBase64Data(base64Image);

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
          { text: PROMPT },
        ],
      },
    ],
    config: {
      temperature: 0,
      maxOutputTokens: 512,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini mengembalikan respons kosong');

  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Gemini tidak mengembalikan JSON valid. Response: ${cleaned.slice(0, 100)}`);
  return JSON.parse(jsonMatch[0]) as KTPData;
};

// === GROQ Vision OCR (Fallback) ===
const extractWithGroq = async (base64Image: string): Promise<KTPData> => {
  const p1 = import.meta.env.VITE_GROQ_API_KEY_P1 || '';
  const p2 = import.meta.env.VITE_GROQ_API_KEY_P2 || '';
  const apiKey = (p1 + p2).trim();
  if (!apiKey) throw new Error('Groq API key tidak ditemukan');

  const imageUrl = base64Image.startsWith('data:')
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
      max_tokens: 512,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq error ${response.status}: ${err?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq mengembalikan respons kosong');

  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Groq tidak mengembalikan JSON valid');
  return JSON.parse(jsonMatch[0]) as KTPData;
};

// === MAIN EXPORT: Gemini primary → Groq fallback ===
export const extractKTPData = async (
  base64Image: string,
  signal?: AbortSignal
): Promise<KTPData> => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const resizedImage = await resizeImage(base64Image, 900);

  // 1. Coba Gemini terlebih dahulu
  try {
    const result = await extractWithGemini(resizedImage);
    console.log('✅ OCR via Gemini berhasil');
    return result;
  } catch (geminiErr: any) {
    console.warn('⚠️ Gemini gagal:', geminiErr?.message);
  }

  // 2. Fallback ke Groq
  try {
    const result = await extractWithGroq(resizedImage);
    console.log('✅ OCR via Groq berhasil (fallback)');
    return result;
  } catch (groqErr: any) {
    console.error('❌ Groq juga gagal:', groqErr?.message);
    throw new Error(`OCR gagal: ${groqErr?.message || 'Error tidak diketahui'}. Silakan isi data manual.`);
  }
};
