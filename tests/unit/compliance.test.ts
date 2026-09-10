import { expect, it } from 'vitest';
import { assessCompliance } from '../../src/core/compliance';

const required = { format: 'jpg' as const, width: 600, height: 600, maxBytes: 200000 };

it.each([[199999,true],[200000,true],[200001,false]])('checks max bytes exactly: %s', (bytes, expected) => {
  expect(assessCompliance(required, { format: 'jpg', width: 600, height: 600, bytes }).passed).toBe(expected);
});
it('fails if the actual encoder MIME normalized format differs', () => {
  expect(assessCompliance(required, { format: 'png', width: 600, height: 600, bytes: 100000 }).passed).toBe(false);
});
it('fails exact dimensions even if only one pixel is wrong', () => {
  expect(assessCompliance(required, { format: 'jpg', width: 599, height: 600, bytes: 100000 }).passed).toBe(false);
});
