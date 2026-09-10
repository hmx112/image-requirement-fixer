import type { ImageFormat } from './types.js';
import { mimeForFormat, normalizeFormat } from './format.js';

export async function encodeCanvas(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  format: ImageFormat,
  quality?: number,
): Promise<Blob> {
  const mime = mimeForFormat(format);
  const blob = 'convertToBlob' in canvas
    ? await (canvas as OffscreenCanvas).convertToBlob({ type: mime, quality })
    : await new Promise<Blob>((resolve, reject) => {
        (canvas as HTMLCanvasElement).toBlob(
          (value) => value ? resolve(value) : reject(new Error('encode-failed')),
          mime,
          quality,
        );
      });

  if (normalizeFormat(blob.type) !== format) throw new Error('encoder-format-mismatch');
  return blob;
}
