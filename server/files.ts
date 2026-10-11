import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { Owner } from './db/index.ts';

const BUCKET = 'uploads';

/** SUPABASE_SECRET_KEY set: files go to the public Storage bucket "uploads" (the host disk is wiped on deploy) */
export function createUploads(dataDir: string, env = process.env) {
  const dir = `${dataDir}/uploads`;
  mkdirSync(dir, { recursive: true });
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL, key = env.SUPABASE_SECRET_KEY;
  const storage = url && key ? { url, key } : null;
  return {
    dir,
    /** where /uploads/<name> lives when it is not on local disk */
    remote: storage && ((name: string) => `${storage.url}/storage/v1/object/public/${BUCKET}/${name}`),
    /** a signed-in user's files go in their own folder; the local user keeps the flat layout */
    async save(buf: Buffer, ext: string, owner: Owner = null) {
      const name = `${owner ? `${owner}/` : ''}${randomUUID()}.${ext}`;
      if (storage) {
        const res = await fetch(`${storage.url}/storage/v1/object/${BUCKET}/${name}`, {
          method: 'POST', body: new Uint8Array(buf),
          headers: { apikey: storage.key, 'content-type': ext === 'glb' ? 'model/gltf-binary' : 'application/octet-stream' },
        });
        if (!res.ok) throw new Error(`storage upload failed: ${res.status} ${await res.text()}`);
      } else {
        if (owner) mkdirSync(`${dir}/${owner}`, { recursive: true });
        writeFileSync(`${dir}/${name}`, buf);
      }
      return `/uploads/${name}`;
    },
  };
}
export type Uploads = ReturnType<typeof createUploads>;

// ponytail: macOS `sips` only (this app runs on the owner's Mac); swap for sharp/libheif if hosted elsewhere
export function heicToJpeg(buf: Buffer) {
  const src = `${tmpdir()}/${randomUUID()}.heic`, out = `${src}.jpg`;
  writeFileSync(src, buf);
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', '2048', src, '--out', out], { stdio: 'ignore' });
    return readFileSync(out);
  } finally { rmSync(src, { force: true }); rmSync(out, { force: true }); }
}
