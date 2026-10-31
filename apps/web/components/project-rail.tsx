'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx, Material, MoneyRange, type Finish } from '@foyer/ui';

export interface RailProps {
  base: string;
  name: string;
  subtitle?: string;
  meta: string;
  finishes: Finish[];
  budget?: { lowCents: number; highCents: number; overCents?: number };
  nav: { seg: string; title: string; count: number }[];
}

export function ProjectRail({ base, name, subtitle, meta, finishes, budget, nav }: RailProps) {
  const path = usePathname();

  return (
    <aside className="no-print lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:py-12">
      {/* The project's finish board, as a strip across the top of its card. */}
      <div className="card overflow-hidden">
        <div className="grid h-20 grid-cols-6">
          {finishes.map((f, i) => (
            <Material key={i} finish={f} className="h-full" />
          ))}
        </div>
        <div className="p-5">
          <h1 className="text-[2rem] leading-none">{name}</h1>
          {subtitle ? <p className="mt-2 text-sm text-ink-muted">{subtitle}</p> : null}
          <p className="mt-0.5 text-sm text-ink-faint">{meta}</p>

          {budget ? (
            <div className="mt-5 rounded-sm bg-brass-soft/70 px-3.5 py-3">
              <p className="text-xs font-medium text-brass">Budget</p>
              <MoneyRange
                lowCents={budget.lowCents}
                highCents={budget.highCents}
                className="mt-0.5 block font-display text-xl text-ink"
              />
              {budget.overCents !== undefined ? (
                <p className={cx('mt-1 text-xs', budget.overCents > 0 ? 'text-clay-ink' : 'text-olive')}>
                  {budget.overCents > 0
                    ? `Plan runs $${Math.round(budget.overCents / 100).toLocaleString('en-US')} over`
                    : 'Plan fits'}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <nav className="mt-6 space-y-0.5">
        {nav.map((n) => {
          const href = n.seg ? `${base}/${n.seg}` : base;
          const active = n.seg ? path.startsWith(href) : path === base;
          return (
            <Link
              key={n.title}
              href={href}
              className={cx(
                'flex items-center justify-between rounded-full px-4 py-2.5 text-[15px] transition-colors',
                active
                  ? 'bg-ink font-medium text-ink-inverse'
                  : 'text-ink-muted hover:bg-sunken hover:text-ink',
              )}
            >
              {n.title}
              <span className={cx('text-xs tabular-nums', active ? 'text-ink-inverse-muted' : 'text-ink-faint')}>
                {n.count}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
