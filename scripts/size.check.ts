import { execFileSync } from 'node:child_process';

execFileSync('npx', ['tsx', 'scripts/check-size.ts'], { stdio: 'inherit' });
