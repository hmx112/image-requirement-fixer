import type { SourceImageInfo } from '../core/types.js';
import { reduceRatio } from '../core/dimensions.js';

export interface UploadView {
  input: HTMLInputElement;
  summary: HTMLDivElement;
}

export function renderUploadSection(container: HTMLElement): UploadView {
  container.innerHTML = `
    <section class="card" data-step="upload">
      <p class="eyebrow">100% Local Processing</p>
      <h2>Upload your image</h2>
      <p class="muted">Your image never leaves your device.</p>
      <label class="dropzone">
        <input type="file" accept="image/jpeg,image/png,image/webp" />
        <span class="dropzone-title">Choose JPG, PNG or WebP</span>
        <span class="muted small">Tap to select an image from this device.</span>
      </label>
      <div class="source-summary" data-source-summary hidden></div>
    </section>
  `;
  return {
    input: container.querySelector<HTMLInputElement>('input[type=file]')!,
    summary: container.querySelector<HTMLDivElement>('[data-source-summary]')!,
  };
}

export function updateSourceSummary(element: HTMLDivElement, source?: SourceImageInfo): void {
  if (!source) {
    element.hidden = true;
    element.innerHTML = '';
    return;
  }
  const ratio = reduceRatio(source.width, source.height);
  element.hidden = false;
  element.innerHTML = `
    <strong>Original image</strong>
    <dl class="summary-grid">
      <div><dt>Dimensions</dt><dd>${source.width}×${source.height} px</dd></div>
      <div><dt>Aspect ratio</dt><dd>${ratio.width}:${ratio.height}</dd></div>
      <div><dt>Format</dt><dd>${source.format.toUpperCase()}</dd></div>
      <div><dt>File size</dt><dd>${formatBytes(source.bytes)}</dd></div>
    </dl>
  `;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(bytes >= 10_000_000 ? 1 : 2)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}
