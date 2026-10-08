import type { ExportLongSide, Format } from './types';

/** width : height of each export format */
export const ASPECTS: Record<Format, [number, number]> = { '9:16': [9, 16], '4:5': [4, 5], '1:1': [1, 1], '16:9': [16, 9] };
export const EXPORT_LONG_SIDES: ExportLongSide[] = [1080, 1920];

const even = (v: number) => Math.max(2, Math.round(v / 2) * 2);

/** the long side is exact, the short one follows the aspect; both even for the encoder */
export function videoSize(format: Format, longSide: number): { width: number; height: number } {
  const [w, h] = ASPECTS[format], long = even(longSide), short = even((long * Math.min(w, h)) / Math.max(w, h));
  return w >= h ? { width: long, height: short } : { width: short, height: long };
}

/** H.264 levels (level_idc) with their max frame size in 16x16 macroblocks */
const AVC_LEVELS: [number, number][] = [[0x1f, 3600], [0x28, 8192], [0x2a, 8704], [0x32, 22080], [0x33, 36864]];

/** lowest H.264 level_idc whose frame-size limit fits the frame */
export function avcLevel(width: number, height: number): number {
  const mbs = Math.ceil(width / 16) * Math.ceil(height / 16);
  return (AVC_LEVELS.find(([, max]) => mbs <= max) ?? AVC_LEVELS[AVC_LEVELS.length - 1])[0];
}
