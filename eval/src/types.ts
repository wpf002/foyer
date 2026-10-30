import type { BriefEntry, CheckFailure, Critique, Judgement, RawAnswer, RoomInput } from '@foyer/rubric';

/** Coverage tags the golden-set README requires. */
export type CaseTag = 'leave-alone' | 'load-bearing' | 'permit' | 'small-budget' | 'renter';

export interface CaseMeta {
  id: string;
  /** Synthetic cases run but never count toward the gate. */
  source: 'real' | 'synthetic';
  tags: CaseTag[];
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
