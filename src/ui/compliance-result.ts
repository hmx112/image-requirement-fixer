import type { ProcessResult, SourceImageInfo } from '../core/types.js';
import { reduceRatio } from '../core/dimensions.js';
import { formatBytes } from './upload.js';

export function renderProcessResult(container: HTMLElement, result: ProcessResult, source?: SourceImageInfo): void {
  if (!result.ok) {
    container.hidden = false;
    const suggested = result.suggestedFormats?.length
      ? `<div class="suggested-actions">${result.suggestedFormats.map((format) => `<button type="button" class="button-secondary" data-use-format="${format}">Use ${format.toUpperCase()}</button>`).join('')}</div>` : '';
    container.innerHTML = `<section class="card result-card error-card"><h2>Requirements not met</h2><p>${escapeHtml(result.message)}</p>${result.smallestBytes ? `<p>Smallest result: <strong>${formatBytes(result.smallestBytes)}</strong></p>` : ''}${suggested}<div data-failure-extra></div></section>`;
    return;
  }
  const passed = result.compliance.passed;
  const afterRatio = reduceRatio(result.image.width, result.image.height);
  const beforeRatio = source ? reduceRatio(source.width, source.height) : undefined;
  const compressionPercent = source ? Math.max(0, Math.round((1 - result.image.blob.size / source.bytes) * 100)) : 0;
  container.hidden = false;
  container.innerHTML = `
    <section class="card result-card ${passed ? 'success-card' : 'error-card'}">
      <p class="eyebrow">Compliance check</p>
      <h2>${passed ? 'All requirements met' : 'Some requirements were not met'}</h2>
      <div class="compliance-list">${result.compliance.items.map((item) => `<div class="compliance-row"><span>${labelFor(item.key)}</span><span>${escapeHtml(item.actual)} / ${escapeHtml(item.required)}</span><strong class="${item.passed ? 'pass' : 'fail'}">${item.passed ? 'PASS' : 'FAIL'}</strong></div>`).join('')}</div>
      <h3>Before / After</h3>
      <div class="compare-grid">
        <div><span>Dimensions</span><strong>${source ? `${source.width}×${source.height}` : '—'}</strong><strong>${result.image.width}×${result.image.height}</strong></div>
        <div><span>Aspect ratio</span><strong>${beforeRatio ? `${beforeRatio.width}:${beforeRatio.height}` : '—'}</strong><strong>${afterRatio.width}:${afterRatio.height}</strong></div>
        <div><span>Format</span><strong>${source?.format.toUpperCase() ?? '—'}</strong><strong>${result.image.format.toUpperCase()}</strong></div>
        <div><span>File size</span><strong>${source ? formatBytes(source.bytes) : '—'}</strong><strong>${formatBytes(result.image.blob.size)}</strong></div>
      </div>
      <p class="muted">${compressionPercent}% smaller · Original image metadata removed during re-encoding · Processed locally</p>
      ${result.image.resolutionReducedFrom ? `<p class="notice">Resolution was reduced from ${result.image.resolutionReducedFrom.width}×${result.image.resolutionReducedFrom.height} to ${result.image.width}×${result.image.height} to meet the file-size limit.</p>` : ''}
      <a class="action-primary download-link" data-download hidden>Download Compliant Image</a>
      <button type="button" class="button-quiet" data-adjust>Adjust Settings</button>
    </section>`;
}

function labelFor(key: string): string {
  return ({ format: 'Format', width: 'Width', height: 'Height', aspectRatio: 'Aspect ratio', maxBytes: 'File size' } as Record<string,string>)[key] ?? key;
}
function escapeHtml(value: string): string { return value.replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] ?? c)); }
