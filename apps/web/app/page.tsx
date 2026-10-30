import Link from 'next/link';
import { Button, Chip, Material, MoneyRange, Trace } from '@foyer/ui';
import {
  answerFor,
  artifacts,
  brief,
  palette,
  project,
  recommendations,
  roadmap,
  rooms,
} from '@/lib/mock';

const CONTENTS = [
  { title: 'Brief', href: '/projects/prescott', what: 'Every answer, in your words.', count: `${brief.length} answers` },
  { title: 'Rooms', href: '/projects/prescott/rooms', what: 'What stays, what moves.', count: `${rooms.length} rooms` },
  { title: 'Recommendations', href: '/projects/prescott/recommendations', what: 'Each tied to an answer.', count: `${recommendations.length} items` },
  { title: 'Roadmap', href: '/projects/prescott/roadmap', what: 'Three phases, in order.', count: `${roadmap.length} steps` },
  { title: 'Costs', href: '/projects/prescott/costs', what: 'Ranges for your zip.', count: `×${project.regionFactor.toFixed(2)}` },
  { title: 'Handoff', href: '/projects/prescott/artifacts', what: 'For your contractor and designer.', count: `${artifacts.length} documents` },
];

export default function Home() {
  const rec = recommendations[0]!;
  const answer = answerFor(rec.briefAnswerId);
  const item = roadmap.find((r) => r.scope.includes('Lighting'))!;

  return (
    <main>
      {/* Hero ------------------------------------------------------------- */}
      <section className="mx-auto grid max-w-[1240px] items-center gap-14 px-6 pt-14 pb-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pt-20 lg:pb-28">
        <div>
          <p className="eyebrow">Interior Plans</p>
          <h1 className="mt-6 max-w-[11ch] text-[clamp(3.25rem,7.5vw,6rem)]">
            The rooms you have, <em className="text-clay">finished.</em>
          </h1>
          <p className="lede mt-7 max-w-[44ch]">
            Fifteen answers and a few photos become a phased plan with finishes, order, and costs
            for your zip.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/intake">
              <Button size="lg">Start A Plan</Button>
            </Link>
            <Link href="/projects/prescott">
              <Button size="lg" variant="secondary">
                See A Sample
              </Button>
            </Link>
          </div>
        </div>

        {/* Flat-lay: the finish samples as a designer lays them out, with the
            one recommendation they came from pinned on top. */}
        <figure className="relative mx-auto aspect-[1/1.02] w-full max-w-[560px]">
          <Material finish="plaster" className="absolute top-0 left-[6%] h-[62%] w-[58%] rounded-lg shadow-lg" />
          <Material finish="oak" className="absolute top-[8%] right-0 h-[46%] w-[36%] rounded-md shadow-lg" />
          <Material finish="linen" className="absolute top-[50%] right-[4%] h-[34%] w-[40%] rotate-[3deg] rounded-md shadow-lg" />
          <Material finish="terracotta" className="absolute bottom-[3%] left-0 size-[26%] rounded-sm shadow-lg" />
          <Material finish="walnut" className="absolute bottom-0 left-[28%] h-[20%] w-[30%] rounded-sm shadow-lg" />
          <Material finish="brass" className="absolute top-[44%] left-[52%] size-[13%] rounded-full shadow-lg" />

          <div className="card absolute bottom-[10%] left-[14%] w-[72%] max-w-[360px] p-5 shadow-lg">
            <p className="font-display text-[1.3rem] leading-snug text-ink">&ldquo;{answer.raw}&rdquo;</p>
            <div className="mt-4 border-t border-line pt-4">
              <div className="flex items-center justify-between gap-2">
                <Chip tone="clay">Atmospheric</Chip>
                <MoneyRange lowCents={item.lowCents} highCents={item.highCents} className="text-brass" />
              </div>
              <p className="mt-3 text-[15px] leading-snug font-medium text-ink">{rec.title}</p>
              <Trace questionId={answer.questionId} label={answer.short} className="mt-3" />
            </div>
          </div>
        </figure>
      </section>

      {/* Finish schedule ---------------------------------------------------- */}
      <section className="bg-espresso text-ink-inverse">
        <div className="mx-auto max-w-[1240px] px-6 py-20 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-[16ch] text-[clamp(2.25rem,4.5vw,3.5rem)] text-ink-inverse">
              Six finishes, every one placed.
            </h2>
            <p className="max-w-[34ch] text-ink-inverse-muted">
              Pulled from the recommendations for {project.name}. Each names its room.
            </p>
          </div>
          <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {palette.map((p) => (
              <li key={p.name}>
                <Material finish={p.finish} className="aspect-[4/5] rounded-md" />
                <p className="mt-4 font-display text-xl leading-tight">{p.name}</p>
                <p className="mt-1 text-sm text-ink-inverse-muted">{p.where}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contents ----------------------------------------------------------- */}
      <section className="mx-auto max-w-[1240px] px-6 py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[22rem_1fr] lg:gap-20">
          <div>
            <p className="eyebrow">What You Get</p>
            <h2 className="mt-5 text-[clamp(2.25rem,4vw,3.25rem)]">One plan, start to finish.</h2>
            <p className="lede mt-5">Open the sample to see a full plan for a 1948 ranch in Oakland.</p>
          </div>
          <ol>
            {CONTENTS.map((c, i) => (
              <li key={c.title}>
                <Link
                  href={c.href}
                  className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-5 border-b border-line py-6 first:pt-0"
                >
                  <span className="font-display text-xl text-ink-faint">{i + 1}</span>
                  <span>
                    <span className="block font-display text-[2rem] leading-none transition-colors group-hover:text-clay">
                      {c.title}
                    </span>
                    <span className="mt-2 block text-ink-muted">{c.what}</span>
                  </span>
                  <span className="text-sm text-ink-faint tabular-nums">{c.count}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="no-print border-t border-line">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-6 py-10 text-sm text-ink-muted sm:grid-cols-3">
          <p>
            <span className="block font-medium text-ink">Costs</span>
            Ranges for your region. Never a quote.
          </p>
          <p>
            <span className="block font-medium text-ink">Renders</span>
            Illustrate a recommendation. They never lead.
          </p>
          <p>
            <span className="block font-medium text-ink">Structure</span>
            Foyer flags walls. A licensed pro decides.
          </p>
        </div>
      </footer>
    </main>
  );
}
