import { Logger, NodeIO, type Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

/** a figure is ~100 px on screen: more detail only costs phones memory and download time */
const MAX_TRIANGLES = 75_000;
const MAX_TEXTURE = 1024;

export interface GlbStats { bytes: number; triangles: number; maxTexture: number }
export interface Lightened { glb: Buffer; before: GlbStats; after: GlbStats }

export class BadModelError extends Error {}

// every known extension is read and written back, so materials keep their specular, clearcoat etc.
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

function stats(doc: Document, bytes: number): GlbStats {
  let triangles = 0, maxTexture = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const p of mesh.listPrimitives()) triangles += Math.floor((p.getIndices() ?? p.getAttribute('POSITION'))!.getCount() / 3);
  }
  for (const t of doc.getRoot().listTextures()) maxTexture = Math.max(maxTexture, ...(t.getSize() ?? [0]));
  return { bytes, triangles, maxTexture };
}

/**
 * Brings any GLB down to what a figure needs: at most MAX_TRIANGLES (meshoptimizer), textures at most MAX_TEXTURE px,
 * re-encoded as JPEG unless a material uses transparency. Photo→3D models arrive at 500k triangles and 4096² textures
 * (~35 MB, ~90 MB of GPU memory per map), which phones fail to load. Rejects files that are not GLB.
 */
export async function lightenGlb(input: Buffer): Promise<Lightened> {
  let doc: Document;
  try {
    doc = await io.readBinary(new Uint8Array(input));
  } catch (e) {
    throw new BadModelError(`not a GLB file: ${e instanceof Error ? e.message : e}`);
  }
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  const before = stats(doc, input.byteLength);
  const transparent = doc.getRoot().listMaterials().some((m) => m.getAlphaMode() !== 'OPAQUE');
  await MeshoptSimplifier.ready;
  await doc.transform(
    weld(),
    ...(before.triangles > MAX_TRIANGLES ? [simplify({ simplifier: MeshoptSimplifier, ratio: MAX_TRIANGLES / before.triangles, error: 0.002 })] : []),
    textureCompress({ encoder: sharp, resize: [MAX_TEXTURE, MAX_TEXTURE], ...(transparent ? {} : { targetFormat: 'jpeg' as const, quality: 85 }) }),
    dedup(),
    prune(),
  );
  const glb = Buffer.from(await io.writeBinary(doc));
  // a model already small and lean can come out bigger after re-encoding: keep whichever is lighter
  if (glb.byteLength >= input.byteLength && before.triangles <= MAX_TRIANGLES && before.maxTexture <= MAX_TEXTURE) return { glb: input, before, after: before };
  return { glb, before, after: stats(doc, glb.byteLength) };
}
