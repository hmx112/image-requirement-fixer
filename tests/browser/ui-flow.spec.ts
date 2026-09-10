import { expect, test } from '@playwright/test';

const onePixelPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZP14AAAAASUVORK5CYII=';
const onePixelPng = Buffer.from(onePixelPngBase64, 'base64');

test('shows local-processing trust copy and parser-filled editable fields', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('100% Local Processing')).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: onePixelPng });
  await page.locator('[name=requirementText]').fill('Photo must be JPG format, 600 x 600 pixels and less than 200 KB.');
  await page.getByRole('button', { name: 'Detect requirements' }).click();
  await expect(page.locator('[name=width]')).toHaveValue('600');
  await expect(page.locator('[name=height]')).toHaveValue('600');
  await expect(page.locator('[name=format]')).toHaveValue('jpg');
  await page.locator('[name=width]').fill('640');
  await expect(page.locator('[name=width]')).toHaveValue('640');
});

test('shows a concise main hero and drag-drop upload copy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Fix Your Image for Upload' })).toBeVisible();
  await expect(page.getByText('Size, dimensions, format — all in one.')).toBeVisible();
  await expect(page.getByText('Drag & drop an image here')).toBeVisible();
  await expect(page.getByText('or click to browse JPG, PNG or WebP')).toBeVisible();
});

test('accepts a PNG dropped onto the upload zone', async ({ page }) => {
  await page.goto('/');
  const dropzone = page.locator('[data-dropzone]');
  await dropzone.evaluate((element, base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const file = new File([bytes], 'dropped.png', { type: 'image/png' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    element.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  }, onePixelPngBase64);

  await expect(page.getByText('Original image')).toBeVisible();
  await expect(page.getByText('1×1 px')).toBeVisible();
  await expect(page.locator('[data-source-summary]')).toContainText('PNG');
});
