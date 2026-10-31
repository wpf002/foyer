import { ledger } from './spend';
import { ModelError } from './model';

/**
 * Concept renders through fal.ai FLUX.1 Kontext. Edits the room photo in place
 * so walls, openings, and camera angle stay put. Server-side only: FAL_KEY is
 * read here and never sent to a browser.
 */
export const RENDER_MODEL = 'fal-ai/flux-pro/kontext';
/** Flat per-image price, checked against the spend cap before the call. */
export const RENDER_COST_USD = 0.04;

export interface ConceptInput {
  title: string;
  rationale: string;
  preserve: string | null;
  /** Finish and spec lines from the material board, e.g. "Walls: limewash, warm white". */
  specs: string[];
}

/** Built only from the recommendation, so a render can't show a change the plan doesn't make. */
export function conceptPrompt(c: ConceptInput): string {
  return [
    `Edit this interior photo to show one change: ${c.title}.`,
    c.specs.length ? `Materials: ${c.specs.join('; ')}.` : '',
    c.preserve ? `Leave unchanged: ${c.preserve}.` : '',
    'Keep the walls, windows, doors, ceiling, floor plan, furniture placement, lighting direction, and camera angle exactly as they are.',
    'Photorealistic interior photograph. No text, people, or watermarks.',
  ]
    .filter(Boolean)
    .join(' ');
}

export const renderConfigured = () => !!process.env.FAL_KEY;

export interface ConceptResult {
  bytes: Buffer;
  mime: string;
  seed: number | null;
  model: string;
}

export async function renderConcept(opts: { userId: string; prompt: string; image: { mime: string; data: string } }): Promise<ConceptResult> {
  const key = process.env.FAL_KEY;
  if (!key) throw new ModelError('FAL_KEY is not set', 503);
  ledger.assertHeadroom(opts.userId, RENDER_COST_USD);

  const res = await fetch(`https://fal.run/${RENDER_MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: opts.prompt,
      image_url: `data:${opts.image.mime};base64,${opts.image.data}`,
      num_images: 1,
      output_format: 'jpeg',
      safety_tolerance: '2',
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new ModelError(`fal ${res.status}: ${(await res.text()).slice(0, 200)}`, res.status === 401 ? 503 : 502);
  const out = (await res.json()) as { images?: { url: string; content_type?: string }[]; seed?: number };
  const img = out.images?.[0];
  if (!img?.url) throw new ModelError('fal returned no image', 502);
  ledger.record(opts.userId, RENDER_COST_USD);

  // fal URLs expire. Keep the bytes.
  const file = await fetch(img.url, { signal: AbortSignal.timeout(60_000) });
  if (!file.ok) throw new ModelError(`fal image ${file.status}`, 502);
  return {
    bytes: Buffer.from(await file.arrayBuffer()),
    mime: img.content_type ?? 'image/jpeg',
    seed: typeof out.seed === 'number' ? out.seed : null,
    model: RENDER_MODEL,
  };
}
