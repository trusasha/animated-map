import type { Mode } from '../../../domain/types';

/** line-dasharray per mode, in line widths; null = solid */
export const DASH: Record<Mode, [number, number] | null> = { ground: null, water: [2, 1.6], air: [0.1, 2] };

/** a leg whose route is still being built */
export const PENDING_DASH: [number, number] = [0.1, 2.5];
