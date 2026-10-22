import { createMp4Encoder } from './encoder';
import { VideoError } from './errors';

export interface RenderVideoOptions {
  width: number;
  height: number;
  /** seconds of timeline to cover */
  duration: number;
  fps?: number;
  /** draws timeline second `t` into `ctx` (a width x height canvas); `progress` is 0..1 across the video */
  renderFrame(ctx: CanvasRenderingContext2D, t: number, progress: number): Promise<void>;
  /** called after each encoded frame with 0..1 */
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
}

export const FPS = 30;

/** frame loop independent of any map: renderFrame paints, the encoder muxes */
export async function renderVideo({ width, height, duration, fps = FPS, renderFrame, onProgress, signal }: RenderVideoOptions): Promise<Blob> {
  const frames = Math.ceil(duration * fps) + 1;
  const encoder = await createMp4Encoder(width, height, fps, frames);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    for (let i = 0; i < frames; i++) {
      if (signal?.aborted) throw new VideoError('aborted');
      await renderFrame(ctx, i / fps, i / (frames - 1));
      await encoder.encode(canvas, i);
      onProgress?.((i + 1) / frames);
    }
    return await encoder.finish();
  } finally {
    encoder.close();
  }
}
