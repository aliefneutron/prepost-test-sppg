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

// === GEMINI via REST API (Primary) ===
async function extractWithGemini(base64Data: string): Promise<any> {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) throw new Error('API KEY Gemini tidak dikonfigurasi di server');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: PROMPT }
        ]
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 512 }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini ${response.status}: ${err?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini mengembalikan respons kosong');

  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini tidak mengembalikan JSON valid');
  return JSON.parse(jsonMatch[0]);
}

// === GROQ Vision (Fallback) ===
async function extractWithGroq(imageDataUrl: string): Promise<any> {
  const apiKey = process.env.VITE_GROQ_API_KEY || (process.env.GROQ_API_KEY_P1 || '') + (process.env.GROQ_API_KEY_P2 || '');
  if (!apiKey.trim()) throw new Error('API KEY Groq tidak dikonfigurasi di server');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: PROMPT }
        ]
      }],
      max_tokens: 512,
      temperature: 0
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq ${response.status}: ${err?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq mengembalikan respons kosong');

  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Groq tidak mengembalikan JSON valid');
  return JSON.parse(jsonMatch[0]);
}

// === VERCEL SERVERLESS HANDLER ===
export default async function handler(req: any, res: any) {
  // CORS headers untuk keamanan
  res.setHeader('Access-Control-Allow-Origin', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { image } = body || {};

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Field "image" (base64) wajib diisi' });
    }

    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const imageDataUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    // 1. Coba Gemini terlebih dahulu
    try {
      const result = await extractWithGemini(base64Data);
      console.log('[OCR] ✅ Gemini berhasil');
      return res.status(200).json(result);
    } catch (geminiErr: any) {
      console.warn('[OCR] ⚠️ Gemini gagal:', geminiErr.message);
    }

    // 2. Fallback ke Groq
    try {
      const result = await extractWithGroq(imageDataUrl);
      console.log('[OCR] ✅ Groq berhasil (fallback)');
      return res.status(200).json(result);
    } catch (groqErr: any) {
      console.error('[OCR] ❌ Semua metode gagal:', groqErr.message);
      return res.status(500).json({ error: `OCR gagal: ${groqErr.message}` });
    }

  } catch (err: any) {
    console.error('[OCR] Error tidak terduga:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
