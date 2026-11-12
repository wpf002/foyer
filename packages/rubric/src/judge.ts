import { call, type ModelUsage } from '@foyer/ai';
import { CODE_SCORED, DIMENSION_KEYS, type DimensionKey } from './rubric';
import { caps, type CheckFailure } from './checks';
import type { BriefEntry } from './intake';
import type { Critique, RoomInput } from './critique';
import { briefBlock, judgeSystemPrompt, roomMessage } from './prompts';

export interface DimensionScore {
  score: number;
  reason: string;
  /** Set when an automated check lowered the judge's score. */
  cappedFrom?: number;
  /** Judge's own score on a code-scored dimension. Advisory only. */
  judgeScore?: number;
}

export interface Judgement {
  scores: Record<DimensionKey, DimensionScore>;
  failures: string[];
  mean: number;
}

export interface JudgeResult {
  judgement: Judgement;
  model: string;
  usage: ModelUsage;
}

const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));

/** Normalize the judge reply and apply check caps. Missing dimensions score 1. */
export function applyCaps(raw: unknown, checks: CheckFailure[]): Judgement {
  const o = (raw ?? {}) as { scores?: Record<string, { score?: unknown; reason?: unknown }>; failures?: unknown };
  const limit = caps(checks);
  const scores = {} as Record<DimensionKey, DimensionScore>;

  for (const k of DIMENSION_KEYS) {
    const s = o.scores?.[k];
    const given = typeof s?.score === 'number' && Number.isFinite(s.score) ? clamp(s.score) : 1;
    const reason = typeof s?.reason === 'string' ? s.reason : 'Judge returned no score for this dimension';
    const cap = limit[k];
    if (CODE_SCORED.includes(k)) {
      const own = checks.filter((c) => c.dimension === k).map((c) => c.message);
      scores[k] = { score: cap ?? 5, reason: own.length ? own.join('; ') : 'All automated checks passed', judgeScore: given };
      continue;
    }
    scores[k] = cap !== undefined && given > cap ? { score: cap, reason, cappedFrom: given } : { score: given, reason };
  }

  const judgeFailures = Array.isArray(o.failures) ? o.failures.filter((f): f is string => typeof f === 'string') : [];
  const failures = [...checks.map((c) => `[check] ${c.message}`), ...judgeFailures];
  const mean = DIMENSION_KEYS.reduce((n, k) => n + scores[k].score, 0) / DIMENSION_KEYS.length;
  return { scores, failures, mean: Number(mean.toFixed(2)) };
}

export async function judge(
  brief: BriefEntry[],
  room: RoomInput,
  critique: Critique,
  checks: CheckFailure[],
  userId: string,
  /** Priced items and total, as the app shows them. The critique model never sees prices. */
  pricing?: string,
): Promise<JudgeResult> {
  const res = await call({
    task: 'judge_output',
    userId,
    system: [
      { text: judgeSystemPrompt(), cache: true },
      { text: briefBlock(brief), cache: true },
    ],
    messages: [
      {
        role: 'user',
        content: [
          roomMessage(room),
          '',
          '## Critique',
          JSON.stringify(critique, null, 2),
          '',
          '## Automated checks',
          checks.length ? checks.map((c) => `- ${c.dimension} (cap ${c.cap}): ${c.message}`).join('\n') : '- all passed',
          ...(pricing ? ['', '## Priced items', pricing] : []),
        ].join('\n'),
      },
    ],
    maxTokens: 8000,
    json: true,
  });
  return { judgement: applyCaps(res.parsed, checks), model: res.model, usage: res.usage };
}
