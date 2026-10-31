import Link from 'next/link';
import { api, STATUS_LABEL, type ApiMe, type ApiProjectSummary } from '@/lib/api';

export const dynamic = 'force-dynamic';

const day = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Where a project stands, as the next screen to open. */
const stage = (p: ApiProjectSummary) =>
  p.artifacts ? { label: 'Handoff', seg: 'artifacts' }
  : p.roadmapItems ? { label: 'Roadmap', seg: 'roadmap' }
  : p.rooms ? { label: 'Rooms', seg: 'rooms' }
  : { label: 'Brief', seg: '' };

export default async function ProjectsPage() {
  const [me, rows] = await Promise.all([api<ApiMe>('/me'), api<ApiProjectSummary[]>('/projects')]);
  const projects = rows ?? [];
  const pro = !!me?.pro;
  const clients = new Set(projects.map((p) => p.clientName).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-12 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          {me?.studio ? <p className="eyebrow">{me.studio}</p> : null}
          <h1 className="mt-2 text-[clamp(2.75rem,5vw,4rem)]">Projects</h1>
        </div>
        <dl className="flex gap-10 text-right">
          <div>
            <dt className="text-sm text-ink-faint">Projects</dt>
            <dd className="font-display text-3xl tabular-nums">{projects.length}</dd>
          </div>
          {pro ? (
            <div>
              <dt className="text-sm text-ink-faint">Clients</dt>
              <dd className="font-display text-3xl tabular-nums">{clients}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-sm text-ink-faint">Handoffs</dt>
            <dd className="font-display text-3xl tabular-nums">{projects.filter((p) => p.artifacts).length}</dd>
          </div>
        </dl>
      </header>

      {projects.length ? (
        <div className="card mt-12 overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-sunken/60 text-sm text-ink-muted">
                <th className="px-6 py-3 font-medium">Project</th>
                {pro ? <th className="hidden px-4 py-3 font-medium sm:table-cell">Client</th> : null}
                <th className="hidden px-4 py-3 font-medium md:table-cell">Status</th>
                <th className="px-4 py-3 font-medium">Next</th>
                <th className="px-6 py-3 text-right font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const s = stage(p);
                return (
                  <tr key={p.id} className="border-t border-line align-middle transition-colors hover:bg-sunken/40">
                    <td className="px-6 py-4">
                      <Link href={`/projects/${p.id}`} className="font-display text-xl text-ink hover:text-clay">
                        {p.name}
                      </Link>
                      <span className="mt-0.5 block text-xs text-ink-faint">Zip {p.zip}</span>
                    </td>
                    {pro ? (
                      <td className="hidden px-4 py-4 text-sm text-ink-muted sm:table-cell">{p.clientName ?? '—'}</td>
                    ) : null}
                    <td className="hidden px-4 py-4 text-sm text-ink-muted md:table-cell">{STATUS_LABEL[p.status] ?? p.status}</td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/projects/${p.id}${s.seg ? `/${s.seg}` : ''}`}
                        className="text-sm text-clay underline-offset-4 hover:underline"
                      >
                        {s.label}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-ink-faint tabular-nums">{day(p.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-12 text-ink-muted">
          <Link href="/intake" className="text-clay underline-offset-4 hover:underline">
            Start A Plan
          </Link>
        </p>
      )}
    </div>
  );
}
