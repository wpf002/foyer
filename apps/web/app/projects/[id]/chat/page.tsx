import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChatThread } from '@/components/chat-thread';
import { api, isSample, type ApiChatMessage, type ApiProject } from '@/lib/api';

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const header = <h2 className="text-[clamp(2.75rem,5vw,4rem)]">Chat</h2>;
  if (isSample(id))
    return (
      <article>
        {header}
        <p className="mt-10 text-ink-muted">
          <Link href="/projects" className="text-clay underline-offset-4 hover:underline">
            Start A Project
          </Link>{' '}
          to chat.
        </p>
      </article>
    );

  const [p, messages] = await Promise.all([
    api<ApiProject>(`/projects/${id}`),
    api<ApiChatMessage[]>(`/projects/${id}/chat`),
  ]);
  if (!p || !messages) notFound();

  return (
    <article>
      {header}
      {p.brief?.completedAt ? (
        <ChatThread projectId={id} initial={messages} />
      ) : (
        <p className="mt-10 text-ink-muted">
          <Link href={`/projects/${id}`} className="text-clay underline-offset-4 hover:underline">
            Finish The Brief
          </Link>{' '}
          to chat.
        </p>
      )}
    </article>
  );
}
