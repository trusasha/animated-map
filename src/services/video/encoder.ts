import { Muxer, StreamTarget } from 'mp4-muxer';
import { avcLevel } from '../../domain/video';
import { BlobSink } from './blobSink';
import { VideoError } from './errors';

/** how far the encoder lags: frames handed in whose encoded chunk has not come out yet */
export interface EncoderStats { inFlight: number; peakInFlight: number; flushes: number }

export interface Mp4Encoder {
  /** queues one frame; resolves once the encoder's backlog is small enough for the next one */
  encode(source: CanvasImageSource, index: number): Promise<void>;
  stats(): EncoderStats;
  finish(): Promise<Blob>;
  close(): void;
}

const PROFILES = ['6400', '4d00', '42e0'];
/**
 * each frame the encoder still holds is a full-size pixel buffer (8 MB at 1080×1920). WebKit's hardware encoder keeps
 * frames beyond what encodeQueueSize reports, so the backlog is counted by chunks out, not by the queue
 */
const MAX_IN_FLIGHT = 8;
/** an encoder sitting on frames this long (lookahead) is drained with flush() */
const STALL_MS = 250;
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
  let failure: unknown, submitted = 0, emitted = 0, peakInFlight = 0, flushes = 0;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => { emitted++; muxer.addVideoChunk(chunk, meta); },
    error: (e) => { failure = e; },
  });
  encoder.configure(cfg);
  return {
    async encode(source, index) {
      if (failure) throw failure;
      const frame = new VideoFrame(source, { timestamp: Math.round((index * 1e6) / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(frame, { keyFrame: index % (fps * 2) === 0 });
      frame.close();
      submitted++;
      peakInFlight = Math.max(peakInFlight, submitted - emitted);
      const since = performance.now();
      while (submitted - emitted > MAX_IN_FLIGHT || encoder.encodeQueueSize > MAX_IN_FLIGHT) {
        if (failure) throw failure;
        if (performance.now() - since > STALL_MS) { flushes++; await encoder.flush(); break; }
        await new Promise((r) => setTimeout(r, 4));
      }
    },
    stats: () => ({ inFlight: submitted - emitted, peakInFlight, flushes }),
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
