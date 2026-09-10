# Image Requirement Fixer MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, browser-only image requirement fixer that converts JPG/PNG/WebP images to user-specified dimensions, aspect handling, format, and maximum file size, then proves compliance before download.

**Architecture:** A Vite + TypeScript static multi-page app exposes one shared processing engine to six intent-specific landing pages. Pure geometry/parser/compliance logic stays framework-free and unit-testable; browser-only decode/render/encode work runs in a Web Worker with OffscreenCanvas when possible and falls back to main-thread Canvas with identical behavior.

**Tech Stack:** Node 22, npm 10, Vite, TypeScript, Vanilla DOM, Canvas API, createImageBitmap, Web Worker, OffscreenCanvas, Vitest, Playwright, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-09-10-image-requirement-fixer-design.md`

## Global Constraints

- Supported input formats: JPG/JPEG, PNG, WebP only.
- Supported output formats: JPG, PNG, WebP only.
- No application backend, external image-processing API, cloud upload, account system, or batch processing in MVP.
- Process source files locally in the browser; never upload the original as a fallback.
- Use decimal upload limits: 1 KB = 1,000 bytes and 1 MB = 1,000,000 bytes.
- Exact width + height outrank explicit aspect ratio, which outranks source aspect ratio.
- Show Crop / Fit / Stretch controls only when source and resolved target ratios differ.
- Recommend Crop by default, but require preview and repositioning controls.
- Fit supports White, Black, Custom color, Transparent, and fixed Blur background.
- Transparent output is valid only for PNG/WebP; JPG requires explicit background replacement.
- Stretch remains secondary and displays `This may distort the image.`
- JPG/WebP optimization targets the highest passing quality under the requested maximum bytes.
- Initial lossy quality search range: 0.35 through 0.95, approximately 8 iterations.
- PNG does not use quality binary search and does not add quantization in MVP.
- Never silently reduce exact dimensions or silently change output format.
- Revalidate the actual output Blob MIME, dimensions, ratio, and byte size before showing success.
- Do not use `toDataURL()` for processing or download; use Blob-based APIs.
- Metadata removal is achieved through decode → canvas render → newly encoded Blob; original metadata is not copied.
- HEIC, PDF, animated GIF, SVG editing, AI background removal, upscaling, Smart Crop, face detection, passport/visa databases, and numeric SEO page farms are out of scope.
- Initial indexable experiences: `/`, `/image-compressor/`, `/image-resizer/`, `/image-format-converter/`, `/webp-to-jpg/`, `/remove-image-metadata/`.
- Primary mobile E2E viewport: 375×812.

---

## Planned File Structure

```text
image-requirement-fixer/
├─ index.html                         # Principal requirement-fixer landing page
├─ image-compressor/index.html        # Max-file-size preset landing page
├─ image-resizer/index.html           # Dimension-focused preset landing page
├─ image-format-converter/index.html  # Format-conversion preset landing page
├─ webp-to-jpg/index.html             # WebP→JPG preset landing page
├─ remove-image-metadata/index.html   # Re-encode/metadata-removal preset landing page
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ playwright.config.ts
├─ src/
│  ├─ main.ts                         # Bootstraps page preset + app controller
│  ├─ styles.css                      # Mobile-first shared styles
│  ├─ core/
│  │  ├─ types.ts                     # Stable domain types and worker messages
│  │  ├─ format.ts                    # MIME/extension normalization
│  │  ├─ dimensions.ts                # Ratio and target-dimension resolution
│  │  ├─ decode.ts                    # Browser decode and oriented source metadata
│  │  ├─ render.ts                    # Crop/Fit/Stretch canvas rendering
│  │  ├─ encode.ts                    # Blob encoding adapter
│  │  ├─ target-file-size.ts          # JPG/WebP binary-search optimizer
│  │  ├─ compliance.ts                # Strict final requirement checks
│  │  └─ process-image.ts             # Canonical processing pipeline
│  ├─ aspect/
│  │  ├─ crop.ts                      # Crop source-rect math + pan/zoom clamping
│  │  ├─ fit.ts                       # Contain/cover/background geometry
│  │  └─ stretch.ts                   # Exact target draw geometry
│  ├─ parser/
│  │  └─ requirement-parser.ts        # Regex/rule-based requirement extraction
│  ├─ worker/
│  │  ├─ image.worker.ts              # Worker endpoint
│  │  └─ worker-client.ts             # Feature detection + Worker/main fallback
│  ├─ ui/
│  │  ├─ app-controller.ts            # UI state machine and orchestration
│  │  ├─ upload.ts                    # File picker/drop state
│  │  ├─ requirements.ts              # Direct input + paste parser UI
│  │  ├─ aspect-editor.ts             # Crop/Fit/Stretch and crop gestures
│  │  ├─ preview.ts                   # Canvas preview rendering
│  │  ├─ compliance-result.ts         # Before/After + PASS/FAIL output
│  │  └─ download.ts                  # Blob URL lifecycle and download action
│  └─ pages/
│     └─ presets.ts                    # Landing-page title/copy/default settings
├─ tests/
│  ├─ unit/
│  │  ├─ format.test.ts
│  │  ├─ dimensions.test.ts
│  │  ├─ crop.test.ts
│  │  ├─ fit.test.ts
│  │  ├─ requirement-parser.test.ts
│  │  ├─ compliance.test.ts
│  │  └─ target-file-size.test.ts
│  ├─ browser/
│  │  ├─ processing.spec.ts
│  │  ├─ metadata.spec.ts
│  │  └─ mobile-flow.spec.ts
│  └─ fixtures/
│     └─ generate-fixtures.mjs         # Deterministic browser-test fixture generator
└─ public/
   ├─ robots.txt
   └─ _headers                         # Security/privacy-friendly static headers
```

---

### Task 1: Scaffold the static TypeScript app and stable domain types

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/core/types.ts`
- Create: `src/core/format.ts`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `tests/unit/format.test.ts`
- Create: `index.html`

**Interfaces:**
- Consumes: none.
- Produces: `ImageFormat`, `Requirements`, `SourceImageInfo`, `CropState`, `FitBackground`, `ProcessRequest`, `ProcessedImage`, `ComplianceReport`, `normalizeFormat()`, `mimeForFormat()`.

- [ ] **Step 1: Write the failing format-normalization test**

```ts
// tests/unit/format.test.ts
import { describe, expect, it } from 'vitest';
import { mimeForFormat, normalizeFormat } from '../../src/core/format';

describe('format helpers', () => {
  it('normalizes JPEG aliases to jpg', () => {
    expect(normalizeFormat('image/jpeg')).toBe('jpg');
    expect(normalizeFormat('jpeg')).toBe('jpg');
    expect(normalizeFormat('.JPG')).toBe('jpg');
  });

  it('maps output formats to MIME types', () => {
    expect(mimeForFormat('jpg')).toBe('image/jpeg');
    expect(mimeForFormat('png')).toBe('image/png');
    expect(mimeForFormat('webp')).toBe('image/webp');
  });
});
```

- [ ] **Step 2: Create package/tooling files and run the test to verify failure**

```json
// package.json
{
  "name": "image-requirement-fixer",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:browser": "playwright test",
    "check": "npm run test && npm run build"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
  },
});
```

Run:
```bash
npm install
npm test -- tests/unit/format.test.ts
```

Expected: FAIL because `src/core/format.ts` does not exist yet.

- [ ] **Step 3: Define the stable domain types**

```ts
// src/core/types.ts
export type ImageFormat = 'jpg' | 'png' | 'webp';
export type AspectMode = 'crop' | 'fit' | 'stretch';
export type FitBackgroundKind = 'white' | 'black' | 'custom' | 'transparent' | 'blur';

export interface Ratio {
  width: number;
  height: number;
}

export interface Requirements {
  format?: ImageFormat;
  width?: number;
  height?: number;
  aspectRatio?: Ratio;
  maxBytes?: number;
  dimensionsAreExact?: boolean;
}

export interface SourceImageInfo {
  name: string;
  mime: string;
  format: ImageFormat;
  width: number;
  height: number;
  bytes: number;
  hasTransparency?: boolean;
}

export interface CropState {
  centerX: number;
  centerY: number;
  zoom: number;
}

export interface FitBackground {
  kind: FitBackgroundKind;
  color?: string;
}

export interface ProcessRequest {
  file: File;
  requirements: Requirements;
  aspectMode: AspectMode;
  crop: CropState;
  fitBackground: FitBackground;
  jpgBackgroundColor?: string;
  allowDimensionReduction?: boolean;
}

export interface ProcessedImage {
  blob: Blob;
  format: ImageFormat;
  width: number;
  height: number;
  quality?: number;
  resolutionReducedFrom?: { width: number; height: number };
  metadataRemoved: true;
}

export interface ComplianceItem {
  key: 'format' | 'width' | 'height' | 'aspectRatio' | 'maxBytes';
  passed: boolean;
  required: string;
  actual: string;
}

export interface ComplianceReport {
  passed: boolean;
  items: ComplianceItem[];
}
```

- [ ] **Step 4: Implement format helpers minimally**

```ts
// src/core/format.ts
import type { ImageFormat } from './types';

export function normalizeFormat(value: string): ImageFormat | undefined {
  const normalized = value.trim().toLowerCase().replace(/^\./, '');
  if (normalized === 'jpg' || normalized === 'jpeg' || normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'png' || normalized === 'image/png') return 'png';
  if (normalized === 'webp' || normalized === 'image/webp') return 'webp';
  return undefined;
}

export function mimeForFormat(format: ImageFormat): string {
  if (format === 'jpg') return 'image/jpeg';
  if (format === 'png') return 'image/png';
  return 'image/webp';
}
```

- [ ] **Step 5: Add minimal boot HTML and verify the toolchain**

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Fix image size, dimensions, format and upload requirements locally in your browser." />
    <title>Image Requirement Fixer</title>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```ts
// src/main.ts
import './styles.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <section class="shell">
    <h1>Image Requirement Fixer</h1>
    <p>Make your image match the required size, dimensions and format.</p>
  </section>
`;
```

```css
/* src/styles.css */
:root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #172033; background: #f6f8fb; }
* { box-sizing: border-box; }
body { margin: 0; }
.shell { width: min(100% - 32px, 760px); margin: 0 auto; padding: 32px 0 64px; }
```

Run:
```bash
npm test -- tests/unit/format.test.ts
npm run build
```

Expected: test PASS and Vite build succeeds.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src tests/unit/format.test.ts
git commit -m "chore: scaffold image requirement fixer"
```

---

### Task 2: Implement ratio reduction and aspect-mode-aware target-dimension resolution

**Files:**
- Create: `src/core/dimensions.ts`
- Create: `tests/unit/dimensions.test.ts`

**Interfaces:**
- Consumes: `Ratio`, `Requirements`, `AspectMode` from `src/core/types.ts`.
- Produces: `reduceRatio(width, height): Ratio`, `ratiosEqual(a, b): boolean`, `resolveTargetDimensions(sourceWidth, sourceHeight, requirements, aspectMode): { width; height; ratio }`.

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/dimensions.test.ts
import { describe, expect, it } from 'vitest';
import { reduceRatio, resolveTargetDimensions } from '../../src/core/dimensions';

describe('dimensions', () => {
  it('reduces pixel dimensions to stable ratios', () => {
    expect(reduceRatio(3000, 2000)).toEqual({ width: 3, height: 2 });
    expect(reduceRatio(600, 600)).toEqual({ width: 1, height: 1 });
  });

  it('uses exact width and height when both are provided', () => {
    expect(resolveTargetDimensions(3000, 2000, { width: 600, height: 600 }, 'crop'))
      .toEqual({ width: 600, height: 600, ratio: { width: 1, height: 1 } });
  });

  it('calculates a missing dimension from the explicit ratio first', () => {
    expect(resolveTargetDimensions(3000, 2000, { width: 1200, aspectRatio: { width: 1, height: 1 } }, 'crop'))
      .toEqual({ width: 1200, height: 1200, ratio: { width: 1, height: 1 } });
  });

  it('uses source ratio when only one dimension is provided', () => {
    expect(resolveTargetDimensions(1600, 1200, { width: 1200 }, 'crop'))
      .toEqual({ width: 1200, height: 900, ratio: { width: 4, height: 3 } });
  });

  it('preserves the largest crop resolution when only a target ratio is supplied', () => {
    expect(resolveTargetDimensions(3000, 2000, { aspectRatio: { width: 1, height: 1 } }, 'crop'))
      .toEqual({ width: 2000, height: 2000, ratio: { width: 1, height: 1 } });
  });

  it('preserves the whole source without downscaling for Fit when only a target ratio is supplied', () => {
    expect(resolveTargetDimensions(3000, 2000, { aspectRatio: { width: 1, height: 1 } }, 'fit'))
      .toEqual({ width: 3000, height: 3000, ratio: { width: 1, height: 1 } });
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:
```bash
npm test -- tests/unit/dimensions.test.ts
```

Expected: FAIL because `src/core/dimensions.ts` is missing.

- [ ] **Step 3: Implement pure dimension helpers with aspect-mode-aware ratio-only behavior**

```ts
// src/core/dimensions.ts
import type { AspectMode, Ratio, Requirements } from './types';

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) [x, y] = [y, x % y];
  return x || 1;
}

export function reduceRatio(width: number, height: number): Ratio {
  const divisor = gcd(width, height);
  return { width: Math.round(width / divisor), height: Math.round(height / divisor) };
}

export function ratiosEqual(a: Ratio, b: Ratio): boolean {
  return a.width * b.height === b.width * a.height;
}

export function resolveTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  requirements: Requirements,
  aspectMode: AspectMode,
): { width: number; height: number; ratio: Ratio } {
  const sourceRatio = reduceRatio(sourceWidth, sourceHeight);
  const ratio = requirements.width && requirements.height
    ? reduceRatio(requirements.width, requirements.height)
    : requirements.aspectRatio ?? sourceRatio;

  if (requirements.width && requirements.height) {
    return { width: requirements.width, height: requirements.height, ratio };
  }
  if (requirements.width) {
    return { width: requirements.width, height: Math.round(requirements.width * ratio.height / ratio.width), ratio };
  }
  if (requirements.height) {
    return { width: Math.round(requirements.height * ratio.width / ratio.height), height: requirements.height, ratio };
  }

  if (requirements.aspectRatio) {
    const sourceValue = sourceWidth / sourceHeight;
    const targetValue = ratio.width / ratio.height;

    if (aspectMode === 'crop') {
      if (sourceValue >= targetValue) {
        return { width: Math.round(sourceHeight * targetValue), height: sourceHeight, ratio };
      }
      return { width: sourceWidth, height: Math.round(sourceWidth / targetValue), ratio };
    }

    if (sourceValue >= targetValue) {
      return { width: sourceWidth, height: Math.round(sourceWidth / targetValue), ratio };
    }
    return { width: Math.round(sourceHeight * targetValue), height: sourceHeight, ratio };
  }

  return { width: sourceWidth, height: sourceHeight, ratio: sourceRatio };
}
```

For ratio-only Stretch, use the same no-downscale target canvas rule as Fit; Stretch changes drawing geometry, not target size selection.

- [ ] **Step 4: Run unit tests**

Run:
```bash
npm test -- tests/unit/dimensions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/dimensions.ts tests/unit/dimensions.test.ts
git commit -m "feat: resolve image dimensions and ratios"
```

---

### Task 3: Implement Crop, Fit, and Stretch geometry including crop pan/zoom clamping

**Files:**
- Create: `src/aspect/crop.ts`
- Create: `src/aspect/fit.ts`
- Create: `src/aspect/stretch.ts`
- Create: `tests/unit/crop.test.ts`
- Create: `tests/unit/fit.test.ts`

**Interfaces:**
- Consumes: source dimensions, target dimensions, `CropState`.
- Produces: `getCropRect()`, `clampCropState()`, `getFitGeometry()`, `getStretchGeometry()`.

- [ ] **Step 1: Write failing crop tests**

```ts
// tests/unit/crop.test.ts
import { describe, expect, it } from 'vitest';
import { getCropRect } from '../../src/aspect/crop';

describe('crop geometry', () => {
  it('center-crops 3000x2000 to 1:1', () => {
    expect(getCropRect(3000, 2000, 1, { centerX: 0.5, centerY: 0.5, zoom: 1 }))
      .toEqual({ x: 500, y: 0, width: 2000, height: 2000 });
  });

  it('zooms by shrinking the source rectangle while retaining target ratio', () => {
    expect(getCropRect(3000, 2000, 1, { centerX: 0.5, centerY: 0.5, zoom: 2 }))
      .toEqual({ x: 1000, y: 500, width: 1000, height: 1000 });
  });
});
```

- [ ] **Step 2: Write failing Fit tests**

```ts
// tests/unit/fit.test.ts
import { describe, expect, it } from 'vitest';
import { getFitGeometry } from '../../src/aspect/fit';

describe('fit geometry', () => {
  it('contains 3000x2000 inside 600x600', () => {
    expect(getFitGeometry(3000, 2000, 600, 600)).toEqual({
      x: 0,
      y: 100,
      width: 600,
      height: 400,
      cover: { x: -150, y: 0, width: 900, height: 600 },
    });
  });
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:
```bash
npm test -- tests/unit/crop.test.ts tests/unit/fit.test.ts
```

Expected: FAIL because aspect modules do not exist.

- [ ] **Step 4: Implement crop math with normalized centers**

```ts
// src/aspect/crop.ts
import type { CropState } from '../core/types';

export interface Rect { x: number; y: number; width: number; height: number; }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function clampCropState(state: CropState): CropState {
  return {
    centerX: clamp(state.centerX, 0, 1),
    centerY: clamp(state.centerY, 0, 1),
    zoom: clamp(state.zoom, 1, 8),
  };
}

export function getCropRect(
  sourceWidth: number,
  sourceHeight: number,
  targetRatio: number,
  rawState: CropState,
): Rect {
  const state = clampCropState(rawState);
  const sourceRatio = sourceWidth / sourceHeight;
  let baseWidth: number;
  let baseHeight: number;

  if (sourceRatio >= targetRatio) {
    baseHeight = sourceHeight;
    baseWidth = baseHeight * targetRatio;
  } else {
    baseWidth = sourceWidth;
    baseHeight = baseWidth / targetRatio;
  }

  const width = baseWidth / state.zoom;
  const height = baseHeight / state.zoom;
  const maxX = sourceWidth - width;
  const maxY = sourceHeight - height;
  const x = clamp(sourceWidth * state.centerX - width / 2, 0, maxX);
  const y = clamp(sourceHeight * state.centerY - height / 2, 0, maxY);

  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}
```

- [ ] **Step 5: Implement Fit and Stretch geometry**

```ts
// src/aspect/fit.ts
export interface DrawRect { x: number; y: number; width: number; height: number; }

function centeredRect(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, mode: 'contain' | 'cover'): DrawRect {
  const scale = mode === 'contain'
    ? Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
    : Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height };
}

export function getFitGeometry(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) {
  const contain = centeredRect(sourceWidth, sourceHeight, targetWidth, targetHeight, 'contain');
  const cover = centeredRect(sourceWidth, sourceHeight, targetWidth, targetHeight, 'cover');
  return {
    x: Math.round(contain.x),
    y: Math.round(contain.y),
    width: Math.round(contain.width),
    height: Math.round(contain.height),
    cover: {
      x: Math.round(cover.x),
      y: Math.round(cover.y),
      width: Math.round(cover.width),
      height: Math.round(cover.height),
    },
  };
}
```

```ts
// src/aspect/stretch.ts
export function getStretchGeometry(targetWidth: number, targetHeight: number) {
  return { x: 0, y: 0, width: targetWidth, height: targetHeight };
}
```

- [ ] **Step 6: Run tests**

Run:
```bash
npm test -- tests/unit/crop.test.ts tests/unit/fit.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/aspect tests/unit/crop.test.ts tests/unit/fit.test.ts
git commit -m "feat: add aspect ratio geometry engine"
```

---

### Task 4: Implement the deterministic requirement parser with conservative ambiguity handling

**Files:**
- Create: `src/parser/requirement-parser.ts`
- Create: `tests/unit/requirement-parser.test.ts`

**Interfaces:**
- Consumes: freeform user text.
- Produces: `parseRequirements(text): ParsedRequirements` with optional format, dimensions, maxBytes, aspect recommendation, confidence map, and warnings.

- [ ] **Step 1: Write failing parser tests**

```ts
// tests/unit/requirement-parser.test.ts
import { describe, expect, it } from 'vitest';
import { parseRequirements } from '../../src/parser/requirement-parser';

describe('requirement parser', () => {
  it('extracts a direct JPG dimension and maximum byte limit', () => {
    expect(parseRequirements('Photo must be JPG format, 600 x 600 pixels and less than 200 KB.')).toMatchObject({
      format: 'jpg', width: 600, height: 600, maxBytes: 200000,
    });
  });

  it('parses MB limits as decimal bytes', () => {
    expect(parseRequirements('Upload a PNG no larger than 2 MB.')).toMatchObject({
      format: 'png', maxBytes: 2000000,
    });
  });

  it('extracts separate width and height phrases', () => {
    expect(parseRequirements('JPEG image. Maximum file size: 500KB. Width 1200px, height 800px.')).toMatchObject({
      format: 'jpg', width: 1200, height: 800, maxBytes: 500000,
    });
  });

  it('does not treat advisory dimensions as exact', () => {
    const parsed = parseRequirements('Recommended size is 600×600.');
    expect(parsed.width).toBeUndefined();
    expect(parsed.height).toBeUndefined();
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });

  it('does not choose when multiple output formats are allowed', () => {
    const parsed = parseRequirements('Upload JPG or PNG, maximum 200 KB.');
    expect(parsed.format).toBeUndefined();
    expect(parsed.warnings.join(' ')).toMatch(/Multiple output formats/i);
  });

  it('recommends Fit for explicit no-crop language', () => {
    expect(parseRequirements('JPG, exactly 600x600 pixels. Do not crop the photo.').recommendedAspectMode).toBe('fit');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:
```bash
npm test -- tests/unit/requirement-parser.test.ts
```

Expected: FAIL because parser module does not exist.

- [ ] **Step 3: Implement regex rules with local advisory guards and separate width/height support**

```ts
// src/parser/requirement-parser.ts
import type { AspectMode, ImageFormat } from '../core/types';
import { normalizeFormat } from '../core/format';

export interface ParsedRequirements {
  format?: ImageFormat;
  width?: number;
  height?: number;
  maxBytes?: number;
  recommendedAspectMode?: AspectMode;
  confidence: Partial<Record<'format' | 'dimensions' | 'fileSize', 'high' | 'medium'>>;
  warnings: string[];
}

const advisoryPattern = /\b(recommended|suggested|ideally|preferred)\b/i;
const dimensionPattern = /(\d{2,5})\s*(?:x|×|by)\s*(\d{2,5})(?:\s*(?:px|pixels?))?/i;
const widthPattern = /\bwidth\s*[:=]?\s*(\d{2,5})\s*(?:px|pixels?)?/i;
const heightPattern = /\bheight\s*[:=]?\s*(\d{2,5})\s*(?:px|pixels?)?/i;
const sizePattern = /(\d+(?:\.\d+)?)\s*(kb|mb)\b/i;
const limitPattern = /\b(max(?:imum)?|less than|under|up to|no more than|not exceed|no larger than)\b/i;

function isAdvisoryAroundMatch(text: string, index: number, length: number): boolean {
  const before = Math.max(0, index - 48);
  const after = Math.min(text.length, index + length + 48);
  return advisoryPattern.test(text.slice(before, after));
}

export function parseRequirements(text: string): ParsedRequirements {
  const result: ParsedRequirements = { confidence: {}, warnings: [] };
  const formatMatches = [...text.matchAll(/\b(jpe?g|png|webp)\b/gi)]
    .map((match) => normalizeFormat(match[1] ?? ''))
    .filter((value): value is ImageFormat => Boolean(value));
  const uniqueFormats = [...new Set(formatMatches)];

  if (uniqueFormats.length === 1) {
    result.format = uniqueFormats[0];
    result.confidence.format = 'high';
  } else if (uniqueFormats.length > 1) {
    result.warnings.push(`Multiple output formats detected: ${uniqueFormats.join(', ')}`);
  }

  const pair = dimensionPattern.exec(text);
  if (pair) {
    if (isAdvisoryAroundMatch(text, pair.index, pair[0].length)) {
      result.warnings.push('Possible dimensions were found, but the wording appears advisory.');
    } else {
      result.width = Number(pair[1]);
      result.height = Number(pair[2]);
      result.confidence.dimensions = /\b(exactly|must|required)\b/i.test(text) ? 'high' : 'medium';
    }
  } else {
    const width = widthPattern.exec(text);
    const height = heightPattern.exec(text);
    if (width && height && !isAdvisoryAroundMatch(text, Math.min(width.index, height.index), Math.max(width[0].length, height[0].length))) {
      result.width = Number(width[1]);
      result.height = Number(height[1]);
      result.confidence.dimensions = 'medium';
    }
  }

  const size = sizePattern.exec(text);
  if (size && limitPattern.test(text)) {
    const multiplier = size[2]!.toLowerCase() === 'mb' ? 1_000_000 : 1_000;
    result.maxBytes = Math.round(Number(size[1]) * multiplier);
    result.confidence.fileSize = 'high';
  }

  if (/\b(do not crop|no cropping|keep the whole image)\b/i.test(text)) result.recommendedAspectMode = 'fit';
  if (/\b(fill the frame|no blank space)\b/i.test(text)) result.recommendedAspectMode = 'crop';

  return result;
}
```

- [ ] **Step 4: Run parser tests**

Run:
```bash
npm test -- tests/unit/requirement-parser.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parser/requirement-parser.ts tests/unit/requirement-parser.test.ts
git commit -m "feat: parse common image upload requirements"
```

---

### Task 5: Implement strict output compliance checks

**Files:**
- Create: `src/core/compliance.ts`
- Create: `tests/unit/compliance.test.ts`

**Interfaces:**
- Consumes: `Requirements`, actual output `{ format, width, height, bytes }`.
- Produces: `assessCompliance(requirements, actual): ComplianceReport`.

- [ ] **Step 1: Write failing byte-boundary and format tests**

```ts
// tests/unit/compliance.test.ts
import { describe, expect, it } from 'vitest';
import { assessCompliance } from '../../src/core/compliance';

const required = { format: 'jpg' as const, width: 600, height: 600, maxBytes: 200000 };

it.each([
  [199999, true],
  [200000, true],
  [200001, false],
])('checks max bytes exactly: %s', (bytes, expected) => {
  expect(assessCompliance(required, { format: 'jpg', width: 600, height: 600, bytes }).passed).toBe(expected);
});

it('fails if the actual encoder MIME normalized format differs', () => {
  expect(assessCompliance(required, { format: 'png', width: 600, height: 600, bytes: 100000 }).passed).toBe(false);
});

it('fails exact dimensions even if only one pixel is wrong', () => {
  expect(assessCompliance(required, { format: 'jpg', width: 599, height: 600, bytes: 100000 }).passed).toBe(false);
});
```

- [ ] **Step 2: Run test and verify failure**

Run:
```bash
npm test -- tests/unit/compliance.test.ts
```

Expected: FAIL because compliance module is missing.

- [ ] **Step 3: Implement independent requirement checks**

```ts
// src/core/compliance.ts
import type { ComplianceItem, ComplianceReport, ImageFormat, Requirements } from './types';
import { reduceRatio, ratiosEqual } from './dimensions';

export interface ActualOutput {
  format: ImageFormat;
  width: number;
  height: number;
  bytes: number;
}

export function assessCompliance(requirements: Requirements, actual: ActualOutput): ComplianceReport {
  const items: ComplianceItem[] = [];
  const push = (item: ComplianceItem) => items.push(item);

  if (requirements.format) push({ key: 'format', passed: actual.format === requirements.format, required: requirements.format, actual: actual.format });
  if (requirements.width) push({ key: 'width', passed: actual.width === requirements.width, required: String(requirements.width), actual: String(actual.width) });
  if (requirements.height) push({ key: 'height', passed: actual.height === requirements.height, required: String(requirements.height), actual: String(actual.height) });
  if (requirements.aspectRatio) {
    const actualRatio = reduceRatio(actual.width, actual.height);
    push({ key: 'aspectRatio', passed: ratiosEqual(actualRatio, requirements.aspectRatio), required: `${requirements.aspectRatio.width}:${requirements.aspectRatio.height}`, actual: `${actualRatio.width}:${actualRatio.height}` });
  }
  if (requirements.maxBytes !== undefined) push({ key: 'maxBytes', passed: actual.bytes <= requirements.maxBytes, required: `≤${requirements.maxBytes}`, actual: String(actual.bytes) });

  return { passed: items.every((item) => item.passed), items };
}
```

- [ ] **Step 4: Run tests**

Run:
```bash
npm test -- tests/unit/compliance.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/compliance.ts tests/unit/compliance.test.ts
git commit -m "feat: add strict image compliance validation"
```

---

### Task 6: Implement lossy max-file-size optimization and PNG failure policy

**Files:**
- Create: `src/core/target-file-size.ts`
- Create: `tests/unit/target-file-size.test.ts`

**Interfaces:**
- Consumes: an encoder callback `(quality: number) => Promise<Blob>`, target maximum bytes, and format.
- Produces: `optimizeLossySize()` with best passing Blob/quality or explicit unattainable result; `canQualityOptimize(format)`; `buildResolutionSteps(width, height)` for explicit post-failure dimension fallback.

- [ ] **Step 1: Write failing optimizer tests with a deterministic fake encoder**

```ts
// tests/unit/target-file-size.test.ts
import { describe, expect, it } from 'vitest';
import { optimizeLossySize } from '../../src/core/target-file-size';

function fakeBlob(size: number): Blob {
  return new Blob([new Uint8Array(size)], { type: 'image/jpeg' });
}

it('returns the highest passing quality found under 200000 bytes', async () => {
  const encoder = async (quality: number) => fakeBlob(Math.round(50_000 + quality * 200_000));
  const result = await optimizeLossySize(encoder, 200_000, { minQuality: 0.35, maxQuality: 0.95, iterations: 8 });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.blob.size).toBeLessThanOrEqual(200_000);
  expect(result.quality).toBeGreaterThan(0.7);
  expect(result.quality).toBeLessThanOrEqual(0.75);
});

it('reports unattainable when minimum quality still exceeds the limit', async () => {
  const encoder = async () => fakeBlob(31_000);
  expect(await optimizeLossySize(encoder, 20_000)).toMatchObject({ ok: false, smallestBytes: 31_000 });
});

it('builds a 10 percent resolution fallback ladder without changing aspect ratio', async () => {
  const { buildResolutionSteps } = await import('../../src/core/target-file-size');
  expect(buildResolutionSteps(600, 600).slice(0, 3)).toEqual([
    { width: 540, height: 540 },
    { width: 486, height: 486 },
    { width: 437, height: 437 },
  ]);
});
```

- [ ] **Step 2: Run optimizer test and verify failure**

Run:
```bash
npm test -- tests/unit/target-file-size.test.ts
```

Expected: FAIL because optimizer module is missing.

- [ ] **Step 3: Implement best-passing binary search**

```ts
// src/core/target-file-size.ts
import type { ImageFormat } from './types';

export interface LossySearchOptions {
  minQuality: number;
  maxQuality: number;
  iterations: number;
}

export type LossySearchResult =
  | { ok: true; blob: Blob; quality: number }
  | { ok: false; smallestBlob: Blob; smallestBytes: number };

export function canQualityOptimize(format: ImageFormat): boolean {
  return format === 'jpg' || format === 'webp';
}

export function buildResolutionSteps(width: number, height: number): Array<{ width: number; height: number }> {
  const steps: Array<{ width: number; height: number }> = [];
  let currentWidth = width;
  let currentHeight = height;
  while (Math.min(currentWidth, currentHeight) > 64 && steps.length < 20) {
    currentWidth = Math.max(1, Math.round(currentWidth * 0.9));
    currentHeight = Math.max(1, Math.round(currentHeight * 0.9));
    steps.push({ width: currentWidth, height: currentHeight });
  }
  return steps;
}

export async function optimizeLossySize(
  encode: (quality: number) => Promise<Blob>,
  maxBytes: number,
  options: LossySearchOptions = { minQuality: 0.35, maxQuality: 0.95, iterations: 8 },
): Promise<LossySearchResult> {
  let low = options.minQuality;
  let high = options.maxQuality;
  let best: { blob: Blob; quality: number } | undefined;
  let smallest = await encode(low);

  if (smallest.size <= maxBytes) best = { blob: smallest, quality: low };

  for (let i = 0; i < options.iterations; i += 1) {
    const quality = (low + high) / 2;
    const blob = await encode(quality);
    if (blob.size < smallest.size) smallest = blob;
    if (blob.size <= maxBytes) {
      best = { blob, quality };
      low = quality;
    } else {
      high = quality;
    }
  }

  return best
    ? { ok: true, ...best }
    : { ok: false, smallestBlob: smallest, smallestBytes: smallest.size };
}
```

- [ ] **Step 4: Run optimizer tests**

Run:
```bash
npm test -- tests/unit/target-file-size.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/target-file-size.ts tests/unit/target-file-size.test.ts
git commit -m "feat: optimize jpg and webp to max byte limits"
```

---

### Task 7: Implement browser decode, render, encode, and the canonical processing pipeline with a failing browser test first

**Files:**
- Create: `src/core/decode.ts`
- Create: `src/core/render.ts`
- Create: `src/core/encode.ts`
- Create: `src/core/process-image.ts`
- Create: `playwright.config.ts`
- Create: `tests/browser/core-processing.spec.ts`
- Modify: `src/core/types.ts`

**Interfaces:**
- Consumes: `ProcessRequest`, aspect geometry helpers, optimizer, compliance logic.
- Produces: `decodeImage(file)`, `renderToContext()`, `encodeCanvas()`, `makeMainThreadCanvas()`, `processImage(request, makeCanvas): Promise<ProcessResult>`.

- [ ] **Step 1: Configure Playwright and write the failing browser-core test before implementation**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

```ts
// tests/browser/core-processing.spec.ts
import { expect, test } from '@playwright/test';

test('processes an in-memory landscape image to compliant 600x600 JPG', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { processImage, makeMainThreadCanvas } = await import('/src/core/process-image.ts');
    const source = document.createElement('canvas');
    source.width = 1200;
    source.height = 800;
    const sourceCtx = source.getContext('2d')!;
    sourceCtx.fillStyle = '#2f6fb0';
    sourceCtx.fillRect(0, 0, source.width, source.height);
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
    return {
      ok: true,
      mime: processed.image.blob.type,
      bytes: processed.image.blob.size,
      width: processed.image.width,
      height: processed.image.height,
      compliance: processed.compliance.passed,
    };
  });

  expect(result).toMatchObject({ ok: true, mime: 'image/jpeg', width: 600, height: 600, compliance: true });
  if ('bytes' in result) expect(result.bytes).toBeLessThanOrEqual(200_000);
});
```

Run:
```bash
npx playwright install chromium
npm run test:browser -- tests/browser/core-processing.spec.ts
```

Expected: FAIL because `src/core/process-image.ts` does not exist.

- [ ] **Step 2: Define processing result/error types and the canvas factory contract**

```ts
// append to src/core/types.ts
export type ProcessFailureCode =
  | 'unsupported-input'
  | 'decode-failed'
  | 'requirement-conflict'
  | 'file-size-unattainable'
  | 'encoder-format-mismatch'
  | 'processing-failed';

export type ProcessResult =
  | { ok: true; image: ProcessedImage; compliance: ComplianceReport }
  | { ok: false; code: ProcessFailureCode; message: string; smallestBytes?: number; suggestedFormats?: ImageFormat[] };

export type CanvasFactory = (width: number, height: number) => OffscreenCanvas | HTMLCanvasElement;
```

- [ ] **Step 3: Implement decode with createImageBitmap and supported-format validation**

```ts
// src/core/decode.ts
import { normalizeFormat } from './format';

export async function decodeImage(file: File): Promise<ImageBitmap> {
  const format = normalizeFormat(file.type || file.name.split('.').pop() || '');
  if (!format) throw new Error('unsupported-input');
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('decode-failed');
  }
}
```

- [ ] **Step 4: Implement Blob encoding and reject browser MIME fallback**

```ts
// src/core/encode.ts
import type { ImageFormat } from './types';
import { mimeForFormat, normalizeFormat } from './format';

export async function encodeCanvas(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  format: ImageFormat,
  quality?: number,
): Promise<Blob> {
  const mime = mimeForFormat(format);
  const blob = 'convertToBlob' in canvas
    ? await (canvas as OffscreenCanvas).convertToBlob({ type: mime, quality })
    : await new Promise<Blob>((resolve, reject) => {
        (canvas as HTMLCanvasElement).toBlob(
          (value) => value ? resolve(value) : reject(new Error('encode-failed')),
          mime,
          quality,
        );
      });

  if (normalizeFormat(blob.type) !== format) throw new Error('encoder-format-mismatch');
  return blob;
}
```

- [ ] **Step 5: Implement one-target-canvas rendering for Crop, Fit, Stretch, and JPG flattening**

```ts
// src/core/render.ts
import type { AspectMode, CropState, FitBackground } from './types';
import { getCropRect } from '../aspect/crop';
import { getFitGeometry } from '../aspect/fit';

export interface RenderOptions {
  mode: AspectMode;
  crop: CropState;
  background: FitBackground;
  targetWidth: number;
  targetHeight: number;
  flattenColor?: string;
}

export function renderToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  options: RenderOptions,
): void {
  const { targetWidth, targetHeight } = options;

  if (options.flattenColor) {
    ctx.fillStyle = options.flattenColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  if (options.mode === 'crop') {
    const rect = getCropRect(sourceWidth, sourceHeight, targetWidth / targetHeight, options.crop);
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, targetWidth, targetHeight);
    return;
  }

  if (options.mode === 'stretch') {
    ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
    return;
  }

  const fit = getFitGeometry(sourceWidth, sourceHeight, targetWidth, targetHeight);
  if (options.background.kind === 'white' || options.background.kind === 'black' || options.background.kind === 'custom') {
    ctx.fillStyle = options.background.kind === 'white' ? '#ffffff' : options.background.kind === 'black' ? '#000000' : (options.background.color ?? '#ffffff');
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else if (options.background.kind === 'blur') {
    ctx.save();
    ctx.filter = 'blur(20px)';
    ctx.drawImage(image, fit.cover.x, fit.cover.y, fit.cover.width, fit.cover.height);
    ctx.restore();
  }
  ctx.drawImage(image, fit.x, fit.y, fit.width, fit.height);
}
```

For JPG output, `processImage` passes `flattenColor: '#ffffff'` by default so transparent pixels never become an implicit browser-dependent color. The UI must display this white replacement whenever a PNG/WebP source is being converted to JPG and allow the user to choose a different explicit background color before processing.

- [ ] **Step 6: Implement canonical processing order with an injected canvas factory**

```ts
// src/core/process-image.ts
import type { CanvasFactory, ProcessRequest, ProcessResult } from './types';
import { resolveTargetDimensions } from './dimensions';
import { decodeImage } from './decode';
import { renderToContext } from './render';
import { encodeCanvas } from './encode';
import { assessCompliance } from './compliance';
import { buildResolutionSteps, canQualityOptimize, optimizeLossySize } from './target-file-size';
import { normalizeFormat } from './format';

export function makeMainThreadCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function processImage(request: ProcessRequest, makeCanvas: CanvasFactory): Promise<ProcessResult> {
  const requestedFormat = request.requirements.format ?? normalizeFormat(request.file.type) ?? 'jpg';
  if (requestedFormat === 'jpg' && request.fitBackground.kind === 'transparent') {
    return { ok: false, code: 'requirement-conflict', message: 'JPG does not support transparency.', suggestedFormats: ['png', 'webp'] };
  }

  let bitmap: ImageBitmap;
  try { bitmap = await decodeImage(request.file); }
  catch (error) {
    const code = error instanceof Error && error.message === 'unsupported-input' ? 'unsupported-input' : 'decode-failed';
    return { ok: false, code, message: code === 'unsupported-input' ? 'Supported formats are JPG, PNG and WebP.' : "The browser couldn't decode this image." };
  }

  const initialTarget = resolveTargetDimensions(bitmap.width, bitmap.height, request.requirements, request.aspectMode);

  const renderAndEncode = async (width: number, height: number) => {
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('processing-failed');
    renderToContext(ctx as never, bitmap, bitmap.width, bitmap.height, {
      mode: request.aspectMode,
      crop: request.crop,
      background: request.fitBackground,
      targetWidth: width,
      targetHeight: height,
      flattenColor: requestedFormat === 'jpg' ? (request.jpgBackgroundColor ?? '#ffffff') : undefined,
    });

    const maxBytes = request.requirements.maxBytes;
    if (maxBytes !== undefined && canQualityOptimize(requestedFormat)) {
      return optimizeLossySize((q) => encodeCanvas(canvas, requestedFormat, q), maxBytes);
    }
    const blob = await encodeCanvas(canvas, requestedFormat, requestedFormat === 'png' ? undefined : 0.95);
    return blob.size <= (maxBytes ?? Number.POSITIVE_INFINITY)
      ? { ok: true as const, blob, quality: requestedFormat === 'png' ? undefined : 0.95 }
      : { ok: false as const, smallestBlob: blob, smallestBytes: blob.size };
  };

  try {
    let outputWidth = initialTarget.width;
    let outputHeight = initialTarget.height;
    let resolutionReducedFrom: { width: number; height: number } | undefined;
    let encoded = await renderAndEncode(outputWidth, outputHeight);

    if (!encoded.ok && request.allowDimensionReduction && request.requirements.dimensionsAreExact !== true) {
      for (const step of buildResolutionSteps(initialTarget.width, initialTarget.height)) {
        const candidate = await renderAndEncode(step.width, step.height);
        if (candidate.ok) {
          encoded = candidate;
          outputWidth = step.width;
          outputHeight = step.height;
          resolutionReducedFrom = { width: initialTarget.width, height: initialTarget.height };
          break;
        }
      }
    }

    if (!encoded.ok) {
      return {
        ok: false,
        code: 'file-size-unattainable',
        message: requestedFormat === 'png'
          ? 'PNG could not meet the requested file-size limit at the current dimensions.'
          : `The requested file-size limit could not be reached at ${initialTarget.width}×${initialTarget.height}.`,
        smallestBytes: encoded.smallestBytes,
        suggestedFormats: requestedFormat === 'png' ? ['webp', 'jpg'] : undefined,
      };
    }

    const actualFormat = normalizeFormat(encoded.blob.type);
    if (!actualFormat) return { ok: false, code: 'encoder-format-mismatch', message: 'The browser returned an unsupported output format.' };

    const complianceRequirements = resolutionReducedFrom
      ? { ...request.requirements, width: undefined, height: undefined, aspectRatio: request.requirements.aspectRatio }
      : request.requirements;
    const compliance = assessCompliance(complianceRequirements, {
      format: actualFormat,
      width: outputWidth,
      height: outputHeight,
      bytes: encoded.blob.size,
    });

    return {
      ok: true,
      image: {
        blob: encoded.blob,
        format: actualFormat,
        width: outputWidth,
        height: outputHeight,
        quality: encoded.quality,
        resolutionReducedFrom,
        metadataRemoved: true,
      },
      compliance,
    };
  } catch (error) {
    const code = error instanceof Error && error.message === 'encoder-format-mismatch' ? 'encoder-format-mismatch' : 'processing-failed';
    return { ok: false, code, message: code === 'encoder-format-mismatch' ? 'This browser did not produce the requested image format.' : 'We could not process this image.' };
  } finally {
    bitmap.close();
  }
}
```

- [ ] **Step 7: Run unit tests, type-check, then rerun the browser-core test**

Run:
```bash
npm test
npm run build
npm run test:browser -- tests/browser/core-processing.spec.ts
```

Expected: all unit tests PASS, build succeeds, and browser-core test PASS.

- [ ] **Step 8: Commit**

```bash
git add src/core playwright.config.ts tests/browser/core-processing.spec.ts
git commit -m "feat: add browser image processing pipeline"
```

---

### Task 8: Move processing behind a Worker with a behavior-identical main-thread fallback

**Files:**
- Create: `src/worker/image.worker.ts`
- Create: `src/worker/worker-client.ts`
- Create: `tests/browser/worker-fallback.spec.ts`
- Modify: `src/core/types.ts`

**Interfaces:**
- Consumes: `processImage(request, makeCanvas)` from Task 7.
- Produces: `processWithBestAvailablePath(request): Promise<ProcessResult>`; Worker request/response message types.

- [ ] **Step 1: Write failing tests for Worker preference and forced fallback**

```ts
// tests/browser/worker-fallback.spec.ts
import { expect, test } from '@playwright/test';

async function runSyntheticProcess(page: import('@playwright/test').Page, disableWorker: boolean) {
  return page.evaluate(async ({ disableWorker }) => {
    if (disableWorker) Object.defineProperty(window, 'Worker', { value: undefined, configurable: true });
    const { processWithBestAvailablePath } = await import('/src/worker/worker-client.ts');
    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 600;
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
  await page.goto('/');
  expect(await runSyntheticProcess(page, false)).toMatchObject({ ok: true, passed: true });
});

test('falls back to main-thread canvas when Worker is unavailable', async ({ page }) => {
  await page.goto('/');
  expect(await runSyntheticProcess(page, true)).toMatchObject({ ok: true, passed: true });
});
```

Run:
```bash
npm run test:browser -- tests/browser/worker-fallback.spec.ts
```

Expected: FAIL because Worker client does not exist.

- [ ] **Step 2: Add explicit Worker message contracts**

```ts
// append to src/core/types.ts
export interface WorkerProcessPayload {
  file: File;
  requirements: Requirements;
  aspectMode: AspectMode;
  crop: CropState;
  fitBackground: FitBackground;
}

export type WorkerRequest = { id: string; type: 'process'; payload: WorkerProcessPayload };
export type WorkerResponse = { id: string; type: 'result'; result: ProcessResult };
```

- [ ] **Step 3: Implement Worker endpoint with OffscreenCanvas only**

```ts
// src/worker/image.worker.ts
/// <reference lib="webworker" />
import type { WorkerRequest, WorkerResponse } from '../core/types';
import { processImage } from '../core/process-image';

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type !== 'process') return;
  const result = await processImage(message.payload, (width, height) => new OffscreenCanvas(width, height));
  const response: WorkerResponse = { id: message.id, type: 'result', result };
  self.postMessage(response);
};
```

- [ ] **Step 4: Implement feature detection, timeout, and fallback client**

```ts
// src/worker/worker-client.ts
import type { ProcessRequest, ProcessResult, WorkerRequest, WorkerResponse } from '../core/types';
import { makeMainThreadCanvas, processImage } from '../core/process-image';

export async function processWithBestAvailablePath(request: ProcessRequest): Promise<ProcessResult> {
  if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    try {
      return await new Promise<ProcessResult>((resolve, reject) => {
        const worker = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' });
        const id = crypto.randomUUID();
        const timeout = window.setTimeout(() => {
          worker.terminate();
          reject(new Error('worker-timeout'));
        }, 60_000);
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.id !== id) return;
          clearTimeout(timeout);
          worker.terminate();
          resolve(event.data.result);
        };
        worker.onerror = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(event.error ?? new Error(event.message));
        };
        const message: WorkerRequest = { id, type: 'process', payload: request };
        worker.postMessage(message);
      });
    } catch {
      // Worker failure is allowed to fall back locally, never to a server.
    }
  }
  return processImage(request, makeMainThreadCanvas);
}
```

- [ ] **Step 5: Run both Worker and fallback browser tests**

Run:
```bash
npm run test:browser -- tests/browser/core-processing.spec.ts tests/browser/worker-fallback.spec.ts
```

Expected: both tests PASS and produce the same compliant result semantics.

- [ ] **Step 6: Commit**

```bash
git add src/worker src/core/types.ts tests/browser/worker-fallback.spec.ts
git commit -m "feat: process images in worker with canvas fallback"
```

---

### Task 9: Build the mobile-first upload, requirement, aspect, preview, result, and download UI

**Files:**
- Create: `src/ui/app-controller.ts`
- Create: `src/ui/upload.ts`
- Create: `src/ui/requirements.ts`
- Create: `src/ui/aspect-editor.ts`
- Create: `src/ui/preview.ts`
- Create: `src/ui/compliance-result.ts`
- Create: `src/ui/download.ts`
- Create: `tests/browser/ui-flow.spec.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: parser, dimension helpers, `processWithBestAvailablePath()`.
- Produces: one progressive mobile workflow with editable parsed requirements, ratio mismatch options, crop pan/zoom state, processing status, strict compliance result, and Blob download.

- [ ] **Step 1: Write a failing UI smoke test before creating the controller**

```ts
// tests/browser/ui-flow.spec.ts
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
```

Run:
```bash
npm run test:browser -- tests/browser/ui-flow.spec.ts
```

Expected: FAIL because the production UI controller has not been created.

- [ ] **Step 2: Define a UI state model in the controller**

```ts
// src/ui/app-controller.ts
import type { AspectMode, CropState, FitBackground, Requirements, SourceImageInfo } from '../core/types';

export interface AppState {
  file?: File;
  source?: SourceImageInfo;
  requirements: Requirements;
  aspectMode: AspectMode;
  crop: CropState;
  background: FitBackground;
  jpgBackgroundColor: string;
  status: 'idle' | 'ready' | 'processing' | 'success' | 'error';
}

export const initialState: AppState = {
  requirements: {},
  aspectMode: 'crop',
  crop: { centerX: 0.5, centerY: 0.5, zoom: 1 },
  background: { kind: 'white' },
  jpgBackgroundColor: '#ffffff',
  status: 'idle',
};
```

- [ ] **Step 3: Implement upload view with explicit local-processing trust copy**

The upload module must render these exact core elements:

```html
<section class="card" data-step="upload">
  <p class="eyebrow">100% Local Processing</p>
  <h2>Upload your image</h2>
  <p>Your image never leaves your device.</p>
  <label class="dropzone">
    <input type="file" accept="image/jpeg,image/png,image/webp" />
    <span>Choose JPG, PNG or WebP</span>
  </label>
  <div data-source-summary hidden></div>
</section>
```

After selection, decode only for source info and render: width, height, reduced ratio, format, and original byte size.

- [ ] **Step 4: Implement requirements form and paste parser**

Required controls:

```html
<textarea name="requirementText" placeholder="Photo must be JPG, 600 × 600 pixels and less than 200 KB."></textarea>
<button type="button" data-detect>Detect requirements</button>
<input name="maxSize" inputmode="decimal" />
<select name="maxSizeUnit"><option>KB</option><option>MB</option></select>
<input name="width" inputmode="numeric" />
<input name="height" inputmode="numeric" />
<input name="aspectRatio" inputmode="text" placeholder="1:1" />
<select name="format"><option value="">Keep original</option><option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select>
```

On Detect, call `parseRequirements()`, fill only confidently parsed values, show parser warnings, and leave all fields editable. When building `Requirements`, convert units and custom ratios explicitly:

```ts
const maxBytes = maxSize === '' ? undefined : Math.round(Number(maxSize) * (maxSizeUnit === 'MB' ? 1_000_000 : 1_000));
const aspectRatio = aspectRatioText.trim() === '' ? undefined : (() => {
  const match = aspectRatioText.match(/^(\d+)\s*:\s*(\d+)$/);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : undefined;
})();
const dimensionsAreExact = widthValue !== '' || heightValue !== '';
```

If a non-empty aspect ratio cannot be parsed, show an input error and do not process.

- [ ] **Step 5: Implement aspect mismatch disclosure and options**

Use `reduceRatio()` + `ratiosEqual()` to hide the block when ratios match. When they differ, render:

```html
<section data-aspect-choice>
  <h2>The aspect ratios don't match.</h2>
  <p>How should we fit your image?</p>
  <label><input type="radio" name="aspectMode" value="crop" checked /> Crop — Fill the frame <strong>Recommended</strong></label>
  <label><input type="radio" name="aspectMode" value="fit" /> Fit — Keep the whole image</label>
  <details><summary>More options</summary><label><input type="radio" name="aspectMode" value="stretch" /> Stretch — Force exact size</label><p>This may distort the image.</p></details>
</section>
```

- [ ] **Step 6: Implement Crop drag/zoom without destructive re-encoding**

Crop UI stores normalized `centerX`, `centerY`, and `zoom`; drag updates only state. Pointer movement mapping:

```ts
const dxNormalized = -event.movementX / preview.clientWidth;
const dyNormalized = -event.movementY / preview.clientHeight;
state.crop.centerX = Math.min(1, Math.max(0, state.crop.centerX + dxNormalized));
state.crop.centerY = Math.min(1, Math.max(0, state.crop.centerY + dyNormalized));
```

Zoom controls update `zoom` within `1..8`; Reset returns `{ centerX: 0.5, centerY: 0.5, zoom: 1 }`. Add two-pointer pinch support by comparing pointer distance and applying the distance ratio to `zoom`.

- [ ] **Step 7: Implement Fit background controls with JPG transparency conflict UI**

Only show Fit backgrounds for Fit mode. Additionally, whenever a PNG/WebP source is converted to JPG, show an explicit `Transparent pixels will use this background` color control initialized to white and bind it to `state.jpgBackgroundColor`. Transparent selection plus JPG output must not process; display:

```text
JPG does not support transparency.
```

and buttons/actions for `Use PNG`, `Use WebP`, or selecting a background color. Blur has one fixed strength and no slider in MVP.

- [ ] **Step 8: Wire Fix My Image to Worker/fallback processing and strict result rendering**

Processing status text rotates through deterministic UI states:

```text
Preparing image…
Resizing…
Optimizing file size…
Checking requirements…
```

Construct the processing request from visible state so no hidden constraint changes occur:

```ts
const request = {
  file: state.file!,
  requirements: { ...state.requirements, dimensionsAreExact },
  aspectMode: state.aspectMode,
  crop: state.crop,
  fitBackground: state.background,
  jpgBackgroundColor: state.jpgBackgroundColor,
  allowDimensionReduction: false,
};
```

The first processing attempt sends `allowDimensionReduction: false`. If it fails with `file-size-unattainable` and `dimensionsAreExact !== true`, show `Allow smaller dimensions`. That button repeats the same request with `allowDimensionReduction: true`; when success returns `resolutionReducedFrom`, display `Resolution was reduced from {oldWidth}×{oldHeight} to {newWidth}×{newHeight} to meet the file-size limit.`

Final success header is shown only when `result.ok && result.compliance.passed`:

```text
All requirements met
```

Render a row per compliance item with required/actual values and PASS/FAIL. Also render a Before / After summary containing dimensions, reduced aspect ratio, format, file bytes, and compression percentage:

```ts
const compressionPercent = state.source
  ? Math.max(0, Math.round((1 - result.image.blob.size / state.source.bytes) * 100))
  : 0;
```

If `file-size-unattainable`, show requested dimensions, `smallestBytes`, and explicit next actions; do not silently resize.

- [ ] **Step 9: Implement Blob URL download lifecycle**

```ts
// src/ui/download.ts
let currentUrl: string | undefined;

export function setDownload(anchor: HTMLAnchorElement, blob: Blob, filename: string) {
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = URL.createObjectURL(blob);
  anchor.href = currentUrl;
  anchor.download = filename;
}

export function clearDownload() {
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = undefined;
}
```

Button copy: `Download Compliant Image` appears only when compliance passes. The MVP does not expose a download action for failed compliance results.

- [ ] **Step 10: Apply mobile-first CSS and verify no dual-panel desktop dependency**

Core CSS constraints:

```css
:root { color-scheme: light; }
body { min-width: 320px; }
.shell { width: min(100% - 24px, 760px); }
.card { background: #fff; border: 1px solid #e3e7ee; border-radius: 18px; padding: 18px; margin: 14px 0; }
input, select, textarea, button { font: inherit; min-height: 44px; }
.preview-stage { touch-action: none; overflow: hidden; border-radius: 16px; }
.action-primary { width: 100%; min-height: 52px; font-weight: 700; }
@media (min-width: 768px) { .shell { padding-top: 48px; } }
```

- [ ] **Step 11: Build and run the UI browser smoke test**

Run:
```bash
npm run build
npm run test:browser -- tests/browser/ui-flow.spec.ts
```

Expected: build succeeds and UI smoke test PASS. The later mobile E2E task verifies the 375×812 layout and aspect-control visibility.

- [ ] **Step 12: Commit**

```bash
git add src/ui src/main.ts src/styles.css tests/browser/ui-flow.spec.ts
git commit -m "feat: build mobile image fixer workflow"
```

---

### Task 10: Add intent-specific landing pages without duplicating the processing engine

**Files:**
- Create: `src/pages/presets.ts`
- Create: `image-compressor/index.html`
- Create: `image-resizer/index.html`
- Create: `image-format-converter/index.html`
- Create: `webp-to-jpg/index.html`
- Create: `remove-image-metadata/index.html`
- Modify: `src/main.ts`
- Modify: `vite.config.ts`
- Create: `tests/unit/presets.test.ts`

**Interfaces:**
- Consumes: shared app controller.
- Produces: `getPagePreset(pathname)` returning copy and safe initial field defaults only.

- [ ] **Step 1: Write a failing preset test**

```ts
// tests/unit/presets.test.ts
import { expect, it } from 'vitest';
import { getPagePreset } from '../../src/pages/presets';

it('preselects JPG only for the WebP to JPG landing page', () => {
  expect(getPagePreset('/webp-to-jpg/').format).toBe('jpg');
  expect(getPagePreset('/image-compressor/').format).toBeUndefined();
});
```

Run:
```bash
npm test -- tests/unit/presets.test.ts
```

Expected: FAIL because `src/pages/presets.ts` does not exist.

- [ ] **Step 2: Define page presets**

```ts
// src/pages/presets.ts
export interface PagePreset {
  title: string;
  heading: string;
  description: string;
  format?: 'jpg' | 'png' | 'webp';
  focus?: 'all' | 'size' | 'dimensions' | 'format' | 'metadata';
}

const presets: Record<string, PagePreset> = {
  '/': { title: 'Image Requirement Fixer', heading: 'Fix images that don’t meet upload requirements', description: 'Match file size, dimensions and format in one flow.', focus: 'all' },
  '/image-compressor/': { title: 'Compress Image to a Maximum File Size', heading: 'Compress an image to the size limit you need', description: 'Enter the maximum KB or MB and keep the highest available quality.', focus: 'size' },
  '/image-resizer/': { title: 'Resize Image to Exact Dimensions', heading: 'Resize an image to exact pixel dimensions', description: 'Set width and height, then choose how mismatched aspect ratios are handled.', focus: 'dimensions' },
  '/image-format-converter/': { title: 'Image Format Converter', heading: 'Convert JPG, PNG and WebP locally', description: 'Convert formats without uploading your image.', focus: 'format' },
  '/webp-to-jpg/': { title: 'WebP to JPG Converter', heading: 'Convert WebP to JPG locally', description: 'Turn a WebP image into JPG in your browser.', format: 'jpg', focus: 'format' },
  '/remove-image-metadata/': { title: 'Remove Image Metadata', heading: 'Re-encode an image without copying original metadata', description: 'Create a fresh JPG, PNG or WebP file locally in your browser.', focus: 'metadata' },
};

export function getPagePreset(pathname: string): PagePreset {
  return presets[pathname] ?? presets['/']!;
}
```

- [ ] **Step 3: Make every page load the same `/src/main.ts` entry**

Each subpage HTML must include its own static `<title>`, meta description, canonical-relative content, `<h1>` fallback content for crawlers, and:

```html
<script type="module" src="/src/main.ts"></script>
```

No processing code is copied into subdirectories.

- [ ] **Step 4: Configure Vite MPA inputs**

```ts
// vite.config.ts
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        compressor: resolve(root, 'image-compressor/index.html'),
        resizer: resolve(root, 'image-resizer/index.html'),
        converter: resolve(root, 'image-format-converter/index.html'),
        webpToJpg: resolve(root, 'webp-to-jpg/index.html'),
        metadata: resolve(root, 'remove-image-metadata/index.html'),
      },
    },
  },
});
```

- [ ] **Step 5: Apply preset copy/defaults at boot**

In `src/main.ts`, call `getPagePreset(location.pathname)` before mounting the controller. Presets may preselect output JPG on `/webp-to-jpg/`, but they must not bypass compliance checks or alter the shared engine.

- [ ] **Step 6: Build and inspect all generated pages**

Run:
```bash
npm test -- tests/unit/presets.test.ts
npm run build
find dist -maxdepth 2 -name index.html -print
```

Expected: six indexable HTML entry points are present, and the generated JS chunks are shared rather than six copies of the engine.

- [ ] **Step 7: Commit**

```bash
git add src/pages src/main.ts vite.config.ts image-compressor image-resizer image-format-converter webp-to-jpg remove-image-metadata tests/unit/presets.test.ts
git commit -m "feat: add intent specific image tool landing pages"
```

---

### Task 11: Generate deterministic image fixtures and verify real browser processing

**Files:**
- Create: `tests/fixtures/generate-fixtures.mjs`
- Create generated fixtures under `tests/fixtures/generated/`
- Create: `tests/browser/processing.spec.ts`
- Modify: `package.json`
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: built app and browser File API.
- Produces: real Chromium assertions for output dimensions, format, file size, crop position, Fit transparency/background, and Stretch.

- [ ] **Step 1: Add deterministic fixture generation with test-only `sharp` + `piexifjs`**

Install test-only generators:

```bash
npm install -D sharp piexifjs
```

`tests/fixtures/generate-fixtures.mjs` must generate every fixture locally with no network input. Use `sharp` to create JPEG/PNG/WebP pixel data and `piexifjs` to inject orientation/GPS EXIF into the two metadata fixtures. The crop fixture must have three solid vertical regions so pixel sampling can identify LEFT / CENTER / RIGHT. Generate these exact files:

```text
landscape.jpg
portrait.jpg
square.jpg
transparent.png
sample.webp
exif-rotated.jpg
gps-metadata.jpg
large-photo.jpg
crop-regions.png
```

Core generator structure:

```js
// tests/fixtures/generate-fixtures.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import piexif from 'piexifjs';

const out = path.resolve('tests/fixtures/generated');
await fs.mkdir(out, { recursive: true });

await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 90, g: 140, b: 210 } } }).jpeg({ quality: 92 }).toFile(path.join(out, 'landscape.jpg'));
await sharp({ create: { width: 800, height: 1200, channels: 3, background: { r: 180, g: 110, b: 90 } } }).jpeg({ quality: 92 }).toFile(path.join(out, 'portrait.jpg'));
await sharp({ create: { width: 900, height: 900, channels: 3, background: { r: 100, g: 180, b: 120 } } }).jpeg({ quality: 92 }).toFile(path.join(out, 'square.jpg'));
await sharp({ create: { width: 900, height: 600, channels: 4, background: { r: 30, g: 140, b: 210, alpha: 0.55 } } }).png().toFile(path.join(out, 'transparent.png'));
await sharp({ create: { width: 1000, height: 700, channels: 3, background: { r: 130, g: 80, b: 190 } } }).webp({ quality: 92 }).toFile(path.join(out, 'sample.webp'));
await sharp({ create: { width: 8000, height: 6000, channels: 3, background: { r: 120, g: 130, b: 140 } } }).jpeg({ quality: 88 }).toFile(path.join(out, 'large-photo.jpg'));

await sharp({ create: { width: 1200, height: 600, channels: 3, background: { r: 0, g: 0, b: 0 } } })
  .composite([
    { input: Buffer.from('<svg width="400" height="600"><rect width="400" height="600" fill="red"/></svg>'), left: 0, top: 0 },
    { input: Buffer.from('<svg width="400" height="600"><rect width="400" height="600" fill="green"/></svg>'), left: 400, top: 0 },
    { input: Buffer.from('<svg width="400" height="600"><rect width="400" height="600" fill="blue"/></svg>'), left: 800, top: 0 },
  ]).png().toFile(path.join(out, 'crop-regions.png'));

const baseJpeg = await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 160, g: 160, b: 160 } } }).jpeg().toBuffer();
const base64 = `data:image/jpeg;base64,${baseJpeg.toString('base64')}`;
const orientationExif = piexif.dump({ '0th': { [piexif.ImageIFD.Orientation]: 6 }, Exif: {}, GPS: {}, '1st': {}, thumbnail: null });
await fs.writeFile(path.join(out, 'exif-rotated.jpg'), Buffer.from(piexif.insert(orientationExif, base64).split(',')[1], 'base64'));
const gpsExif = piexif.dump({ '0th': { [piexif.ImageIFD.ImageDescription]: 'IRF_GPS_FIXTURE_MARKER' }, Exif: {}, GPS: { [piexif.GPSIFD.GPSLatitudeRef]: 'N', [piexif.GPSIFD.GPSLatitude]: [[37,1],[33,1],[0,1]], [piexif.GPSIFD.GPSLongitudeRef]: 'E', [piexif.GPSIFD.GPSLongitude]: [[126,1],[59,1],[0,1]] }, '1st': {}, thumbnail: null });
await fs.writeFile(path.join(out, 'gps-metadata.jpg'), Buffer.from(piexif.insert(gpsExif, base64).split(',')[1], 'base64'));
```

Add script:

```json
"fixtures": "node tests/fixtures/generate-fixtures.mjs"
```

Run `npm run fixtures` and assert all nine files exist; the generator must fail on write/encode errors and never download network assets.

- [ ] **Step 2: Configure Playwright to start Vite preview**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 3: Write a real JPG Crop + max-size browser test**

```ts
// tests/browser/processing.spec.ts
import { expect, test } from '@playwright/test';
import path from 'node:path';

test('creates a compliant 600x600 JPG under 200KB', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(path.resolve('tests/fixtures/generated/landscape.jpg'));
  await page.locator('[name=width]').fill('600');
  await page.locator('[name=height]').fill('600');
  await page.locator('[name=maxSize]').fill('200');
  await page.locator('[name=maxSizeUnit]').selectOption('KB');
  await page.locator('[name=format]').selectOption('jpg');
  await page.getByRole('button', { name: 'Fix My Image' }).click();
  await expect(page.getByText('All requirements met')).toBeVisible();
  await expect(page.getByText(/600×600/)).toBeVisible();
  await expect(page.getByText(/PASS/).first()).toBeVisible();
});
```

- [ ] **Step 4: Add EXIF orientation plus Fit transparency/background tests**

For `exif-rotated.jpg`, upload the orientation=6 fixture and assert the app reports oriented source dimensions `800×1200`, not stored-pixel dimensions `1200×800`.

Transparent PNG test must sample an output corner and assert alpha is zero. White Fit test must sample a corner and assert RGB is white. Blur test only asserts the corner is non-transparent, not pixel-perfect.

- [ ] **Step 5: Add Crop reposition test**

Load `crop-regions.png`, choose 1:1 crop, drag the preview toward the RIGHT source region, process, decode the output in the test page, and sample its center pixel to confirm the chosen source region moved. This proves UI state reaches final render geometry.

- [ ] **Step 6: Add Stretch exact-size test**

Input 3000×2000-equivalent fixture, request 600×600 Stretch, and assert final decoded dimensions equal exactly 600×600.

- [ ] **Step 7: Run browser processing suite**

Run:
```bash
npx playwright install chromium
npm run test:browser -- tests/browser/processing.spec.ts
```

Expected: all processing tests PASS in Chromium.

- [ ] **Step 8: Commit**

```bash
git add tests/fixtures tests/browser/processing.spec.ts playwright.config.ts package.json package-lock.json
git commit -m "test: verify image processing in chromium"
```

---

### Task 12: Verify metadata removal, MIME fallback detection, and failure flows

**Files:**
- Create: `tests/browser/metadata.spec.ts`
- Modify: `tests/browser/processing.spec.ts`

**Interfaces:**
- Consumes: metadata-bearing fixtures and processing UI.
- Produces: evidence that re-encoded output does not retain original EXIF/GPS markers and that unsupported/failed constraints never display false success.

- [ ] **Step 1: Add metadata fixture assertions**

Use `gps-metadata.jpg` with known ASCII marker values in APP1 EXIF data, for example a fixture comment or GPS tag marker string unique to the source. Process it through the app, fetch the Blob bytes from the object URL in page context, and assert the unique source marker is absent after re-encoding.

Example assertion helper:

```ts
const containsAscii = (bytes: Uint8Array, text: string) => new TextDecoder('latin1').decode(bytes).includes(text);
expect(containsAscii(outputBytes, 'IRF_GPS_FIXTURE_MARKER')).toBe(false);
```

- [ ] **Step 2: Verify JPG + Transparent produces a conflict instead of silent format change**

Browser flow:

```text
upload transparent.png
→ set target format JPG
→ choose Fit
→ choose Transparent
→ press Fix My Image
```

Expected visible message: `JPG does not support transparency.`
Expected: no `All requirements met` text and no compliant download action.

- [ ] **Step 3: Verify PNG over-limit failure does not silently resize or convert**

Request an exact 600×600 PNG under an intentionally impossible fixture threshold. Expected:
- `file-size-unattainable` message visible
- result still reports requested 600×600 context
- suggested WebP/JPG actions visible
- no automatic change to selected format or dimensions

- [ ] **Step 4: Verify unsupported HEIC is rejected locally**

Use a fake `.heic` file with `image/heic` MIME. Expected message lists JPG, PNG and WebP as supported formats and no network request is made for processing.

- [ ] **Step 5: Run the failure/metadata suite**

Run:
```bash
npm run test:browser -- tests/browser/metadata.spec.ts tests/browser/processing.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/browser/metadata.spec.ts tests/browser/processing.spec.ts tests/fixtures
git commit -m "test: verify metadata and failure safeguards"
```

---

### Task 13: Add the primary 375×812 mobile E2E flow and UI regression checks

**Files:**
- Create: `tests/browser/mobile-flow.spec.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: complete app.
- Produces: end-to-end proof of the MVP flow on a mobile viewport.

- [ ] **Step 1: Add a mobile Playwright project at the required viewport**

```ts
// add to playwright.config.ts projects
{
  name: 'mobile-375',
  use: {
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  },
}
```

- [ ] **Step 2: Write the full mobile success flow**

```ts
// tests/browser/mobile-flow.spec.ts
import { expect, test } from '@playwright/test';
import path from 'node:path';

test('mobile user fixes a ratio-mismatched image and downloads a compliant result', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(path.resolve('tests/fixtures/generated/landscape.jpg'));
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
```

- [ ] **Step 3: Verify ratio controls stay hidden when ratios already match**

Use a 4:3 source fixture and request 1200×900; assert `The aspect ratios don't match.` is not visible.

- [ ] **Step 4: Verify parser-to-editable-fields mobile flow**

Paste:

```text
Photo must be JPG format, 600 x 600 pixels and less than 200 KB.
```

Press Detect Requirements and assert the direct input fields contain `jpg`, `600`, `600`, and `200` KB. Then modify width manually and assert the field remains editable; parser must not lock the form.

- [ ] **Step 5: Run mobile suite**

Run:
```bash
npm run test:browser -- --project=mobile-375 tests/browser/mobile-flow.spec.ts
```

Expected: PASS at 375×812.

- [ ] **Step 6: Commit**

```bash
git add tests/browser/mobile-flow.spec.ts playwright.config.ts
git commit -m "test: cover mobile image fixing flow"
```

---

### Task 14: Add static SEO/privacy files and final release verification

**Files:**
- Create: `public/robots.txt`
- Create: `public/_headers`
- Create: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: completed MVP.
- Produces: deployable Cloudflare Pages artifact plus documented local-development and verification commands.

- [ ] **Step 1: Add crawler and static security headers**

```text
# public/robots.txt
User-agent: *
Allow: /
```

```text
# public/_headers
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Do not add a CSP until Worker/Blob download behavior is verified against it; avoid shipping a guessed policy that breaks the app.

- [ ] **Step 2: Document product guarantees and local commands**

README must state:
- source images are processed locally in browser memory
- supported formats are JPG/JPEG, PNG, WebP
- 1 KB = 1000 bytes for compliance
- JPG/WebP use highest-passing-quality search
- PNG may fail very small byte limits at exact dimensions
- exact dimensions and output formats are never silently changed
- HEIC is intentionally unsupported in MVP

Commands:

```bash
npm install
npm run dev
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Cloudflare Pages settings:

```text
Build command: npm run build
Build output directory: dist
Node version: 22
```

- [ ] **Step 3: Run complete release verification from a clean dependency install**

Run:
```bash
rm -rf node_modules dist
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Expected:
- Vitest: all PASS
- Playwright Chromium + mobile project: all PASS
- TypeScript: no errors
- Vite build: succeeds
- `dist/` contains all six landing pages

- [ ] **Step 4: Inspect bundle for prohibited server/API behavior**

Run:
```bash
grep -RE 'fetch\(|XMLHttpRequest|toDataURL' -n src || true
```

Expected:
- no image-processing network upload call
- no `toDataURL()` usage
- any future non-processing `fetch()` would require explicit review before release

- [ ] **Step 5: Confirm implementation matches MVP Definition of Done**

Run these targeted checks:

```bash
npm test -- tests/unit/dimensions.test.ts tests/unit/crop.test.ts tests/unit/fit.test.ts tests/unit/requirement-parser.test.ts tests/unit/compliance.test.ts tests/unit/target-file-size.test.ts
npm run test:browser -- tests/browser/processing.spec.ts tests/browser/metadata.spec.ts tests/browser/mobile-flow.spec.ts
```

Expected: every listed test passes. Verify the UI exposes JPG/PNG/WebP only, the six landing pages share the same engine entry, and no numeric 50KB/100KB/200KB landing directories exist.

- [ ] **Step 6: Commit the release-ready documentation and static files**

```bash
git add README.md public package.json package-lock.json
git commit -m "docs: prepare image requirement fixer for deployment"
```

---

## Plan Self-Review

### Spec coverage

- JPG/PNG/WebP input/output: Tasks 1, 7, 11.
- Width/height, explicit ratio, one-sided resolution, and mode-aware ratio-only resolution: Task 2.
- Crop/Fit/Stretch + mismatch behavior: Tasks 3 and 9.
- Crop reposition/zoom: Tasks 3 and 9, verified in Task 11.
- White/Black/Custom/Transparent/Blur Fit backgrounds: Tasks 7 and 9, verified in Task 11.
- JPG/WebP max bytes and explicit user-approved dimension fallback: Task 6, integrated Task 7 and Task 9, browser verified Task 11.
- PNG failure policy: Task 7, verified Task 12.
- Requirement parser: Task 4, UI integration Task 9, E2E Task 13.
- PASS/FAIL compliance plus Before/After comparison: Task 5, UI integration Task 9.
- EXIF orientation: Task 7 decode path, verified Task 11.
- Metadata removal: Task 7 architecture, verified Task 12.
- Local processing / no server fallback: Tasks 7, 8, 14.
- Worker + fallback: Task 8.
- Mobile-first UX: Task 9, verified Task 13.
- Six SEO landing pages: Task 10, release check Task 14.
- HEIC and numeric SEO pages excluded: Global Constraints and Task 14 release check.

### Placeholder scan

No `TBD`, `TODO`, `implement later`, or unspecified “add tests/error handling” steps remain. Every implementation task identifies concrete files, interfaces, test commands, and expected outcomes.

### Type consistency

Core names are consistent across tasks:
- `ImageFormat`, `Requirements`, `CropState`, `FitBackground`, `ProcessRequest`, `ProcessResult`
- `reduceRatio`, `ratiosEqual`, `resolveTargetDimensions(sourceWidth, sourceHeight, requirements, aspectMode)`
- `getCropRect`, `getFitGeometry`
- `parseRequirements`
- `assessCompliance`
- `optimizeLossySize`
- `processImage`
- `processWithBestAvailablePath`

