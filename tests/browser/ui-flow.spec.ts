import { expect, test } from '@playwright/test';

const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZP14AAAAASUVORK5CYII=', 'base64');

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
