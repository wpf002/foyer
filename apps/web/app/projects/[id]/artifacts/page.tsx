import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ARTIFACT_TYPES, buildArtifact, SLUG, TITLES } from '@foyer/artifacts';
import { cx, Material, type Finish } from '@foyer/ui';
import { GenerateArtifacts } from '@/components/artifact-tools';
import { api, isSample, type ApiArtifactSummary, type ApiProject } from '@/lib/api';
import { sampleInput } from '@/lib/sample-artifacts';

/** A cover finish per document, so the set reads as a set of bound briefs. */
const COVER: Record<string, Finish> = {
  'contractor-brief': 'walnut',
  'designer-brief': 'linen',
  'shopping-list': 'oak',
  'permit-checklist': 'plaster',
  'contractor-questions': 'terracotta',
};

const NOTE: Record<string, string> = {
  'contractor-brief': 'Scope, preserves, sequencing, permits.',
  'designer-brief': 'Mood, priorities, money, pieces retained.',
  'shopping-list': 'Ranges by room.',
  'permit-checklist': 'Flags, licensed work, local filing.',
  'contractor-questions': 'Questions per hired scope item.',
};

interface Card {
  slug: string;
  title: string;
  sections: number;
  version: number | null;
}

const stamp = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default async function ArtifactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let cards: Card[];
  let live: { hasRoadmap: boolean; generated: string | null } | null = null;

  if (isSample(id)) {
    const input = sampleInput();
    cards = ARTIFACT_TYPES.map((t) => ({
      slug: SLUG[t],
      title: TITLES[t],
      sections: buildArtifact(t, input).sections.length,
      version: null,
    }));
  } else {
    const [p, list] = await Promise.all([
      api<ApiProject>(`/projects/${id}`),
      api<ApiArtifactSummary[]>(`/projects/${id}/artifacts`),
    ]);
    if (!p || !list) notFound();
    cards = list.map((a) => ({ slug: a.slug, title: a.title, sections: a.sections, version: a.version }));
    const newest = list.map((a) => a.generatedAt).sort().at(-1) ?? null;
    live = { hasRoadmap: p.roadmapItems.length > 0, generated: newest };
  }

  return (
    <article>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-[clamp(2.75rem,5vw,4rem)]">Handoff</h2>
          <p className="lede mt-3">One plan, cut for each person doing the work.</p>
        </div>
        {live?.hasRoadmap ? (
          <div className="flex items-center gap-4">
            {live.generated ? <span className="text-sm text-ink-faint">Written {stamp(live.generated)}</span> : null}
            <GenerateArtifacts projectId={id} again={!!live.generated} />
          </div>
        ) : null}
      </header>

      {live && !live.hasRoadmap ? (
        <p className="mt-10 text-ink-muted">
          <Link href={`/projects/${id}/roadmap`} className="text-clay underline-offset-4 hover:underline">
            Build The Roadmap
          </Link>{' '}
          first.
        </p>
      ) : null}

      {cards.length ? (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {cards.map((a, i) => (
            <li key={a.slug} className={i === 0 ? 'sm:col-span-2' : undefined}>
              <Link href={`/projects/${id}/artifacts/${a.slug}`} className="card card-lift block h-full">
                <Material
                  finish={COVER[a.slug] ?? 'plaster'}
                  className={cx('w-full rounded-t-md', i === 0 ? 'h-44' : 'h-28')}
                />
                <div className="p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[1.75rem] leading-tight">{a.title}</h3>
                    <span className="shrink-0 text-sm text-ink-faint tabular-nums">
                      {a.sections} Sections{a.version ? ` · v${a.version}` : ''}
                    </span>
                  </div>
                  <p className="mt-2 text-ink-muted">{NOTE[a.slug]}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
