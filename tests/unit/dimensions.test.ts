import { describe, expect, it } from 'vitest';
import { reduceRatio, resolveTargetDimensions } from '../../src/core/dimensions';

describe('dimensions', () => {
  it('reduces pixel dimensions to stable ratios', () => {
    expect(reduceRatio(3000, 2000)).toEqual({ width: 3, height: 2 });
    expect(reduceRatio(600, 600)).toEqual({ width: 1, height: 1 });
  });
  it('uses exact width and height when both are provided', () => {
    expect(resolveTargetDimensions(3000, 2000, { width: 600, height: 600 }, 'crop')).toEqual({ width: 600, height: 600, ratio: { width: 1, height: 1 } });
  });
  it('calculates a missing dimension from the explicit ratio first', () => {
    expect(resolveTargetDimensions(3000, 2000, { width: 1200, aspectRatio: { width: 1, height: 1 } }, 'crop')).toEqual({ width: 1200, height: 1200, ratio: { width: 1, height: 1 } });
  });
  it('uses source ratio when only one dimension is provided', () => {
    expect(resolveTargetDimensions(1600, 1200, { width: 1200 }, 'crop')).toEqual({ width: 1200, height: 900, ratio: { width: 4, height: 3 } });
  });
  it('preserves the largest crop resolution when only a target ratio is supplied', () => {
    expect(resolveTargetDimensions(3000, 2000, { aspectRatio: { width: 1, height: 1 } }, 'crop')).toEqual({ width: 2000, height: 2000, ratio: { width: 1, height: 1 } });
  });
  it('preserves the whole source without downscaling for Fit when only a target ratio is supplied', () => {
    expect(resolveTargetDimensions(3000, 2000, { aspectRatio: { width: 1, height: 1 } }, 'fit')).toEqual({ width: 3000, height: 3000, ratio: { width: 1, height: 1 } });
  });
});
