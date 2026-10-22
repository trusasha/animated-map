import assert from 'node:assert/strict';
import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import { BadModelError, lightenGlb } from './models3d.ts';

/** a textured grid with 2·n² triangles, like a dense photo→3D mesh */
async function heavyGlb(n: number, texture: number) {
  const doc = new Document(), buffer = doc.createBuffer();
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) { pos.push(x / n, Math.sin((x * y) / n) * 0.05, y / n); uv.push(x / n, y / n); }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const a = y * (n + 1) + x, b = a + 1, c = a + n + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  // noise: a single-colour texture would be pruned into the material colour
  const pixels = Buffer.from(Array.from({ length: texture * texture * 3 }, (_, i) => (i * 2654435761) >>> 24));
  const png = await sharp(pixels, { raw: { width: texture, height: texture, channels: 3 } }).png().toBuffer();
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer))
    .setMaterial(doc.createMaterial().setBaseColorTexture(doc.createTexture().setImage(new Uint8Array(png)).setMimeType('image/png')));
  doc.createScene().addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(prim)));
  return Buffer.from(await new NodeIO().writeBinary(doc));
}

const heavy = await heavyGlb(400, 2048);
const { glb, before, after } = await lightenGlb(heavy);
assert.equal(before.triangles, 320_000);
assert.equal(before.maxTexture, 2048);
assert.ok(after.triangles <= 75_000, `triangles ${after.triangles}`);
assert.equal(after.maxTexture, 1024);
assert.ok(glb.byteLength < heavy.byteLength / 3, `bytes ${heavy.byteLength} -> ${glb.byteLength}`);
const back = await new NodeIO().readBinary(new Uint8Array(glb));
assert.equal(back.getRoot().listTextures()[0].getMimeType(), 'image/jpeg');

// a small model passes through untouched
const small = await heavyGlb(10, 64);
assert.ok((await lightenGlb(small)).after.triangles === 200);

await assert.rejects(lightenGlb(Buffer.from('<!doctype html>')), BadModelError);
console.log('models3d ok');
