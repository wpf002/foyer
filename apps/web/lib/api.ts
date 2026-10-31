import type { Board } from '@foyer/artifacts';
import type { Category, Effort, Path, Permit, Phase, Section } from './mock';

/** Sample project id. Everything else is read from the API. */
export const SAMPLE_ID = 'prescott';
export const isSample = (id: string) => id === SAMPLE_ID;

export interface ApiQuestion {
  id: string;
  section: Section;
  prompt: string;
  choices: string[] | null;
}

export interface ApiAnswer {
  id: string;
  questionId: string;
  section: Section;
  prompt: string;
  raw: string;
  parsed: { tags: string[]; flags: string[] } | null;
}

export interface ApiPhoto {
  id: string;
  url: string;
  analyzedAt: string | null;
}

export interface ApiRecommendation {
  id: string;
  roomId: string | null;
  briefAnswerId: string;
  citation: string;
  supportingQuestionIds: string[];
  category: Category;
  title: string;
  rationale: string;
  preserve: string | null;
  effort: Effort;
  needsProReview: boolean;
  board: Board | null;
}

/** Mirrors ScanSummary in @foyer/cost. */
export interface ApiScan {
  widthIn: number;
  lengthIn: number;
  ceilingIn: number;
  floorSqft: number;
  wallSqft: number;
  perimeterFt: number;
  walls: number;
  doors: number;
  windows: number;
  openings: number;
}

export interface ApiRoom {
  id: string;
  name: string;
  type: string;
  widthIn: number | null;
  lengthIn: number | null;
  ceilingIn: number | null;
  dimsFromScan: boolean;
  scan: ApiScan | null;
  fixedElements: string[] | null;
  movableElements: string[] | null;
  description: string | null;
  critique: { roomRead: string; leaveAlone: { element: string; reason: string; citation: string }[] } | null;
  critiquedAt: string | null;
  photos: ApiPhoto[];
  recommendations: ApiRecommendation[];
}

export interface ApiRoadmapItem {
  id: string;
  recommendationId: string | null;
  phase: Phase;
  order: number;
  scope: string;
  why: string;
  path: Path;
  permit: Permit;
  effort: Effort;
  lowCents: number | null;
  highCents: number | null;
  riskNote: string | null;
  dependsOn: { prerequisiteId: string; reason: string }[];
  cost: ApiCost | null;
}

export interface ApiCost {
  midCents: number;
  source: 'BASELINE_STATIC' | 'FOYER_FLYWHEEL' | string;
  regionFactor: number;
  workType: string | null;
  quantity: number | null;
  basis: string | null;
  localPoints: number;
  actualCents: number | null;
}

export interface ApiProject {
  id: string;
  name: string;
  zip: string;
  status: string;
  budgetLowCents: number | null;
  budgetHighCents: number | null;
  updatedAt: string;
  region: { factor: number; basis: 'metro' | 'state' | 'national'; state: string | null };
  brief: { completedAt: string | null; answers: ApiAnswer[] } | null;
  rooms: ApiRoom[];
  roadmapItems: ApiRoadmapItem[];
}

export interface ApiArtifactSummary {
  id: string;
  type: string;
  slug: string;
  title: string;
  version: number;
  generatedAt: string;
  sections: number;
}

export interface ApiProjectSummary {
  id: string;
  name: string;
  zip: string;
  status: string;
  updatedAt: string;
  briefComplete: boolean;
  rooms: number;
  clientName: string | null;
  roadmapItems: number;
  artifacts: number;
}

export type AccountKind = 'HOMEOWNER' | 'DESIGNER' | 'CONTRACTOR' | 'STAGER' | 'AGENT';

export const KIND_LABEL: Record<AccountKind, string> = {
  HOMEOWNER: 'Homeowner',
  DESIGNER: 'Designer',
  CONTRACTOR: 'Contractor',
  STAGER: 'Stager',
  AGENT: 'Agent',
};

export interface ApiMe {
  id: string;
  email: string;
  name: string | null;
  kind: AccountKind;
  zip: string | null;
  studio: string | null;
  license: string | null;
  pro: boolean;
}

export interface ApiPreparer {
  name: string | null;
  studio: string | null;
  license: string | null;
  kind: AccountKind;
}

export interface ApiShare {
  id: string;
  token: string;
  label: string | null;
  views: number;
  lastViewedAt: string | null;
  createdAt: string;
}

/** One line naming who prepared a document. */
export const preparedLine = (p: ApiPreparer | null) =>
  p ? [p.studio ?? p.name, p.license ? `Lic. ${p.license}` : null].filter(Boolean).join(' · ') || null : null;

/** Server-side base. Browser code uses the same-origin /api/v1 rewrite instead. */
const base = () => `${process.env.API_URL ?? 'http://localhost:4000'}/v1`;

export async function api<T>(path: string): Promise<T | null> {
  const res = await fetch(`${base()}${path}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return (await res.json()) as T;
}

/** Browser-side call. Throws the API's message so the UI can show it. */
export async function send<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const json = typeof init.body === 'string';
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: json ? { 'content-type': 'application/json', ...init.headers } : init.headers,
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) throw new Error(body.message ?? body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export const STATUS_LABEL: Record<string, string> = {
  INTAKE: 'Intake',
  ANALYZING: 'Analyzing',
  BRIEF_READY: 'Brief Ready',
  IN_PROGRESS: 'In Progress',
  ARCHIVED: 'Archived',
};

export function feetInches(inches: number | null): string | null {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}

/** Mirrors CostIndex in @foyer/cost. */
export interface ApiIndexCell {
  zip3: string;
  workType: string;
  label: string;
  unit: string;
  n: number;
  invoices: number;
  p25Cents: number;
  medianCents: number;
  p75Cents: number;
  baselineCents: number;
  delta: number;
  lastObserved: string;
}

export interface ApiCostIndex {
  cells: ApiIndexCell[];
  points: number;
  regions: number;
  workTypes: number;
  suppressed: number;
}
