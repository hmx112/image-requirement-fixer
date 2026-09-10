import type { CanvasFactory, ProcessRequest, ProcessResult } from './types.js';
import { resolveTargetDimensions } from './dimensions.js';
import { decodeImage } from './decode.js';
import { renderToContext } from './render.js';
import { encodeCanvas } from './encode.js';
import { assessCompliance } from './compliance.js';
import { buildResolutionSteps, canQualityOptimize, optimizeLossySize } from './target-file-size.js';
import { normalizeFormat } from './format.js';

export function makeMainThreadCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function processImage(request: ProcessRequest, makeCanvas: CanvasFactory): Promise<ProcessResult> {
  const requestedFormat = request.requirements.format ?? normalizeFormat(request.file.type) ?? 'jpg';
  if (requestedFormat === 'jpg' && request.fitBackground.kind === 'transparent') {
    return { ok: false, code: 'requirement-conflict', message: 'JPG does not support transparency.', suggestedFormats: ['png', 'webp'] };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await decodeImage(request.file);
  } catch (error) {
    const code = error instanceof Error && error.message === 'unsupported-input' ? 'unsupported-input' : 'decode-failed';
    return {
      ok: false,
      code,
      message: code === 'unsupported-input'
        ? 'Supported formats are JPG, PNG and WebP.'
        : "The browser couldn't decode this image.",
    };
  }

  const initialTarget = resolveTargetDimensions(bitmap.width, bitmap.height, request.requirements, request.aspectMode);

  const renderAndEncode = async (width: number, height: number) => {
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) throw new Error('processing-failed');
    renderToContext(ctx, bitmap, bitmap.width, bitmap.height, {
      mode: request.aspectMode,
      crop: request.crop,
      background: request.fitBackground,
      targetWidth: width,
      targetHeight: height,
      flattenColor: requestedFormat === 'jpg' ? (request.jpgBackgroundColor ?? '#ffffff') : undefined,
    });

    const maxBytes = request.requirements.maxBytes;
    if (maxBytes !== undefined && canQualityOptimize(requestedFormat)) {
      return optimizeLossySize((q) => encodeCanvas(canvas, requestedFormat, q), maxBytes);
    }

    const blob = await encodeCanvas(canvas, requestedFormat, requestedFormat === 'png' ? undefined : 0.95);
    return blob.size <= (maxBytes ?? Number.POSITIVE_INFINITY)
      ? { ok: true as const, blob, quality: requestedFormat === 'png' ? undefined : 0.95 }
      : { ok: false as const, smallestBlob: blob, smallestBytes: blob.size };
  };

  try {
    let outputWidth = initialTarget.width;
    let outputHeight = initialTarget.height;
    let resolutionReducedFrom: { width: number; height: number } | undefined;
    let encoded = await renderAndEncode(outputWidth, outputHeight);

    if (!encoded.ok && request.allowDimensionReduction && request.requirements.dimensionsAreExact !== true) {
      for (const step of buildResolutionSteps(initialTarget.width, initialTarget.height)) {
        const candidate = await renderAndEncode(step.width, step.height);
        if (candidate.ok) {
          encoded = candidate;
          outputWidth = step.width;
          outputHeight = step.height;
          resolutionReducedFrom = { width: initialTarget.width, height: initialTarget.height };
          break;
        }
      }
    }

    if (!encoded.ok) {
      return {
        ok: false,
        code: 'file-size-unattainable',
        message: requestedFormat === 'png'
          ? 'PNG could not meet the requested file-size limit at the current dimensions.'
          : `The requested file-size limit could not be reached at ${initialTarget.width}×${initialTarget.height}.`,
        smallestBytes: encoded.smallestBytes,
        suggestedFormats: requestedFormat === 'png' ? ['webp', 'jpg'] : undefined,
      };
    }

    const actualFormat = normalizeFormat(encoded.blob.type);
    if (!actualFormat) {
      return { ok: false, code: 'encoder-format-mismatch', message: 'The browser returned an unsupported output format.' };
    }

    const complianceRequirements = resolutionReducedFrom
      ? { ...request.requirements, width: undefined, height: undefined, aspectRatio: request.requirements.aspectRatio }
      : request.requirements;
    const compliance = assessCompliance(complianceRequirements, {
      format: actualFormat,
      width: outputWidth,
      height: outputHeight,
      bytes: encoded.blob.size,
    });

    return {
      ok: true,
      image: {
        blob: encoded.blob,
        format: actualFormat,
        width: outputWidth,
        height: outputHeight,
        quality: encoded.quality,
        resolutionReducedFrom,
        metadataRemoved: true,
      },
      compliance,
    };
  } catch (error) {
    const code = error instanceof Error && error.message === 'encoder-format-mismatch'
      ? 'encoder-format-mismatch'
      : 'processing-failed';
    return {
      ok: false,
      code,
      message: code === 'encoder-format-mismatch'
        ? 'This browser did not produce the requested image format.'
        : 'We could not process this image.',
    };
  } finally {
    bitmap.close();
  }
}
