// Dev page (/figures.html): every built-in figure from two angles; ?only=car&size=600 for a close look.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { animateFigure } from './figures/animate';
import { createFigure, FIGURE_IDS } from './figures/registry';

const params = new URLSearchParams(location.search);
const ids = params.get('only')?.split(',') ?? FIGURE_IDS;
const cell = Number(params.get('size') ?? 300);
const views: [number, number][] = [[-0.7, 0.75], [-PI_2(), 0.12], [2.4, 0.5]];
function PI_2() { return Math.PI / 2; }

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(cell * views.length, cell * ids.length);
renderer.setScissorTest(true);
document.body.append(renderer.domElement);
document.body.style.overflow = 'auto';

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(0.6, 1, -0.4);
scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(0.8, 48), new THREE.MeshStandardMaterial({ color: 0x6f8a5a }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const figures = await Promise.all(ids.map((id) => createFigure(id)));
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);

function draw(time: number) {
  figures.forEach((fig, row) => {
    scene.add(fig);
    animateFigure(fig, time);
    views.forEach(([az, el], col) => {
      camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(2.1).add(new THREE.Vector3(0, 0.25, 0));
      camera.lookAt(0, 0.25, 0);
      const y = (ids.length - 1 - row) * cell;
      renderer.setViewport(col * cell, y, cell, cell);
      renderer.setScissor(col * cell, y, cell, cell);
      renderer.setClearColor(0x9fb3c8);
      renderer.render(scene, camera);
    });
    scene.remove(fig);
  });
}
renderer.setAnimationLoop((t) => draw(params.has('still') ? 0.3 : t / 1000));
