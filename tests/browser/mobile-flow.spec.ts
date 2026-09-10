import { expect, test } from '@playwright/test';
import path from 'node:path';

const landscape = path.resolve('tests/fixtures/generated/landscape.jpg');

test('mobile user fixes a ratio-mismatched image and downloads a compliant result', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(landscape);
  await expect(page.getByText('100% Local Processing')).toBeVisible();
  await expect(page.getByText('Your image never leaves your device.')).toBeVisible();

  await page.locator('[name=maxSize]').fill('200');
  await page.locator('[name=maxSizeUnit]').selectOption('KB');
  await page.locator('[name=width]').fill('600');
  await page.locator('[name=height]').fill('600');
  await page.locator('[name=format]').selectOption('jpg');

  await expect(page.getByText("The aspect ratios don't match.")).toBeVisible();
  await expect(page.locator('[name=aspectMode][value=crop]')).toBeChecked();
  await page.getByRole('button', { name: 'Fix My Image' }).click();

  await expect(page.getByText('All requirements met')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download Compliant Image' })).toBeVisible();
});

test('ratio controls stay hidden when source and target ratios already match', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(landscape);
  await page.locator('[name=width]').fill('900');
  await page.locator('[name=height]').fill('600');

  await expect(page.getByText("The aspect ratios don't match.")).toBeHidden();
});

test('detected requirements remain editable on mobile', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(landscape);
  await page.locator('[name=requirementText]').fill(
    'Photo must be JPG format, 600 x 600 pixels and less than 200 KB.',
  );
  await page.getByRole('button', { name: 'Detect Requirements' }).click();

  await expect(page.locator('[name=format]')).toHaveValue('jpg');
  await expect(page.locator('[name=width]')).toHaveValue('600');
  await expect(page.locator('[name=height]')).toHaveValue('600');
  await expect(page.locator('[name=maxSize]')).toHaveValue('200');
  await expect(page.locator('[name=maxSizeUnit]')).toHaveValue('KB');

  await page.locator('[name=width]').fill('720');
  await expect(page.locator('[name=width]')).toHaveValue('720');
});
