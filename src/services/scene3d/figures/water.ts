import * as THREE from 'three';
import { canvasTexture, darkGlass, group, mat, mesh, paint, PI, rod, sideExtrude, topExtrude } from './materials';
import { sideDecals } from './parts';

export const waterBuilders: Record<string, () => THREE.Group> = {
  ship() {
    const hullTop: [number, number][] = [[-0.12, -0.48], [0.12, -0.48], [0.13, -0.3], [0.13, 0.2], [0.09, 0.38], [0, 0.5], [-0.09, 0.38], [-0.13, 0.2], [-0.13, -0.3]];
    const g = group(
      mesh(topExtrude(hullTop, 0.035), paint(0xb5192e)),
      mesh(topExtrude(hullTop, 0.07), paint(0x14213d), [0, 0.035, 0]),
      mesh(topExtrude(hullTop.map(([x, z]) => [x * 1.01, z * 1.005]), 0.006, 0), paint(0xf4f6f8), [0, 0.1, 0]),
      mesh(topExtrude([[-0.12, -0.46], [0.12, -0.46], [0.12, 0.2], [0.07, 0.36], [-0.07, 0.36], [-0.12, 0.2]], 0.004, 0), mat(0x9c6b3f, 0.7), [0, 0.106, 0]),
    );
    const windows = canvasTexture(512, 64, (c) => {
      c.fillStyle = '#2a3b55';
      for (let x = 4; x < 512; x += 14) c.fillRect(x, 22, 9, 20);
    });
    windows.wrapS = THREE.RepeatWrapping;
    const deck = paint(0xf6f7f9);
    const decks: [number, number, number, number][] = [[0.11, -0.4, 0.22, 0.05], [0.1, -0.36, 0.17, 0.05], [0.085, -0.3, 0.12, 0.045], [0.06, -0.2, 0.06, 0.045]];
    decks.forEach(([hw, z0, z1, h], i) => {
      const y = 0.11 + i * 0.05;
      g.add(mesh(topExtrude([[-hw, z0], [hw, z0], [hw, z1 - 0.03], [hw * 0.6, z1], [-hw * 0.6, z1], [-hw, z1 - 0.03]], h, 0.003), deck, [0, y, 0]));
      const len = z1 - z0 - 0.04, t = windows.clone();
      t.repeat.set(len * 4, 1);
      g.add(...sideDecals(t, hw + 0.004, len, h * 0.9, y + h / 2, (z0 + z1 - 0.03) / 2));
    });
    g.add(mesh(new THREE.BoxGeometry(0.13, 0.03, 0.05), darkGlass(), [0, 0.29, 0.03]));
    for (const z of [-0.22, -0.32]) {
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.11, 20), paint(0xd62828), [0, 0.37, z], [-0.15, 0, 0]));
      g.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.025, 20), mat(0x111111), [0, 0.425, z - 0.008], [-0.15, 0, 0]));
    }
    for (const s of [-1, 1]) for (let z = -0.32; z < 0.12; z += 0.085) {
      g.add(mesh(new THREE.CapsuleGeometry(0.012, 0.035, 4, 10), paint(0xff8c00), [s * 0.118, 0.19, z], [PI / 2, 0, 0]));
    }
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.004, 0.06), mat(0x4cc9f0, 0.1, 0.1), [0, 0.162, 0.1]));
    g.add(rod([0, 0.3, 0.06], [0, 0.4, 0.06], 0.004, mat(0xdddddd)));
    return g;
  },

  sailboat() {
    const hull = mesh(topExtrude([[-0.1, -0.38], [0.1, -0.38], [0.12, -0.1], [0.1, 0.18], [0, 0.42], [-0.1, 0.18], [-0.12, -0.1]], 0.09, 0.01), paint(0xf4f4f2));
    const stripe = mesh(topExtrude([[-0.104, -0.385], [0.104, -0.385], [0.124, -0.1], [0.104, 0.18], [0, 0.425], [-0.104, 0.18], [-0.124, -0.1]], 0.012, 0), paint(0x1d3557), [0, 0.06, 0]);
    const deck = mesh(topExtrude([[-0.09, -0.36], [0.09, -0.36], [0.1, -0.1], [0.085, 0.17], [0, 0.38], [-0.085, 0.17], [-0.1, -0.1]], 0.004, 0), mat(0xb08452, 0.7), [0, 0.095, 0]);
    const cabin = mesh(sideExtrude([[-0.22, 0.1], [0.08, 0.1], [0.04, 0.15], [-0.2, 0.15]], 0.12, 0.012), paint(0xf4f4f2));
    const portholes = mesh(sideExtrude([[-0.16, 0.115], [0.02, 0.115], [0.0, 0.135], [-0.15, 0.135]], 0.125, 0.004), darkGlass());
    const mastM = mat(0xc0c6cc, 0.3, 0.9);
    const sailM = mat(0xfffdf6, 0.85, 0, { side: THREE.DoubleSide });
    const sail = (pts: [number, number][], belly: number) => {
      const geo = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))), 12);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(Math.min(1, Math.max(0, (p.getX(i) - pts[0][0]) / 0.3)) * PI) * belly * (1 - p.getY(i) / 1.3));
      geo.rotateY(-PI / 2);
      return mesh(geo, sailM);
    };
    const g = group(hull, stripe, deck, cabin, portholes,
      rod([0, 0.1, 0.06], [0, 0.95, 0.06], 0.008, mastM), rod([0, 0.22, 0.05], [0, 0.22, -0.32], 0.006, mastM),
      sail([[0.05, 0.23], [-0.32, 0.23], [0.05, 0.92]], 0.05), sail([[0.4, 0.12], [0.08, 0.15], [0.07, 0.86]], 0.035),
      rod([0, 0.95, 0.06], [0, 0.11, 0.41], 0.002, mat(0x333333)),
    );
    g.add(mesh(new THREE.ConeGeometry(0.02, 0.05, 3), paint(0xe63946), [0, 0.97, 0.06], [0, 0, -PI / 2], [1, 1, 0.2]));
    return g;
  },
};
