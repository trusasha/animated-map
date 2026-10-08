import * as THREE from 'three';
import { canvasTexture, darkGlass, group, lamp, mat, mesh, paint, PI, rod } from './materials';
import { car_wheel, sideDecals } from './parts';

export const groundBuilders: Record<string, () => THREE.Group> = {
  car() {
    const red = paint(0xd62839), trim = mat(0x16181c, 0.5, 0.3);
    const W = 0.4, wr = 0.088, axle = 0.285;
    const p = new THREE.Shape();
    p.moveTo(-0.47, 0.1);
    p.lineTo(-axle - wr - 0.02, 0.07);
    p.absarc(-axle, wr, wr + 0.018, PI, 0, true);
    p.lineTo(axle - wr - 0.018, 0.07);
    p.absarc(axle, wr, wr + 0.018, PI, 0, true);
    p.lineTo(0.47, 0.08);
    p.quadraticCurveTo(0.49, 0.15, 0.45, 0.2);
    p.quadraticCurveTo(0.33, 0.235, 0.17, 0.25);
    p.quadraticCurveTo(0.1, 0.33, 0.02, 0.365);
    p.quadraticCurveTo(-0.1, 0.385, -0.22, 0.37);
    p.quadraticCurveTo(-0.33, 0.33, -0.38, 0.26);
    p.quadraticCurveTo(-0.45, 0.255, -0.47, 0.23);
    p.lineTo(-0.47, 0.1);
    const bevel = 0.045;
    const bodyGeo = new THREE.ExtrudeGeometry(p, { depth: W - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 6, curveSegments: 24 });
    bodyGeo.rotateY(-PI / 2);
    bodyGeo.translate((W - 2 * bevel) / 2, 0, 0);
    const win = new THREE.Shape();
    win.moveTo(0.168, 0.258);
    win.quadraticCurveTo(0.1, 0.335, 0.02, 0.372);
    win.lineTo(-0.2, 0.374);
    win.quadraticCurveTo(-0.32, 0.335, -0.385, 0.265);
    win.lineTo(0.168, 0.258);
    const winGeo = new THREE.ExtrudeGeometry(win, { depth: W - 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.004, bevelSegments: 3, curveSegments: 16 });
    winGeo.rotateY(-PI / 2);
    winGeo.translate((W - 0.05) / 2, 0.002, 0);
    const g = group(mesh(bodyGeo, red), mesh(winGeo, darkGlass()));
    g.add(mesh(new THREE.BoxGeometry(W + 0.012, 0.11, 0.028), red, [0, 0.315, -0.07], [-0.08, 0, 0]));
    for (const z of [-axle, axle]) for (const s of [-1, 1]) {
      const w = car_wheel(wr, 0.075);
      w.position.set(s * (W / 2 - 0.035), wr, z);
      g.add(w);
    }
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.CapsuleGeometry(0.018, 0.05, 4, 10), lamp(0xfff5d6), [s * 0.13, 0.185, 0.462], [0, 0, PI / 2]));
      g.add(mesh(new THREE.BoxGeometry(0.1, 0.028, 0.012), lamp(0xff1a1a), [s * 0.12, 0.215, -0.49]));
      g.add(mesh(new THREE.BoxGeometry(0.035, 0.028, 0.05), red, [s * 0.215, 0.29, 0.13], [0, s * 0.2, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.004, 0.012, 0.05), mat(0x8a9099, 0.3, 0.9), [s * (W / 2 + 0.002), 0.235, -0.03]));
    }
    g.add(mesh(new THREE.BoxGeometry(0.17, 0.045, 0.012), trim, [0, 0.13, 0.485]));
    g.add(mesh(new THREE.BoxGeometry(W - 0.01, 0.03, 0.03), trim, [0, 0.085, 0.47]), mesh(new THREE.BoxGeometry(W - 0.01, 0.03, 0.03), trim, [0, 0.095, -0.48]));
    g.add(mesh(new THREE.BoxGeometry(0.09, 0.028, 0.004), mat(0xf4f4f4, 0.5), [0, 0.15, -0.493]));
    return g;
  },

  bus() {
    const L = 1, W = 0.3, H = 0.36;
    const side = canvasTexture(1024, 256, (c) => {
      c.fillStyle = '#ffc300'; c.fillRect(0, 0, 1024, 256);
      c.fillStyle = '#1b2735'; c.fillRect(0, 50, 1024, 95);
      c.fillStyle = '#ffc300';
      for (let x = 70; x < 1024; x += 118) c.fillRect(x, 50, 10, 95);
      c.fillStyle = '#1d4e89'; c.fillRect(0, 180, 1024, 22);
      c.fillStyle = '#ffffff'; c.font = 'bold 40px sans-serif'; c.fillText('CITY TOURS', 380, 238);
    });
    const body = mat(0xffffff, 0.35, 0.2, { map: side, clearcoat: 0.6 });
    const yellow = paint(0xffc300);
    const g = group(mesh(new THREE.BoxGeometry(W, H, L - 0.02), [body, body, yellow, yellow, yellow, yellow], [0, 0.08 + H / 2, 0]));
    g.add(mesh(new THREE.BoxGeometry(W * 0.92, H * 0.45, 0.01), darkGlass(), [0, 0.08 + H * 0.66, L / 2 - 0.008]));
    g.add(mesh(new THREE.BoxGeometry(W * 0.6, 0.04, 0.012), lamp(0xffa000), [0, 0.08 + H - 0.03, L / 2 - 0.004]));
    g.add(mesh(new THREE.BoxGeometry(W * 0.92, H * 0.3, 0.01), darkGlass(), [0, 0.08 + H * 0.7, -L / 2 + 0.008]));
    g.add(mesh(new THREE.BoxGeometry(W * 0.7, 0.03, 0.3), mat(0xd9dde2, 0.4, 0.5), [0, 0.08 + H + 0.015, -0.05]));
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.BoxGeometry(0.04, 0.025, 0.008), lamp(0xfff5d6), [s * 0.1, 0.13, L / 2 - 0.004]));
      g.add(mesh(new THREE.BoxGeometry(0.03, 0.05, 0.008), lamp(0xff1a1a), [s * 0.12, 0.15, -L / 2 + 0.004]));
      g.add(rod([s * W / 2, 0.42, L / 2 - 0.02], [s * (W / 2 + 0.04), 0.38, L / 2 + 0.02], 0.005, mat(0x111111)));
    }
    g.add(mesh(new THREE.BoxGeometry(W + 0.006, 0.05, L), mat(0x2b2f36, 0.6), [0, 0.1, 0]));
    for (const z of [-0.3, 0.32]) for (const s of [-1, 1]) {
      const w = car_wheel(0.075, 0.055, 0xd0d4da);
      w.position.set(s * (W / 2 - 0.015), 0.075, z);
      g.add(w);
    }
    return g;
  },

  train() {
    const W = 0.2;
    const windows = canvasTexture(1024, 128, (c) => {
      c.fillStyle = '#1d3557'; c.fillRect(0, 22, 1024, 52);
      c.fillStyle = '#0f1720';
      for (let x = 24; x < 1000; x += 46) { c.beginPath(); c.roundRect(x, 30, 34, 36, 7); c.fill(); }
      c.fillStyle = '#e63946'; c.fillRect(0, 96, 1024, 12);
    });
    const shell = paint(0xf4f6f8);
    const nose = new THREE.Shape();
    nose.moveTo(-0.02, 0.05);
    nose.lineTo(0.36, 0.05);
    nose.quadraticCurveTo(0.5, 0.06, 0.5, 0.1);
    nose.quadraticCurveTo(0.45, 0.2, 0.25, 0.25);
    nose.lineTo(-0.02, 0.25);
    const geo = (sh: THREE.Shape) => {
      const g = new THREE.ExtrudeGeometry(sh, { depth: W - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 6, curveSegments: 24 });
      g.rotateY(-PI / 2);
      g.translate((W - 0.06) / 2, 0, 0);
      return g;
    };
    const coachShape = new THREE.Shape([new THREE.Vector2(-0.5, 0.05), new THREE.Vector2(-0.05, 0.05), new THREE.Vector2(-0.05, 0.25), new THREE.Vector2(-0.5, 0.25)]);
    const shield = new THREE.Shape();
    shield.moveTo(0.4, 0.165);
    shield.quadraticCurveTo(0.34, 0.22, 0.24, 0.245);
    shield.lineTo(0.22, 0.24);
    shield.quadraticCurveTo(0.31, 0.205, 0.36, 0.16);
    const shieldGeo = new THREE.ExtrudeGeometry(shield, { depth: W * 0.7, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.008, bevelSegments: 3 });
    shieldGeo.rotateY(-PI / 2);
    shieldGeo.translate(W * 0.35, 0.004, 0);
    const g = group(mesh(geo(nose), shell), mesh(geo(coachShape), shell), mesh(shieldGeo, darkGlass()));
    g.add(...sideDecals(windows, W / 2 + 0.031, 0.42, 0.13, 0.15, -0.28), ...sideDecals(windows, W / 2 + 0.031, 0.18, 0.13, 0.15, 0.1));
    g.add(mesh(new THREE.BoxGeometry(W * 0.9, 0.19, 0.04), mat(0x1b1d22, 0.8), [0, 0.15, -0.035]));
    for (const s of [-1, 1]) g.add(mesh(new THREE.CapsuleGeometry(0.008, 0.03, 4, 8), lamp(0xfff5d6), [s * 0.05, 0.085, 0.5], [0, 0, PI / 2]));
    g.add(rod([0, 0.28, 0.1], [0, 0.34, 0.0], 0.004, mat(0x222222)), rod([0, 0.34, 0.0], [0, 0.34, -0.08], 0.004, mat(0x222222)));
    for (const z of [-0.4, -0.2, 0.15, 0.33]) for (const s of [-1, 1]) {
      const w = car_wheel(0.032, 0.02, 0x666b73);
      w.position.set(s * 0.075, 0.035, z);
      g.add(w);
    }
    for (const z of [-0.3, 0.24]) g.add(mesh(new THREE.BoxGeometry(W * 0.85, 0.03, 0.2), mat(0x2a2d33, 0.6, 0.5), [0, 0.045, z]));
    return g;
  },
};
