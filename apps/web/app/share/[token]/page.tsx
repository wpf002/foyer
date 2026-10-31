import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cx, Material } from '@foyer/ui';
import { api, preparedLine, type ApiPreparer } from '@/lib/api';
import { COVER, NOTE } from '@/lib/handoff';

export const dynamic = 'force-dynamic';

interface Shared {
  project: { name: string; zip: string; clientName: string | null };
  preparedBy: ApiPreparer | null;
  artifacts: { slug: string; title: string; version: number; sections: number }[];
}

export default async function SharedHandoff({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await api<Shared>(`/shared/${token}`);
  if (!s) notFound();
  const by = preparedLine(s.preparedBy);

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-12 lg:py-16">
      <header className="border-b border-line-strong pb-8">
        <p className="eyebrow">{by ?? 'Foyer'}</p>
        <h1 className="mt-3 text-[clamp(2.75rem,5vw,4rem)]">{s.project.name}</h1>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-1 text-sm text-ink-muted">
          {s.project.clientName ? (
            <div className="flex gap-2">
              <dt className="text-ink-faint">Client</dt>
              <dd>{s.project.clientName}</dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt className="text-ink-faint">Zip</dt>
            <dd>{s.project.zip}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-faint">Documents</dt>
            <dd>{s.artifacts.length}</dd>
          </div>
        </dl>
      </header>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {s.artifacts.map((a, i) => (
          <li key={a.slug} className={i === 0 ? 'sm:col-span-2' : undefined}>
            <Link href={`/share/${token}/${a.slug}`} className="card card-lift block h-full">
              <Material finish={COVER[a.slug] ?? 'plaster'} className={cx('w-full rounded-t-md', i === 0 ? 'h-44' : 'h-28')} />
              <div className="p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[1.75rem] leading-tight">{a.title}</h2>
                  <span className="shrink-0 text-sm text-ink-faint tabular-nums">v{a.version}</span>
                </div>
                <p className="mt-2 text-ink-muted">{NOTE[a.slug]}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
