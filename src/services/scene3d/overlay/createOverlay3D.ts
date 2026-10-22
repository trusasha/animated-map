import * as THREE from 'three';
import { FIGURES } from '../../../domain/figures';
import type { MapOverlay3D } from '../../../domain/overlay3d';
import type { TLeg } from '../../../domain/timeline';
import { figureKey } from '../figures/glb';
import { createFigure } from '../figures/registry';
import { createArcs, removeArcs } from './arcs';
import { renderOverlay, type OverlayScene } from './render';

/** figures and air arcs drawn into a map's GL context; the map service hosts it as a custom layer */
export function createOverlay3D(opts: { onFigureError?: (figure: string, error: unknown) => void } = {}): MapOverlay3D {
  const s: OverlayScene = {
    figures: new Map(), figScene: new THREE.Scene(), arcScene: new THREE.Scene(), camera: new THREE.Camera(),
    occluder: new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.MeshBasicMaterial({ colorWrite: false })),
    arcs: [], legs: [],
  };
  const loading = new Map<string, Promise<void>>();
  s.figScene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(0.4, -0.6, 1);
  s.figScene.add(sun);
  s.occluder.renderOrder = -1;
  s.arcScene.add(s.occluder);

  return {
    attach(canvas, gl) {
      // style reloads re-attach on the same canvas/context
      s.renderer ??= new THREE.WebGLRenderer({ canvas, context: gl });
      s.renderer.autoClear = false;
    },
    async setLegs(legs: TLeg[]) {
      for (const { figure, mode } of legs) {
        const key = figureKey(figure);
        const onError = (e: unknown) => opts.onFigureError?.(figure, e);
        if (!loading.has(key)) loading.set(key, createFigure(figure, undefined, FIGURES[mode][0], onError).then((g) => {
          g.matrixAutoUpdate = false;
          g.visible = false;
          g.traverse((o) => { o.frustumCulled = false; });
          const old = s.figures.get(figure);
          if (old) s.figScene.remove(old);
          s.figures.set(figure, g);
          s.figScene.add(g);
        }));
      }
      await Promise.all(legs.map((l) => loading.get(figureKey(l.figure))));
      removeArcs(s.arcScene, s.arcs);
      s.legs = legs;
      s.arcs = createArcs(legs);
      for (const a of s.arcs) s.arcScene.add(a.planned, a.casing, a.done);
    },
    render: (gl, proj, ctx) => renderOverlay(s, gl, proj, ctx),
    dispose() {
      removeArcs(s.arcScene, s.arcs);
      s.arcs = [];
      s.renderer?.dispose();
      s.renderer = undefined;
    },
  };
}
