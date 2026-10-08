import type * as THREE from 'three';

export function animateFigure(g: THREE.Object3D, time: number) {
  g.traverse((o) => {
    if (o.userData.spin) o.rotation.y = time * o.userData.spin;
    if (o.userData.spinX) o.rotation.x = time * o.userData.spinX;
    if (o.userData.roll) o.rotation.x = (time * 0.35) / o.userData.roll;
  });
}
