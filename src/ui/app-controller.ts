import type { AspectMode, CropState, FitBackground, ImageFormat, ProcessRequest, Requirements, SourceImageInfo } from '../core/types.js';
import { normalizeFormat } from '../core/format.js';
import { parseRequirements } from '../parser/requirement-parser.js';
import { processWithBestAvailablePath } from '../worker/worker-client.js';
import { renderUploadSection, updateSourceSummary } from './upload.js';
import { applyParsedRequirements, readRequirements, renderRequirementsSection, setRequirementError } from './requirements.js';
import { cropFromControls, renderAspectSection, shouldShowAspectChoice, updateAspectView } from './aspect-editor.js';
import { PreviewController } from './preview.js';
import { clearDownload, setDownload } from './download.js';
import { renderProcessResult } from './compliance-result.js';

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

export interface AppPreset {
  title?: string;
  intro?: string;
  format?: ImageFormat;
  width?: number;
  height?: number;
  maxSize?: number;
  maxSizeUnit?: 'KB' | 'MB';
}

export function mountApp(root: HTMLElement, preset: AppPreset = {}): void {
  const state: AppState = {
    ...initialState,
    crop: { ...initialState.crop },
    background: { ...initialState.background },
    requirements: {
      format: preset.format,
      width: preset.width,
      height: preset.height,
      maxBytes: preset.maxSize ? Math.round(preset.maxSize * (preset.maxSizeUnit === 'MB' ? 1_000_000 : 1_000)) : undefined,
      dimensionsAreExact: Boolean(preset.width || preset.height),
    },
  };

  root.innerHTML = `
    <div class="shell">
      <header class="hero">
        <p class="brand">Image Requirement Fixer</p>
        <h1>${escapeHtml(preset.title ?? 'Fix images that don’t meet upload requirements.')}</h1>
        <p>${escapeHtml(preset.intro ?? 'Match file size, dimensions, format and aspect ratio in one step — without uploading your image.')}</p>
      </header>
      <div data-upload></div>
      <div data-requirements></div>
      <div data-aspect></div>
      <section class="card preview-card" data-preview-card hidden>
        <div class="section-heading"><span class="step-number">4</span><div><h2>Preview</h2><p class="muted">Check framing before the final file is created.</p></div></div>
        <div class="preview-stage"><canvas data-preview aria-label="Image preview"></canvas></div>
      </section>
      <section class="card action-card" data-action-card>
        <button type="button" class="action-primary" data-fix disabled>Fix My Image</button>
        <p class="processing-status" data-processing-status hidden></p>
      </section>
      <div data-result hidden></div>
      <footer><strong>Private by design.</strong> Processing stays in your browser. No source image is uploaded.</footer>
    </div>`;

  const upload = renderUploadSection(root.querySelector('[data-upload]')!);
  const requirement = renderRequirementsSection(root.querySelector('[data-requirements]')!);
  const aspect = renderAspectSection(root.querySelector('[data-aspect]')!);
  const previewCard = root.querySelector<HTMLElement>('[data-preview-card]')!;
  const previewCanvas = root.querySelector<HTMLCanvasElement>('[data-preview]')!;
  const fixButton = root.querySelector<HTMLButtonElement>('[data-fix]')!;
  const processingStatus = root.querySelector<HTMLElement>('[data-processing-status]')!;
  const resultContainer = root.querySelector<HTMLElement>('[data-result]')!;

  if (preset.width) requirement.width.value = String(preset.width);
  if (preset.height) requirement.height.value = String(preset.height);
  if (preset.format) requirement.format.value = preset.format;
  if (preset.maxSize) { requirement.maxSize.value = String(preset.maxSize); requirement.maxSizeUnit.value = preset.maxSizeUnit ?? 'KB'; }

  const preview = new PreviewController(previewCanvas, (dx, dy, zoomFactor) => {
    if (zoomFactor !== undefined) {
      state.crop.zoom = clamp(state.crop.zoom * zoomFactor, 1, 8);
      aspect.zoom.value = String(state.crop.zoom);
    } else {
      state.crop.centerX = clamp(state.crop.centerX + dx, 0, 1);
      state.crop.centerY = clamp(state.crop.centerY + dy, 0, 1);
    }
    preview.render(state);
  });

  const syncRequirements = (): boolean => {
    const read = readRequirements(requirement);
    if (!read.requirements) {
      setRequirementError(requirement, read.error);
      return false;
    }
    setRequirementError(requirement);
    state.requirements = read.requirements;
    refreshDependentUI();
    return true;
  };

  const outputFormat = (): ImageFormat | undefined => state.requirements.format ?? state.source?.format;

  function refreshDependentUI(): void {
    const showAspect = shouldShowAspectChoice(state.source, state.requirements, state.aspectMode);
    aspect.section.hidden = !showAspect;
    if (!showAspect) state.aspectMode = 'crop';
    for (const mode of aspect.modes) mode.checked = mode.value === state.aspectMode;
    updateAspectView(aspect, state.aspectMode, state.background, state.source, outputFormat());
    if (state.file && state.source) {
      previewCard.hidden = false;
      preview.render(state);
      fixButton.disabled = false;
    }
  }

  upload.input.addEventListener('change', async () => {
    clearDownload();
    resultContainer.hidden = true;
    const file = upload.input.files?.[0];
    if (!file) return;
    const format = normalizeFormat(file.type || file.name.split('.').pop() || '');
    if (!format) {
      state.file = undefined; state.source = undefined; fixButton.disabled = true; previewCard.hidden = true;
      upload.summary.hidden = false;
      upload.summary.innerHTML = `<p class="input-error">The selected file isn't supported. Supported formats are JPG, PNG and WebP.</p>`;
      return;
    }
    try {
      const dimensions = await preview.setFile(file);
      state.file = file;
      state.source = { name: file.name, mime: file.type, format, width: dimensions.width, height: dimensions.height, bytes: file.size };
      state.status = 'ready';
      if (!state.requirements.format && preset.format) state.requirements.format = preset.format;
      updateSourceSummary(upload.summary, state.source);
      syncRequirements();
    } catch {
      state.file = undefined; state.source = undefined; fixButton.disabled = true; previewCard.hidden = true;
      upload.summary.hidden = false;
      upload.summary.innerHTML = `<p class="input-error">The browser couldn't decode this image.</p>`;
    }
  });

  requirement.detect.addEventListener('click', () => {
    const parsed = parseRequirements(requirement.requirementText.value);
    applyParsedRequirements(requirement, parsed);
    if (parsed.recommendedAspectMode) state.aspectMode = parsed.recommendedAspectMode;
    syncRequirements();
  });

  for (const field of [requirement.maxSize, requirement.maxSizeUnit, requirement.width, requirement.height, requirement.aspectRatio, requirement.format]) {
    field.addEventListener('input', syncRequirements);
    field.addEventListener('change', syncRequirements);
  }

  for (const mode of aspect.modes) mode.addEventListener('change', () => {
    if (!mode.checked) return;
    state.aspectMode = mode.value as AspectMode;
    updateAspectView(aspect, state.aspectMode, state.background, state.source, outputFormat());
    preview.render(state);
  });

  aspect.zoom.addEventListener('input', () => {
    state.crop = cropFromControls(aspect, state.crop);
    preview.render(state);
  });
  aspect.reset.addEventListener('click', () => {
    state.crop = { centerX: 0.5, centerY: 0.5, zoom: 1 };
    aspect.zoom.value = '1';
    preview.render(state);
  });
  for (const radio of aspect.backgrounds) radio.addEventListener('change', () => {
    if (!radio.checked) return;
    state.background = { kind: radio.value as FitBackground['kind'], color: radio.value === 'custom' ? aspect.customColor.value : undefined };
    updateAspectView(aspect, state.aspectMode, state.background, state.source, outputFormat());
    preview.render(state);
  });
  aspect.customColor.addEventListener('input', () => {
    if (state.background.kind === 'custom') state.background = { kind: 'custom', color: aspect.customColor.value };
    preview.render(state);
  });
  aspect.jpgColor.addEventListener('input', () => { state.jpgBackgroundColor = aspect.jpgColor.value; preview.render(state); });

  async function runProcessing(allowDimensionReduction: boolean): Promise<void> {
    if (!state.file || !syncRequirements()) return;
    clearDownload(); resultContainer.hidden = true;
    state.status = 'processing'; fixButton.disabled = true; processingStatus.hidden = false; processingStatus.textContent = 'Preparing image…';
    const request: ProcessRequest = {
      file: state.file,
      requirements: state.requirements,
      aspectMode: state.aspectMode,
      crop: state.crop,
      fitBackground: state.background,
      jpgBackgroundColor: state.jpgBackgroundColor,
      allowDimensionReduction,
    };
    processingStatus.textContent = state.requirements.maxBytes ? 'Optimizing file size…' : 'Resizing…';
    const result = await processWithBestAvailablePath(request);
    processingStatus.textContent = 'Checking requirements…';
    renderProcessResult(resultContainer, result, state.source);
    processingStatus.hidden = true; fixButton.disabled = false;
    state.status = result.ok && result.compliance.passed ? 'success' : 'error';

    if (result.ok && result.compliance.passed) {
      const anchor = resultContainer.querySelector<HTMLAnchorElement>('[data-download]')!;
      const base = state.file.name.replace(/\.[^.]+$/, '') || 'image';
      setDownload(anchor, result.image.blob, `${base}-compliant.${result.image.format === 'jpg' ? 'jpg' : result.image.format}`);
      anchor.hidden = false;
    } else if (!result.ok) {
      if (result.code === 'file-size-unattainable' && state.requirements.dimensionsAreExact !== true) {
        const extra = resultContainer.querySelector<HTMLElement>('[data-failure-extra]');
        if (extra) {
          extra.innerHTML = `<button type="button" class="action-primary" data-allow-smaller>Allow smaller dimensions</button>`;
          extra.querySelector('[data-allow-smaller]')?.addEventListener('click', () => void runProcessing(true));
        }
      }
      for (const button of resultContainer.querySelectorAll<HTMLButtonElement>('[data-use-format]')) {
        button.addEventListener('click', () => {
          requirement.format.value = button.dataset.useFormat ?? '';
          syncRequirements();
          resultContainer.hidden = true;
        });
      }
    }
    resultContainer.querySelector('[data-adjust]')?.addEventListener('click', () => requirement.requirementText.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  fixButton.addEventListener('click', () => void runProcessing(false));
  syncRequirements();
}

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function escapeHtml(value: string): string { return value.replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] ?? c)); }
