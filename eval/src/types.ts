import type { BriefEntry, CheckFailure, Critique, Judgement, RawAnswer, RoomInput } from '@foyer/rubric';

/** Coverage tags the golden-set README requires. */
export type CaseTag = 'leave-alone' | 'load-bearing' | 'permit' | 'small-budget' | 'renter';

export interface CaseMeta {
  id: string;
  /**
   * real: a homeowner's room and brief. stock: a licensed stock photo with a
   * written brief; counts toward the gate. synthetic: pipeline smoke test only.
   */
  source: 'real' | 'stock' | 'synthetic';
  tags: CaseTag[];
  photos?: { file: string; unsplashId?: string; by?: string; license?: string }[];
}

export interface GoldenCase {
  meta: CaseMeta;
  dir: string;
  brief: RawAnswer[];
  room: RoomInput;
}

export interface CaseResult {
  caseId: string;
  source: CaseMeta['source'];
  brief: BriefEntry[];
  critique: Critique;
  checks: CheckFailure[];
  judgement: Judgement;
}
