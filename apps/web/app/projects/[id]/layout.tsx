import { notFound } from 'next/navigation';
import { budgetLabel, type Finish } from '@foyer/ui';
import { ProjectRail, type RailProps } from '@/components/project-rail';
import { api, isSample, type ApiProject } from '@/lib/api';
import { artifacts, brief, palette, project, recommendations, roadmap, rooms, totals } from '@/lib/mock';

const DEFAULT_FINISHES: Finish[] = ['plaster', 'oak', 'linen', 'terracotta', 'brass', 'walnut'];

async function railFor(id: string): Promise<Omit<RailProps, 'base'> | null> {
  if (isSample(id)) {
    return {
      name: project.name,
      subtitle: project.subtitle,
      meta: `${project.city} · ×${project.regionFactor.toFixed(2)}`,
      finishes: palette.map((p) => p.finish),
      budget: {
        label: budgetLabel(project.budgetLowCents, project.budgetHighCents) ?? '',
        overCents: totals.midCents - project.budgetHighCents,
      },
      nav: [
        { seg: '', title: 'Brief', count: brief.length },
        { seg: 'rooms', title: 'Rooms', count: rooms.length },
        { seg: 'recommendations', title: 'Recommendations', count: recommendations.length },
        { seg: 'roadmap', title: 'Roadmap', count: roadmap.length },
        { seg: 'costs', title: 'Costs', count: roadmap.length },
        { seg: 'artifacts', title: 'Handoff', count: artifacts.length },
      ],
    };
  }
  const p = await api<ApiProject>(`/projects/${id}`);
  if (!p) return null;
  const label = budgetLabel(p.budgetLowCents, p.budgetHighCents);
  return {
    name: p.name,
    meta: `Zip ${p.zip}`,
    finishes: DEFAULT_FINISHES,
    budget: label ? { label } : undefined,
    nav: [
      { seg: '', title: 'Brief', count: p.brief?.answers.length ?? 0 },
      { seg: 'rooms', title: 'Rooms', count: p.rooms.length },
      {
        seg: 'recommendations',
        title: 'Recommendations',
        count: p.rooms.reduce((n, r) => n + r.recommendations.length, 0),
      },
      { seg: 'roadmap', title: 'Roadmap', count: p.roadmapItems.length },
      { seg: 'costs', title: 'Costs', count: p.roadmapItems.filter((r) => r.lowCents !== null).length },
      { seg: 'artifacts', title: 'Handoff', count: p.roadmapItems.length ? 5 : 0 },
      { seg: 'chat', title: 'Chat', count: p.chatCount },
    ],
  };
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rail = await railFor(id);
  if (!rail) notFound();
  return (
    <div className="mx-auto grid max-w-[1240px] gap-2 px-6 lg:grid-cols-[16rem_1fr] lg:gap-16">
      <ProjectRail base={`/projects/${id}`} {...rail} />
      <div className="min-w-0 py-8 lg:py-14">{children}</div>
    </div>
  );
}
