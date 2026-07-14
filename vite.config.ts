import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Plugin: Simulasi endpoint /api/ocr-ktp saat development lokal
// Di Vercel production, endpoint ini ditangani oleh api/ocr-ktp.ts (serverless function)
function ocrApiDevPlugin() {
  const PROMPT = `Kamu adalah mesin OCR khusus untuk KTP (Kartu Tanda Penduduk) Indonesia.
Ekstrak SEMUA data dari gambar KTP ini dengan sangat teliti.
Kembalikan HANYA objek JSON yang valid tanpa teks tambahan, tanpa markdown, tanpa code block.
Gunakan struktur JSON berikut PERSIS:
{"nik":"","nama":"","tempat_tgl_lahir":"","jenis_kelamin":"","alamat":"","rt_rw":"","kel_desa":"","kecamatan":"","agama":"","status_perkawinan":"","pekerjaan":"","kewarganegaraan":"","berlaku_hingga":""}
Petunjuk: nik=16 digit NIK, jenis_kelamin=LAKI-LAKI/PEREMPUAN, kosongkan field yang tidak terbaca. Hanya kembalikan JSON.`;

  return {
    name: 'ocr-api-dev',
    configureServer(server: any) {
      server.middlewares.use('/api/ocr-ktp', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { image } = JSON.parse(body);
            const base64Data = image.includes(',') ? image.split(',')[1] : image;
            const apiKey = process.env.VITE_GEMINI_API_KEY || '';

            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'VITE_GEMINI_API_KEY tidak ditemukan di .env.local' }));
              return;
            }

            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
              {
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
              }
            );

            const data = await geminiRes.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Respons Gemini kosong');

            const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Tidak ada JSON dalam respons Gemini');

            res.setHeader('Content-Type', 'application/json');
            res.end(jsonMatch[0]);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'OCR gagal' }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: process.env.VERCEL ? '/' : '/prepost-test-sppg/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), tailwindcss(), ocrApiDevPlugin()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
