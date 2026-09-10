# Image Requirement Fixer — MVP Design

Date: 2026-09-10
Status: Approved design for implementation planning

## 1. Product Goal

Build a global, browser-based image upload requirement fixer that helps users make an existing image comply with external upload rules in one flow. The product is positioned as an upload-problem solver rather than a generic compressor or image editor.

Primary user intent includes:
- compress image to a maximum KB/MB limit
- resize image to exact dimensions
- convert image format
- resolve image upload errors
- convert WebP to JPG
- remove image metadata through re-encoding

The MVP processes images locally in the browser and does not upload source images to a server.

## 2. Scope

### Supported input formats
- JPG / JPEG
- PNG
- WebP

### Supported output formats
- JPG
- PNG
- WebP

### MVP capabilities
- maximum file size in KB / MB
- exact width / height
- one-sided dimension entry with automatic calculation
- aspect-ratio mismatch detection
- Crop
- Fit
- Stretch
- crop drag repositioning and zoom
- white / black / custom / transparent / blur backgrounds for Fit
- format conversion
- JPG / WebP max-file-size optimization
- requirement text parser
- before / after comparison
- strict PASS / FAIL compliance validation
- metadata removal by decode + re-encode
- local browser processing
- Worker processing with fallback
- mobile-first UX
- six intent-specific SEO landing pages sharing one engine

### Explicitly excluded from MVP
- HEIC
- PDF
- animated GIF
- SVG editing
- AI background removal
- upscaling
- Smart Crop / face detection
- passport or visa rule databases
- account system
- cloud storage
- large batch processing
- numeric SEO page farms such as 50KB / 100KB / 200KB variants

## 3. Technical Stack

- Vite
- TypeScript
- Vanilla DOM
- Canvas API
- createImageBitmap when available
- Web Worker
- OffscreenCanvas when available
- main-thread Canvas fallback
- Vitest
- Playwright
- Cloudflare Pages target deployment

No application backend or external processing API is required for the MVP.

## 4. Application Architecture

The application is a static multi-page site with a single shared image-processing engine.

```text
image-requirement-fixer/
├─ index.html
├─ image-compressor/index.html
├─ image-resizer/index.html
├─ image-format-converter/index.html
├─ webp-to-jpg/index.html
├─ remove-image-metadata/index.html
├─ src/
│  ├─ core/
│  │  ├─ types.ts
│  │  ├─ decode.ts
│  │  ├─ dimensions.ts
│  │  ├─ render.ts
│  │  ├─ encode.ts
│  │  ├─ target-file-size.ts
│  │  └─ compliance.ts
│  ├─ aspect/
│  │  ├─ crop.ts
│  │  ├─ fit.ts
│  │  └─ stretch.ts
│  ├─ parser/
│  │  └─ requirement-parser.ts
│  ├─ worker/
│  │  └─ image.worker.ts
│  ├─ ui/
│  │  ├─ upload.ts
│  │  ├─ requirements.ts
│  │  ├─ aspect-editor.ts
│  │  ├─ preview.ts
│  │  ├─ compliance-result.ts
│  │  └─ download.ts
│  ├─ pages/
│  │  └─ presets.ts
│  └─ main.ts
├─ tests/
│  ├─ unit/
│  ├─ browser/
│  └─ fixtures/
├─ public/
├─ docs/
├─ vite.config.ts
├─ tsconfig.json
└─ package.json
```

Landing pages differ in title, copy and initial UI preset only. They do not duplicate processing code.

## 5. Mobile UX Flow

Primary flow:

```text
Upload Image
→ Requirements
→ Aspect Ratio Check
→ Preview / Position
→ Fix My Image
→ Compliance Check
→ Download
```

The UI reveals advanced controls only when needed.

### Upload state
After upload, show:
- width
- height
- aspect ratio
- format
- file size

Persistent trust message:
- `100% Local Processing`
- `Your image never leaves your device.`

### Requirements state
Users may either paste requirement text or enter fields directly.

Fields:
- maximum file size + KB/MB unit
- width
- height
- output format
- optional explicit aspect ratio

Parser output remains editable and must be reviewed before processing.

## 6. Aspect Ratio Mismatch UX

Aspect handling controls are shown only when the oriented source ratio differs from the resolved target ratio.

Primary options:

### Crop — Fill the frame
Default recommendation.
- target frame is fixed to target aspect ratio
- image moves behind the frame
- touch drag repositions
- pinch and +/- zoom
- reset action
- preview required because content may be removed

### Fit — Keep the whole image
Preserves the full image and fills remaining space with:
- White
- Black
- Custom color
- Transparent
- Blur background

Transparent output is allowed only for PNG/WebP. JPG requires a background color or explicit output-format change.

### Stretch — Force exact size
Available under More options.
- ignores source aspect ratio
- warning: `This may distort the image.`

## 7. Dimension Resolution Rules

Priority:

```text
Exact width + height
> Explicit aspect ratio
> Original aspect ratio
```

Rules:
- if width and height are provided, both are exact
- if only one dimension is provided, calculate the other using explicit ratio if present, otherwise source ratio
- if only aspect ratio is provided, preserve maximum practical source resolution instead of arbitrarily downscaling

Example:
- source 3000×2000
- ratio 1:1
- Crop result before later resizing: 2000×2000

## 8. Processing Pipeline

Canonical order:

```text
Validate file
→ Decode
→ Apply / honor image orientation
→ Read oriented dimensions
→ Resolve target dimensions / target ratio
→ Resolve Crop / Fit / Stretch geometry
→ Render once to target canvas
→ Encode requested format
→ Optimize to max file size when applicable
→ Verify actual output Blob
→ Compliance Check
→ Download
```

Do not compress first and resize afterward.

## 9. Geometry Rules

### Crop
For source width `SW`, source height `SH`, target ratio `R`:
- choose the largest source rectangle with ratio `R`
- center it initially
- store crop geometry as source coordinates
- user repositioning changes source x/y
- zoom reduces source rectangle size while preserving ratio
- perform the actual crop only at render time

Example:
- 3000×2000 to 1:1
- source crop = 2000×2000
- initial x = 500, y = 0

### Fit
Use:

```text
scale = min(targetWidth / sourceWidth, targetHeight / sourceHeight)
```

Center the contained source image in the target canvas.

Blur background:
1. draw a cover-scaled copy into the full canvas
2. apply fixed MVP blur amount
3. draw the contained source image on top

### Stretch
Draw source dimensions directly to target dimensions without preserving aspect ratio.

## 10. File Size Units

Internally use decimal upload limits:
- 1 KB = 1,000 bytes
- 1 MB = 1,000,000 bytes

Rationale: conservative compatibility with external upload systems that enforce decimal file-size limits.

UI labels may show rounded human-readable values, but compliance decisions use raw byte counts.

## 11. JPG / WebP Maximum File Size Optimization

Goal:
> highest available encoding quality whose output is at or below the requested byte limit.

Initial MVP search range:
- max quality: 0.95
- min quality: 0.35
- approximately 7–9 binary-search iterations

The search stores the best passing Blob and quality seen so far.

A result passes only when:

```text
blob.size <= requestedMaxBytes
```

The UI never exposes encoding quality as a primary user control.

## 12. When the Requested File Size Cannot Be Reached

Preserve requested dimensions first.

Priority:
1. preserve dimensions
2. search encoding quality
3. report failure if still too large
4. ask user permission before reducing dimensions
5. only after approval, reduce dimensions progressively and retry quality search

If exact dimensions were explicitly required, the application must not reduce them and then claim compliance.

No silent dimension reduction is allowed.

## 13. PNG Policy

PNG is not treated like JPG/WebP quality-based encoding.

If a PNG output exceeds a requested maximum size:
- report that the limit cannot be reached at the current dimensions
- offer Keep PNG
- offer Convert to WebP
- offer Convert to JPG
- allow dimension reduction only if dimensions are not exact and the user explicitly approves it

PNG quantization is out of scope for MVP.

## 14. Transparency Rules

- PNG and WebP may preserve transparent backgrounds
- JPG cannot
- transparent source to JPG requires explicit background replacement
- default suggested replacement is white
- never silently change JPG output to PNG/WebP

After encoding, verify the actual Blob MIME type. If the requested output type is not the produced type, format compliance fails.

## 15. Metadata Removal

All output files are created through:

```text
decode → canvas render → new encoded Blob
```

Original EXIF/GPS metadata is not intentionally copied to the output.

User-facing wording:
`Original image metadata removed during re-encoding.`

Automated tests must verify that source metadata fixtures are not retained.

## 16. Memory Strategy

Avoid full-resolution intermediate canvases whenever the final target is smaller.

Example:
- source 8000×6000
- output 600×600

Prefer:
- decode source to ImageBitmap when possible
- compute source rectangle
- draw directly into 600×600 target canvas

Do not use `toDataURL()` for processing or downloads. Use Blob-based APIs.

The app must not upload the original to a server as a fallback for local memory failures.

## 17. Worker Strategy

Preferred path:

```text
Main thread:
UI, gestures, preview state, progress, download coordination

Worker:
decode where supported, geometry execution, render, encode,
file-size search, final validation support
```

Use OffscreenCanvas where available.

Fallback:
- perform equivalent Canvas processing on the main thread
- keep behavior and validation rules identical

## 18. Requirement Parser

MVP is deterministic and does not use an LLM.

Recognize:

### Formats
- JPG
- JPEG
- PNG
- WebP

### Dimensions
- `600x600`
- `600 x 600`
- `600×600`
- `600 by 600 pixels`
- clear width / height phrases

### File size
- KB
- MB

### Limit language
- maximum
- max
- less than
- under
- up to
- no more than
- not exceed

### Crop guidance
Clear instructions such as:
- do not crop
- no cropping
- keep the whole image

may recommend Fit.

Clear instructions such as:
- fill the frame
- no blank space

may recommend Crop.

Parser philosophy:
> minimize false positives rather than force a parse of every sentence.

Recommended dimensions must not be mistaken for exact requirements when the wording is clearly advisory.

Parser suggestions never bypass user review.

## 19. Compliance Engine

Inputs:
- requested format
- requested width
- requested height
- requested aspect ratio
- requested maximum bytes

Actual output values:
- Blob MIME / normalized format
- output width
- output height
- reduced ratio
- Blob byte size

Every specified requirement must pass independently.

Examples:
- max 200,000 bytes: 200,000 passes, 200,001 fails
- exact 600×600: 599×600 fails
- requested JPG but output Blob is PNG: fails

`All requirements met` appears only when every specified constraint passes.

## 20. Error Categories

### Input Error
Unsupported or invalid source file.

### Processing Error
Browser could not decode or process the image. Do not claim a specific memory cause unless it is known.

### Requirement Conflict
Examples:
- JPG + transparent output requirement

Offer explicit resolution choices instead of silently changing constraints.

### Unsupported Case
Examples:
- HEIC in MVP

List supported formats and do not route files to a server fallback.

## 21. SEO Structure

Initial indexable pages:
- `/` or `/image-requirement-fixer/` as the principal fixer experience
- `/image-compressor/`
- `/image-resizer/`
- `/image-format-converter/`
- `/webp-to-jpg/`
- `/remove-image-metadata/`

All use the same application engine and vary by search intent, copy and preset.

Do not create numeric file-size pages initially. Search Console data must justify any future numeric landing page, and each must add meaningful preset/content value.

## 22. Test Strategy

### Unit tests — Vitest
Test pure logic:
- ratio reduction
- target dimension resolution
- crop geometry
- fit geometry
- parser extraction
- parser ambiguity
- byte-boundary compliance
- format normalization
- file-size search orchestration with mocked encoder

Required examples:
- 3000×2000 → 3:2
- 600×600 → 1:1
- crop 3000×2000 to 1:1 → x=500,y=0,w=2000,h=2000
- fit 3000×2000 into 600×600 → 600×400 offset y=100
- 199,999 / 200,000 / 200,001 byte boundary tests

### Browser engine tests — Playwright Chromium
Fixtures:
- landscape.jpg
- portrait.jpg
- square.jpg
- transparent.png
- sample.webp
- exif-rotated.jpg
- gps-metadata.jpg
- large-photo.jpg

Verify actual output:
- dimensions
- Blob MIME
- file size
- transparency behavior
- metadata removal
- crop reposition behavior

### Crop visual fixture
Use a deterministic source image with distinct left / center / right regions so crop position can be verified by pixel sampling.

### Fit tests
Verify:
- transparent corners when requested
- white corners for white background
- blur background is non-transparent

Do not require pixel-perfect blur equivalence across browsers.

### E2E mobile flow
Primary viewport around 375×812.

Flow:
Upload → enter max size → dimensions → format → choose aspect mode → process → PASS/FAIL → download.

## 23. MVP Definition of Done

The MVP is publishable only when all of the following are implemented and verified:

1. JPG / PNG / WebP input
2. JPG / PNG / WebP output
3. Width / height change
4. One-sided dimension calculation
5. Crop
6. Crop reposition
7. Crop zoom
8. Fit
9. White / Black / Custom backgrounds
10. Transparent background
11. Blur background
12. Stretch
13. JPG/WebP max-byte optimization
14. PNG file-size failure policy
15. Format conversion
16. Requirement Parser
17. Before / After comparison
18. Strict PASS / FAIL
19. Metadata removal
20. 100% local-processing architecture
21. Mobile-first UI
22. Worker + fallback
23. Six intent-specific landing pages
24. Automated test suite passing

## 24. Non-Negotiable Product Rules

1. Process file size, dimensions, format and ratio in one flow.
2. Do not mass-generate numeric SEO pages at launch.
3. Show Crop / Fit / Stretch only when ratio handling is needed.
4. Recommend Crop by default but always provide preview and positioning.
5. Fit supports background choices including transparency and blur.
6. Stretch remains secondary and carries a distortion warning.
7. Revalidate the final output rather than trusting requested encoder settings.
8. For JPG/WebP, target the highest passing quality under the maximum size.
9. Never silently reduce dimensions or change format.
10. Keep source images local to the browser.
11. Prioritize mobile UX.
12. Keep HEIC out until separately evaluated.
13. Position the service as an upload-requirement fixer, not merely a compressor.
