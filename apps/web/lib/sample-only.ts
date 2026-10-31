import { notFound } from 'next/navigation';
import { isSample } from './api';

/** Roadmap, costs, and handoff exist only for the sample until Phase 2. */
export async function sampleOnly(params: Promise<{ id: string }>): Promise<string> {
  const { id } = await params;
  if (!isSample(id)) notFound();
  return id;
}
