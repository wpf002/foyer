'use client';

import { Button } from '@foyer/ui';
import { send } from '@/lib/api';
import { useAction } from './room-tools';

export function BuildRoadmap({ projectId, built }: { projectId: string; built: boolean }) {
  const { run, busy, error } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant={built ? 'secondary' : 'primary'}
        disabled={!!busy}
        onClick={() => void run('build', () => send(`/projects/${projectId}/roadmap`, { method: 'POST' }))}
      >
        {busy ? 'Sequencing…' : built ? 'Rebuild Roadmap' : 'Build Roadmap'}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
