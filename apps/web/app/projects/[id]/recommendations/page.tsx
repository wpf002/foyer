import { notFound } from 'next/navigation';
import { buildBoard } from '@foyer/artifacts';
import { Chip, cx, Trace, type Finish } from '@foyer/ui';
import { BoardColumn, BoardSpecs } from '@/components/board';
import { DrawBoards, DrawConcept } from '@/components/render-tools';
import { api, isSample, type ApiProject } from '@/lib/api';
import {
  answerFor,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  EFFORT_LABEL,
  recFinish,
  recommendations,
  roomFor,
  SHORT,
  type Category,
} from '@/lib/mock';

function SampleRecommendations() {
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
                const board = buildBoard(rec);
                return (
                  <li
                    key={rec.id}
                    className="card card-lift grid gap-6 p-6 sm:grid-cols-[7.5rem_1fr] sm:p-7"
                  >
                    <BoardColumn board={board} fallback={recFinish[rec.id] ?? 'plaster'} />
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
                      <BoardSpecs board={board} />

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

const CATEGORY_FINISH: Record<Category, Finish> = {
  STRUCTURAL: 'plaster',
  COSMETIC: 'linen',
  FUNCTIONAL: 'oak',
  ATMOSPHERIC: 'brass',
};

function LiveRecommendations({ project }: { project: ApiProject }) {
  const recs = project.rooms.flatMap((room) => room.recommendations.map((rec) => ({ rec, room })));
  const prompts = new Map(project.brief?.answers.map((a) => [a.questionId, a.prompt]) ?? []);
  const drawn = recs.some(({ rec }) => rec.board);

  return (
    <article>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-[clamp(2.75rem,5vw,4rem)]">Recommendations</h2>
          <p className="lede mt-3">Each one cites the answer behind it.</p>
        </div>
        {recs.length ? <DrawBoards projectId={project.id} again={drawn} /> : null}
      </header>

      {recs.length === 0 ? <p className="mt-12 text-ink-muted">No critiques yet.</p> : null}

      {CATEGORY_ORDER.map((cat) => {
        const group = recs.filter(({ rec }) => rec.category === cat);
        if (group.length === 0) return null;
        return (
          <section key={cat} className="mt-14">
            <h3 className="flex items-baseline gap-3 text-[1.875rem]">
              {CATEGORY_LABEL[cat]}
              <span className="font-sans text-sm text-ink-faint">{group.length}</span>
            </h3>
            <ol className="mt-5 space-y-5">
              {group.map(({ rec, room }) => (
                <li
                  key={rec.id}
                  className={cx(
                    'card card-lift grid gap-6 p-6 sm:grid-cols-[7.5rem_1fr] sm:p-7',
                    rec.concept && 'lg:grid-cols-[7.5rem_1fr_19rem]',
                  )}
                >
                  <BoardColumn board={rec.board} fallback={CATEGORY_FINISH[cat]} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Chip>{room.name}</Chip>
                      <Chip>{EFFORT_LABEL[rec.effort]}</Chip>
                      {rec.needsProReview ? <Chip tone="danger">Pro Review</Chip> : null}
                    </div>
                    <h4 className="mt-3 max-w-[30ch] font-display text-[1.75rem] leading-[1.1] text-ink">
                      {rec.title}
                    </h4>
                    <p className="mt-3 max-w-[64ch] text-ink-muted">{rec.rationale}</p>
                    <BoardSpecs board={rec.board} />
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
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {[rec.citation, ...(rec.supportingQuestionIds ?? [])].map((q) => (
                          <Trace key={q} questionId={q} label={SHORT[q] ?? prompts.get(q) ?? q} />
                        ))}
                      </div>
                      {room.photos.length && !rec.needsProReview ? <DrawConcept recId={rec.id} again={!!rec.concept} /> : null}
                    </div>
                  </div>
                  {rec.concept ? (
                    <figure className="relative aspect-[4/3] overflow-hidden rounded-md bg-sunken sm:col-span-2 lg:col-span-1 lg:aspect-auto lg:min-h-[14rem]">
                      <img src={`/api${rec.concept.url}`} alt={rec.title} className="absolute inset-0 size-full object-cover" />
                      <figcaption
                        className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-medium text-ink backdrop-blur-sm"
                        title="Shows direction, not a final design"
                      >
                        Directional
                      </figcaption>
                    </figure>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </article>
  );
}

export default async function RecommendationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSample(id)) return <SampleRecommendations />;
  const project = await api<ApiProject>(`/projects/${id}`);
  if (!project) notFound();
  return <LiveRecommendations project={project} />;
}
