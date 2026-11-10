import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isStoredMime, photoKind, storablePhoto } from '@foyer/ai';

const JPEG_MAGIC = [0xff, 0xd8, 0xff];

test('photoKind accepts HEIC by mimetype or extension', () => {
  assert.equal(photoKind('image/heic', 'IMG_1.HEIC'), 'heic');
  assert.equal(photoKind('', 'IMG_1.HEIC'), 'heic');
  assert.equal(photoKind('application/octet-stream', 'scan.heif'), 'heic');
  assert.deepEqual(photoKind('image/jpeg', 'a.jpg'), { ext: 'jpg', mime: 'image/jpeg' });
  assert.equal(photoKind('image/gif', 'a.gif'), undefined);
  assert.equal(photoKind('application/pdf', 'plan.pdf'), undefined);
});

test('HEIC is stored as JPEG', async () => {
  const heic = await readFile(path.join(import.meta.dirname, 'fixtures/tiny.heic'));
  const out = await storablePhoto(heic, 'heic');
  assert.equal(out.mime, 'image/jpeg');
  assert.equal(out.ext, 'jpg');
  assert.deepEqual([...out.buf.subarray(0, 3)], JPEG_MAGIC);
  assert.ok(isStoredMime(out.mime));
  assert.ok(!isStoredMime('image/heic'));
});

test('corrupt HEIC rejects instead of storing garbage', async () => {
  await assert.rejects(storablePhoto(Buffer.from('not an image'), 'heic'));
});

test('large photos are capped at 2048 px on the long edge', async () => {
  const sharp = (await import('sharp')).default;
  const big = await sharp({ create: { width: 4032, height: 3024, channels: 3, background: '#6b7f5a' } }).jpeg().toBuffer();
  const out = await storablePhoto(big, { ext: 'jpg', mime: 'image/jpeg' });
  const meta = await sharp(out.buf).metadata();
  assert.equal(meta.width, 2048);
  assert.equal(meta.height, 1536);
});
