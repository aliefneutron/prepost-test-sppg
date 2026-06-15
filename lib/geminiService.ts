import { KTPData } from "../types";
import { createWorker } from "tesseract.js";

const PROMPT = `You are an OCR engine for Indonesian ID cards (KTP). Extract all data from the KTP image and return ONLY a valid JSON object with no extra text, no markdown, no code blocks. Use this exact structure:
{"nik":"","nama":"","tempat_tgl_lahir":"","jenis_kelamin":"","alamat":"","rt_rw":"","kel_desa":"","kecamatan":"","agama":"","status_perkawinan":"","pekerjaan":"","kewarganegaraan":"","berlaku_hingga":""}
Fill each field with the text from the KTP. If a field cannot be read, use empty string.`;

// === GROQ Vision OCR (Primary - Gratis, Akurat) ===
const extractWithGroq = async (base64Image: string): Promise<KTPData> => {
  const p1 = import.meta.env.VITE_GROQ_API_KEY_P1 || "";
  const p2 = import.meta.env.VITE_GROQ_API_KEY_P2 || "";
  const apiKey = [p1, p2].join("");
  if (!apiKey) throw new Error("No Groq API key");

  // Pastikan format base64 benar
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
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(JSON.stringify(err));
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Groq");

  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned) as KTPData;
};

// === TESSERACT OCR (Fallback lokal) ===
const preprocessImage = (base64Image: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 1600;
      const scale = img.width > maxW ? maxW / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.8 + 128));
        d[i] = d[i + 1] = d[i + 2] = enhanced;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png', 1.0));
    };
    img.src = base64Image;
  });
};

const extractWithTesseract = async (base64Image: string): Promise<KTPData> => {
  const processedImage = await preprocessImage(base64Image);
  const worker = await createWorker('ind');
  const { data: { text } } = await worker.recognize(processedImage);
  await worker.terminate();

  console.log("Tesseract OCR Raw:\n", text);
  const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 2);

  const nikMatch = text.replace(/[oO]/g, '0').replace(/[\s\-\.]/g, '').match(/(\d{16})/);
  const getField = (kw: RegExp): string => {
    const idx = lines.findIndex((l: string) => kw.test(l));
    if (idx === -1) return '';
    const after = lines[idx].split(':').pop()?.trim() || '';
    return after.length > 1 ? after : (lines[idx + 1] || '');
  };

  return {
    nik: nikMatch ? nikMatch[1] : '',
    nama: getField(/^nama/i).replace(/[^a-zA-Z\s]/g, '').trim(),
    tempat_tgl_lahir: getField(/lahir/i),
    jenis_kelamin: '',
    alamat: getField(/^alamat/i),
    rt_rw: getField(/^rt\s*[\/\-]?\s*rw/i),
    kel_desa: getField(/kel.*desa|desa|kelurahan/i),
    kecamatan: getField(/kecamatan/i),
    agama: '',
    status_perkawinan: '',
    pekerjaan: '',
    kewarganegaraan: '',
    berlaku_hingga: '',
  };
};

// === MAIN: Groq → Tesseract fallback ===
export const extractKTPData = async (
  base64Image: string,
  signal?: AbortSignal
): Promise<KTPData & { usedFallback?: boolean }> => {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  try {
    const result = await extractWithGroq(base64Image);
    console.log("✅ OCR via Groq berhasil");
    return result;
  } catch (groqError: any) {
    console.warn("⚠️ Groq gagal, beralih ke Tesseract:", groqError?.message);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const result = await extractWithTesseract(base64Image);
    return { ...result, usedFallback: true };
  }
};
