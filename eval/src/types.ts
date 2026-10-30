import type { DimensionKey } from '@foyer/rubric';

export interface GoldenCase {
  id: string;
  dir: string;
  brief: { questionId: string; prompt: string; raw: string }[];
  room: { type: string; widthIn?: number; lengthIn?: number; ceilingIn?: number };
}

export interface JudgeResult {
  caseId: string;
  scores: Record<DimensionKey, { score: number; reason: string }>;
  failures: string[];
}
