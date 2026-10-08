import type { LngLat } from './types';
import type { Frame, TLeg } from './timeline';

/** column-major 4×4 matrices as MapLibre hands them out; projectionTransition 0 = mercator, 1 = globe */
export interface ProjectionData { mainMatrix: ArrayLike<number>; fallbackMatrix: ArrayLike<number>; projectionTransition?: number }

export interface OverlayContext {
  frame?: Frame; time: number; zoom: number; center: LngLat; pixelRatio: number;
  selected: number | null; elevation(p: LngLat): number;
}

/** the 3D layer drawn into the map's own GL context; implemented by scene3d, hosted by the map service */
export interface MapOverlay3D {
  attach(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext): void;
  setLegs(legs: TLeg[]): Promise<void>;
  render(gl: WebGL2RenderingContext, proj: ProjectionData, ctx: OverlayContext): void;
  dispose(): void;
}
