export type ImageFormat = 'jpg' | 'png' | 'webp';
export type AspectMode = 'crop' | 'fit' | 'stretch';
export type FitBackgroundKind = 'white' | 'black' | 'custom' | 'transparent' | 'blur';

export interface Ratio {
  width: number;
  height: number;
}

export interface Requirements {
  format?: ImageFormat;
  width?: number;
  height?: number;
  aspectRatio?: Ratio;
  maxBytes?: number;
  dimensionsAreExact?: boolean;
}

export interface SourceImageInfo {
  name: string;
  mime: string;
  format: ImageFormat;
  width: number;
  height: number;
  bytes: number;
  hasTransparency?: boolean;
}

export interface CropState {
  centerX: number;
  centerY: number;
  zoom: number;
}

export interface FitBackground {
  kind: FitBackgroundKind;
  color?: string;
}

export interface ProcessRequest {
  file: File;
  requirements: Requirements;
  aspectMode: AspectMode;
  crop: CropState;
  fitBackground: FitBackground;
  jpgBackgroundColor?: string;
  allowDimensionReduction?: boolean;
}

export interface ProcessedImage {
  blob: Blob;
  format: ImageFormat;
  width: number;
  height: number;
  quality?: number;
  resolutionReducedFrom?: { width: number; height: number };
  metadataRemoved: true;
}

export interface ComplianceItem {
  key: 'format' | 'width' | 'height' | 'aspectRatio' | 'maxBytes';
  passed: boolean;
  required: string;
  actual: string;
}

export interface ComplianceReport {
  passed: boolean;
  items: ComplianceItem[];
}

export type ProcessFailureCode =
  | 'unsupported-input'
  | 'decode-failed'
  | 'requirement-conflict'
  | 'file-size-unattainable'
  | 'encoder-format-mismatch'
  | 'processing-failed';

export type ProcessResult =
  | { ok: true; image: ProcessedImage; compliance: ComplianceReport }
  | { ok: false; code: ProcessFailureCode; message: string; smallestBytes?: number; suggestedFormats?: ImageFormat[] };

export type CanvasFactory = (width: number, height: number) => OffscreenCanvas | HTMLCanvasElement;

export type WorkerProcessPayload = ProcessRequest;
export type WorkerRequest = { id: string; type: 'process'; payload: WorkerProcessPayload };
export type WorkerResponse = { id: string; type: 'result'; result: ProcessResult };
