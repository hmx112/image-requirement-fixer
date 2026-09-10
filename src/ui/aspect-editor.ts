import type { AspectMode, CropState, FitBackground, ImageFormat, SourceImageInfo } from '../core/types.js';
import { ratiosEqual, reduceRatio, resolveTargetDimensions } from '../core/dimensions.js';

export interface AspectView {
  section: HTMLElement;
  modes: NodeListOf<HTMLInputElement>;
  cropControls: HTMLElement;
  zoom: HTMLInputElement;
  reset: HTMLButtonElement;
  fitControls: HTMLElement;
  backgrounds: NodeListOf<HTMLInputElement>;
  customColor: HTMLInputElement;
  jpgFlatten: HTMLElement;
  jpgColor: HTMLInputElement;
  conflict: HTMLElement;
}

export function renderAspectSection(container: HTMLElement): AspectView {
  container.innerHTML = `
    <section class="card" data-aspect-choice hidden>
      <div class="section-heading"><span class="step-number">3</span><div><h2>The aspect ratios don't match.</h2><p class="muted">How should we fit your image?</p></div></div>
      <div class="choice-list">
        <label class="choice-card"><input type="radio" name="aspectMode" value="crop" checked /><span><strong>Crop — Fill the frame</strong><small>Recommended · Some edges may be cropped.</small></span></label>
        <label class="choice-card"><input type="radio" name="aspectMode" value="fit" /><span><strong>Fit — Keep the whole image</strong><small>Adds space when the ratios differ.</small></span></label>
        <details class="more-options"><summary>More options</summary><label class="choice-card"><input type="radio" name="aspectMode" value="stretch" /><span><strong>Stretch — Force exact size</strong><small>This may distort the image.</small></span></label></details>
      </div>
      <div class="crop-controls" data-crop-controls>
        <label class="field"><span>Crop zoom</span><input name="cropZoom" type="range" min="1" max="8" step="0.05" value="1" /></label>
        <button type="button" class="button-quiet" data-reset-crop>Reset crop</button>
        <p class="muted small">Drag the preview to reposition the image. Pinch on touch screens to zoom.</p>
      </div>
      <div class="fit-controls" data-fit-controls hidden>
        <p class="field-label">Background</p>
        <div class="background-grid">
          <label><input type="radio" name="fitBackground" value="white" checked /> White</label>
          <label><input type="radio" name="fitBackground" value="black" /> Black</label>
          <label><input type="radio" name="fitBackground" value="custom" /> Custom</label>
          <label><input type="radio" name="fitBackground" value="transparent" /> Transparent</label>
          <label><input type="radio" name="fitBackground" value="blur" /> Blur</label>
        </div>
        <label class="field compact"><span>Custom background</span><input type="color" name="customBackground" value="#ffffff" /></label>
      </div>
      <div class="jpg-flatten" data-jpg-flatten hidden>
        <label class="field compact"><span>Transparent pixels will use this background</span><input type="color" name="jpgBackgroundColor" value="#ffffff" /></label>
      </div>
      <div class="input-error" data-transparency-conflict hidden>JPG does not support transparency.</div>
    </section>
  `;
  return {
    section: container.querySelector('[data-aspect-choice]')!,
    modes: container.querySelectorAll<HTMLInputElement>('[name=aspectMode]'),
    cropControls: container.querySelector('[data-crop-controls]')!,
    zoom: container.querySelector('[name=cropZoom]')!,
    reset: container.querySelector('[data-reset-crop]')!,
    fitControls: container.querySelector('[data-fit-controls]')!,
    backgrounds: container.querySelectorAll<HTMLInputElement>('[name=fitBackground]'),
    customColor: container.querySelector('[name=customBackground]')!,
    jpgFlatten: container.querySelector('[data-jpg-flatten]')!,
    jpgColor: container.querySelector('[name=jpgBackgroundColor]')!,
    conflict: container.querySelector('[data-transparency-conflict]')!,
  };
}

export function shouldShowAspectChoice(source: SourceImageInfo | undefined, requirements: import('../core/types.js').Requirements, mode: AspectMode): boolean {
  if (!source) return false;
  const target = resolveTargetDimensions(source.width, source.height, requirements, mode);
  return !ratiosEqual(reduceRatio(source.width, source.height), target.ratio);
}

export function updateAspectView(view: AspectView, mode: AspectMode, background: FitBackground, source: SourceImageInfo | undefined, outputFormat: ImageFormat | undefined): void {
  view.cropControls.hidden = mode !== 'crop';
  view.fitControls.hidden = mode !== 'fit';
  const selectedBackground = [...view.backgrounds].find((input) => input.value === background.kind);
  if (selectedBackground) selectedBackground.checked = true;
  const convertingTransparentCapableSourceToJpg = Boolean(source && source.format !== 'jpg' && outputFormat === 'jpg');
  view.jpgFlatten.hidden = !convertingTransparentCapableSourceToJpg;
  const conflict = mode === 'fit' && background.kind === 'transparent' && outputFormat === 'jpg';
  view.conflict.hidden = !conflict;
}

export function cropFromControls(view: AspectView, crop: CropState): CropState {
  return { ...crop, zoom: Math.min(8, Math.max(1, Number(view.zoom.value) || 1)) };
}
