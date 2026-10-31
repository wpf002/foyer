import { cx, Material, type Finish } from '@foyer/ui';
import type { Board, Swatch } from '@foyer/artifacts';

function Band({ s, className }: { s: Swatch; className?: string }) {
  return s.finish ? (
    <Material finish={s.finish} className={cx('h-full w-full', className)} />
  ) : (
    <span aria-hidden className={cx('block h-full w-full', className)} style={{ background: s.hex }} />
  );
}

/** The sample column on a recommendation card. Falls back to one finish when there's no board. */
export function BoardColumn({ board, fallback }: { board: Board | null; fallback: Finish }) {
  const swatches = board?.swatches ?? [];
  if (!swatches.length)
    return <Material finish={fallback} className="hidden aspect-[4/5] rounded-sm sm:block" />;

  return (
    <figure className="min-w-0">
      <div className="flex h-3 overflow-hidden rounded-xs sm:aspect-[4/5] sm:h-auto sm:flex-col sm:rounded-sm">
        {swatches.map((s, i) => (
          <div key={s.name} className={cx('min-h-0 min-w-0', i === 0 ? 'flex-[2]' : 'flex-1')}>
            <Band s={s} />
          </div>
        ))}
      </div>
      <figcaption className="mt-2.5 hidden gap-1 sm:grid">
        {swatches.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-[11px] leading-tight text-ink-muted">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: s.hex }} />
            <span className="truncate">{s.name}</span>
            {s.role === 'keep' ? <span className="text-olive">Keep</span> : null}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Specs a board pulled out of the recommendation, as one line. */
export function BoardSpecs({ board }: { board: Board | null }) {
  if (!board?.specs.length) return null;
  return (
    <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {board.specs.map((s, i) => (
        <div key={`${s.label}-${i}`} className="flex items-baseline gap-1.5">
          <dt className="text-ink-faint">{s.label}</dt>
          <dd className="text-ink tabular-nums">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
