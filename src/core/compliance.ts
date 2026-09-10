import type { ComplianceItem, ComplianceReport, ImageFormat, Requirements } from './types.js';
import { reduceRatio, ratiosEqual } from './dimensions.js';

export interface ActualOutput {
  format: ImageFormat;
  width: number;
  height: number;
  bytes: number;
}

export function assessCompliance(requirements: Requirements, actual: ActualOutput): ComplianceReport {
  const items: ComplianceItem[] = [];
  const push = (item: ComplianceItem) => items.push(item);

  if (requirements.format) push({ key: 'format', passed: actual.format === requirements.format, required: requirements.format, actual: actual.format });
  if (requirements.width) push({ key: 'width', passed: actual.width === requirements.width, required: String(requirements.width), actual: String(actual.width) });
  if (requirements.height) push({ key: 'height', passed: actual.height === requirements.height, required: String(requirements.height), actual: String(actual.height) });
  if (requirements.aspectRatio) {
    const actualRatio = reduceRatio(actual.width, actual.height);
    push({ key: 'aspectRatio', passed: ratiosEqual(actualRatio, requirements.aspectRatio), required: `${requirements.aspectRatio.width}:${requirements.aspectRatio.height}`, actual: `${actualRatio.width}:${actualRatio.height}` });
  }
  if (requirements.maxBytes !== undefined) push({ key: 'maxBytes', passed: actual.bytes <= requirements.maxBytes, required: `≤${requirements.maxBytes}`, actual: String(actual.bytes) });

  return { passed: items.every((item) => item.passed), items };
}
