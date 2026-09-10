import { expect, it } from 'vitest';
import { optimizeLossySize } from '../../src/core/target-file-size';

function fakeBlob(size: number): Blob { return new Blob([new Uint8Array(size)], { type: 'image/jpeg' }); }

it('returns the highest passing quality found under 200000 bytes', async () => {
  const encoder = async (quality: number) => fakeBlob(Math.round(50_000 + quality * 200_000));
  const result = await optimizeLossySize(encoder, 200_000, { minQuality: 0.35, maxQuality: 0.95, iterations: 8 });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.blob.size).toBeLessThanOrEqual(200_000);
  expect(result.quality).toBeGreaterThan(0.7);
  expect(result.quality).toBeLessThanOrEqual(0.75);
});

it('reports unattainable when minimum quality still exceeds the limit', async () => {
  const encoder = async () => fakeBlob(31_000);
  expect(await optimizeLossySize(encoder, 20_000)).toMatchObject({ ok: false, smallestBytes: 31_000 });
});

it('builds a 10 percent resolution fallback ladder without changing aspect ratio', async () => {
  const { buildResolutionSteps } = await import('../../src/core/target-file-size');
  expect(buildResolutionSteps(600, 600).slice(0, 3)).toEqual([{ width: 540, height: 540 }, { width: 486, height: 486 }, { width: 437, height: 437 }]);
});
