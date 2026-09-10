import { describe, expect, it } from 'vitest';
import { getFitGeometry } from '../../src/aspect/fit';

describe('fit geometry', () => {
  it('contains 3000x2000 inside 600x600', () => {
    expect(getFitGeometry(3000, 2000, 600, 600)).toEqual({
      x: 0, y: 100, width: 600, height: 400,
      cover: { x: -150, y: 0, width: 900, height: 600 },
    });
  });
});
