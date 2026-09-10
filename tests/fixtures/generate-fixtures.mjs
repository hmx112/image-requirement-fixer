import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const out = path.resolve('tests/fixtures/generated');
await fs.mkdir(out, { recursive: true });

await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 90, g: 140, b: 210 } } }).jpeg({ quality: 92 }).toFile(path.join(out, 'landscape.jpg'));
await sharp({ create: { width: 800, height: 1200, channels: 3, background: { r: 180, g: 110, b: 90 } } }).jpeg({ quality: 92 }).toFile(path.join(out, 'portrait.jpg'));
await sharp({ create: { width: 900, height: 900, channels: 3, background: { r: 100, g: 180, b: 120 } } }).jpeg({ quality: 92 }).toFile(path.join(out, 'square.jpg'));
await sharp({ create: { width: 900, height: 600, channels: 4, background: { r: 30, g: 140, b: 210, alpha: 0.55 } } }).png().toFile(path.join(out, 'transparent.png'));
await sharp({ create: { width: 1000, height: 700, channels: 3, background: { r: 130, g: 80, b: 190 } } }).webp({ quality: 92 }).toFile(path.join(out, 'sample.webp'));
await sharp({ create: { width: 8000, height: 6000, channels: 3, background: { r: 120, g: 130, b: 140 } } }).jpeg({ quality: 88 }).toFile(path.join(out, 'large-photo.jpg'));

await sharp({ create: { width: 1200, height: 600, channels: 3, background: { r: 0, g: 0, b: 0 } } })
  .composite([
    { input: Buffer.from('<svg width="400" height="600"><rect width="400" height="600" fill="red"/></svg>'), left: 0, top: 0 },
    { input: Buffer.from('<svg width="400" height="600"><rect width="400" height="600" fill="green"/></svg>'), left: 400, top: 0 },
    { input: Buffer.from('<svg width="400" height="600"><rect width="400" height="600" fill="blue"/></svg>'), left: 800, top: 0 },
  ])
  .png()
  .toFile(path.join(out, 'crop-regions.png'));

await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 160, g: 160, b: 160 } } })
  .jpeg({ quality: 92 })
  .withMetadata({ orientation: 6 })
  .toFile(path.join(out, 'exif-rotated.jpg'));

await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 160, g: 160, b: 160 } } })
  .jpeg({ quality: 92 })
  .withExif({
    IFD0: { ImageDescription: 'IRF_GPS_FIXTURE_MARKER' },
    GPS: {
      GPSLatitudeRef: 'N', GPSLatitude: '37/1 33/1 0/1',
      GPSLongitudeRef: 'E', GPSLongitude: '126/1 59/1 0/1',
    },
  })
  .toFile(path.join(out, 'gps-metadata.jpg'));

const expected = [
  'landscape.jpg', 'portrait.jpg', 'square.jpg', 'transparent.png', 'sample.webp',
  'exif-rotated.jpg', 'gps-metadata.jpg', 'large-photo.jpg', 'crop-regions.png',
];
for (const name of expected) await fs.stat(path.join(out, name));
console.log(`Generated ${expected.length} fixtures in ${out}`);
