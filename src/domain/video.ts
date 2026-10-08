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
