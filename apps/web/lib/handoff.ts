import type { Finish } from '@foyer/ui';

/** A cover finish per document, so the set reads as a set of bound briefs. */
export const COVER: Record<string, Finish> = {
  'contractor-brief': 'walnut',
  'designer-brief': 'linen',
  'shopping-list': 'oak',
  'permit-checklist': 'plaster',
  'contractor-questions': 'terracotta',
};

export const NOTE: Record<string, string> = {
  'contractor-brief': 'Scope, preserves, sequencing, permits.',
  'designer-brief': 'Mood, priorities, money, pieces retained.',
  'shopping-list': 'Ranges by room.',
  'permit-checklist': 'Flags, licensed work, local filing.',
  'contractor-questions': 'Questions per hired scope item.',
};
