import { globSync, rmSync } from 'node:fs';

export default function wipeE2eData() {
  for (const dir of globSync('.e2e-data*')) rmSync(dir, { recursive: true, force: true });
}
