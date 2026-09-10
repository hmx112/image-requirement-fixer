import { describe, expect, it } from 'vitest';
import { parseRequirements } from '../../src/parser/requirement-parser';

describe('requirement parser', () => {
  it('extracts a direct JPG dimension and maximum byte limit', () => {
    expect(parseRequirements('Photo must be JPG format, 600 x 600 pixels and less than 200 KB.')).toMatchObject({ format: 'jpg', width: 600, height: 600, maxBytes: 200000 });
  });
  it('parses MB limits as decimal bytes', () => {
    expect(parseRequirements('Upload a PNG no larger than 2 MB.')).toMatchObject({ format: 'png', maxBytes: 2000000 });
  });
  it('extracts separate width and height phrases', () => {
    expect(parseRequirements('JPEG image. Maximum file size: 500KB. Width 1200px, height 800px.')).toMatchObject({ format: 'jpg', width: 1200, height: 800, maxBytes: 500000 });
  });
  it('does not treat advisory dimensions as exact', () => {
    const parsed = parseRequirements('Recommended size is 600×600.');
    expect(parsed.width).toBeUndefined(); expect(parsed.height).toBeUndefined(); expect(parsed.warnings.length).toBeGreaterThan(0);
  });
  it('does not choose when multiple output formats are allowed', () => {
    const parsed = parseRequirements('Upload JPG or PNG, maximum 200 KB.');
    expect(parsed.format).toBeUndefined(); expect(parsed.warnings.join(' ')).toMatch(/Multiple output formats/i);
  });
  it('recommends Fit for explicit no-crop language', () => {
    expect(parseRequirements('JPG, exactly 600x600 pixels. Do not crop the photo.').recommendedAspectMode).toBe('fit');
  });
});
