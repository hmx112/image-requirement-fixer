import type { AspectMode, CropState, FitBackground } from './types.js';
import { getCropRect } from '../aspect/crop.js';
import { getFitGeometry } from '../aspect/fit.js';

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
    ctx.fillStyle = options.background.kind === 'white'
      ? '#ffffff'
      : options.background.kind === 'black'
        ? '#000000'
        : (options.background.color ?? '#ffffff');
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else if (options.background.kind === 'blur') {
    ctx.save();
    ctx.filter = 'blur(20px)';
    ctx.drawImage(image, fit.cover.x, fit.cover.y, fit.cover.width, fit.cover.height);
    ctx.restore();
  }
  ctx.drawImage(image, fit.x, fit.y, fit.width, fit.height);
}
