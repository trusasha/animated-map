import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EARTH_RADIUS as R } from '../../../domain/geo';
import type { OverlayContext, ProjectionData } from '../../../domain/overlay3d';
import { FIG_PX, type TLeg } from '../../../domain/timeline';
import { animateFigure } from '../figures/animate';
import { updateArcs, type Arc } from './arcs';
import { enuToGlobe, enuToMerc, globeWorld, mercWorld } from './projection';

const rad = Math.PI / 180;

export interface OverlayScene {
  renderer?: THREE.WebGLRenderer;
  figures: Map<string, THREE.Group>;
  figScene: THREE.Scene;
  arcScene: THREE.Scene;
  camera: THREE.Camera;
  /** hides arc parts behind the globe */
  occluder: THREE.Mesh;
  arcs: Arc[];
  legs: TLeg[];
}

/** draws arcs, then the current figure, into the map's GL context with the map's own matrices */
export function renderOverlay(s: OverlayScene, gl: WebGL2RenderingContext, data: ProjectionData, ctx: OverlayContext) {
  const f = ctx.frame, renderer = s.renderer;
  if (!renderer) return;
  for (const g of s.figures.values()) g.visible = false;
  if (!f && !s.arcs.length) return;

  const g = data.projectionTransition ?? 0;
  const merc = new THREE.Matrix4().fromArray(Array.from(g > 0 ? data.fallbackMatrix : data.mainMatrix));
  const globe = g > 0 ? new THREE.Matrix4().fromArray(Array.from(data.mainMatrix)) : null;
  const center = ctx.center;
  const [lng, lat] = f ? f.pos : center;
  // pick the mercator world copy the camera is looking at
  const copyLng = lng + Math.round((center[0] - lng) / 360) * 360;

  if (!s.figScene.environment) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    s.figScene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  renderer.resetState();
  renderer.setViewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  renderer.clearDepth();
  const elev = ctx.elevation;
  // arcs ride on a straight ramp between the airports' ground heights, not on every ridge below
  const ramp = (leg: TLeg) => { const a = elev(leg.path[0]), b = elev(leg.path.at(-1)!); return (frac: number) => a + (b - a) * frac; };

  if (s.arcs.length) {
    const useGlobe = !!globe && g >= 0.5;
    const world = (x: number, y: number, a: number) => useGlobe ? globeWorld(x, y, a) : mercWorld(x - lng + copyLng, y, a);
    const origin = world(lng, lat, 0);
    s.camera.projectionMatrix.copy(useGlobe ? globe! : merc).multiply(new THREE.Matrix4().makeTranslation(origin));
    s.camera.projectionMatrixInverse.copy(s.camera.projectionMatrix).invert();
    s.occluder.visible = useGlobe;
    s.occluder.position.copy(origin).negate();
    updateArcs(s.arcs, gl, { world, origin, ramp, frame: f, selected: ctx.selected, pixelRatio: ctx.pixelRatio });
    renderer.render(s.arcScene, s.camera);
    renderer.clearDepth();
  }

  const fig = f && s.figures.get(f.figure);
  if (!f || !fig || f.scale <= 0.001) return;
  const P = merc.clone().multiply(enuToMerc(copyLng, lat));
  if (globe) {
    const pg = globe.clone().multiply(enuToGlobe(lng, lat));
    P.elements.forEach((v, i) => { P.elements[i] = v + (pg.elements[i] - v) * g; });
  }
  s.camera.projectionMatrix.copy(P);
  s.camera.projectionMatrixInverse.copy(P).invert();

  const th = f.heading * rad + f.spin, c = Math.max(-25, Math.min(25, f.climb)) * rad;
  const fwd = new THREE.Vector3(Math.cos(c) * Math.sin(th), Math.cos(c) * Math.cos(th), Math.sin(c));
  const up = new THREE.Vector3(-Math.sin(c) * Math.sin(th), -Math.sin(c) * Math.cos(th), Math.cos(c));
  const right = up.clone().cross(fwd);
  const size = (FIG_PX * 2 * Math.PI * R * Math.cos(lat * rad)) / (512 * 2 ** ctx.zoom);
  const leg = s.legs[f.legIndex];
  const ground = f.mode === 'air' && leg.mode === 'air' ? ramp(leg)(f.progress) : elev(f.pos);
  fig.matrix.makeBasis(right, up, fwd).scale(new THREE.Vector3().setScalar(size * f.scale)).setPosition(0, 0, f.alt + ground);
  fig.matrixWorldNeedsUpdate = true;
  fig.visible = true;
  animateFigure(fig, ctx.time);
  renderer.render(s.figScene, s.camera);
}
