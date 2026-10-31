import { Chip, Material } from '@foyer/ui';
import { notFound } from 'next/navigation';
import { AddRoom, RoomTools } from '@/components/room-tools';
import { api, feetInches, isSample, type ApiProject, type ApiRoom } from '@/lib/api';
import { recommendations, roomFinishes, rooms, type Room } from '@/lib/mock';

/** The room's finishes laid out as a sample board, largest first. */
function Board({ room }: { room: Room }) {
  const [lead, ...rest] = roomFinishes[room.id] ?? ['plaster'];
  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-md lg:aspect-auto lg:h-full lg:min-h-[19rem]">
      <Material finish={lead!} className="absolute inset-0" />
      <div className="absolute right-4 bottom-4 flex gap-2.5">
        {rest.map((f) => (
          <Material key={f} finish={f} className="size-14 rounded-sm shadow-md" />
        ))}
      </div>
      <figcaption className="absolute top-4 left-4 rounded-full bg-surface/90 px-3 py-1 text-xs font-medium text-ink backdrop-blur-sm">
        {room.dims} · {room.ceiling} Ceiling
      </figcaption>
    </figure>
  );
}

function SampleRooms() {
  return (
    <article>
      <header>
        <h2 className="text-[clamp(2.75rem,5vw,4rem)]">Rooms</h2>
        <p className="lede mt-3">Four rooms, measured by hand.</p>
      </header>

      <div className="mt-12 space-y-8">
        {rooms.map((room) => {
          const count = recommendations.filter((r) => r.roomId === room.id).length;
          return (
            <section
              key={room.id}
              className="card grid gap-0 overflow-hidden lg:grid-cols-[minmax(0,21rem)_1fr]"
            >
              <Board room={room} />
              <div className="p-7 lg:p-9">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-[2.5rem]">{room.name}</h3>
                  <span className="text-sm text-ink-faint">
                    {room.photos} Photos · {count} Recs
                  </span>
                </div>
                <p className="mt-4 max-w-[58ch] text-ink-muted">{room.read}</p>

                <div className="mt-7 grid gap-6 xl:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-ink">Fixed</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {room.fixed.map((it) =>
                        it.includes('unconfirmed') ? (
                          <Chip key={it} tone="danger">
                            {it.replace(' (unconfirmed)', '')} · Unconfirmed
                          </Chip>
                        ) : (
                          <Chip key={it}>{it}</Chip>
                        ),
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">Can Move</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {room.movable.map((it) => (
                        <Chip key={it} tone="olive">
                          {it}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 flex gap-4 rounded-md bg-danger-soft p-6">
        <Chip tone="danger" className="h-fit shrink-0">
          Safety
        </Chip>
        <p className="max-w-[62ch] text-sm text-ink-muted">
          Load paths stay unconfirmed until a licensed structural engineer inspects them. Foyer
          can&rsquo;t read a load path from a photo.
        </p>
      </div>
    </article>
  );
}

function Photo({ room }: { room: ApiRoom }) {
  const first = room.photos[0];
  const dims = [feetInches(room.widthIn), feetInches(room.lengthIn)].filter(Boolean).join(' × ');
  const ceiling = feetInches(room.ceilingIn);
  const caption = [dims, ceiling ? `${ceiling} Ceiling` : null].filter(Boolean).join(' · ');
  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-md bg-sunken lg:aspect-auto lg:h-full lg:min-h-[19rem]">
      {first ? (
        <img src={`/api${first.url}`} alt={room.name} className="absolute inset-0 size-full object-cover" />
      ) : (
        <Material finish="plaster" className="absolute inset-0" />
      )}
      {caption ? (
        <figcaption className="absolute top-4 left-4 rounded-full bg-surface/90 px-3 py-1 text-xs font-medium text-ink backdrop-blur-sm">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function LiveRooms({ project }: { project: ApiProject }) {
  const briefDone = !!project.brief?.completedAt;
  return (
    <article>
      <header>
        <h2 className="text-[clamp(2.75rem,5vw,4rem)]">Rooms</h2>
      </header>

      <div className="mt-12 space-y-8">
        {project.rooms.map((room) => {
          const fixed = room.fixedElements ?? [];
          const movable = room.movableElements ?? [];
          const read = room.critique?.roomRead ?? room.description;
          return (
            <section key={room.id} className="card grid gap-0 overflow-hidden lg:grid-cols-[minmax(0,21rem)_1fr]">
              <Photo room={room} />
              <div className="p-7 lg:p-9">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-[2.5rem]">{room.name}</h3>
                  <span className="text-sm text-ink-faint">
                    {room.photos.length} Photos · {room.recommendations.length} Recs
                  </span>
                </div>
                {read ? <p className="mt-4 max-w-[58ch] text-ink-muted">{read}</p> : null}

                {fixed.length || movable.length ? (
                  <div className="mt-7 grid gap-6 xl:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-ink">Fixed</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {fixed.map((it) => (
                          <Chip key={it} tone={it.includes('unconfirmed') ? 'danger' : 'neutral'}>
                            {it}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">Can Move</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {movable.map((it) => (
                          <Chip key={it} tone="olive">
                            {it}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {room.critique?.leaveAlone.length ? (
                  <div className="mt-7">
                    <p className="text-sm font-medium text-ink">Leave Alone</p>
                    <ul className="mt-2.5 space-y-2 text-sm text-ink-muted">
                      {room.critique.leaveAlone.map((l) => (
                        <li key={l.element}>
                          <span className="text-ink">{l.element}</span> · {l.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <RoomTools
                  roomId={room.id}
                  photos={room.photos.length}
                  canCritique={briefDone && (!!room.description || fixed.length > 0)}
                  critiqued={!!room.critiquedAt}
                />
              </div>
            </section>
          );
        })}
        <AddRoom projectId={project.id} />
      </div>
    </article>
  );
}

export default async function RoomsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isSample(id)) return <SampleRooms />;
  const project = await api<ApiProject>(`/projects/${id}`);
  if (!project) notFound();
  return <LiveRooms project={project} />;
}
