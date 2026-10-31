/**
 * Handoff artifacts. The pro product. Each type has a fixed section order so
 * a contractor who has read one has read them all.
 */
export const ARTIFACT_TYPES = [
  'CONTRACTOR_BRIEF',
  'DESIGNER_BRIEF',
  'SHOPPING_LIST',
  'PERMIT_CHECKLIST',
  'CONTRACTOR_QUESTIONS',
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export type Block =
  | { kind: 'prose'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'checklist'; items: string[] }
  | { kind: 'lines'; groups: { label?: string; rows: { label: string; value: string }[] }[] }
  | { kind: 'notes'; tone?: 'danger'; items: { title: string; body: string }[] }
  | { kind: 'quotes'; items: { cite: string; text: string }[] }
  | { kind: 'questions'; groups: { label: string; items: string[] }[] };

export interface Section {
  heading: string;
  blocks: Block[];
}

export interface ArtifactDoc {
  type: ArtifactType;
  title: string;
  projectName: string;
  location: string;
  issuedAt: string;
  sections: Section[];
}

export const TITLES: Record<ArtifactType, string> = {
  CONTRACTOR_BRIEF: 'Contractor Brief',
  DESIGNER_BRIEF: 'Designer Brief',
  SHOPPING_LIST: 'Shopping List',
  PERMIT_CHECKLIST: 'Permit Checklist',
  CONTRACTOR_QUESTIONS: 'Questions For Your Contractor',
};

/** URL slug per type. */
export const SLUG: Record<ArtifactType, string> = {
  CONTRACTOR_BRIEF: 'contractor-brief',
  DESIGNER_BRIEF: 'designer-brief',
  SHOPPING_LIST: 'shopping-list',
  PERMIT_CHECKLIST: 'permit-checklist',
  CONTRACTOR_QUESTIONS: 'contractor-questions',
};

export const typeOfSlug = (slug: string): ArtifactType | undefined =>
  ARTIFACT_TYPES.find((t) => SLUG[t] === slug);
