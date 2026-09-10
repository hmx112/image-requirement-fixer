import type { CropState } from '../core/types.js';

export interface Rect { x: number; y: number; width: number; height: number; }
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function clampCropState(state: CropState): CropState {
  return {
    centerX: clamp(state.centerX, 0, 1),
    centerY: clamp(state.centerY, 0, 1),
    zoom: clamp(state.zoom, 1, 8),
  };
}

export function getCropRect(sourceWidth: number, sourceHeight: number, targetRatio: number, rawState: CropState): Rect {
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
