import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { question, type RawAnswer, type RoomInput } from '@foyer/rubric';
import type { CaseMeta, GoldenCase } from './types';

export const GOLDEN = join(import.meta.dirname, '..', 'golden');

const read = <T>(dir: string, file: string): T => JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;

/** Load and validate every case. Throws on a malformed case so a typo can't silently drop it. */
export function loadCases(only?: string): GoldenCase[] {
  if (!existsSync(GOLDEN)) return [];
  const ids = readdirSync(GOLDEN, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (!only || d.name === only))
    .map((d) => d.name)
    .sort();

  return ids.map((id) => {
    const dir = join(GOLDEN, id);
    const meta = read<CaseMeta>(dir, 'case.json');
    const brief = read<RawAnswer[]>(dir, 'brief.json');
    const room = read<RoomInput>(dir, 'room.json');

    if (meta.id !== id) throw new Error(`${id}: case.json id is "${meta.id}"`);
    if (meta.source !== 'real' && meta.source !== 'synthetic') throw new Error(`${id}: source must be real or synthetic`);
    for (const a of brief) question(a.questionId);
    if (brief.length !== 15) throw new Error(`${id}: brief has ${brief.length} answers, expected 15`);
    if (!room.name || !room.type || !room.description) throw new Error(`${id}: room needs name, type, description`);

    return { meta, dir, brief, room };
  });
}
