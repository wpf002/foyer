import { Chip } from '@foyer/ui';
import { brief, project, SECTIONS } from '@/lib/mock';

export default function BriefPage() {
  return (
    <article>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[clamp(2.75rem,5vw,4rem)]">The Brief</h2>
          <p className="lede mt-3">Fifteen answers, in the client&rsquo;s words.</p>
        </div>
        <Chip tone="olive">{project.status}</Chip>
      </header>

      {SECTIONS.map((s) => (
        <section key={s.key} className="mt-16 grid gap-6 lg:grid-cols-[9rem_1fr] lg:gap-10">
          <div>
            <p className="font-display text-5xl leading-none text-clay/70">{s.n}</p>
            <h3 className="mt-2 text-[1.75rem]">{s.label}</h3>
          </div>
          <dl className="space-y-4">
            {brief
              .filter((a) => a.section === s.key)
              .map((a) => (
                <div key={a.id} id={a.questionId} className="card scroll-mt-24 p-6">
                  <dt className="flex items-center gap-2.5 text-sm text-ink-muted">
                    <span className="rounded-full bg-clay-soft px-2 py-0.5 text-xs font-medium text-clay-ink">
                      {a.questionId}
                    </span>
                    {a.prompt}
                  </dt>
                  <dd>
                    <p className="mt-3 font-display text-[1.6rem] leading-[1.2] text-ink">
                      &ldquo;{a.raw}&rdquo;
                    </p>
                    {a.parsed ? (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {a.parsed.map((p) => (
                          <Chip key={p}>{p}</Chip>
                        ))}
                      </div>
                    ) : null}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </article>
  );
}
