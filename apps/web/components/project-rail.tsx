'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx, Material, MoneyRange } from '@foyer/ui';
import {
  artifacts,
  brief,
  palette,
  project,
  recommendations,
  roadmap,
  rooms,
  totals,
} from '@/lib/mock';

const NAV = [
  { seg: '', title: 'Brief', count: brief.length },
  { seg: 'rooms', title: 'Rooms', count: rooms.length },
  { seg: 'recommendations', title: 'Recommendations', count: recommendations.length },
  { seg: 'roadmap', title: 'Roadmap', count: roadmap.length },
  { seg: 'costs', title: 'Costs', count: roadmap.length },
  { seg: 'artifacts', title: 'Handoff', count: artifacts.length },
];

export function ProjectRail({ base }: { base: string }) {
  const path = usePathname();
  const over = totals.midCents - project.budgetHighCents;

  return (
    <aside className="no-print lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:py-12">
      {/* The project's finish board, as a strip across the top of its card. */}
      <div className="card overflow-hidden">
        <div className="grid h-20 grid-cols-6">
          {palette.map((f) => (
            <Material key={f.name} finish={f.finish} className="h-full" />
          ))}
        </div>
        <div className="p-5">
          <h1 className="text-[2rem] leading-none">{project.name}</h1>
          <p className="mt-2 text-sm text-ink-muted">{project.subtitle}</p>
          <p className="mt-0.5 text-sm text-ink-faint">
            {project.city} · ×{project.regionFactor.toFixed(2)}
          </p>

          <div className="mt-5 rounded-sm bg-brass-soft/70 px-3.5 py-3">
            <p className="text-xs font-medium text-brass">Budget</p>
            <MoneyRange
              lowCents={project.budgetLowCents}
              highCents={project.budgetHighCents}
              className="mt-0.5 block font-display text-xl text-ink"
            />
            <p className={cx('mt-1 text-xs', over > 0 ? 'text-clay-ink' : 'text-olive')}>
              {over > 0
                ? `Plan runs $${Math.round(over / 100).toLocaleString('en-US')} over`
                : 'Plan fits'}
            </p>
          </div>
        </div>
      </div>

      <nav className="mt-6 space-y-0.5">
        {NAV.map((n) => {
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
              <span
                className={cx(
                  'text-xs tabular-nums',
                  active ? 'text-ink-inverse-muted' : 'text-ink-faint',
                )}
              >
                {n.count}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
