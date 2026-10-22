import { Muxer, StreamTarget } from 'mp4-muxer';
import { avcLevel } from '../../domain/video';
import { BlobSink } from './blobSink';
import { VideoError } from './errors';

export interface Mp4Encoder {
  /** queues one frame; resolves once the encoder's backlog is small enough for the next one */
  encode(source: CanvasImageSource, index: number): Promise<void>;
  finish(): Promise<Blob>;
  close(): void;
}

const PROFILES = ['6400', '4d00', '42e0'];
const hex = (n: number) => n.toString(16).padStart(2, '0');

async function pickConfig(width: number, height: number, fps: number) {
  if (typeof VideoEncoder === 'undefined') throw new VideoError('codec-unsupported');
  const level = avcLevel(width, height);
  for (const codec of [...PROFILES.map((p) => `avc1.${p}${hex(level)}`), 'avc1.640033']) {
    const cfg: VideoEncoderConfig = { codec, width, height, bitrate: 12_000_000, framerate: fps, avc: { format: 'avc' } };
    if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg;
  }
  throw new VideoError('codec-unsupported');
}

/**
 * H.264 in a regular fast-start MP4 (moov first, so players and uploads start without reading the whole file). The
 * moov space is reserved up front from the frame count, so encoded frames stream out to a BlobSink as they come
 * instead of piling up in the tab's memory until the end.
 */
export async function createMp4Encoder(width: number, height: number, fps: number, frames: number): Promise<Mp4Encoder> {
  const cfg = await pickConfig(width, height, fps);
  const sink = new BlobSink();
  const muxer = new Muxer({
    target: new StreamTarget({ onData: (data, position) => sink.write(data, position) }),
    video: { codec: 'avc', width, height, frameRate: fps }, fastStart: { expectedVideoChunks: frames },
  });
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
      return sink.blob('video/mp4');
    },
    close() {
      if (encoder.state !== 'closed') encoder.close();
    },
  };
}
