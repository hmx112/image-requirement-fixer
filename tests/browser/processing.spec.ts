import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const fixture = (name: string) => path.resolve('tests/fixtures/generated', name);

async function fillTarget(page: Page, options: { width?: string; height?: string; format?: string; maxSize?: string }) {
  if (options.width !== undefined) await page.locator('[name=width]').fill(options.width);
  if (options.height !== undefined) await page.locator('[name=height]').fill(options.height);
  if (options.format !== undefined) await page.locator('[name=format]').selectOption(options.format);
  if (options.maxSize !== undefined) { await page.locator('[name=maxSize]').fill(options.maxSize); await page.locator('[name=maxSizeUnit]').selectOption('KB'); }
}

async function readOutputPixel(page: Page, x: number, y: number) {
  await page.locator('[data-download]').waitFor({ state: 'attached' });
  return page.evaluate(async ({ x, y }) => {
    const anchor = document.querySelector<HTMLAnchorElement>('[data-download]')!;
    const blob = await fetch(anchor.href).then((response) => response.blob());
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(bitmap, 0, 0);
    const data = [...ctx.getImageData(x, y, 1, 1).data]; bitmap.close();
    return { data, width: canvas.width, height: canvas.height, mime: blob.type, bytes: blob.size };
  }, { x, y });
}

test('creates a compliant 600x600 JPG under 200KB', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(fixture('landscape.jpg'));
  await fillTarget(page, { width: '600', height: '600', format: 'jpg', maxSize: '200' });
  await page.getByRole('button', { name: 'Fix My Image' }).click();
  await expect(page.getByText('All requirements met')).toBeVisible();
  const output = await readOutputPixel(page, 300, 300);
  expect(output.width).toBe(600); expect(output.height).toBe(600); expect(output.mime).toBe('image/jpeg'); expect(output.bytes).toBeLessThanOrEqual(200_000);
});

test('reports EXIF-oriented source dimensions', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(fixture('exif-rotated.jpg'));
  await expect(page.locator('[data-source-summary]')).toContainText('800×1200 px');
});

test('Fit with transparent PNG keeps empty corners transparent', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(fixture('transparent.png'));
  await fillTarget(page, { width: '600', height: '600', format: 'png' });
  await page.locator('[name=aspectMode][value=fit]').check();
  await page.locator('[name=fitBackground][value=transparent]').check();
  await page.getByRole('button', { name: 'Fix My Image' }).click();
  await expect(page.getByText('All requirements met')).toBeVisible();
  const output = await readOutputPixel(page, 3, 3);
  expect(output.data[3]).toBe(0);
});

test('Fit with white background paints empty corners white', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(fixture('landscape.jpg'));
  await fillTarget(page, { width: '600', height: '600', format: 'png' });
  await page.locator('[name=aspectMode][value=fit]').check();
  await page.locator('[name=fitBackground][value=white]').check();
  await page.getByRole('button', { name: 'Fix My Image' }).click();
  const output = await readOutputPixel(page, 3, 3);
  expect(output.data.slice(0, 4)).toEqual([255, 255, 255, 255]);
});

test('Fit blur background fills empty corners', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(fixture('landscape.jpg'));
  await fillTarget(page, { width: '600', height: '600', format: 'png' });
  await page.locator('[name=aspectMode][value=fit]').check();
  await page.locator('[name=fitBackground][value=blur]').check();
  await page.getByRole('button', { name: 'Fix My Image' }).click();
  const output = await readOutputPixel(page, 3, 3);
  expect(output.data[3]).toBeGreaterThan(0);
});

test('crop drag changes the final sampled source region', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(fixture('crop-regions.png'));
  await fillTarget(page, { width: '600', height: '600', format: 'png' });
  const canvas = page.locator('[data-preview]');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox(); expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 - box.width * 0.25, box.y + box.height / 2, { steps: 5 }); await page.mouse.up();
  await page.getByRole('button', { name: 'Fix My Image' }).click();
  const output = await readOutputPixel(page, 300, 300);
  expect(output.data[2]!).toBeGreaterThan(output.data[0]!);
  expect(output.data[2]!).toBeGreaterThan(output.data[1]!);
});

test('Stretch forces exact 600x600 output dimensions', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(fixture('landscape.jpg'));
  await fillTarget(page, { width: '600', height: '600', format: 'jpg' });
  await page.locator('summary').filter({ hasText: 'More options' }).click();
  await page.locator('[name=aspectMode][value=stretch]').check();
  await page.getByRole('button', { name: 'Fix My Image' }).click();
  const output = await readOutputPixel(page, 300, 300);
  expect(output.width).toBe(600); expect(output.height).toBe(600);
});
