import type { AspectMode, ImageFormat } from '../core/types.js';
import { normalizeFormat } from '../core/format.js';

export interface ParsedRequirements {
  format?: ImageFormat;
  width?: number;
  height?: number;
  maxBytes?: number;
  recommendedAspectMode?: AspectMode;
  confidence: Partial<Record<'format' | 'dimensions' | 'fileSize', 'high' | 'medium'>>;
  warnings: string[];
}

const advisoryPattern = /\b(recommended|suggested|ideally|preferred)\b/i;
const dimensionPattern = /(\d{2,5})\s*(?:x|×|by)\s*(\d{2,5})(?:\s*(?:px|pixels?))?/i;
const widthPattern = /\bwidth\s*[:=]?\s*(\d{2,5})\s*(?:px|pixels?)?/i;
const heightPattern = /\bheight\s*[:=]?\s*(\d{2,5})\s*(?:px|pixels?)?/i;
const sizePattern = /(\d+(?:\.\d+)?)\s*(kb|mb)\b/i;
const limitPattern = /\b(max(?:imum)?|less than|under|up to|no more than|not exceed|no larger than)\b/i;

function isAdvisoryAroundMatch(text: string, index: number, length: number): boolean {
  const before = Math.max(0, index - 48);
  const after = Math.min(text.length, index + length + 48);
  return advisoryPattern.test(text.slice(before, after));
}

export function parseRequirements(text: string): ParsedRequirements {
  const result: ParsedRequirements = { confidence: {}, warnings: [] };
  const formatMatches = [...text.matchAll(/\b(jpe?g|png|webp)\b/gi)]
    .map((match) => normalizeFormat(match[1] ?? ''))
    .filter((value): value is ImageFormat => Boolean(value));
  const uniqueFormats = [...new Set(formatMatches)];

  if (uniqueFormats.length === 1) {
    result.format = uniqueFormats[0];
    result.confidence.format = 'high';
  } else if (uniqueFormats.length > 1) {
    result.warnings.push(`Multiple output formats detected: ${uniqueFormats.join(', ')}`);
  }

  const pair = dimensionPattern.exec(text);
  if (pair) {
    if (isAdvisoryAroundMatch(text, pair.index, pair[0].length)) {
      result.warnings.push('Possible dimensions were found, but the wording appears advisory.');
    } else {
      result.width = Number(pair[1]);
      result.height = Number(pair[2]);
      result.confidence.dimensions = /\b(exactly|must|required)\b/i.test(text) ? 'high' : 'medium';
    }
  } else {
    const width = widthPattern.exec(text);
    const height = heightPattern.exec(text);
    if (width && height) {
      const index = Math.min(width.index, height.index);
      const length = Math.max(width.index + width[0].length, height.index + height[0].length) - index;
      if (isAdvisoryAroundMatch(text, index, length)) {
        result.warnings.push('Possible dimensions were found, but the wording appears advisory.');
      } else {
        result.width = Number(width[1]);
        result.height = Number(height[1]);
        result.confidence.dimensions = 'medium';
      }
    }
  }

  const size = sizePattern.exec(text);
  if (size && limitPattern.test(text)) {
    const multiplier = size[2]!.toLowerCase() === 'mb' ? 1_000_000 : 1_000;
    result.maxBytes = Math.round(Number(size[1]) * multiplier);
    result.confidence.fileSize = 'high';
  }

  if (/\b(do not crop|no cropping|keep the whole image)\b/i.test(text)) result.recommendedAspectMode = 'fit';
  if (/\b(fill the frame|no blank space)\b/i.test(text)) result.recommendedAspectMode = 'crop';

  return result;
}
