import assert from 'node:assert/strict';
import { ASPECTS, avcLevel, videoSize } from './video';
import type { Format } from './types';

assert.deepEqual(videoSize('9:16', 1920), { width: 1080, height: 1920 }, 'default keeps today 9:16');
assert.deepEqual(videoSize('16:9', 1920), { width: 1920, height: 1080 }, 'default keeps today 16:9');
assert.deepEqual(videoSize('9:16', 1080), { width: 608, height: 1080 });
assert.deepEqual(videoSize('16:9', 1080), { width: 1080, height: 608 });
assert.deepEqual(videoSize('1:1', 1080), { width: 1080, height: 1080 });
assert.deepEqual(videoSize('4:5', 1920), { width: 1536, height: 1920 });
for (const f of Object.keys(ASPECTS) as Format[]) for (const side of [1080, 1920, 1001, 721]) {
  const { width, height } = videoSize(f, side);
  assert.ok(width % 2 === 0 && height % 2 === 0, `${f}@${side} even: ${width}x${height}`);
  assert.ok(Math.max(width, height) - side <= 1, `${f}@${side} long side kept`);
}

assert.equal(avcLevel(1280, 720), 0x1f, '720p fits level 3.1');
assert.equal(avcLevel(608, 1080), 0x1f);
assert.equal(avcLevel(1080, 1920), 0x28, 'today 9:16 stays at level 4.0');
assert.equal(avcLevel(1920, 1080), 0x28, 'today 16:9 stays at level 4.0');
assert.equal(avcLevel(3840, 2160), 0x33);

console.log('video ok');
