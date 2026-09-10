import type { AppState } from './app-controller.js';
import { resolveTargetDimensions } from '../core/dimensions.js';
import { renderToContext } from '../core/render.js';

export class PreviewController {
  private bitmap?: ImageBitmap;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance?: number;

  constructor(private canvas: HTMLCanvasElement, private onCropChange: (centerX: number, centerY: number, zoom?: number) => void) {
    canvas.addEventListener('pointerdown', (event) => {
      canvas.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.updatePinchDistance();
    });
    canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
    const end = (event: PointerEvent) => { this.pointers.delete(event.pointerId); this.updatePinchDistance(); };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }

  async setFile(file: File): Promise<{ width: number; height: number }> {
    this.bitmap?.close();
    this.bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { width: this.bitmap.width, height: this.bitmap.height };
  }

  render(state: AppState): void {
    if (!this.bitmap || !state.source) return;
    const target = resolveTargetDimensions(state.source.width, state.source.height, state.requirements, state.aspectMode);
    const maxWidth = 720; const maxHeight = 560;
    const scale = Math.min(maxWidth / target.width, maxHeight / target.height, 1);
    const width = Math.max(1, Math.round(target.width * scale));
    const height = Math.max(1, Math.round(target.height * scale));
    this.canvas.width = width; this.canvas.height = height;
    const ctx = this.canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    renderToContext(ctx, this.bitmap, this.bitmap.width, this.bitmap.height, {
      mode: state.aspectMode, crop: state.crop, background: state.background,
      targetWidth: width, targetHeight: height,
      flattenColor: state.requirements.format === 'jpg' ? state.jpgBackgroundColor : undefined,
    });
  }

  private handlePointerMove(event: PointerEvent): void {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    this.pointers.set(event.pointerId, next);
    if (this.pointers.size >= 2) {
      const values = [...this.pointers.values()];
      const distance = Math.hypot(values[0]!.x - values[1]!.x, values[0]!.y - values[1]!.y);
      if (this.pinchDistance && this.pinchDistance > 0) this.onCropChange(NaN, NaN, distance / this.pinchDistance);
      this.pinchDistance = distance;
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.onCropChange(-(next.x - previous.x) / Math.max(1, rect.width), -(next.y - previous.y) / Math.max(1, rect.height));
  }

  private updatePinchDistance(): void {
    if (this.pointers.size < 2) { this.pinchDistance = undefined; return; }
    const values = [...this.pointers.values()];
    this.pinchDistance = Math.hypot(values[0]!.x - values[1]!.x, values[0]!.y - values[1]!.y);
  }
}
