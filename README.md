# Image Requirement Fixer

Image Requirement Fixer is a mobile-first browser tool for fixing images that do not meet upload requirements. It can match a required file size, dimensions, aspect ratio, and output format in one flow instead of asking users to choose technical compression settings.

## Privacy and processing

Source images are processed locally in browser memory. The app does not upload source images to an API or server, and it does not store originals in cloud storage. Re-encoding also removes the original image metadata rather than copying EXIF/GPS metadata into the downloaded result.

## MVP formats

Supported input and output formats:

- JPG / JPEG
- PNG
- WebP

HEIC is intentionally unsupported in the MVP. Unsupported files are rejected locally instead of being uploaded to a conversion service.

## Requirement rules

- Compliance uses decimal file sizes: **1 KB = 1,000 bytes** and **1 MB = 1,000,000 bytes**.
- JPG and WebP search for the highest encoding quality that stays at or below the requested byte limit.
- PNG does not expose a useful lossy quality control through the browser canvas encoder, so very small PNG byte limits can fail at exact dimensions.
- Exact dimensions are never silently changed to satisfy a file-size limit.
- Output format is never silently changed. If a requested browser encoder returns a different MIME type, processing fails instead of claiming compliance.
- If dimensions are not exact and the requested byte limit is otherwise unattainable, dimension reduction only happens after explicit user approval.
- Crop is the recommended ratio-mismatch mode; Fit preserves the entire image; Stretch forces the exact target ratio and may distort the image.

## Local development

Requires Node.js 22.

```bash
npm install
npm run dev
```

Run unit tests:

```bash
npm test
```

Install Chromium for browser tests and run them:

```bash
npx playwright install chromium
npm run test:browser
```

Generate deterministic browser-test fixtures:

```bash
npm run fixtures
```

Create the production build:

```bash
npm run build
```

## Cloudflare Pages

Use these project settings:

```text
Build command: npm run build
Build output directory: dist
Node version: 22
```

The site is a static multi-page app. All landing pages share the same client-side image processing engine.

## Initial landing pages

- `/` — Image Requirement Fixer
- `/image-compressor/`
- `/image-resizer/`
- `/image-format-converter/`
- `/webp-to-jpg/`
- `/remove-image-metadata/`

Numeric landing pages such as `/compress-image-to-50kb/`, `/compress-image-to-100kb/`, or `/compress-image-to-200kb/` are intentionally not generated in the MVP. Search Console data should determine whether any of those pages later deserve unique presets and content.
