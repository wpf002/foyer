'use client';

import { useState } from 'react';
import { Button, money } from '@foyer/ui';
import { send } from '@/lib/api';
import { useAction } from './room-tools';

export function Reprice({ projectId }: { projectId: string }) {
  const { run, busy, error } = useAction();
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={!!busy}
        onClick={() => void run('price', () => send(`/projects/${projectId}/costs`, { method: 'POST' }))}
      >
        {busy ? 'Pricing…' : 'Reprice'}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

/** Inline quote entry. A logged quote shows in place of the button. */
export function QuoteEntry({ itemId, actualCents }: { itemId: string; actualCents: number | null }) {
  const { run, busy, error } = useAction();
  const [open, setOpen] = useState(false);
  if (!open)
    return actualCents ? (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-olive underline-offset-4 hover:underline">
        Quoted {money(actualCents)}
      </button>
    ) : (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-ink-faint underline-offset-4 hover:text-clay hover:underline">
        Add Quote
      </button>
    );
  return (
    <form
      className="flex items-center justify-end gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const usd = Number(String(f.get('usd')).replace(/[$,\s]/g, ''));
        void run('quote', async () => {
          await send(`/roadmap-items/${itemId}/quote`, {
            method: 'POST',
            body: JSON.stringify({ cents: Math.round(usd * 100), kind: f.get('kind') }),
          });
          setOpen(false);
        });
      }}
    >
      <select name="kind" className="h-8 rounded-xs bg-surface px-1.5 text-xs text-ink shadow-[0_0_0_1px_var(--line-strong)]">
        <option value="QUOTE">Quote</option>
        <option value="ACTUAL">Paid</option>
      </select>
      <input
        name="usd"
        inputMode="decimal"
        required
        autoFocus
        placeholder="$"
        className="h-8 w-24 rounded-xs bg-surface px-2 text-right text-xs text-ink tabular-nums shadow-[0_0_0_1px_var(--line-strong)]"
      />
      <Button type="submit" size="sm" disabled={!!busy}>
        {busy ? '…' : 'Log'}
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </form>
  );
}
