'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, TextInput } from '@foyer/ui';
import { send, sendWithProgress } from '@/lib/api';

const TYPES = ['Kitchen', 'Bathroom', 'Living', 'Dining', 'Bedroom', 'Entry', 'Office', 'Basement', 'Outdoor', 'Other'];

/** Runs one API call, then re-renders the server page. Shows the API's error inline. */
export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
      start(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  return { run, busy: busy ?? (pending ? 'refresh' : null), error };
}

export function AddRoom({ projectId }: { projectId: string }) {
  const { run, busy, error } = useAction();
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      className="card flex flex-wrap items-end gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void run('add', async () => {
          await send(`/projects/${projectId}/rooms`, {
            method: 'POST',
            body: JSON.stringify({ name: f.get('name'), type: f.get('type') }),
          });
          form.current?.reset();
        });
      }}
    >
      <label className="min-w-[12rem] flex-1">
        <span className="text-sm font-medium text-ink">Room</span>
        <TextInput name="name" required placeholder="Front Room" className="mt-1.5" />
      </label>
      <label>
        <span className="text-sm font-medium text-ink">Type</span>
        <select
          name="type"
          defaultValue="LIVING"
          className="mt-1.5 block h-11 rounded-sm bg-surface px-3 text-[15px] text-ink shadow-[0_0_0_1px_var(--line-strong)]"
        >
          {TYPES.map((t) => (
            <option key={t} value={t.toUpperCase()}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={!!busy}>
        {busy ? 'Adding…' : 'Add Room'}
      </Button>
      {error ? <p className="w-full text-sm text-danger">{error}</p> : null}
    </form>
  );
}

export function RoomTools({
  roomId,
  photos,
  canCritique,
  critiqued,
  scanned,
}: {
  roomId: string;
  photos: number;
  scanned: boolean;
  canCritique: boolean;
  critiqued: boolean;
}) {
  const { run, busy, error } = useAction();
  const [uploaded, setUploaded] = useState(0);
  const file = useRef<HTMLInputElement>(null);
  const scanFile = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-7">
      <div className="flex flex-wrap gap-2">
        <input
          ref={file}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.currentTarget.files ?? []);
            e.currentTarget.value = '';
            if (!files.length) return;
            const body = new FormData();
            files.forEach((f) => body.append('photo', f));
            setUploaded(0);
            void run('upload', () => sendWithProgress(`/rooms/${roomId}/photos`, body, setUploaded));
          }}
        />
        <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => file.current?.click()}>
          {busy === 'upload' ? (uploaded < 1 ? `Uploading ${Math.round(uploaded * 100)}%` : 'Processing…') : 'Add Photos'}
        </Button>
        <input
          ref={scanFile}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (!f) return;
            void run('scan', async () => {
              const text = await f.text();
              try {
                JSON.parse(text);
              } catch {
                throw new Error(`${f.name} isn't JSON. Export the CapturedRoom from RoomPlan.`);
              }
              await send(`/rooms/${roomId}/scan`, { method: 'POST', body: text });
            });
          }}
        />
        <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => scanFile.current?.click()}>
          {busy === 'scan' ? 'Reading Scan…' : scanned ? 'Rescan' : 'Add Scan'}
        </Button>
        {photos > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={!!busy}
            onClick={() => void run('analyze', () => send(`/rooms/${roomId}/analyze`, { method: 'POST' }))}
          >
            {busy === 'analyze' ? 'Reading Photos…' : 'Read Photos'}
          </Button>
        ) : null}
        <Button
          size="sm"
          disabled={!!busy || !canCritique}
          title={canCritique ? undefined : 'Needs a finished brief and a room read'}
          onClick={() => void run('critique', () => send(`/rooms/${roomId}/critique`, { method: 'POST' }))}
        >
          {busy === 'critique' ? 'Critiquing…' : critiqued ? 'Critique Again' : 'Critique'}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
