import heicConvert from 'heic-convert';
import sharp from 'sharp';
import type { ImageMime } from './model';

/** Upload formats we store as-is, keyed by browser mimetype. */
const STORED: Record<string, { ext: string; mime: ImageMime }> = {
  'image/jpeg': { ext: 'jpg', mime: 'image/jpeg' },
  'image/png': { ext: 'png', mime: 'image/png' },
  'image/webp': { ext: 'webp', mime: 'image/webp' },
};
const HEIC_MIMES = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);
const HEIC_EXT = /\.(heic|heif)$/i;
const HEIC_DECODE_QUALITY = 0.95;
/** Vision caps each image at 5 MB base64 and downsamples past ~1568 px anyway. */
const MAX_EDGE_PX = 2048;
const JPEG_QUALITY = 85;

export type PhotoKind = 'heic' | { ext: string; mime: ImageMime };

/**
 * iPhone HEIC files arrive as image/heic, or with an empty or octet-stream
 * mimetype from browsers that don't know the format, so the extension counts too.
 */
export function photoKind(mimetype: string, filename: string): PhotoKind | undefined {
  if (HEIC_MIMES.has(mimetype) || HEIC_EXT.test(filename)) return 'heic';
  return STORED[mimetype];
}

export function isStoredMime(mime: string): mime is ImageMime {
  return Object.values(STORED).some((s) => s.mime === mime);
}

/**
 * Models and browsers can't read HEIC, so it becomes JPEG. Every photo is
 * capped at MAX_EDGE_PX so a full-size phone shot stays under the vision limit.
 */
export async function storablePhoto(buf: Buffer, kind: PhotoKind): Promise<{ buf: Buffer; ext: string; mime: ImageMime }> {
  const input = kind === 'heic' ? Buffer.from(await heicConvert({ buffer: buf, format: 'JPEG', quality: HEIC_DECODE_QUALITY })) : buf;
  const img = sharp(input).rotate().resize(MAX_EDGE_PX, MAX_EDGE_PX, { fit: 'inside', withoutEnlargement: true });
  if (kind !== 'heic' && kind.mime === 'image/png') return { buf: await img.png().toBuffer(), ...kind };
  if (kind !== 'heic' && kind.mime === 'image/webp') return { buf: await img.webp().toBuffer(), ...kind };
  return { buf: await img.jpeg({ quality: JPEG_QUALITY }).toBuffer(), ext: 'jpg', mime: 'image/jpeg' };
}
