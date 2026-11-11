import { notFound } from 'next/navigation';
import { Chip, titleCase } from '@foyer/ui';
import { api, isSample, STATUS_LABEL, type ApiProject } from '@/lib/api';
import { brief, project, SECTIONS, type Section } from '@/lib/mock';

/** Flags are internal keys; show the client a plain label. */
const FLAG_LABEL: Record<string, string> = {
  possible_structural_change: 'Possible Structural Work',
  historic_district_unknown: 'Historic District Unknown',
  hoa_review: 'HOA Review',
  renter: 'Renter',
  hard_deadline: 'Hard Deadline',
  large_pet: 'Large Pet',
  young_children: 'Young Children',
  multigenerational: 'Multigenerational',
  accessibility_need: 'Accessibility Need',
  hand_measured: 'Hand-Measured',
  no_measurements: 'No Measurements',
};

/** Q12 tags saved before 0.3.1 used an internal scale. */
const LEGACY_TAG: Record<string, string> = {
  'Low quiet': 'Open Display',
  'Medium quiet': 'Some Display',
  'High quiet': 'Minimal Display',
  'Display welcome': 'Collections Welcome',
};
const tagLabel = (tag: string) => LEGACY_TAG[tag] ?? titleCase(tag);

interface Entry {
  id: string;
  questionId: string;
  section: Section;
  prompt: string;
  raw: string;
  parsed?: string[] | null;
}

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let entries: Entry[];
  let status: string;
  if (isSample(id)) {
    entries = brief;
    status = project.status;
  } else {
    const p = await api<ApiProject>(`/projects/${id}`);
    if (!p) notFound();
    entries = (p.brief?.answers ?? []).map((a) => ({
      ...a,
      parsed: a.parsed
        ? [...new Set([...a.parsed.tags.map(tagLabel), ...a.parsed.flags.map((f) => FLAG_LABEL[f] ?? titleCase(f))])]
        : null,
    }));
    status = STATUS_LABEL[p.status] ?? p.status;
  }

  return (
    <article>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[clamp(2.75rem,5vw,4rem)]">The Brief</h2>
          <p className="lede mt-3">{entries.length} answers, in the client&rsquo;s words.</p>
        </div>
        <Chip tone="olive">{status}</Chip>
      </header>

      {SECTIONS.map((s) => {
        const rows = entries.filter((a) => a.section === s.key);
        if (!rows.length) return null;
        return (
          <section key={s.key} className="mt-16 grid gap-6 lg:grid-cols-[9rem_1fr] lg:gap-10">
            <div>
              <p className="font-display text-5xl leading-none text-clay/70">{s.n}</p>
              <h3 className="mt-2 text-[1.75rem]">{s.label}</h3>
            </div>
            <dl className="space-y-4">
              {rows.map((a) => (
                <div key={a.id} id={a.questionId} className="card scroll-mt-24 p-6">
                  <dt className="flex items-center gap-2.5 text-sm text-ink-muted">
                    <span className="rounded-full bg-clay-soft px-2 py-0.5 text-xs font-medium text-clay-ink">
                      {a.questionId}
                    </span>
                    {a.prompt}
                  </dt>
                  <dd>
                    <p className="mt-3 font-display text-[1.6rem] leading-[1.2] text-ink">&ldquo;{a.raw}&rdquo;</p>
                    {a.parsed?.length ? (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {a.parsed.map((t) => (
                          <Chip key={t}>{t}</Chip>
                        ))}
                      </div>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </article>
  );
}
