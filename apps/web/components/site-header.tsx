'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './wordmark';
import { isSample } from '@/lib/api';
import { project } from '@/lib/mock';

const NAV = [
  { href: '/projects/prescott', label: 'Sample' },
  { href: '/intake', label: 'Start A Plan' },
];

export function SiteHeader() {
  const path = usePathname();
  const inSample = isSample(path.split('/')[2] ?? '') && path.startsWith('/projects/');

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-5 px-6">
        <Link href="/" className="text-ink transition-opacity hover:opacity-70">
          <Wordmark />
        </Link>
        {inSample ? (
          <span className="hidden items-center gap-3 text-sm text-ink-muted sm:flex">
            <span className="h-4 w-px bg-line" />
            {project.name}
          </span>
        ) : null}

        <nav className="ml-auto flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={
                n.href === '/intake'
                  ? 'ml-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-ink-inverse transition-colors hover:bg-espresso-soft'
                  : 'rounded-full px-3.5 py-2 text-sm text-ink-muted transition-colors hover:bg-sunken hover:text-ink'
              }
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
