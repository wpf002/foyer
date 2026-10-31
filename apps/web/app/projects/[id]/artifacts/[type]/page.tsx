import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildArtifact, typeOfSlug, type ArtifactDoc } from '@foyer/artifacts';
import { Material } from '@foyer/ui';
import { ArtifactDocView } from '@/components/artifact-doc';
import { PrintButton } from '@/components/print-button';
import { api, isSample } from '@/lib/api';
import { palette } from '@/lib/mock';
import { sampleInput } from '@/lib/sample-artifacts';

export default async function ArtifactPage({ params }: { params: Promise<{ id: string; type: string }> }) {
  const { id, type: slug } = await params;
  const type = typeOfSlug(slug);
  if (!type) notFound();

  let doc: ArtifactDoc;
  let version: number | undefined;
  if (isSample(id)) doc = buildArtifact(type, sampleInput());
  else {
    const row = await api<{ version: number; doc: ArtifactDoc }>(`/projects/${id}/artifacts/${slug}`);
    if (!row) notFound();
    doc = row.doc;
    version = row.version;
  }

  const strip = isSample(id) ? (
    <div className="grid h-3 grid-cols-6 print:hidden">
      {palette.map((f) => (
        <Material key={f.name} finish={f.finish} className="h-full" />
      ))}
    </div>
  ) : null;

  return (
    <div>
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <Link href={`/projects/${id}/artifacts`} className="text-sm text-ink-muted transition-colors hover:text-clay">
          &larr; Handoff
        </Link>
        <div className="flex items-center gap-3">
          <a
            href={`/api/v1/projects/${id}/artifacts/${slug}/pdf`}
            className="text-sm text-ink-muted underline-offset-4 transition-colors hover:text-clay hover:underline"
          >
            Download PDF
          </a>
          <PrintButton />
        </div>
      </div>
      <ArtifactDocView doc={doc} version={version} strip={strip} />
    </div>
  );
}
