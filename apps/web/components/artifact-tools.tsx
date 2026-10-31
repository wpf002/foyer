'use client';

import { Button } from '@foyer/ui';
import { send } from '@/lib/api';
import { useAction } from './room-tools';

export function GenerateArtifacts({ projectId, again }: { projectId: string; again: boolean }) {
  const { run, busy, error } = useAction();
  return (
    <div className="flex items-center gap-3">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button
        variant={again ? 'secondary' : 'primary'}
        size="sm"
        disabled={!!busy}
        onClick={() => void run('gen', () => send(`/projects/${projectId}/artifacts`, { method: 'POST' }))}
      >
        {busy ? 'Writing…' : again ? 'Regenerate' : 'Generate'}
      </Button>
    </div>
  );
}
