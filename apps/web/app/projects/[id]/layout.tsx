import { ProjectRail } from '@/components/project-rail';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto grid max-w-[1240px] gap-10 px-6 lg:grid-cols-[16rem_1fr] lg:gap-16">
      <ProjectRail base={`/projects/${id}`} />
      <div className="min-w-0 py-12 lg:py-14">{children}</div>
    </div>
  );
}
