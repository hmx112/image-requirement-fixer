import { describe, expect, it } from 'vitest';
import { mimeForFormat, normalizeFormat } from '../../src/core/format';

describe('format helpers', () => {
  it('normalizes JPEG aliases to jpg', () => {
    expect(normalizeFormat('image/jpeg')).toBe('jpg');
    expect(normalizeFormat('jpeg')).toBe('jpg');
    expect(normalizeFormat('.JPG')).toBe('jpg');
  });

  it('maps output formats to MIME types', () => {
    expect(mimeForFormat('jpg')).toBe('image/jpeg');
    expect(mimeForFormat('png')).toBe('image/png');
    expect(mimeForFormat('webp')).toBe('image/webp');
  });
});
