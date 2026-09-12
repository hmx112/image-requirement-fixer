export interface PagePreset {
  title: string;
  heading: string;
  description: string;
  format?: 'jpg' | 'png' | 'webp';
  focus?: 'all' | 'size' | 'dimensions' | 'format' | 'metadata';
  width?: number;
  height?: number;
  maxSize?: number;
  maxSizeUnit?: 'KB' | 'MB';
  referenceUrl?: string;
  referenceLabel?: string;
  verificationText?: string;
}

const epsReference = {
  referenceUrl: 'https://eps.dmw.gov.ph/',
  referenceLabel: 'Official DMW EPS requirements',
  verificationText: 'Verified against the official DMW EPS site on September 12, 2026.',
} as const;

const presets: Record<string, PagePreset> = {
  '/': { title: 'Image Requirement Fixer', heading: 'Fix Your Image for Upload', description: 'Size, dimensions, format — all in one.', focus: 'all' },
  '/image-compressor/': { title: 'Compress Image to a Maximum File Size', heading: 'Compress an image to the size limit you need', description: 'Enter the maximum KB or MB and keep the highest available quality.', focus: 'size' },
  '/image-resizer/': { title: 'Resize Image to Exact Dimensions', heading: 'Resize an image to exact pixel dimensions', description: 'Set width and height, then choose how mismatched aspect ratios are handled.', focus: 'dimensions' },
  '/image-format-converter/': { title: 'Image Format Converter', heading: 'Convert JPG, PNG and WebP locally', description: 'Convert formats without uploading your image.', focus: 'format' },
  '/webp-to-jpg/': { title: 'WebP to JPG Converter', heading: 'Convert WebP to JPG locally', description: 'Turn a WebP image into JPG in your browser.', format: 'jpg', focus: 'format' },
  '/remove-image-metadata/': { title: 'Remove Image Metadata', heading: 'Re-encode an image without copying original metadata', description: 'Create a fresh JPG, PNG or WebP file locally in your browser.', focus: 'metadata' },
  '/ph/eps-topik-photo/': {
    title: 'EPS-TOPIK Photo 300x400 JPG 13KB or Less',
    heading: 'EPS-TOPIK ID Photo: 300×400 JPG, 13KB or less',
    description: 'Prepare the Philippines DMW EPS-TOPIK registration photo at exactly 300×400 px, JPG, and 13 KB or below. Your image stays on your device.',
    format: 'jpg',
    width: 300,
    height: 400,
    maxSize: 13,
    maxSizeUnit: 'KB',
    focus: 'all',
    ...epsReference,
  },
  '/ph/eps-topik-passport/': {
    title: 'EPS-TOPIK Passport 800x600 JPG 90KB or Less',
    heading: 'EPS-TOPIK Passport Scan: 800×600 JPG, 90KB or less',
    description: 'Prepare the Philippines DMW EPS-TOPIK passport scan at exactly 800×600 px, JPG, and 90 KB or below. Your image stays on your device.',
    format: 'jpg',
    width: 800,
    height: 600,
    maxSize: 90,
    maxSizeUnit: 'KB',
    focus: 'all',
    ...epsReference,
  },
};

export function getPagePreset(pathname: string): PagePreset {
  return presets[pathname] ?? presets['/']!;
}
