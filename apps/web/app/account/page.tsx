import { notFound } from 'next/navigation';
import { Material } from '@foyer/ui';
import { AccountForm } from '@/components/account-form';
import { SignOutButton } from '@/components/auth-form';
import { api, KIND_LABEL, preparedLine, type ApiMe } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const me = await api<ApiMe>('/me');
  if (!me) notFound();
  const line = preparedLine(me.pro ? me : null);

  return (
    <div className="mx-auto grid max-w-[1240px] gap-12 px-6 py-12 lg:grid-cols-[1fr_22rem] lg:gap-16 lg:py-16">
      <main className="min-w-0">
        <h1 className="text-[clamp(2.75rem,5vw,4rem)]">Account</h1>
        <div className="mt-3 flex items-center gap-4">
          <p className="text-ink-muted">{me.email}</p>
          <SignOutButton />
        </div>
        <div className="mt-12 max-w-[40rem]">
          <AccountForm me={me} />
        </div>
      </main>

      <aside className="lg:pt-24">
        <p className="eyebrow">Handoff Header</p>
        <div className="card mt-3 overflow-hidden">
          <Material finish="walnut" className="h-16 w-full" />
          <div className="p-6">
            <p className="text-sm text-ink-faint">{line ?? 'Foyer'} &middot; Project Name</p>
            <p className="mt-2 font-display text-3xl leading-none">Contractor Brief</p>
            <dl className="mt-5 grid gap-1.5 text-sm text-ink-muted">
              <div className="flex justify-between gap-4 border-b border-line pb-1.5">
                <dt className="text-ink-faint">Prepared By</dt>
                <dd>{me.pro ? (me.name ?? me.studio ?? '—') : 'Foyer'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line pb-1.5">
                <dt className="text-ink-faint">Account</dt>
                <dd>{KIND_LABEL[me.kind]}</dd>
              </div>
            </dl>
          </div>
        </div>
      </aside>
    </div>
  );
}
