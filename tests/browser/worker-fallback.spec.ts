import { expect, test } from '@playwright/test';

async function runSyntheticProcess(page: import('@playwright/test').Page, disableWorker: boolean) {
  return page.evaluate(async ({ disableWorker }) => {
    if (disableWorker) Object.defineProperty(window, 'Worker', { value: undefined, configurable: true });
    const modulePath = '/src/worker/worker-client.ts';
    const { processWithBestAvailablePath } = await import(modulePath);
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 600;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#777'; ctx.fillRect(0, 0, 900, 600);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), 'image/jpeg', 0.9));
    const result = await processWithBestAvailablePath({
      file: new File([blob], 'source.jpg', { type: 'image/jpeg' }),
      requirements: { format: 'jpg', width: 300, height: 300, maxBytes: 100_000, dimensionsAreExact: true },
      aspectMode: 'crop', crop: { centerX: 0.5, centerY: 0.5, zoom: 1 }, fitBackground: { kind: 'white' },
    });
    return result.ok ? { ok: true, passed: result.compliance.passed } : result;
  }, { disableWorker });
}

test('processes through best available worker path', async ({ page }) => {
  await page.goto('/'); expect(await runSyntheticProcess(page, false)).toMatchObject({ ok: true, passed: true });
});
test('falls back to main-thread canvas when Worker is unavailable', async ({ page }) => {
  await page.goto('/'); expect(await runSyntheticProcess(page, true)).toMatchObject({ ok: true, passed: true });
});
