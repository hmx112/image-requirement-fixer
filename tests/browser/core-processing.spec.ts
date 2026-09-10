import { expect, test } from '@playwright/test';

test('processes an in-memory landscape image to compliant 600x600 JPG', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const modulePath = '/src/core/process-image.ts';
    const { processImage, makeMainThreadCanvas } = await import(modulePath);
    const source = document.createElement('canvas');
    source.width = 1200; source.height = 800;
    const sourceCtx = source.getContext('2d')!;
    sourceCtx.fillStyle = '#2f6fb0'; sourceCtx.fillRect(0, 0, source.width, source.height);
    const sourceBlob = await new Promise<Blob>((resolve) => source.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95));
    const file = new File([sourceBlob], 'landscape.jpg', { type: 'image/jpeg' });
    const processed = await processImage({
      file,
      requirements: { format: 'jpg', width: 600, height: 600, maxBytes: 200_000, dimensionsAreExact: true },
      aspectMode: 'crop',
      crop: { centerX: 0.5, centerY: 0.5, zoom: 1 },
      fitBackground: { kind: 'white' },
    }, makeMainThreadCanvas);
    if (!processed.ok) return processed;
    return { ok: true, mime: processed.image.blob.type, bytes: processed.image.blob.size, width: processed.image.width, height: processed.image.height, compliance: processed.compliance.passed };
  });
  expect(result).toMatchObject({ ok: true, mime: 'image/jpeg', width: 600, height: 600, compliance: true });
  if ('bytes' in result) expect(result.bytes).toBeLessThanOrEqual(200_000);
});
