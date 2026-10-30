import { Chip, Material, Trace } from '@foyer/ui';
import {
  answerFor,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  EFFORT_LABEL,
  recFinish,
  recommendations,
  roomFor,
} from '@/lib/mock';

export default function RecommendationsPage() {
  return (
    <article>
      <header>
        <h2 className="text-[clamp(2.75rem,5vw,4rem)]">Recommendations</h2>
        <p className="lede mt-3">Each one cites the answer behind it.</p>
      </header>

      {CATEGORY_ORDER.map((cat) => {
        const group = recommendations.filter((r) => r.category === cat);
        if (group.length === 0) return null;
        return (
          <section key={cat} className="mt-14">
            <h3 className="flex items-baseline gap-3 text-[1.875rem]">
              {CATEGORY_LABEL[cat]}
              <span className="font-sans text-sm text-ink-faint">{group.length}</span>
            </h3>
            <ol className="mt-5 space-y-5">
              {group.map((rec) => {
                const answer = answerFor(rec.briefAnswerId);
                const room = roomFor(rec.roomId);
                return (
                  <li
                    key={rec.id}
                    className="card card-lift grid gap-6 p-6 sm:grid-cols-[6.5rem_1fr] sm:p-7"
                  >
                    <Material
                      finish={recFinish[rec.id] ?? 'plaster'}
                      className="hidden aspect-[4/5] rounded-sm sm:block"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {room ? <Chip>{room.name}</Chip> : null}
                        <Chip>{EFFORT_LABEL[rec.effort]}</Chip>
                        {rec.needsProReview ? <Chip tone="danger">Pro Review</Chip> : null}
                      </div>
                      <h4 className="mt-3 max-w-[30ch] font-display text-[1.75rem] leading-[1.1] text-ink">
                        {rec.title}
                      </h4>
                      <p className="mt-3 max-w-[64ch] text-ink-muted">{rec.rationale}</p>

                      {rec.preserve ? (
                        <p className="mt-4 max-w-[62ch] rounded-sm bg-olive-soft px-4 py-3 text-sm text-ink-muted">
                          <span className="font-medium text-olive">Keep </span>
                          {rec.preserve}
                        </p>
                      ) : null}
                      {rec.needsProReview ? (
                        <p className="mt-3 text-sm text-danger">
                          A licensed professional confirms this before any work starts.
                        </p>
                      ) : null}

                      <Trace questionId={answer.questionId} label={answer.short} className="mt-5" />
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
