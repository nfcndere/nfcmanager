export type CompressedImageResult = {
  file: File;
  width?: number;
  height?: number;
  wasCompressed: boolean;
};

const MAX_DIMENSION = 2_000;
const QUALITY = 0.82;

/**
 * Redimensionne (≤ 2000 px sur le plus grand côté) et compresse une image en WebP/JPEG (~0,82)
 * côté navigateur avant l'envoi. Les vidéos, GIF animés et petits fichiers (< 350 Ko) sont conservés tels quels.
 */
export async function compressImageBeforeUpload(file: File): Promise<CompressedImageResult> {
  if (typeof document === 'undefined' || !file.type.startsWith('image/') || file.type === 'image/gif') {
    return { file, wasCompressed: false };
  }
  if (file.size <= 350 * 1024) {
    return { file, wasCompressed: false };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      if (!naturalW || !naturalH) {
        resolve({ file, wasCompressed: false });
        return;
      }

      const scale = Math.min(1, MAX_DIMENSION / Math.max(naturalW, naturalH));
      const targetW = Math.max(1, Math.round(naturalW * scale));
      const targetH = Math.max(1, Math.round(naturalH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ file, width: naturalW, height: naturalH, wasCompressed: false });
        return;
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const outputMime = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve({ file, width: naturalW, height: naturalH, wasCompressed: false });
            return;
          }
          const ext = outputMime === 'image/webp' ? '.webp' : '.jpg';
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressed = new File([blob], `${baseName}${ext}`, {
            type: outputMime,
            lastModified: Date.now(),
          });
          resolve({ file: compressed, width: targetW, height: targetH, wasCompressed: true });
        },
        outputMime,
        QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ file, wasCompressed: false });
    };

    img.src = objectUrl;
  });
}
