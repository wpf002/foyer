import { isSample } from '@/lib/api';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Material, MoneyRange, money } from '@foyer/ui';
import { PrintButton } from '@/components/print-button';
import {
  answerFor,
  artifacts,
  itemFor,
  palette,
  PATH_LABEL,
  PERMIT_LABEL,
  PHASES,
  project,
  recommendations,
  roadmap,
  roomFor,
} from '@/lib/mock';

interface Block {
  heading: string;
  body: ReactNode;
}

/* -------------------------------------------------------------------------- */
/* Document pieces. Prints cleanly; no decoration that needs colour.          */
/* -------------------------------------------------------------------------- */

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 last:border-0 sm:grid-cols-[1fr_auto] sm:gap-6">
      <p className="text-sm text-ink">{label}</p>
      <div className="text-sm text-ink-muted tabular-nums sm:text-right">{children}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((t) => (
        <li key={t} className="grid grid-cols-[0.75rem_1fr] gap-2 text-sm text-ink-muted">
          <span aria-hidden className="mt-2 size-1.5 rounded-full bg-clay/60" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function blocksFor(slug: string): Block[] {
  const flagged = roadmap.filter((r) => r.permit !== 'NONE');
  const risky = roadmap.filter((r) => r.riskNote);
  const preserved = recommendations.filter((r) => r.preserve);

  if (slug === 'contractor-brief') {
    return [
      {
        heading: 'Scope, In Order',
        body: (
          <div className="grid gap-7">
            {PHASES.map((p) => (
              <div key={p.key}>
                <p className="eyebrow">{p.label}</p>
                <div className="mt-1.5">
                  {roadmap
                    .filter((r) => r.phase === p.key)
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                      <Line key={item.id} label={`${item.order}. ${item.scope}`}>
                        {PATH_LABEL[item.path]} &middot;{' '}
                        <MoneyRange
                          lowCents={item.lowCents}
                          highCents={item.highCents}
                          className="text-sm"
                        />
                      </Line>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        heading: 'Do Not Touch',
        body: <Bullets items={preserved.map((r) => r.preserve!)} />,
      },
      {
        heading: 'Sequencing Constraints',
        body: (
          <div className="grid gap-4">
            {roadmap
              .filter((r) => r.dependsOn)
              .map((r) => {
                const dep = itemFor(r.dependsOn!.id);
                return (
                  <div key={r.id} className="border-l-2 border-line-strong pl-3">
                    <p className="text-sm text-ink">
                      {r.scope} follows {dep?.scope ?? r.dependsOn!.id}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">{r.dependsOn!.reason}</p>
                  </div>
                );
              })}
          </div>
        ),
      },
      {
        heading: 'Permits Flagged',
        body: (
          <div>
            {flagged.map((r) => (
              <Line key={r.id} label={r.scope}>
                {PERMIT_LABEL[r.permit]}
              </Line>
            ))}
            <p className="mt-4 text-sm text-ink-muted">
              Flags come from a rules table, not a judgment call. The permitting authority decides.
            </p>
          </div>
        ),
      },
      {
        heading: 'Professional Review Required',
        body: (
          <div className="grid gap-4">
            {risky.map((r) => (
              <div key={r.id} className="border-l-2 border-danger pl-3">
                <p className="text-sm font-medium text-ink">{r.scope}</p>
                <p className="mt-1 text-sm text-ink-muted">{r.riskNote}</p>
              </div>
            ))}
          </div>
        ),
      },
    ];
  }

  if (slug === 'designer-brief') {
    const ids = ['a07', 'a09', 'a12'];
    return [
      {
        heading: 'The Mood, In Their Words',
        body: (
          <div className="grid gap-5">
            {ids.map((id) => {
              const a = answerFor(id);
              return (
                <div key={id}>
                  <p className="eyebrow">
                    {a.questionId} &middot; {a.short}
                  </p>
                  <p className="mt-1.5 font-display text-lg leading-snug text-ink">{a.raw}</p>
                </div>
              );
            })}
          </div>
        ),
      },
      {
        heading: 'Vetoes',
        body: <p className="text-sm text-ink-muted">{answerFor('a11').raw}</p>,
      },
      {
        heading: 'Staying Exactly As It Is',
        body: (
          <Bullets items={[answerFor('a10').raw, ...preserved.map((r) => r.preserve!)]} />
        ),
      },
      {
        heading: 'Where The Money Goes',
        body: (
          <div>
            {PHASES.map((p) => {
              const mid = roadmap
                .filter((r) => r.phase === p.key)
                .reduce((n, r) => n + r.midCents, 0);
              return (
                <Line key={p.key} label={p.label}>
                  {money(mid)} mid
                </Line>
              );
            })}
          </div>
        ),
      },
    ];
  }

  if (slug === 'shopping-list') {
    return [
      {
        heading: 'By Room',
        body: (
          <div className="grid gap-7">
            {Array.from(new Set(recommendations.map((r) => r.roomId))).map((roomId) => {
              const room = roomFor(roomId);
              return (
                <div key={roomId}>
                  <p className="eyebrow">{room?.name ?? roomId}</p>
                  <div className="mt-1.5">
                    {recommendations
                      .filter((r) => r.roomId === roomId)
                      .map((r) => (
                        <Line key={r.id} label={r.title}>
                          {answerFor(r.briefAnswerId).questionId}
                        </Line>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        ),
      },
      {
        heading: 'Budget Envelope',
        body: (
          <div>
            <Line label="Roadmap, full">
              <MoneyRange
                lowCents={roadmap.reduce((n, r) => n + r.lowCents, 0)}
                highCents={roadmap.reduce((n, r) => n + r.highCents, 0)}
                className="text-sm"
              />
            </Line>
            <Line label="Stated band">
              <MoneyRange
                lowCents={project.budgetLowCents}
                highCents={project.budgetHighCents}
                className="text-sm"
              />
            </Line>
            <p className="mt-4 text-sm text-ink-muted">
              Specifications are written to a range, not a SKU. Substitute freely inside the range.
            </p>
          </div>
        ),
      },
    ];
  }

  if (slug === 'permit-checklist') {
    return [
      {
        heading: 'Flagged Items',
        body: (
          <div>
            {flagged.map((r) => (
              <Line key={r.id} label={r.scope}>
                {PERMIT_LABEL[r.permit]}
              </Line>
            ))}
          </div>
        ),
      },
      {
        heading: 'What To Confirm Locally',
        body: (
          <Bullets
            items={[
              `Permit requirements for zip ${project.zip} are set by the local building department, not by Foyer.`,
              'Electrical work adding circuits usually requires a permit and a licensed electrician.',
              'Any wall opening requires a structural determination before demolition.',
              'Ask your contractor to pull permits in their name and show you the issued copy.',
            ]}
          />
        ),
      },
      {
        heading: 'Structural Items',
        body: (
          <div className="grid gap-4">
            {risky.map((r) => (
              <div key={r.id} className="border-l-2 border-danger pl-3">
                <p className="text-sm font-medium text-ink">{r.scope}</p>
                <p className="mt-1 text-sm text-ink-muted">{r.riskNote}</p>
              </div>
            ))}
          </div>
        ),
      },
    ];
  }

  return [];
}

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ id: string; type: string }>;
}) {
  const { id, type } = await params;
  if (!isSample(id)) notFound();
  const meta = artifacts.find((a) => a.slug === type);
  if (!meta) notFound();

  const blocks = blocksFor(type);

  return (
    <div>
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/projects/${id}/artifacts`}
          className="text-sm text-ink-muted transition-colors hover:text-clay"
        >
          &larr; Handoff
        </Link>
        <PrintButton />
      </div>

      <article className="card mx-auto mt-6 max-w-[48rem] overflow-hidden">
        <div className="grid h-3 grid-cols-6 print:hidden">
          {palette.map((f) => (
            <Material key={f.name} finish={f.finish} className="h-full" />
          ))}
        </div>
        <div className="px-9 py-12 sm:px-14 sm:py-16">
        <header className="border-b border-line-strong pb-6">
          <p className="text-sm text-ink-faint">Foyer &middot; {project.name}</p>
          <h1 className="mt-2 text-[3rem] leading-none">{meta.title}</h1>
          <dl className="mt-7 grid gap-x-8 gap-y-1.5 text-sm text-ink-muted sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-b border-line pb-1.5">
              <dt className="text-ink-faint">Project</dt>
              <dd>{project.name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-1.5">
              <dt className="text-ink-faint">Location</dt>
              <dd>
                {project.city} {project.zip}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-1.5">
              <dt className="text-ink-faint">Issued</dt>
              <dd>{project.updated}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-1.5">
              <dt className="text-ink-faint">Pages</dt>
              <dd>{meta.pages}</dd>
            </div>
          </dl>
        </header>

        {blocks.length === 0 ? (
          <p className="py-14 text-center text-sm text-ink-muted">
            This document lands in Phase 4.
          </p>
        ) : (
          blocks.map((b, i) => (
            <section key={b.heading} className="mt-10 grid gap-3 lg:grid-cols-[2.5rem_1fr]">
              <p className="font-display text-2xl leading-none text-clay/70">{i + 1}</p>
              <div className="min-w-0">
                <h2 className="text-[1.75rem] leading-tight">{b.heading}</h2>
                <div className="mt-4">{b.body}</div>
              </div>
            </section>
          ))
        )}

        <footer className="mt-12 border-t border-line-strong pt-5">
          <p className="text-xs leading-relaxed text-ink-muted">
            Cost figures are ranges derived from a regional baseline, not bids. Foyer does not make
            structural or permit determinations. Items marked for professional review require a
            licensed engineer or contractor before work begins.
          </p>
        </footer>
        </div>
      </article>
    </div>
  );
}
