export type Handle = 'from' | 'to';
export type Range = { from: number; to: number };

const PAGE = 3;

export const clampRange = (count: number, from: number, to: number): Range => {
  const last = Math.max(0, count - 1);
  const f = Math.min(Math.max(0, Math.round(from)), Math.max(0, last - 1));
  const t = Math.min(Math.max(Math.round(to), f + 1), last);
  return { from: f, to: t };
};

export const nearestHandle = (range: Range, idx: number): Handle =>
  Math.abs(idx - range.from) <= Math.abs(idx - range.to) ? 'from' : 'to';

export const dragTo = (handle: Handle, idx: number, range: Range, count: number): Range =>
  handle === 'from'
    ? clampRange(count, Math.min(idx, range.to - 1), range.to)
    : clampRange(count, range.from, Math.max(idx, range.from + 1));

export const keyStep = (handle: Handle, key: string, range: Range, count: number): Range | null => {
  const cur = range[handle];
  const target = {
    ArrowUp: cur - 1,
    ArrowLeft: cur - 1,
    ArrowDown: cur + 1,
    ArrowRight: cur + 1,
    PageUp: cur - PAGE,
    PageDown: cur + PAGE,
    Home: 0,
    End: count - 1,
  }[key];
  if (target === undefined) return null;
  return dragTo(handle, target, range, count);
};
