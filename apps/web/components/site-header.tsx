'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './wordmark';
import { isSample } from '@/lib/api';
import { project } from '@/lib/mock';

const NAV = [
  { href: '/projects', label: 'Projects' },
  { href: '/projects/prescott', label: 'Sample' },
  { href: '/cost-index', label: 'Cost Index' },
  { href: '/account', label: 'Account' },
];

const START = { href: '/intake', label: 'Start A Plan' };

/** Longest matching nav href wins, so /projects/prescott marks Sample, not Projects. */
const activeHref = (path: string) =>
  NAV.map((n) => n.href)
    .filter((h) => path === h || path.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];

export function SiteHeader() {
  const path = usePathname();
  const inSample = isSample(path.split('/')[2] ?? '') && path.startsWith('/projects/');
  const shared = path.startsWith('/share/');

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-5 px-6">
        {shared ? (
          <Wordmark />
        ) : (
          <Link href="/" className="text-ink transition-opacity hover:opacity-70">
            <Wordmark />
          </Link>
        )}
        {inSample ? (
          <span className="hidden items-center gap-3 text-sm text-ink-muted sm:flex">
            <span className="h-4 w-px bg-line" />
            {project.name}
          </span>
        ) : null}

        {shared ? null : (
          <>
            <nav className="ml-auto hidden items-center gap-1 sm:flex">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-full px-3.5 py-2 text-sm text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <Link
              href={START.href}
              className="ml-auto rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-inverse transition-colors hover:bg-espresso-soft sm:ml-1"
            >
              {START.label}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

/** Phone-width tab bar. The top nav takes over from the sm breakpoint. */
export function TabBar() {
  const path = usePathname();
  if (path.startsWith('/share/')) return null;
  const active = activeHref(path);
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:hidden">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={n.href === active ? 'page' : undefined}
          className={`flex h-14 items-center justify-center text-[13px] ${n.href === active ? 'font-medium text-clay' : 'text-ink-muted'}`}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
