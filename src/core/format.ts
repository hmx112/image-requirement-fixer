import type { ImageFormat } from './types.js';

export function normalizeFormat(value: string): ImageFormat | undefined {
  const normalized = value.trim().toLowerCase().replace(/^\./, '');
  if (normalized === 'jpg' || normalized === 'jpeg' || normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'png' || normalized === 'image/png') return 'png';
  if (normalized === 'webp' || normalized === 'image/webp') return 'webp';
  return undefined;
}

export function mimeForFormat(format: ImageFormat): string {
  if (format === 'jpg') return 'image/jpeg';
  if (format === 'png') return 'image/png';
  return 'image/webp';
}
