import { expect, test } from '@playwright/test';

const site = 'https://image-requirement-fixer.pages.dev';

test('exposes Google Search Console verification on the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute(
    'content',
    '4ZhhZv5KF_LkqKW8-C3BRgAjVLLGdZxqhq732zF3W80',
  );
});

test('publishes a sitemap with the market-validation pages and advertises it in robots.txt', async ({ request }) => {
  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.ok()).toBeTruthy();
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain(`${site}/ph/eps-topik-photo/`);
  expect(sitemap).toContain(`${site}/ph/eps-topik-passport/`);
  expect(sitemap).toContain(`${site}/image-compressor/`);
  expect(sitemap).toContain(`${site}/image-resizer/`);

  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.ok()).toBeTruthy();
  const robots = await robotsResponse.text();
  expect(robots).toContain(`Sitemap: ${site}/sitemap.xml`);
});
