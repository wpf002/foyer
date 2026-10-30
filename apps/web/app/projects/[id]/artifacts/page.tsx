import Link from 'next/link';
import { Chip, cx, Material, type Finish } from '@foyer/ui';
import { artifacts } from '@/lib/mock';

/** A cover finish per document, so the set reads as a set of bound briefs. */
const COVER: Record<string, Finish> = {
  'contractor-brief': 'walnut',
  'designer-brief': 'linen',
  'shopping-list': 'oak',
  'permit-checklist': 'plaster',
  'contractor-questions': 'terracotta',
};

export default async function ArtifactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <article>
      <header>
        <h2 className="text-[clamp(2.75rem,5vw,4rem)]">Handoff</h2>
        <p className="lede mt-3">One plan, cut for each person doing the work.</p>
      </header>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2">
        {artifacts.map((a, i) => {
          const body = (
            <>
              <Material
                finish={COVER[a.slug] ?? 'plaster'}
                className={cx('w-full rounded-t-md', i === 0 ? 'h-44' : 'h-28')}
              />
              <div className="p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[1.75rem] leading-tight">{a.title}</h3>
                  {a.ready ? (
                    <span className="shrink-0 text-sm text-ink-faint">{a.pages} Pages</span>
                  ) : (
                    <Chip tone="brass">Phase 4</Chip>
                  )}
                </div>
                <p className="mt-2 text-ink-muted">{a.note}</p>
              </div>
            </>
          );

          return (
            <li key={a.slug} className={i === 0 ? 'sm:col-span-2' : undefined}>
              {a.ready ? (
                <Link
                  href={`/projects/${id}/artifacts/${a.slug}`}
                  className="card card-lift block h-full"
                >
                  {body}
                </Link>
              ) : (
                <div className="card h-full opacity-60">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-sm text-ink-faint">Opens in the browser. Prints to PDF.</p>
    </article>
  );
}
