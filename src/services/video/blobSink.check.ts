import assert from 'node:assert/strict';
import { BlobSink } from './blobSink';

const bytes = async (b: Blob) => [...new Uint8Array(await b.arrayBuffer())];
const u8 = (...v: number[]) => new Uint8Array(v);

// appends, then a reserved gap filled later, then patches over earlier bytes (box headers, moov at finalize)
const s = new BlobSink();
s.write(u8(1, 2, 3), 0);
s.write(u8(9, 9, 9, 9), 6);
s.write(u8(7, 7), 10);
assert.deepEqual(await bytes(s.blob('video/mp4')), [1, 2, 3, 0, 0, 0, 9, 9, 9, 9, 7, 7]);
s.write(u8(4, 5, 6), 3);
s.write(u8(0), 1);
s.write(u8(8, 8), 8);
s.write(u8(5, 5, 5, 5, 5), 5);
assert.deepEqual(await bytes(s.blob('video/mp4')), [1, 0, 3, 4, 5, 5, 5, 5, 5, 5, 7, 7]);
assert.equal(s.blob('video/mp4').type, 'video/mp4');

// a patch spanning several segments exactly
const t = new BlobSink();
for (let i = 0; i < 4; i++) t.write(u8(i, i), i * 2);
t.write(u8(9, 9, 9, 9), 2);
assert.deepEqual(await bytes(t.blob('x')), [0, 0, 9, 9, 9, 9, 3, 3]);
console.log('blob sink ok');
