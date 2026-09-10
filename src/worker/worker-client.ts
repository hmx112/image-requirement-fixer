import type { ProcessRequest, ProcessResult, WorkerRequest, WorkerResponse } from '../core/types.js';
import { makeMainThreadCanvas, processImage } from '../core/process-image.js';

export async function processWithBestAvailablePath(request: ProcessRequest): Promise<ProcessResult> {
  if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    try {
      return await new Promise<ProcessResult>((resolve, reject) => {
        const worker = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' });
        const id = crypto.randomUUID();
        const timeout = window.setTimeout(() => {
          worker.terminate();
          reject(new Error('worker-timeout'));
        }, 60_000);
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.id !== id) return;
          clearTimeout(timeout);
          worker.terminate();
          resolve(event.data.result);
        };
        worker.onerror = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(event.error ?? new Error(event.message));
        };
        const message: WorkerRequest = { id, type: 'process', payload: request };
        worker.postMessage(message);
      });
    } catch {
      // Worker failures fall back locally; files are never uploaded.
    }
  }
  return processImage(request, makeMainThreadCanvas);
}
