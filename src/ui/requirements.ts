import type { Requirements } from '../core/types.js';
import type { ParsedRequirements } from '../parser/requirement-parser.js';

export interface RequirementView {
  requirementText: HTMLTextAreaElement;
  detect: HTMLButtonElement;
  maxSize: HTMLInputElement;
  maxSizeUnit: HTMLSelectElement;
  width: HTMLInputElement;
  height: HTMLInputElement;
  aspectRatio: HTMLInputElement;
  format: HTMLSelectElement;
  warnings: HTMLDivElement;
  error: HTMLDivElement;
}

export interface ReadRequirementResult {
  requirements?: Requirements;
  error?: string;
}

export function renderRequirementsSection(container: HTMLElement): RequirementView {
  container.innerHTML = `
    <section class="card" data-step="requirements">
      <div class="section-heading"><span class="step-number">2</span><div><h2>Requirements</h2><p class="muted">Enter the rules from the upload site.</p></div></div>
      <label class="field full"><span>Paste upload requirements</span>
        <textarea name="requirementText" rows="4" placeholder="Photo must be JPG, 600 × 600 pixels and less than 200 KB."></textarea>
      </label>
      <button type="button" class="button-secondary" data-detect>Detect requirements</button>
      <div class="parser-warnings" data-parser-warnings hidden></div>
      <div class="form-grid">
        <label class="field"><span>Maximum file size</span><div class="input-pair"><input name="maxSize" inputmode="decimal" placeholder="200" /><select name="maxSizeUnit"><option>KB</option><option>MB</option></select></div></label>
        <label class="field"><span>Output format</span><select name="format"><option value="">Keep original</option><option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></label>
        <label class="field"><span>Width (px)</span><input name="width" inputmode="numeric" placeholder="600" /></label>
        <label class="field"><span>Height (px)</span><input name="height" inputmode="numeric" placeholder="600" /></label>
        <label class="field full"><span>Aspect ratio <small>optional</small></span><input name="aspectRatio" inputmode="text" placeholder="1:1" /></label>
      </div>
      <div class="input-error" data-requirement-error hidden></div>
    </section>
  `;
  return {
    requirementText: container.querySelector('[name=requirementText]')!,
    detect: container.querySelector('[data-detect]')!,
    maxSize: container.querySelector('[name=maxSize]')!,
    maxSizeUnit: container.querySelector('[name=maxSizeUnit]')!,
    width: container.querySelector('[name=width]')!,
    height: container.querySelector('[name=height]')!,
    aspectRatio: container.querySelector('[name=aspectRatio]')!,
    format: container.querySelector('[name=format]')!,
    warnings: container.querySelector('[data-parser-warnings]')!,
    error: container.querySelector('[data-requirement-error]')!,
  };
}

function positiveInteger(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

export function readRequirements(view: RequirementView): ReadRequirementResult {
  const width = positiveInteger(view.width.value);
  const height = positiveInteger(view.height.value);
  if (view.width.value.trim() && width === undefined) return { error: 'Width must be a positive whole number.' };
  if (view.height.value.trim() && height === undefined) return { error: 'Height must be a positive whole number.' };

  const maxSizeText = view.maxSize.value.trim();
  let maxBytes: number | undefined;
  if (maxSizeText) {
    const maxSize = Number(maxSizeText);
    if (!Number.isFinite(maxSize) || maxSize <= 0) return { error: 'Maximum file size must be greater than zero.' };
    maxBytes = Math.round(maxSize * (view.maxSizeUnit.value === 'MB' ? 1_000_000 : 1_000));
  }

  const ratioText = view.aspectRatio.value.trim();
  let aspectRatio: Requirements['aspectRatio'];
  if (ratioText) {
    const match = ratioText.match(/^(\d+)\s*:\s*(\d+)$/);
    if (!match || Number(match[1]) <= 0 || Number(match[2]) <= 0) return { error: 'Aspect ratio must look like 1:1, 4:3 or 3:2.' };
    aspectRatio = { width: Number(match[1]), height: Number(match[2]) };
  }

  return {
    requirements: {
      format: view.format.value === '' ? undefined : view.format.value as Requirements['format'],
      width,
      height,
      aspectRatio,
      maxBytes,
      dimensionsAreExact: view.width.value.trim() !== '' || view.height.value.trim() !== '',
    },
  };
}

export function applyParsedRequirements(view: RequirementView, parsed: ParsedRequirements): void {
  if (parsed.width !== undefined) view.width.value = String(parsed.width);
  if (parsed.height !== undefined) view.height.value = String(parsed.height);
  if (parsed.format) view.format.value = parsed.format;
  if (parsed.maxBytes !== undefined) {
    if (parsed.maxBytes >= 1_000_000 && parsed.maxBytes % 1_000_000 === 0) {
      view.maxSize.value = String(parsed.maxBytes / 1_000_000); view.maxSizeUnit.value = 'MB';
    } else {
      view.maxSize.value = String(parsed.maxBytes / 1_000); view.maxSizeUnit.value = 'KB';
    }
  }
  view.warnings.hidden = parsed.warnings.length === 0;
  view.warnings.innerHTML = parsed.warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join('');
}

export function setRequirementError(view: RequirementView, message?: string): void {
  view.error.hidden = !message;
  view.error.textContent = message ?? '';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);
}
