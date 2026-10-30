import { Chip, Material } from '@foyer/ui';
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

export default function RoomsPage() {
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
