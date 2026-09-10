import { expect, it } from 'vitest';
import { getPagePreset } from '../../src/pages/presets';

it('preselects JPG only for the WebP to JPG landing page', () => {
  expect(getPagePreset('/webp-to-jpg/').format).toBe('jpg');
  expect(getPagePreset('/image-compressor/').format).toBeUndefined();
});
