import { KTPData } from '../types';

// === RESIZE: Kurangi ukuran gambar sebelum dikirim ke API ===
const resizeImage = (base64Image: string, maxSize = 900): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = img.width > maxSize ? maxSize / img.width : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas tidak tersedia'));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => reject(new Error('Gagal memuat gambar'));
    img.src = base64Image;
  });
};

// === MAIN: Kirim ke backend /api/ocr-ktp (API key aman di server) ===
export const extractKTPData = async (
  base64Image: string,
  signal?: AbortSignal
): Promise<KTPData> => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  // Kompres gambar terlebih dahulu
  const resizedImage = await resizeImage(base64Image, 900);

  const response = await fetch('/api/ocr-ktp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: resizedImage }),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(err.error || `OCR API error: ${response.status}`);
  }

  return response.json() as Promise<KTPData>;
};
