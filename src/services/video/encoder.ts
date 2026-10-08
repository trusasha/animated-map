import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { VideoError } from './errors';

export interface Mp4Encoder {
  /** queues one frame; resolves once the encoder's backlog is small enough for the next one */
  encode(source: CanvasImageSource, index: number): Promise<void>;
  finish(): Promise<Blob>;
  close(): void;
}

const CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640033'];

async function pickConfig(width: number, height: number, fps: number) {
  if (typeof VideoEncoder === 'undefined') throw new VideoError('codec-unsupported');
  for (const codec of CODECS) {
    const cfg: VideoEncoderConfig = { codec, width, height, bitrate: 12_000_000, framerate: fps, avc: { format: 'avc' } };
    if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg;
  }
  throw new VideoError('codec-unsupported');
}

/** H.264 in an in-memory MP4 */
export async function createMp4Encoder(width: number, height: number, fps: number): Promise<Mp4Encoder> {
  const cfg = await pickConfig(width, height, fps);
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width, height, frameRate: fps }, fastStart: 'in-memory' });
  let failure: unknown;
  const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failure = e; } });
  encoder.configure(cfg);
  return {
    async encode(source, index) {
      if (failure) throw failure;
      const frame = new VideoFrame(source, { timestamp: Math.round((index * 1e6) / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(frame, { keyFrame: index % (fps * 2) === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
    },
    async finish() {
      await encoder.flush();
      muxer.finalize();
      return new Blob([muxer.target.buffer], { type: 'video/mp4' });
    },
    close() {
      if (encoder.state !== 'closed') encoder.close();
    },
  };
}
