import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ArtifactDoc } from '@foyer/artifacts';
import { ArtifactDocView } from '@/components/artifact-doc';
import { PrintButton } from '@/components/print-button';
import { api, type ApiPreparer } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function SharedDoc({ params }: { params: Promise<{ token: string; slug: string }> }) {
  const { token, slug } = await params;
  const row = await api<{ version: number; doc: ArtifactDoc; preparedBy: ApiPreparer | null }>(`/shared/${token}/${slug}`);
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-10 print:p-0">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <Link href={`/share/${token}`} className="text-sm text-ink-muted transition-colors hover:text-clay">
          &larr; {row.doc.projectName}
        </Link>
        <div className="flex items-center gap-3">
          <a
            href={`/api/v1/shared/${token}/${slug}/pdf`}
            className="text-sm text-ink-muted underline-offset-4 transition-colors hover:text-clay hover:underline"
          >
            Download PDF
          </a>
          <PrintButton />
        </div>
      </div>
      <ArtifactDocView doc={row.doc} version={row.version} preparedBy={row.preparedBy} />
    </div>
  );
}
