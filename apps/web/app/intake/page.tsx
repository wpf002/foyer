import { Material } from '@foyer/ui';
import { IntakeForm } from '@/components/intake-form';
import { api, type ApiQuestion } from '@/lib/api';
import { SECTIONS } from '@/lib/mock';

export const dynamic = 'force-dynamic';

export default async function IntakePage() {
  const questions = (await api<ApiQuestion[]>('/questions')) ?? [];
  return (
    <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-12 lg:grid-cols-[14rem_1fr] lg:gap-16 lg:py-16">
      <aside className="no-print lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden">
          <div className="grid h-14 grid-cols-3">
            <Material finish="plaster" className="h-full" />
            <Material finish="oak" className="h-full" />
            <Material finish="linen" className="h-full" />
          </div>
          <nav className="p-2">
            {[{ key: 'HOUSE', label: 'House', n: '00' }, ...SECTIONS].map((s) => (
              <a
                key={s.key}
                href={`#s-${s.key}`}
                className="flex items-baseline gap-3 rounded-full px-3 py-2 text-[15px] text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
              >
                <span className="font-display text-lg leading-none text-clay/70">{s.n}</span>
                {s.label}
              </a>
            ))}
          </nav>
        </div>
        <p className="mt-4 px-2 text-sm text-ink-faint">{questions.length} Questions · 10 Min</p>
      </aside>

      <main className="min-w-0">
        <header>
          <h1 className="max-w-[14ch] text-[clamp(3rem,6vw,4.75rem)]">
            Tell us about the <em className="text-clay">house.</em>
          </h1>
          <p className="lede mt-5 max-w-[46ch]">Your own words. Fragments are fine.</p>
        </header>

        <IntakeForm questions={questions} />
      </main>
    </div>
  );
}
