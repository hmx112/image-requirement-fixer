import type { AspectMode, Ratio, Requirements } from './types.js';

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
