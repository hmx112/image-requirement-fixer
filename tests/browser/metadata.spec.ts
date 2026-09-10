import { expect, test } from '@playwright/test';
import path from 'node:path';

const fixture = (name: string) => path.resolve('tests/fixtures/generated', name);

async function processBasic(page: import('@playwright/test').Page, file: string, format: string, width = '600', height = '600') {
  await page.locator('input[type=file]').setInputFiles(file);
  await page.locator('[name=width]').fill(width);
  await page.locator('[name=height]').fill(height);
  await page.locator('[name=format]').selectOption(format);
}

test('re-encoded output does not retain the source EXIF marker', async ({ page }) => {
  await page.goto('/');
  await processBasic(page, fixture('gps-metadata.jpg'), 'jpg');
  await page.getByRole('button', { name: 'Fix My Image' }).click();
  await expect(page.getByText('All requirements met')).toBeVisible();
  const markerPresent = await page.evaluate(async () => {
    const href = document.querySelector<HTMLAnchorElement>('[data-download]')!.href;
    const bytes = new Uint8Array(await (await fetch(href)).arrayBuffer());
    return new TextDecoder('latin1').decode(bytes).includes('IRF_GPS_FIXTURE_MARKER');
  });
  expect(markerPresent).toBe(false);
});

test('JPG plus transparent Fit background is an explicit conflict', async ({ page }) => {
  await page.goto('/');
  await processBasic(page, fixture('transparent.png'), 'jpg');
  await page.locator('[name=aspectMode][value=fit]').check();
  await page.locator('[name=fitBackground][value=transparent]').check();
  await page.getByRole('button', { name: 'Fix My Image' }).click();
  await expect(page.getByText('JPG does not support transparency.')).toBeVisible();
  await expect(page.getByText('All requirements met')).toHaveCount(0);
  await expect(page.locator('[data-download]:visible')).toHaveCount(0);
});

test('impossible exact PNG byte limit fails without silent resize or format change', async ({ page }) => {
  await page.goto('/');
  await processBasic(page, fixture('transparent.png'), 'png');
  await page.locator('[name=maxSize]').fill('0.05');
  await page.locator('[name=maxSizeUnit]').selectOption('KB');
  await page.getByRole('button', { name: 'Fix My Image' }).click();
  await expect(page.getByText(/PNG could not meet/i)).toBeVisible();
  await expect(page.locator('[name=width]')).toHaveValue('600');
  await expect(page.locator('[name=height]')).toHaveValue('600');
  await expect(page.locator('[name=format]')).toHaveValue('png');
  await expect(page.getByRole('button', { name: 'Use WEBP' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use JPG' })).toBeVisible();
});

test('unsupported HEIC is rejected locally', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'photo.heic', mimeType: 'image/heic', buffer: Buffer.from([0, 1, 2, 3]) });
  await expect(page.getByText(/Supported formats are JPG, PNG and WebP/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fix My Image' })).toBeDisabled();
});

test('encoder MIME fallback is detected instead of reported compliant', async ({ page }) => {
  await page.goto('/');
  await processBasic(page, fixture('landscape.jpg'), 'jpg');
  await page.evaluate(() => {
    Object.defineProperty(window, 'Worker', { value: undefined, configurable: true });
    HTMLCanvasElement.prototype.toBlob = function (callback) {
      callback(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));
    };
  });
  await page.getByRole('button', { name: 'Fix My Image' }).click();
  await expect(page.getByText(/did not produce the requested image format/i)).toBeVisible();
  await expect(page.getByText('All requirements met')).toHaveCount(0);
});
