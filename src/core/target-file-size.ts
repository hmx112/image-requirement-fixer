import type { ImageFormat } from './types.js';

export interface LossySearchOptions { minQuality: number; maxQuality: number; iterations: number; }
export type LossySearchResult =
  | { ok: true; blob: Blob; quality: number }
  | { ok: false; smallestBlob: Blob; smallestBytes: number };

export function canQualityOptimize(format: ImageFormat): boolean {
  return format === 'jpg' || format === 'webp';
}

export function buildResolutionSteps(width: number, height: number): Array<{ width: number; height: number }> {
  const steps: Array<{ width: number; height: number }> = [];
  let currentWidth = width;
  let currentHeight = height;
  while (Math.min(currentWidth, currentHeight) > 64 && steps.length < 20) {
    currentWidth = Math.max(1, Math.round(currentWidth * 0.9));
    currentHeight = Math.max(1, Math.round(currentHeight * 0.9));
    steps.push({ width: currentWidth, height: currentHeight });
  }
  return steps;
}

export async function optimizeLossySize(
  encode: (quality: number) => Promise<Blob>,
  maxBytes: number,
  options: LossySearchOptions = { minQuality: 0.35, maxQuality: 0.95, iterations: 8 },
): Promise<LossySearchResult> {
  let low = options.minQuality;
  let high = options.maxQuality;
  let best: { blob: Blob; quality: number } | undefined;
  let smallest = await encode(low);
  if (smallest.size <= maxBytes) best = { blob: smallest, quality: low };

  for (let i = 0; i < options.iterations; i += 1) {
    const quality = (low + high) / 2;
    const blob = await encode(quality);
    if (blob.size < smallest.size) smallest = blob;
    if (blob.size <= maxBytes) {
      best = { blob, quality };
      low = quality;
    } else {
      high = quality;
    }
  }

  return best ? { ok: true, ...best } : { ok: false, smallestBlob: smallest, smallestBytes: smallest.size };
}
