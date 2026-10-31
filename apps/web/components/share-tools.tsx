'use client';

import { useState } from 'react';
import { Button } from '@foyer/ui';
import { send, type ApiShare } from '@/lib/api';
import { useAction } from './room-tools';

const day = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Read-only client links for a project's handoff. */
export function ShareLinks({ projectId, shares }: { projectId: string; shares: ApiShare[] }) {
  const { run, busy, error } = useAction();
  const [copied, setCopied] = useState<string | null>(null);
  const [label, setLabel] = useState('');

  const copy = async (s: ApiShare) => {
    await navigator.clipboard.writeText(`${window.location.origin}/share/${s.token}`);
    setCopied(s.id);
    setTimeout(() => setCopied((c) => (c === s.id ? null : c)), 1600);
  };

  return (
    <details className="group relative">
      <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-line-strong px-4 text-sm text-ink transition-colors hover:border-ink [&::-webkit-details-marker]:hidden">
        Share
        {shares.length ? <span className="tabular-nums text-ink-faint">{shares.length}</span> : null}
      </summary>
      <div className="card absolute right-0 z-20 mt-2 w-[min(24rem,calc(100vw-3rem))] p-4 shadow-lg">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run('create', async () => {
              await send(`/projects/${projectId}/shares`, {
                method: 'POST',
                body: JSON.stringify({ label: label.trim() || undefined }),
              });
              setLabel('');
            });
          }}
        >
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder="Label"
            aria-label="Link label"
            className="h-9 min-w-0 flex-1 rounded-full border border-line-strong bg-canvas px-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink"
          />
          <Button type="submit" size="sm" disabled={!!busy}>
            {busy === 'create' ? 'Creating…' : 'Create Link'}
          </Button>
        </form>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

        {shares.length ? (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {shares.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{s.label ?? `Link ${day(s.createdAt)}`}</p>
                  <p className="text-xs text-ink-faint tabular-nums">
                    {s.views} {s.views === 1 ? 'View' : 'Views'}
                    {s.lastViewedAt ? ` · Last ${day(s.lastViewedAt)}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => void copy(s)} className="text-sm text-clay hover:underline underline-offset-4">
                  {copied === s.id ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void run(`revoke-${s.id}`, () => send(`/shares/${s.id}/revoke`, { method: 'POST' }))}
                  className="text-sm text-ink-faint transition-colors hover:text-danger"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
