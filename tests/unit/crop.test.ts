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
