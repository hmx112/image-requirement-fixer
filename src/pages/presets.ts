export interface PagePreset {
  title: string;
  heading: string;
  description: string;
  format?: 'jpg' | 'png' | 'webp';
  focus?: 'all' | 'size' | 'dimensions' | 'format' | 'metadata';
}

const presets: Record<string, PagePreset> = {
  '/': { title: 'Image Requirement Fixer', heading: 'Fix images that don’t meet upload requirements', description: 'Match file size, dimensions and format in one flow.', focus: 'all' },
  '/image-compressor/': { title: 'Compress Image to a Maximum File Size', heading: 'Compress an image to the size limit you need', description: 'Enter the maximum KB or MB and keep the highest available quality.', focus: 'size' },
  '/image-resizer/': { title: 'Resize Image to Exact Dimensions', heading: 'Resize an image to exact pixel dimensions', description: 'Set width and height, then choose how mismatched aspect ratios are handled.', focus: 'dimensions' },
  '/image-format-converter/': { title: 'Image Format Converter', heading: 'Convert JPG, PNG and WebP locally', description: 'Convert formats without uploading your image.', focus: 'format' },
  '/webp-to-jpg/': { title: 'WebP to JPG Converter', heading: 'Convert WebP to JPG locally', description: 'Turn a WebP image into JPG in your browser.', format: 'jpg', focus: 'format' },
  '/remove-image-metadata/': { title: 'Remove Image Metadata', heading: 'Re-encode an image without copying original metadata', description: 'Create a fresh JPG, PNG or WebP file locally in your browser.', focus: 'metadata' },
};

export function getPagePreset(pathname: string): PagePreset {
  return presets[pathname] ?? presets['/']!;
}
