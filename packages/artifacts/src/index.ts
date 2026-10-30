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

export interface ArtifactSection {
  heading: string;
  /** Rendered as paragraphs, a table, or a checklist. */
  kind: 'prose' | 'table' | 'checklist';
  body: string[] | string[][];
}

export interface ArtifactDoc {
  type: ArtifactType;
  title: string;
  projectName: string;
  preparedFor: string;
  generatedAt: string;
  sections: ArtifactSection[];
}

export const SECTION_ORDER: Record<ArtifactType, string[]> = {
  CONTRACTOR_BRIEF: ['Scope Of Work', 'Preserve As Is', 'Sequencing', 'Site Constraints', 'Permits Flagged'],
  DESIGNER_BRIEF: ['Mood And Direction', 'Priority Areas', 'Budget Allocation', 'Pieces Retained', 'Avoid'],
  SHOPPING_LIST: ['By Room', 'Specifications', 'Budget Ranges'],
  PERMIT_CHECKLIST: ['Flagged Items', 'Local Resources', 'Before You File'],
  CONTRACTOR_QUESTIONS: ['By Scope Item', 'Red Flags To Listen For'],
};

export const TITLES: Record<ArtifactType, string> = {
  CONTRACTOR_BRIEF: 'Contractor Brief',
  DESIGNER_BRIEF: 'Designer Brief',
  SHOPPING_LIST: 'Shopping List',
  PERMIT_CHECKLIST: 'Permit Checklist',
  CONTRACTOR_QUESTIONS: 'Questions For Your Contractor',
};

/**
 * PDF assembly lands here in Phase 4 (Puppeteer against the artifact route in
 * apps/web, so the PDF and the on-screen document cannot drift apart).
 */
export async function renderPdf(_doc: ArtifactDoc): Promise<Buffer> {
  throw new Error('renderPdf lands in Phase 4');
}
