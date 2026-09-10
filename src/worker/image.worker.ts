/// <reference lib="webworker" />
import type { WorkerRequest, WorkerResponse } from '../core/types.js';
import { processImage } from '../core/process-image.js';

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type !== 'process') return;
  const result = await processImage(message.payload, (width, height) => new OffscreenCanvas(width, height));
  const response: WorkerResponse = { id: message.id, type: 'result', result };
  self.postMessage(response);
};
