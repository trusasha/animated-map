import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

export function createUploads(dataDir: string) {
  const dir = `${dataDir}/uploads`;
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    save(buf: Buffer, ext: string) {
      const name = `${randomUUID()}.${ext}`;
      writeFileSync(`${dir}/${name}`, buf);
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
