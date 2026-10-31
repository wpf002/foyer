import { notFound } from 'next/navigation';
import { isSample } from './api';

/** Costs and handoff exist only for the sample until Phases 3 and 4. */
export async function sampleOnly(params: Promise<{ id: string }>): Promise<string> {
  const { id } = await params;
  if (!isSample(id)) notFound();
  return id;
}
