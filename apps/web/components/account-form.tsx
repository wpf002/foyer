'use client';

import { useState } from 'react';
import { Button, cx, Field, TextInput } from '@foyer/ui';
import { KIND_LABEL, send, type AccountKind, type ApiMe } from '@/lib/api';
import { useAction } from './room-tools';

const KINDS = Object.keys(KIND_LABEL) as AccountKind[];

export function AccountForm({ me }: { me: ApiMe }) {
  const { run, busy, error } = useAction();
  const [kind, setKind] = useState<AccountKind>(me.kind);
  const [saved, setSaved] = useState(false);
  const pro = kind !== 'HOMEOWNER';

  return (
    <form
      className="grid gap-10"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setSaved(false);
        void run('save', async () => {
          await send('/me', {
            method: 'PATCH',
            body: JSON.stringify({
              kind,
              name: f.get('name'),
              zip: f.get('zip'),
              studio: pro ? f.get('studio') : null,
              license: pro ? f.get('license') : null,
            }),
          });
          setSaved(true);
        });
      }}
    >
      <fieldset>
        <legend className="text-[15px] font-medium text-ink">Account Type</legend>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cx(
                'rounded-full border px-4 py-2 text-sm transition-colors',
                kind === k ? 'border-ink bg-ink text-ink-inverse' : 'border-line-strong text-ink-muted hover:border-ink hover:text-ink',
              )}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-[1fr_10rem]">
        <Field label="Name" id="name">
          <TextInput id="name" name="name" defaultValue={me.name ?? ''} autoComplete="name" />
        </Field>
        <Field label="Zip" id="zip">
          <TextInput id="zip" name="zip" defaultValue={me.zip ?? ''} inputMode="numeric" pattern="\d{5}" maxLength={5} />
        </Field>
      </div>

      {pro ? (
        <div className="grid gap-6 sm:grid-cols-[1fr_14rem]">
          <Field label="Studio" id="studio" hint="Printed on every handoff.">
            <TextInput id="studio" name="studio" defaultValue={me.studio ?? ''} autoComplete="organization" />
          </Field>
          <Field label="License" id="license">
            <TextInput id="license" name="license" defaultValue={me.license ?? ''} />
          </Field>
        </div>
      ) : null}

      <div className="flex items-center gap-4 border-t border-line pt-6">
        <Button type="submit" disabled={!!busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        {saved && !busy ? <span className="text-sm text-olive">Saved</span> : null}
        {error ? <span className="text-sm text-danger">{error}</span> : null}
      </div>
    </form>
  );
}
