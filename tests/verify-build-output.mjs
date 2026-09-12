import { access } from 'node:fs/promises';

const requiredOutputs = [
  'dist/ph/eps-topik-photo/index.html',
  'dist/ph/eps-topik-passport/index.html',
];

for (const output of requiredOutputs) {
  try {
    await access(output);
  } catch {
    throw new Error(`Missing production build output: ${output}`);
  }
}
