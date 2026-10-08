import * as THREE from 'three';
import { canvasTexture, group, latheZ, lamp, mat, mesh, paint, PI, rod, rubber } from './materials';

export const airBuilders: Record<string, () => THREE.Group> = {
  airplane() {
    const L = 1, R = 0.058, Y = 0.1;
    const livery = canvasTexture(1024, 512, (c) => {
      c.fillStyle = '#f7f9fb'; c.fillRect(0, 0, 1024, 512);
      c.fillStyle = '#1d4e89'; c.fillRect(0, 0, 1024 * 0.13, 512); c.fillRect(1024 * 0.87, 0, 1024 * 0.13, 512);
      c.fillStyle = '#e63946'; c.fillRect(1024 * 0.13, 0, 14, 512); c.fillRect(1024 * 0.87 - 14, 0, 14, 512);
      c.fillStyle = '#1f2a37';
      for (const x of [0.29, 0.71]) {
        for (let y = 0.2; y < 0.78; y += 0.016) { c.beginPath(); c.roundRect(1024 * x - 7, 512 * (1 - y) - 4, 14, 8, 4); c.fill(); }
        c.fillRect(1024 * x - 14, 512 * 0.62, 28, 22);
      }
      c.fillStyle = '#121a24';
      c.beginPath(); c.moveTo(1024 * 0.3, 512 * 0.065); c.lineTo(1024 * 0.7, 512 * 0.065); c.lineTo(1024 * 0.66, 512 * 0.09); c.lineTo(1024 * 0.34, 512 * 0.09); c.fill();
    });
    const body = mat(0xffffff, 0.3, 0.2, { map: livery, clearcoat: 0.8, clearcoatRoughness: 0.1 });
    const white = paint(0xf2f4f7), accent = paint(0x1d4e89), red = paint(0xe63946), metal = mat(0xb9c0c9, 0.3, 0.8);
    const fuselage = mesh(latheZ((t) => {
      if (t < 0.22) return R * (0.25 + 0.75 * Math.sin((t / 0.22) * PI / 2));
      if (t > 0.86) return R * Math.sqrt(Math.max(0, 1 - ((t - 0.86) / 0.14) ** 2)) ** 0.8;
      return R;
    }, L), body, [0, Y, 0]);

    const wing = (span: number, root: number, tip: number, sweep: number, thick: number) => {
      const shape = new THREE.Shape([
        new THREE.Vector2(0, root / 2), new THREE.Vector2(span, root / 2 - sweep),
        new THREE.Vector2(span, root / 2 - sweep - tip), new THREE.Vector2(0, -root / 2),
      ]);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: thick / 2, bevelSize: thick / 2, bevelSegments: 3 });
      geo.rotateX(PI / 2);
      return geo;
    };
    const g = group(fuselage);
    for (const s of [-1, 1]) {
      const w = mesh(wing(0.48, 0.24, 0.05, 0.2, 0.008), white, [s * R * 0.5, Y - R * 0.45, 0.04], [0, 0, s * 0.08], [s, 1, 1]);
      const winglet = mesh(wing(0.05, 0.05, 0.025, 0.035, 0.004), accent, [s * (R * 0.5 + 0.48), Y - R * 0.45 + 0.04, 0.04 - 0.2 + 0.015], [0, 0, s * (PI / 2 - 0.25)], [s, 1, 1]);
      const stab = mesh(wing(0.16, 0.1, 0.035, 0.08, 0.005), white, [s * R * 0.2, Y + 0.012, -0.43], [0, 0, s * 0.12], [s, 1, 1]);
      const nacelle = mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.13, 24, 1, true), accent, [s * 0.17, Y - 0.07, 0.11], [PI / 2, 0, 0]);
      const intake = mesh(new THREE.TorusGeometry(0.029, 0.005, 8, 24), metal, [s * 0.17, Y - 0.07, 0.175]);
      const fan = mesh(new THREE.CircleGeometry(0.027, 20), mat(0x2a2f36, 0.4, 0.8), [s * 0.17, Y - 0.07, 0.165]);
      const exhaust = mesh(new THREE.ConeGeometry(0.018, 0.04, 16), metal, [s * 0.17, Y - 0.07, 0.03], [-PI / 2, 0, 0]);
      const pylon = mesh(new THREE.BoxGeometry(0.008, 0.04, 0.09), white, [s * 0.17, Y - 0.045, 0.1]);
      const gear = group(rod([0, 0.045, 0], [0, 0.015, 0], 0.005, metal), mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 14), rubber(), [0, 0.014, 0], [0, 0, PI / 2]));
      gear.position.set(s * 0.07, 0, -0.02);
      g.add(w, winglet, stab, nacelle, intake, fan, exhaust, pylon, gear);
    }
    const finShape = new THREE.Shape([new THREE.Vector2(-0.36, 0), new THREE.Vector2(-0.47, 0.17), new THREE.Vector2(-0.51, 0.17), new THREE.Vector2(-0.5, 0)]);
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 });
    finGeo.rotateY(-PI / 2);
    finGeo.scale(-1, 1, 1);
    const fin = mesh(finGeo, accent, [0.003, Y + R * 0.6, 0]);
    const finStripe = mesh(new THREE.BoxGeometry(0.014, 0.012, 0.09), red, [0, Y + R * 0.6 + 0.1, -0.455], [0.5, 0, 0]);
    const noseGear = group(rod([0, 0.06, 0], [0, 0.015, 0], 0.004, metal), mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.01, 12), rubber(), [0, 0.012, 0], [0, 0, PI / 2]));
    noseGear.position.set(0, 0, 0.38);
    const beacon = mesh(new THREE.SphereGeometry(0.006, 8, 8), lamp(0xff3030), [0, Y + R, 0.05]);
    g.add(fin, finStripe, noseGear, beacon);
    return g;
  },

  helicopter() {
    const body = paint(0xe63946), dark = mat(0x23272f, 0.5, 0.4), metal = mat(0x9aa3ad, 0.3, 0.9);
    const cabin = mesh(new THREE.SphereGeometry(0.17, 32, 24), body, [0, 0.24, 0.08], [0, 0, 0], [0.9, 0.85, 1.25]);
    const canopy = mesh(new THREE.SphereGeometry(0.172, 32, 24, PI / 2 - 1.1, 2.2, 0.3, 1.2), mat(0x1c3550, 0.05, 0.5, { clearcoat: 1 }), [0, 0.25, 0.1], [0, 0, 0], [0.9, 0.85, 1.25]);
    const boom = mesh(new THREE.CylinderGeometry(0.022, 0.06, 0.5, 20), body, [0, 0.29, -0.3], [PI / 2 - 0.08, 0, 0]);
    const finShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-0.06, 0.15), new THREE.Vector2(-0.11, 0.15), new THREE.Vector2(-0.08, -0.04)]);
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.008, bevelEnabled: false });
    finGeo.rotateY(-PI / 2);
    const fin = mesh(finGeo, body, [0.004, 0.31, -0.5]);
    const stab = mesh(new THREE.BoxGeometry(0.16, 0.008, 0.04), body, [0, 0.31, -0.46]);
    const engine = mesh(new THREE.CapsuleGeometry(0.06, 0.12, 6, 16), mat(0xd5d9de, 0.4, 0.6), [0, 0.4, -0.03], [PI / 2, 0, 0]);
    const mast = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.07, 12), metal, [0, 0.47, 0.05]);
    const rotor = new THREE.Group();
    rotor.position.set(0, 0.51, 0.05);
    rotor.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), dark));
    for (let i = 0; i < 4; i++) rotor.add(mesh(new THREE.BoxGeometry(0.035, 0.006, 0.52), dark, [Math.sin((i * PI) / 2) * 0.27, 0, Math.cos((i * PI) / 2) * 0.27], [0, (i * PI) / 2, 0.06]));
    rotor.userData.spin = 28;
    const tail = new THREE.Group();
    tail.position.set(0.02, 0.37, -0.55);
    tail.add(mesh(new THREE.BoxGeometry(0.004, 0.13, 0.016), dark), mesh(new THREE.BoxGeometry(0.004, 0.016, 0.13), dark));
    tail.userData.spinX = 50;
    const g = group(cabin, canopy, boom, fin, stab, engine, mast, rotor, tail);
    for (const s of [-1, 1]) {
      g.add(rod([s * 0.13, 0.015, -0.2], [s * 0.13, 0.015, 0.25], 0.011, metal));
      g.add(rod([s * 0.13, 0.015, 0.25], [s * 0.13, 0.04, 0.29], 0.011, metal));
      g.add(rod([s * 0.13, 0.015, -0.1], [s * 0.08, 0.13, -0.08], 0.008, metal));
      g.add(rod([s * 0.13, 0.015, 0.15], [s * 0.08, 0.13, 0.15], 0.008, metal));
    }
    g.add(mesh(new THREE.SphereGeometry(0.008, 8, 8), lamp(0xff3030), [0, 0.38, -0.56]));
    return g;
  },
};
