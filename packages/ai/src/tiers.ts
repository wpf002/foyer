/**
 * Model tiering. This app is a textbook tiering case: parsing a dropdown
 * answer and critiquing a room are not the same job and must not cost the
 * same. The router is the only place a model id is chosen.
 */
export type Tier = 'cheap' | 'reasoning' | 'vision' | 'judge';

export type Task =
  | 'parse_intake_answer'
  | 'classify_room_type'
  | 'normalize_free_text'
  | 'design_critique'
  | 'build_roadmap'
  | 'sequence_check'
  | 'analyze_photo'
  | 'judge_output';

const TASK_TIER: Record<Task, Tier> = {
  parse_intake_answer: 'cheap',
  classify_room_type: 'cheap',
  normalize_free_text: 'cheap',
  design_critique: 'reasoning',
  build_roadmap: 'reasoning',
  sequence_check: 'reasoning',
  analyze_photo: 'vision',
  judge_output: 'judge',
};

const ENV_KEY: Record<Tier, string> = {
  cheap: 'FOYER_MODEL_CHEAP',
  reasoning: 'FOYER_MODEL_REASONING',
  vision: 'FOYER_MODEL_VISION',
  judge: 'FOYER_MODEL_JUDGE',
};

const FALLBACK: Record<Tier, string> = {
  cheap: 'claude-haiku-5-5',
  reasoning: 'claude-opus-5-5',
  vision: 'claude-opus-5-5',
  judge: 'claude-sonnet-5-5',
};

export function tierFor(task: Task): Tier {
  return TASK_TIER[task];
}

export function modelFor(task: Task): string {
  const tier = tierFor(task);
  return process.env[ENV_KEY[tier]] ?? FALLBACK[tier];
}
