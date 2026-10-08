import * as THREE from 'three';
import { chrome, darkGlass, glass, group, lamp, mat, mesh, paint, PI, rod, sideExtrude, type V3 } from './materials';
import { bike_wheel, rider } from './parts';

export const bikeBuilders: Record<string, () => THREE.Group> = {
  motorcycle() {
    // adventure tourer: tall, spoked wheels, panniers, rider upright
    const orange = paint(0xff6b00), black = mat(0x1b1d22, 0.5, 0.4), metal = chrome(), frame = mat(0x30343b, 0.4, 0.7);
    const rf = 0.135, rr = 0.125;
    const front = bike_wheel(rf, 0.025), rear = bike_wheel(rr, 0.03);
    front.position.set(0, rf + 0.005, 0.33);
    rear.position.set(0, rr + 0.005, -0.31);
    const g = group(front, rear);
    for (const s of [-1, 1]) {
      g.add(rod([s * 0.035, rf, 0.33], [s * 0.04, 0.45, 0.22], 0.012, metal));
      g.add(rod([s * 0.04, rr, -0.31], [s * 0.03, 0.27, -0.02], 0.012, frame));
      g.add(mesh(new THREE.BoxGeometry(0.09, 0.14, 0.2), black, [s * 0.11, 0.3, -0.26], [0, 0, 0], [1, 1, 1]));
      g.add(mesh(new THREE.BoxGeometry(0.004, 0.11, 0.17), mat(0x8c939c, 0.3, 0.9), [s * 0.157, 0.3, -0.26]));
    }
    g.add(mesh(new THREE.TorusGeometry(rf + 0.02, 0.012, 6, 20, PI * 0.7), orange, [0, rf + 0.005, 0.33], [0, PI / 2, PI * 0.15]));
    g.add(mesh(new THREE.CapsuleGeometry(0.07, 0.12, 8, 20), orange, [0, 0.39, 0.1], [PI / 2 + 0.25, 0, 0], [1.15, 1, 1]));
    g.add(mesh(sideExtrude([[0.0, 0.0], [0.13, -0.02], [0.17, 0.06], [0.06, 0.1]], 0.16, 0.02), orange, [0, 0.33, 0.13]));
    g.add(mesh(new THREE.BoxGeometry(0.13, 0.13, 0.15), mat(0x60666e, 0.35, 0.8), [0, 0.22, 0.05]));
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.045, 0.3), black, [0, 0.4, -0.12], [-0.08, 0, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.03, 0.18), black, [0, 0.42, -0.36]));
    g.add(rod([0.06, 0.19, -0.05], [0.07, 0.3, -0.4], 0.02, metal, 14));
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 16), metal, [0.08, 0.31, -0.41], [PI / 2 - 0.3, 0, 0]));
    g.add(rod([-0.15, 0.53, 0.2], [0.15, 0.53, 0.2], 0.009, black));
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 20), lamp(0xfff2c8), [0, 0.43, 0.3], [PI / 2, 0, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.15, 0.13, 0.008), glass(), [0, 0.54, 0.25], [-0.45, 0, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.02, 0.01), lamp(0xff1a1a), [0, 0.42, -0.455]));
    g.add(rider({ hip: [0.06, 0.45, -0.13], shoulder: [0, 0.74, -0.06], hands: [0.14, 0.54, 0.19], feet: [0.11, 0.2, -0.05], jacket: 0x2f6f4f, helmet: 0xf1f1f1 }));
    return g;
  },

  sportbike() {
    const blue = paint(0x1149d6), white = paint(0xf3f4f6), black = mat(0x16181d, 0.45, 0.4), gold = mat(0xffc107, 0.35, 0.6);
    const r = 0.12;
    const front = bike_wheel(r, 0.032, 6, gold), rear = bike_wheel(r, 0.042, 6, gold);
    front.position.set(0, r + 0.005, 0.34);
    rear.position.set(0, r + 0.005, -0.32);
    const g = group(front, rear);
    for (const s of [-1, 1]) {
      g.add(rod([s * 0.04, r, 0.34], [s * 0.045, 0.43, 0.22], 0.013, mat(0xd4a017, 0.3, 0.9)));
      g.add(rod([s * 0.05, r, -0.32], [s * 0.04, 0.24, -0.03], 0.014, black));
    }
    const fairing = new THREE.Shape();
    fairing.moveTo(0.37, 0.37);
    fairing.quadraticCurveTo(0.32, 0.47, 0.2, 0.5);
    fairing.lineTo(0.12, 0.45);
    fairing.lineTo(0.0, 0.33);
    fairing.quadraticCurveTo(-0.03, 0.17, 0.07, 0.14);
    fairing.lineTo(0.17, 0.15);
    fairing.quadraticCurveTo(0.2, 0.26, 0.26, 0.28);
    fairing.quadraticCurveTo(0.34, 0.29, 0.37, 0.37);
    g.add(mesh(sideExtrude(fairing, 0.19, 0.045, 24), blue));
    const stripe = new THREE.Shape();
    stripe.moveTo(0.33, 0.36);
    stripe.quadraticCurveTo(0.22, 0.33, 0.06, 0.2);
    stripe.lineTo(0.08, 0.18);
    stripe.quadraticCurveTo(0.22, 0.3, 0.34, 0.33);
    g.add(mesh(sideExtrude(stripe, 0.196, 0.045, 16), white));
    g.add(mesh(new THREE.SphereGeometry(0.08, 24, 16), blue, [0, 0.465, 0.04], [0.15, 0, 0], [0.85, 0.55, 1.35]));
    const tail = new THREE.Shape();
    tail.moveTo(-0.02, 0.45);
    tail.lineTo(-0.2, 0.46);
    tail.quadraticCurveTo(-0.34, 0.49, -0.43, 0.53);
    tail.lineTo(-0.41, 0.49);
    tail.quadraticCurveTo(-0.25, 0.39, -0.04, 0.37);
    g.add(mesh(sideExtrude(tail, 0.13, 0.035, 20), blue));
    const seat = new THREE.Shape();
    seat.moveTo(-0.03, 0.47);
    seat.lineTo(-0.2, 0.478);
    seat.lineTo(-0.22, 0.495);
    seat.quadraticCurveTo(-0.1, 0.495, -0.02, 0.485);
    g.add(mesh(sideExtrude(seat, 0.11, 0.02, 12), black));
    g.add(mesh(new THREE.BoxGeometry(0.13, 0.09, 0.008), darkGlass(), [0, 0.505, 0.26], [-0.95, 0, 0]));
    for (const s of [-1, 1]) g.add(mesh(new THREE.CapsuleGeometry(0.01, 0.03, 4, 8), lamp(0xe8f4ff), [s * 0.035, 0.38, 0.365], [0.6, 0, PI / 2 + s * 0.4]));
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.09, 0.14), mat(0x3b3f46, 0.4, 0.7), [0, 0.2, 0.06]));
    g.add(mesh(new THREE.CylinderGeometry(0.028, 0.038, 0.15, 16), mat(0xb8bec6, 0.2, 1), [0.06, 0.33, -0.33], [PI / 2 - 0.45, 0, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.015, 0.01), lamp(0xff1a1a), [0, 0.5, -0.42], [0.4, 0, 0]));
    g.add(rider({ hip: [0.06, 0.5, -0.13], shoulder: [0, 0.62, 0.06], hands: [0.1, 0.47, 0.22], feet: [0.1, 0.26, -0.17], jacket: 0x1149d6, helmet: 0xf3f4f6 }));
    return g;
  },

  bicycle() {
    const frameM = paint(0x00a676), black = mat(0x1d1f24, 0.5, 0.3), metal = chrome();
    const r = 0.15;
    const front = bike_wheel(r, 0.012, 20), rear = bike_wheel(r, 0.012, 20);
    front.position.set(0, r + 0.005, 0.3);
    rear.position.set(0, r + 0.005, -0.3);
    const bb: V3 = [0, 0.16, -0.02], seat: V3 = [0, 0.4, -0.1], head: V3 = [0, 0.4, 0.2], rearHub: V3 = [0, r, -0.3];
    const g = group(front, rear,
      rod(bb, seat, 0.012, frameM), rod(seat, head, 0.011, frameM), rod(bb, [0, 0.38, 0.19], 0.013, frameM),
      rod(bb, rearHub, 0.008, frameM), rod(seat, rearHub, 0.008, frameM), rod(head, [0, r, 0.3], 0.01, metal),
      rod(seat, [0, 0.45, -0.12], 0.008, metal), mesh(new THREE.BoxGeometry(0.06, 0.02, 0.12), black, [0, 0.46, -0.12]),
      rod(head, [0, 0.46, 0.18], 0.009, metal), rod([-0.11, 0.46, 0.18], [0.11, 0.46, 0.18], 0.008, black),
      mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 20), metal, bb, [0, 0, PI / 2]),
    );
    g.add(rider({ hip: [0.05, 0.47, -0.11], shoulder: [0, 0.68, 0.04], hands: [0.1, 0.47, 0.18], feet: [0.06, 0.13, 0.02], jacket: 0xef476f, helmet: 0xffd166 }));
    return g;
  },
};
