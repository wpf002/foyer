'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, TextArea } from '@foyer/ui';
import { send, type ApiChatChange, type ApiChatMessage } from '@/lib/api';

const MAX_CHARS = 4000;

function changeLine(c: ApiChatChange): string {
  if (c.op === 'add') return `Added ${c.title}`;
  if (c.op === 'remove') return 'Removed An Item';
  return c.title ? `Updated ${c.title}` : 'Updated An Item';
}

function Changes({ projectId, changes }: { projectId: string; changes: ApiChatChange[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-ink-muted">
      {changes.map((c, i) => (
        <span key={i}>{changeLine(c)}</span>
      ))}
      <Link href={`/projects/${projectId}/roadmap`} className="text-clay underline-offset-4 hover:underline">
        Rebuild Roadmap
      </Link>
    </div>
  );
}

export function ChatThread({ projectId, initial }: { projectId: string; initial: ApiChatMessage[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, busy]);

  const submit = async () => {
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    const pending: ApiChatMessage = {
      id: `pending-${Date.now()}`,
      role: 'USER',
      content: message,
      changes: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, pending]);
    setDraft('');
    try {
      const res = await send<{ message: ApiChatMessage; applied: number }>(`/projects/${projectId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      setMessages((m) => [...m, res.message]);
      if (res.applied) router.refresh();
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== pending.id));
      setDraft(message);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 grid gap-6">
      {messages.length ? (
        <ol className="grid gap-4">
          {messages.map((m) =>
            m.role === 'USER' ? (
              <li key={m.id} className="ml-auto max-w-[36rem] rounded-lg bg-sunken px-5 py-3.5 text-ink whitespace-pre-wrap">
                {m.content}
              </li>
            ) : (
              <li key={m.id} className="card max-w-[44rem] px-6 py-5 leading-relaxed text-ink whitespace-pre-wrap">
                {m.content}
                {m.changes?.length ? <Changes projectId={projectId} changes={m.changes} /> : null}
              </li>
            ),
          )}
          {busy ? <li className="px-1 text-sm text-ink-faint">Thinking…</li> : null}
        </ol>
      ) : null}
      <div ref={end} />

      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="chat-message" className="sr-only">
          Message
        </label>
        <TextArea
          id="chat-message"
          value={draft}
          maxLength={MAX_CHARS}
          placeholder="Ask About Any Room"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy || !draft.trim()}>
            {busy ? 'Sending…' : 'Send'}
          </Button>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      </form>
    </div>
  );
}
