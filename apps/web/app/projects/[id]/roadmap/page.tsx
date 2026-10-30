import { Chip, MoneyRange, type Tone } from '@foyer/ui';
import {
  EFFORT_LABEL,
  itemFor,
  PATH_LABEL,
  PERMIT_LABEL,
  PHASES,
  roadmap,
  type Permit,
} from '@/lib/mock';

const PERMIT_TONE: Record<Permit, Tone> = {
  NONE: 'neutral',
  LIKELY: 'brass',
  REQUIRED: 'danger',
  UNKNOWN: 'brass',
};

export default function RoadmapPage() {
  return (
    <article>
      <header>
        <h2 className="text-[clamp(2.75rem,5vw,4rem)]">Roadmap</h2>
        <p className="lede mt-3">Three phases. Each waits on the one before.</p>
      </header>

      {PHASES.map((phase) => {
        const items = roadmap
          .filter((r) => r.phase === phase.key)
          .sort((a, b) => a.order - b.order);
        const low = items.reduce((n, r) => n + r.lowCents, 0);
        const high = items.reduce((n, r) => n + r.highCents, 0);

        return (
          <section key={phase.key} className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-5xl leading-none text-clay/70">{phase.n}</span>
                <div>
                  <h3 className="text-[2rem]">{phase.label}</h3>
                  <p className="mt-1 text-sm text-ink-faint">{phase.band}</p>
                </div>
              </div>
              <MoneyRange lowCents={low} highCents={high} className="font-display text-2xl text-brass" />
            </div>

            <ol className="mt-6 space-y-4">
              {items.map((item) => {
                const dep = item.dependsOn ? itemFor(item.dependsOn.id) : undefined;
                return (
                  <li key={item.id}>
                    {item.dependsOn && dep ? (
                      <p className="mb-3 ml-6 max-w-[62ch] border-l-2 border-line-strong pl-4 text-sm text-ink-muted">
                        <span className="font-medium text-ink">After {dep.scope}. </span>
                        {item.dependsOn.reason}
                      </p>
                    ) : null}
                    <div className="card grid gap-4 p-6 sm:grid-cols-[2.75rem_1fr]">
                      <span className="flex size-11 items-center justify-center rounded-full bg-sunken font-display text-xl text-ink">
                        {item.order}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                          <h4 className="font-display text-[1.6rem] leading-tight text-ink">
                            {item.scope}
                          </h4>
                          <MoneyRange
                            lowCents={item.lowCents}
                            highCents={item.highCents}
                            className="text-brass"
                          />
                        </div>
                        <p className="mt-1.5 max-w-[60ch] text-ink-muted">{item.why}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                          <Chip>{PATH_LABEL[item.path]}</Chip>
                          <Chip tone={PERMIT_TONE[item.permit]}>{PERMIT_LABEL[item.permit]}</Chip>
                          <Chip>{EFFORT_LABEL[item.effort]}</Chip>
                        </div>
                        {item.riskNote ? (
                          <div className="mt-5 rounded-sm bg-danger-soft px-4 py-3">
                            <p className="text-sm font-medium text-danger">
                              Consult A Licensed Professional
                            </p>
                            <p className="mt-1 max-w-[60ch] text-sm text-ink-muted">
                              {item.riskNote}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </article>
  );
}
