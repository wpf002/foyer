/**
 * The mark is a door swing in plan: wall, hinge, leaf at ninety degrees, and
 * the dashed arc. It is the drawing convention for an entry, which is what a
 * foyer is.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="flex items-baseline gap-2">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden className="translate-y-[2px]">
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M1 17h2.2" />
            <path d="M3.2 17V4.4" />
            <path d="M3.2 4.4A12.6 12.6 0 0 1 15.8 17" strokeDasharray="2 2.4" opacity="0.65" />
            <path d="M15.8 17H19" />
          </g>
        </svg>
        <span className="font-display text-[22px] leading-none tracking-[-0.01em]">Foyer</span>
      </span>
    </span>
  );
}
