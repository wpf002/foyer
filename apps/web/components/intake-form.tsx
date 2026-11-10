'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Choice, TextArea, TextInput } from '@foyer/ui';
import { send, type ApiQuestion } from '@/lib/api';
import { SECTIONS, SHORT } from '@/lib/mock';

const MIN_ANSWERS = 8;

export function IntakeForm({ questions, pro = false }: { questions: ApiQuestion[]; pro?: boolean }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (f: FormData) => {
    const answers = questions.map((q) => ({
      questionId: q.id,
      raw: String(f.get(q.id) ?? '').trim(),
    }));
    const filled = answers.filter((a) => a.raw).length;
    if (filled < MIN_ANSWERS) {
      setError(`Answer at least ${MIN_ANSWERS} questions. ${filled} so far.`);
      return;
    }
    setError(null);
    try {
      // Keep the project id so a retry after a failed parse doesn't make a second project.
      let id = projectId;
      if (!id) {
        setStep('Saving');
        id = (await send<{ id: string }>('/projects', {
          method: 'POST',
          body: JSON.stringify({
            name: f.get('name'),
            zip: f.get('zip'),
            clientName: String(f.get('clientName') ?? '').trim() || undefined,
          }),
        })).id;
        setProjectId(id);
      }
      setStep('Saving');
      await send(`/projects/${id}/brief`, { method: 'PUT', body: JSON.stringify({ answers }) });
      setStep('Reading Answers');
      await send(`/projects/${id}/brief/complete`, { method: 'POST' });
      router.push(`/projects/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep(null);
    }
  };

  return (
    <form
      className="mt-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(new FormData(e.currentTarget));
      }}
    >
      <fieldset id="s-HOUSE" className="mt-14 scroll-mt-24">
        <legend className="sr-only">House</legend>
        <div className={`card grid gap-4 p-6 sm:p-7 ${pro ? 'sm:grid-cols-[1fr_1fr_10rem]' : 'sm:grid-cols-[1fr_10rem]'}`}>
          <label>
            <span className="font-display text-[1.5rem] leading-tight text-ink">Plan Name</span>
            <TextInput name="name" required placeholder="Maple Street" className="mt-3" />
          </label>
          {pro ? (
            <label>
              <span className="font-display text-[1.5rem] leading-tight text-ink">Client</span>
              <TextInput name="clientName" maxLength={120} placeholder="The Alvarez Family" className="mt-3" />
            </label>
          ) : null}
          <label>
            <span className="font-display text-[1.5rem] leading-tight text-ink">Zip</span>
            <TextInput name="zip" required inputMode="numeric" pattern="\d{5}" maxLength={5} placeholder="86301" className="mt-3" />
          </label>
        </div>
      </fieldset>

      {SECTIONS.map((s) => (
        <fieldset key={s.key} id={`s-${s.key}`} className="mt-14 scroll-mt-24">
          <legend className="sr-only">{s.label}</legend>
          <h2 className="flex items-baseline gap-3 text-[2rem]">
            <span className="text-clay/70">{s.n}</span>
            {s.label}
          </h2>

          <div className="mt-5 space-y-4">
            {questions
              .filter((q) => q.section === s.key)
              .map((q) => (
                <div key={q.id} className="card p-6 sm:p-7">
                  <label htmlFor={q.id} className="block max-w-[40ch] font-display text-[1.5rem] leading-tight text-ink">
                    {q.prompt}
                  </label>
                  <div className="mt-4 max-w-[44rem]">
                    {q.choices ? (
                      <div className="flex flex-wrap gap-2">
                        {q.choices.map((opt) => (
                          <Choice key={opt} name={q.id} value={opt} label={opt} />
                        ))}
                      </div>
                    ) : (
                      <TextArea id={q.id} name={q.id} placeholder={SHORT[q.id]} />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </fieldset>
      ))}

      <div className="mt-14 flex flex-wrap items-center justify-between gap-5 rounded-lg bg-espresso p-7 text-ink-inverse">
        <div>
          <p className="font-display text-2xl">Yours until you export it.</p>
          {error ? <p className="mt-2 text-sm text-clay-soft">{error}</p> : null}
        </div>
        <Button type="submit" size="lg" disabled={!!step}>
          {step ? `${step}…` : 'Build Brief'}
        </Button>
      </div>
    </form>
  );
}
