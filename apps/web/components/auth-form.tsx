'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Field, TextInput } from '@foyer/ui';
import { send } from '@/lib/api';

type Mode = 'signin' | 'signup';

const COPY: Record<Mode, { title: string; submit: string; busy: string; switchHref: string; switchLabel: string }> = {
  signin: { title: 'Sign In', submit: 'Sign In', busy: 'Signing In…', switchHref: '/signup', switchLabel: 'Create Account' },
  signup: { title: 'Create Account', submit: 'Create Account', busy: 'Creating…', switchHref: '/signin', switchLabel: 'Sign In' },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[mode];

  return (
    <div className="mx-auto max-w-[26rem] px-6 py-16 lg:py-24">
      <h1 className="text-[clamp(2.5rem,5vw,3.5rem)]">{copy.title}</h1>
      <form
        className="mt-10 grid gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError(null);
          send(`/auth/${mode}`, {
            method: 'POST',
            body: JSON.stringify({ email: f.get('email'), password: f.get('password'), name: f.get('name') ?? undefined }),
          })
            .then(() => {
              router.push('/projects');
              router.refresh();
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : String(err));
              setBusy(false);
            });
        }}
      >
        {mode === 'signup' ? (
          <Field label="Name" id="name">
            <TextInput id="name" name="name" autoComplete="name" />
          </Field>
        ) : null}
        <Field label="Email" id="email">
          <TextInput id="email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Password" id="password" hint={mode === 'signup' ? '10 characters minimum.' : undefined}>
          <TextInput
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === 'signup' ? 10 : undefined}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </Field>
        <div className="flex items-center gap-4 border-t border-line pt-6">
          <Button type="submit" disabled={busy}>
            {busy ? copy.busy : copy.submit}
          </Button>
          <Link href={copy.switchHref} className="text-sm text-ink-muted hover:text-ink">
            {copy.switchLabel}
          </Link>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </form>
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      onClick={() => {
        setBusy(true);
        send('/auth/signout', { method: 'POST' })
          .then(() => {
            router.push('/signin');
            router.refresh();
          })
          .catch(() => setBusy(false));
      }}
    >
      Sign Out
    </button>
  );
}
