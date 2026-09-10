import { normalizeFormat } from './format.js';

export async function decodeImage(file: File): Promise<ImageBitmap> {
  const format = normalizeFormat(file.type || file.name.split('.').pop() || '');
  if (!format) throw new Error('unsupported-input');
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('decode-failed');
  }
}
