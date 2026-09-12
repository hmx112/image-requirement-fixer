import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        compressor: resolve(root, 'image-compressor/index.html'),
        resizer: resolve(root, 'image-resizer/index.html'),
        converter: resolve(root, 'image-format-converter/index.html'),
        webpToJpg: resolve(root, 'webp-to-jpg/index.html'),
        metadata: resolve(root, 'remove-image-metadata/index.html'),
        epsTopikPhoto: resolve(root, 'ph/eps-topik-photo/index.html'),
        epsTopikPassport: resolve(root, 'ph/eps-topik-passport/index.html'),
      },
    },
  },
});
