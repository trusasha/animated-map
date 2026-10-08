export type VideoErrorCode = 'codec-unsupported' | 'aborted';

export class VideoError extends Error {
  constructor(readonly code: VideoErrorCode, message: string = code) {
    super(message);
    this.name = 'VideoError';
  }
}

export const isVideoError = (e: unknown, code?: VideoErrorCode): e is VideoError =>
  e instanceof VideoError && (code === undefined || e.code === code);
