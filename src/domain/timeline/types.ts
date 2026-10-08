import type { LngLat, Mode } from '../types';

export type Bounds = [number, number, number, number];
export type LegInput = { mode: Mode; figure: string; path: LngLat[]; speed?: number; smooth?: number; color?: string };
export type FitFn = (b: Bounds) => { zoom: number; center: LngLat };

export interface TLeg {
  mode: Mode; figure: string; from: string; to: string;
  path: LngLat[]; cum: number[]; length: number; peak: number;
  start: number; end: number; zMid: number; zClose: number; pitch: number;
  color?: string;
}

export interface Timeline {
  legs: TLeg[]; duration: number;
  overview: { zoom: number; center: LngLat };
}

export interface Frame {
  legIndex: number;
  /** distance fraction travelled on legs[legIndex] */
  progress: number;
  pos: LngLat; alt: number; heading: number; climb: number;
  figure: string; mode: Mode; scale: number; spin: number;
  camera: { center: LngLat; zoom: number; pitch: number };
  label: string;
}
