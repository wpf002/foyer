import { cx } from '@foyer/ui';
import type { ArtifactDoc, Block } from '@foyer/artifacts';
import { KIND_LABEL, type ApiPreparer } from '@/lib/api';

const issued = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div>
      {rows.map((r, i) => (
        <div
          key={`${r.label}-${i}`}
          className="grid gap-1 border-b border-line py-3 last:border-0 sm:grid-cols-[1fr_auto] sm:gap-6"
        >
          <p className="text-sm text-ink">{r.label}</p>
          <p className="text-sm text-ink-muted tabular-nums sm:text-right">{r.value}</p>
        </div>
      ))}
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.kind) {
    case 'prose':
      return <p className="text-sm leading-relaxed text-ink-muted">{b.text}</p>;
    case 'bullets':
      return (
        <ul className="grid gap-2">
          {b.items.map((t, i) => (
            <li key={i} className="grid grid-cols-[0.75rem_1fr] gap-2 text-sm text-ink-muted">
              <span aria-hidden className="mt-2 size-1.5 rounded-full bg-clay/60" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      );
    case 'checklist':
      return (
        <ul className="grid gap-2.5">
          {b.items.map((t, i) => (
            <li key={i} className="grid grid-cols-[1rem_1fr] gap-3 text-sm text-ink-muted">
              <span aria-hidden className="mt-0.5 size-3.5 rounded-xs border border-line-strong" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      );
    case 'lines':
      return (
        <div className="grid gap-7">
          {b.groups.map((g, i) => (
            <div key={g.label ?? i}>
              {g.label ? <p className="eyebrow">{g.label}</p> : null}
              <div className={g.label ? 'mt-1.5' : undefined}>
                <Rows rows={g.rows} />
              </div>
            </div>
          ))}
        </div>
      );
    case 'notes':
      return (
        <div className="grid gap-4">
          {b.items.map((n, i) => (
            <div
              key={i}
              className={cx('break-inside-avoid border-l-2 pl-3', b.tone === 'danger' ? 'border-danger' : 'border-line-strong')}
            >
              <p className={cx('text-sm text-ink', b.tone === 'danger' && 'font-medium')}>{n.title}</p>
              <p className="mt-1 text-sm text-ink-muted">{n.body}</p>
            </div>
          ))}
        </div>
      );
    case 'quotes':
      return (
        <div className="grid gap-5">
          {b.items.map((q, i) => (
            <figure key={i} className="break-inside-avoid">
              <figcaption className="eyebrow">{q.cite}</figcaption>
              <blockquote className="mt-1.5 font-display text-lg leading-snug text-ink">{q.text}</blockquote>
            </figure>
          ))}
        </div>
      );
    case 'questions':
      return (
        <div className="grid gap-7">
          {b.groups.map((g) => (
            <div key={g.label} className="break-inside-avoid">
              <p className="eyebrow">{g.label}</p>
              <ol className="mt-2 grid gap-2">
                {g.items.map((q, i) => (
                  <li key={i} className="grid grid-cols-[1.5rem_1fr] text-sm text-ink-muted">
                    <span className="tabular-nums text-ink-faint">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      );
  }
}

/** A handoff document. The same markup prints to PDF. */
export function ArtifactDocView({
  doc,
  version,
  strip,
  preparedBy,
}: {
  doc: ArtifactDoc;
  version?: number;
  strip?: React.ReactNode;
  preparedBy?: ApiPreparer | null;
}) {
  const studio = preparedBy?.studio ?? null;
  const preparer = preparedBy
    ? [preparedBy.name ?? KIND_LABEL[preparedBy.kind], preparedBy.license ? `Lic. ${preparedBy.license}` : null]
        .filter(Boolean)
        .join(' · ')
    : null;
  const meta: [string, string][] = [
    ...(preparer ? ([['Prepared By', preparer]] as [string, string][]) : []),
    ['Project', doc.projectName],
    ['Location', doc.location],
    ['Issued', issued(doc.issuedAt)],
    [version ? 'Version' : 'Sections', version ? `v${version}` : String(doc.sections.length)],
  ];
  return (
    <article className="card mx-auto mt-6 max-w-[48rem] overflow-hidden print:mt-0 print:max-w-none print:border-0">
      {strip}
      <div className="px-9 py-12 sm:px-14 sm:py-16 print:p-0">
        <header className="border-b border-line-strong pb-6">
          <p className="text-sm text-ink-faint">{studio ?? 'Foyer'} &middot; {doc.projectName}</p>
          <h1 className="mt-2 text-[3rem] leading-none">{doc.title}</h1>
          <dl className="mt-7 grid gap-x-8 gap-y-1.5 text-sm text-ink-muted sm:grid-cols-2 print:grid-cols-2">
            {meta.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line pb-1.5">
                <dt className="text-ink-faint">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </header>

        {doc.sections.map((s, i) => (
          <section key={s.heading} className="mt-10 grid gap-3 lg:grid-cols-[2.5rem_1fr] print:grid-cols-[2.5rem_1fr]">
            <p className="font-display text-2xl leading-none text-clay/70">{i + 1}</p>
            <div className="min-w-0">
              <h2 className="break-after-avoid text-[1.75rem] leading-tight">{s.heading}</h2>
              <div className="mt-4 grid gap-5">
                {s.blocks.map((b, j) => (
                  <BlockView key={j} b={b} />
                ))}
              </div>
            </div>
          </section>
        ))}

        <footer className="mt-12 break-inside-avoid border-t border-line-strong pt-5">
          <p className="text-xs leading-relaxed text-ink-muted">
            Cost figures are ranges derived from a regional baseline, not bids. Foyer does not make
            structural or permit determinations. Items marked for professional review require a
            licensed engineer or contractor before work begins.
          </p>
        </footer>
      </div>
    </article>
  );
}
