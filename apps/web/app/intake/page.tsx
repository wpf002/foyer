import { Button, Choice, Material, TextArea, TextInput } from '@foyer/ui';
import { brief, SECTIONS } from '@/lib/mock';

/** Presentation only. What each question is asking for, in input terms. */
const CHOICES: Record<string, string[]> = {
  Q02: ['Under 3 Years', '3 To 7 Years', '7 To 15 Years', 'Longer'],
  Q04: ['Hand-Measured', 'Architect Drawings', 'Phone Scan', 'Nothing Yet'],
  Q12: ['As Little As Possible', 'Some Display Is Fine', 'A Lot Of Quiet'],
  Q15: ['Own, No HOA', 'Own, With HOA', 'Own, Landmark District', 'Rent'],
};

const ANGLES = [
  'Standing In The Doorway',
  'Opposite Corner',
  'The Wall You Hate',
  'Ceiling And Lighting',
  'Window Wall, Daylight',
  'The Thing That Stays',
];

export default function IntakePage() {
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
            {[...SECTIONS, { key: 'PHOTOS', label: 'Photos', n: '05' }].map((s) => (
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
        <p className="mt-4 px-2 text-sm text-ink-faint">15 Questions · 6 Photos · 12 Min</p>
      </aside>

      <main className="min-w-0">
        <header>
          <h1 className="max-w-[14ch] text-[clamp(3rem,6vw,4.75rem)]">
            Tell us about the <em className="text-clay">house.</em>
          </h1>
          <p className="lede mt-5 max-w-[46ch]">Your own words. Fragments are fine.</p>
        </header>

        <form className="mt-6">
          {SECTIONS.map((s) => (
            <fieldset key={s.key} id={`s-${s.key}`} className="mt-14 scroll-mt-24">
              <legend className="sr-only">{s.label}</legend>
              <h2 className="flex items-baseline gap-3 text-[2rem]">
                <span className="text-clay/70">{s.n}</span>
                {s.label}
              </h2>

              <div className="mt-5 space-y-4">
                {brief
                  .filter((q) => q.section === s.key)
                  .map((q) => (
                    <div key={q.id} className="card p-6 sm:p-7">
                      <label
                        htmlFor={q.questionId}
                        className="block max-w-[40ch] font-display text-[1.5rem] leading-tight text-ink"
                      >
                        {q.prompt}
                      </label>

                      <div className="mt-4 max-w-[44rem]">
                        {CHOICES[q.questionId] ? (
                          <div className="flex flex-wrap gap-2">
                            {CHOICES[q.questionId]!.map((opt) => (
                              <Choice key={opt} name={q.questionId} value={opt} label={opt} />
                            ))}
                          </div>
                        ) : q.questionId === 'Q13' ? (
                          <div className="flex items-center gap-3">
                            <TextInput
                              id={q.questionId}
                              inputMode="numeric"
                              placeholder="$18,000"
                              className="max-w-[10rem]"
                            />
                            <span className="text-sm text-ink-faint">to</span>
                            <TextInput
                              inputMode="numeric"
                              placeholder="$34,000"
                              className="max-w-[10rem]"
                            />
                          </div>
                        ) : (
                          <TextArea
                            id={q.questionId}
                            placeholder={q.short}
                            rows={q.raw.length > 90 ? 3 : 2}
                          />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </fieldset>
          ))}

          <fieldset id="s-PHOTOS" className="mt-14 scroll-mt-24">
            <legend className="sr-only">Photos</legend>
            <h2 className="flex items-baseline gap-3 text-[2rem]">
              <span className="text-clay/70">05</span>
              Photos
            </h2>
            <p className="mt-2 text-ink-muted">Six per room. Lights on, blinds open.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ANGLES.map((angle) => (
                <label
                  key={angle}
                  className="well group flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 p-5 text-center ring-1 ring-transparent transition hover:bg-clay-soft hover:ring-clay/30"
                >
                  <input type="file" accept="image/*" className="sr-only" />
                  <span
                    aria-hidden
                    className="flex size-11 items-center justify-center rounded-full bg-surface text-xl text-ink-muted shadow-sm group-hover:text-clay"
                  >
                    +
                  </span>
                  <span className="max-w-[16ch] text-[15px] leading-tight text-ink-muted group-hover:text-clay-ink">
                    {angle}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-5 rounded-lg bg-espresso p-7 text-ink-inverse">
            <p className="font-display text-2xl">Yours until you export it.</p>
            <Button type="submit" size="lg">
              Review Answers
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
