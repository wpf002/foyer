import { call, type ContentBlock, type ImageMime, type ModelUsage } from '@foyer/ai';
import type { RoomInput } from './critique';

export interface PhotoInput {
  mime: ImageMime;
  /** Base64, no data: prefix. */
  data: string;
}

export interface PhotoRead {
  description: string;
  fixed: string[];
  movable: string[];
}

export interface PhotoReadResult {
  read: PhotoRead;
  model: string;
  usage: ModelUsage;
}

export const MAX_PHOTOS = 6;

export function visionSystemPrompt(): string {
  return [
    'You are an interior designer reading site photos of one room before writing a critique.',
    'Report what is visible. You do not make recommendations here.',
    '',
    '## Return',
    '- description: 4-8 plain sentences. Light (direction, window count, glare, color temperature of fixtures), finishes and their undertones, sightlines, circulation, clutter, condition.',
    '- fixed: elements that stay with the house: windows, doors, built-ins, fireplace, stairs, flooring, cabinetry, plumbing fixtures, hardwired lights, walls of note.',
    '- movable: furniture, rugs, lamps, art, curtains, accessories.',
    'Each list item is a short noun phrase with the detail that matters, e.g. "white oak strip floor, honey stain".',
    '',
    '## Rules',
    '- Never say a wall is or is not load-bearing. For any wall the brief might touch, write "load path unconfirmed".',
    '- Never estimate dimensions in inches or feet. Typed measurements are authoritative and are not yours to change.',
    '- If a photo is too dark, blurred, or cropped to judge something, say what cannot be judged.',
    '- Do not guess the era of the house unless a feature dates it; name the feature.',
    '',
    '## Output',
    'JSON only: { "description": string, "fixed": string[], "movable": string[] }',
  ].join('\n');
}

function shapeOk(v: unknown): v is PhotoRead {
  const o = v as Partial<PhotoRead> | null;
  const strs = (x: unknown) => Array.isArray(x) && x.every((s) => typeof s === 'string');
  return !!o && typeof o.description === 'string' && strs(o.fixed) && strs(o.movable);
}

/** Rewrites any load-bearing verdict the model slips in. */
const LOAD_CLAIM = /\b(is|isn't|is not|appears|looks|likely|probably)\s+(non-)?load[- ]bearing\b/gi;

export function sanitizeRead(r: PhotoRead): PhotoRead {
  const fix = (s: string) => s.replace(LOAD_CLAIM, 'load path unconfirmed').trim();
  return {
    description: fix(r.description),
    fixed: r.fixed.map(fix).filter(Boolean),
    movable: r.movable.map(fix).filter(Boolean),
  };
}

/** One vision-tier call per room, all photos in one message. */
export async function analyzePhotos(
  photos: PhotoInput[],
  room: Pick<RoomInput, 'name' | 'type'>,
  userId: string,
): Promise<PhotoReadResult> {
  if (!photos.length) throw new Error('No photos to analyze');
  const content: ContentBlock[] = [
    ...photos.slice(0, MAX_PHOTOS).map(
      (p): ContentBlock => ({ type: 'image', source: { type: 'base64', media_type: p.mime, data: p.data } }),
    ),
    { type: 'text', text: `Room: ${room.name} (${room.type}). ${photos.length > 1 ? `${Math.min(photos.length, MAX_PHOTOS)} photos.` : '1 photo.'}` },
  ];
  const res = await call<PhotoRead>({
    task: 'analyze_photo',
    userId,
    system: [{ text: visionSystemPrompt(), cache: true }],
    messages: [{ role: 'user', content }],
    maxTokens: 4000,
    effort: 'medium',
    json: true,
  });
  if (!shapeOk(res.parsed)) throw new Error('Photo read failed shape check');
  return { read: sanitizeRead(res.parsed), model: res.model, usage: res.usage };
}

/**
 * Fills blank room fields from a photo read. Typed values always win; lists
 * merge with typed items first, deduped case-insensitively.
 */
export function mergeRead(room: RoomInput, read: PhotoRead): RoomInput {
  const merge = (typed: string[], seen: string[]) => {
    const keys = new Set(typed.map((s) => s.toLowerCase()));
    return [...typed, ...seen.filter((s) => !keys.has(s.toLowerCase()))];
  };
  return {
    ...room,
    description: room.description.trim() ? room.description : read.description,
    fixed: merge(room.fixed, read.fixed),
    movable: merge(room.movable, read.movable),
  };
}
