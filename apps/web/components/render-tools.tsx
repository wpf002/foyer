'use client';

import { Button } from '@foyer/ui';
import { send } from '@/lib/api';
import { useAction } from './room-tools';

export function DrawBoards({ projectId, again }: { projectId: string; again: boolean }) {
  const { run, busy, error } = useAction();
  return (
    <div className="flex items-center gap-3">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button
        variant={again ? 'secondary' : 'primary'}
        size="sm"
        disabled={!!busy}
        onClick={() => void run('draw', () => send(`/projects/${projectId}/renders`, { method: 'POST' }))}
      >
        {busy ? 'Drawing…' : again ? 'Redraw Boards' : 'Draw Boards'}
      </Button>
    </div>
  );
}

export function DrawConcept({ recId, again }: { recId: string; again: boolean }) {
  const { run, busy, error } = useAction();
  return (
    <div className="flex items-center gap-3">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button
        variant="ghost"
        size="sm"
        disabled={!!busy}
        onClick={() => void run('concept', () => send(`/recommendations/${recId}/concept`, { method: 'POST' }))}
      >
        {busy ? 'Rendering…' : again ? 'Redraw Concept' : 'Draw Concept'}
      </Button>
    </div>
  );
}
