import { GoogleGenAI } from "@google/genai";
import { KTPData } from "../types";

const PROMPT = `Kamu adalah mesin OCR khusus untuk KTP (Kartu Tanda Penduduk) Indonesia.
Ekstrak SEMUA data dari gambar KTP ini dengan sangat teliti dan kembalikan HANYA objek JSON yang valid tanpa teks tambahan, tanpa markdown, tanpa code block.

Gunakan struktur JSON berikut PERSIS:
{"nik":"","nama":"","tempat_tgl_lahir":"","jenis_kelamin":"","alamat":"","rt_rw":"","kel_desa":"","kecamatan":"","agama":"","status_perkawinan":"","pekerjaan":"","kewarganegaraan":"","berlaku_hingga":""}

Petunjuk penting:
- "nik" adalah 16 digit angka di bagian atas KTP
- "nama" adalah nama lengkap pemilik KTP (huruf kapital)
- "tempat_tgl_lahir" format: "KOTA, DD-MM-YYYY" atau "KOTA, DD BULAN YYYY"
- "jenis_kelamin" adalah LAKI-LAKI atau PEREMPUAN
- "rt_rw" format: "xxx/xxx"
- Isi setiap field dengan teks yang tertulis di KTP
- Jika field tidak terbaca, gunakan string kosong ""
- JANGAN menambahkan komentar atau teks apapun di luar JSON`;

// === RESIZE FOR API - Kualitas tinggi untuk akurasi OCR ===
const resizeImage = (base64Image: string, maxSize = 1200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Pertahankan resolusi tinggi untuk akurasi OCR
      const scale = img.width > maxSize ? maxSize / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      
      // Gambar dengan kualitas terbaik
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Kirim dengan kualitas JPEG 95% untuk ketajaman teks
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = base64Image;
  });
};

// === GROQ Vision OCR (Primary - Cepat, Akurat) ===
const extractWithGroq = async (base64Image: string): Promise<KTPData> => {
  const p1 = import.meta.env.VITE_GROQ_API_KEY_P1 || '';
  const p2 = import.meta.env.VITE_GROQ_API_KEY_P2 || '';
  const apiKey = p1 + p2;
  if (!apiKey) throw new Error("No Groq API key");

  const imageUrl = base64Image.startsWith('data:')
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
            {
              type: 'text',
              text: PROMPT,
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.0, // Suhu 0 untuk konsistensi maksimal
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || JSON.stringify(err));
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Groq");

  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Ambil JSON dari dalam teks jika ada teks tambahan
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Groq response");
  return JSON.parse(jsonMatch[0]) as KTPData;
};

// === GEMINI Vision OCR (Fallback - Sangat Akurat) ===
const extractWithGemini = async (base64Image: string): Promise<KTPData> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) throw new Error("No Gemini API key");

  const ai = new GoogleGenAI({ apiKey });

  // Ekstrak base64 murni dari data URL
  const base64Data = base64Image.startsWith('data:')
    ? base64Image.split(',')[1]
    : base64Image;

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
          {
            text: PROMPT,
          },
        ],
      },
    ],
    config: {
      temperature: 0.0,
      maxOutputTokens: 1024,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Gemini response");
  return JSON.parse(jsonMatch[0]) as KTPData;
};

// === MAIN: Groq dulu, jika gagal gunakan Gemini ===
export const extractKTPData = async (
  base64Image: string,
  signal?: AbortSignal
): Promise<KTPData> => {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  // Resize dengan kualitas tinggi untuk akurasi OCR optimal
  const resizedImage = await resizeImage(base64Image, 1200);

  // Coba Groq terlebih dahulu (lebih cepat)
  try {
    const result = await extractWithGroq(resizedImage);
    console.log("✅ OCR via Groq berhasil");
    return result;
  } catch (groqErr) {
    console.warn("⚠️ Groq OCR gagal, mencoba Gemini sebagai fallback...", groqErr);
  }

  // Fallback ke Gemini (lebih akurat, terutama untuk teks yang sulit)
  try {
    const result = await extractWithGemini(resizedImage);
    console.log("✅ OCR via Gemini berhasil (fallback)");
    return result;
  } catch (geminiErr) {
    console.error("❌ Semua metode OCR gagal", geminiErr);
    throw new Error("Semua metode OCR gagal. Silakan isi data manual.");
  }
};
