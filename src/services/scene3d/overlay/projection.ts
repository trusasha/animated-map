import * as THREE from 'three';
import { EARTH_RADIUS as R, mercatorCoord, meterInMercatorUnits } from '../../../domain/geo';

const rad = Math.PI / 180;

/** unit-sphere globe space as MapLibre's globe matrix expects it */
export function globeWorld(lng: number, lat: number, alt: number) {
  const k = 1 + alt / R, c = Math.cos(lat * rad);
  return new THREE.Vector3(Math.sin(lng * rad) * c * k, Math.sin(lat * rad) * k, Math.cos(lng * rad) * c * k);
}

export function mercWorld(lng: number, lat: number, alt: number) {
  const m = mercatorCoord(lng, lat, alt);
  return new THREE.Vector3(m.x, m.y, m.z);
}

/** local east-north-up meters → unit-sphere globe space */
export function enuToGlobe(lng: number, lat: number) {
  const l = lng * rad, p = lat * rad;
  const east = new THREE.Vector3(Math.cos(l), 0, -Math.sin(l)).divideScalar(R);
  const north = new THREE.Vector3(-Math.sin(l) * Math.sin(p), Math.cos(p), -Math.cos(l) * Math.sin(p)).divideScalar(R);
  const up = globeWorld(lng, lat, 0);
  return new THREE.Matrix4().makeBasis(east, north, up.clone().divideScalar(R)).setPosition(up);
}

/** local east-north-up meters → mercator [0..1] space (y grows south) */
export function enuToMerc(lng: number, lat: number) {
  const m = mercatorCoord(lng, lat, 0);
  const s = meterInMercatorUnits(lat);
  return new THREE.Matrix4().set(s, 0, 0, m.x, 0, -s, 0, m.y, 0, 0, s, 0, 0, 0, 0, 1);
}
