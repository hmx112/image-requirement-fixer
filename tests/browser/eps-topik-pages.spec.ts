import { expect, test } from '@playwright/test';

const officialDmwUrl = 'https://eps.dmw.gov.ph/';

test('prefills the current DMW EPS-TOPIK ID photo requirements', async ({ page }) => {
  await page.goto('/ph/eps-topik-photo/');

  await expect(page).toHaveTitle('EPS-TOPIK Photo 300x400 JPG 13KB or Less | Image Requirement Fixer');
  await expect(page.getByRole('heading', { level: 1, name: 'EPS-TOPIK ID Photo: 300×400 JPG, 13KB or less' })).toBeVisible();
  await expect(page.locator('[name=width]')).toHaveValue('300');
  await expect(page.locator('[name=height]')).toHaveValue('400');
  await expect(page.locator('[name=format]')).toHaveValue('jpg');
  await expect(page.locator('[name=maxSize]')).toHaveValue('13');
  await expect(page.locator('[name=maxSizeUnit]')).toHaveValue('KB');
  await expect(page.getByRole('link', { name: 'Official DMW EPS requirements' })).toHaveAttribute('href', officialDmwUrl);
  await expect(page.getByText('Verified against the official DMW EPS site on September 12, 2026.')).toBeVisible();
});

test('prefills the current DMW EPS-TOPIK passport scan requirements', async ({ page }) => {
  await page.goto('/ph/eps-topik-passport/');

  await expect(page).toHaveTitle('EPS-TOPIK Passport 800x600 JPG 90KB or Less | Image Requirement Fixer');
  await expect(page.getByRole('heading', { level: 1, name: 'EPS-TOPIK Passport Scan: 800×600 JPG, 90KB or less' })).toBeVisible();
  await expect(page.locator('[name=width]')).toHaveValue('800');
  await expect(page.locator('[name=height]')).toHaveValue('600');
  await expect(page.locator('[name=format]')).toHaveValue('jpg');
  await expect(page.locator('[name=maxSize]')).toHaveValue('90');
  await expect(page.locator('[name=maxSizeUnit]')).toHaveValue('KB');
  await expect(page.getByRole('link', { name: 'Official DMW EPS requirements' })).toHaveAttribute('href', officialDmwUrl);
  await expect(page.getByText('Verified against the official DMW EPS site on September 12, 2026.')).toBeVisible();
});
