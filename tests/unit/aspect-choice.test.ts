import { describe, expect, it } from 'vitest';
import { shouldShowAspectChoice } from '../../src/ui/aspect-editor.js';
import type { SourceImageInfo } from '../../src/core/types.js';

const source: SourceImageInfo = {
  width: 1200,
  height: 800,
  format: 'jpg',
  mime: 'image/jpeg',
  bytes: 250_000,
  name: 'landscape.jpg',
};

describe('aspect ratio choice visibility', () => {
  it('shows the choice when target ratio differs from the source', () => {
    expect(shouldShowAspectChoice(source, { width: 600, height: 600 }, 'crop')).toBe(true);
  });

  it('keeps the choice hidden when target ratio already matches the source', () => {
    expect(shouldShowAspectChoice(source, { width: 900, height: 600 }, 'crop')).toBe(false);
  });
});
