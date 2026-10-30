import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from './cx';

/* -------------------------------------------------------------------------- */
/* Button — clay is the primary action and nothing else                       */
/* -------------------------------------------------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap ' +
  'transition-[background-color,box-shadow,color] duration-150 outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-45';

export function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cx(
        BTN_BASE,
        size === 'sm' && 'h-8 px-3.5 text-[13px]',
        size === 'md' && 'h-11 px-5 text-[15px]',
        size === 'lg' && 'h-13 px-7 text-base',
        variant === 'primary' && 'bg-clay text-clay-fg shadow-sm hover:bg-clay-hover',
        variant === 'secondary' &&
          'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)] hover:bg-sunken',
        variant === 'ghost' && 'text-ink-muted hover:bg-sunken hover:text-ink',
        className,
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Chip — a soft tag for room, effort, and permit state                       */
/* -------------------------------------------------------------------------- */

export type Tone = 'neutral' | 'clay' | 'olive' | 'brass' | 'danger';

const TONE: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-muted',
  clay: 'bg-clay-soft text-clay-ink',
  olive: 'bg-olive-soft text-olive',
  brass: 'bg-brass-soft text-brass',
  danger: 'bg-danger-soft text-danger',
};

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs leading-none font-medium whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Trace — the schema invariant, on screen.                                   */
/* Every recommendation carries the brief answer that justifies it. If this    */
/* tag has nothing to show, the recommendation should not exist.               */
/* -------------------------------------------------------------------------- */

export function Trace({
  questionId,
  label,
  className,
}: {
  questionId: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full bg-surface py-1 pr-3 pl-1 text-xs',
        'text-ink-muted shadow-[0_0_0_1px_var(--line)] transition-colors hover:text-clay-ink',
        className,
      )}
    >
      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-clay-soft px-1.5 text-[10px] font-semibold text-clay-ink tabular-nums">
        {questionId}
      </span>
      <span>{label}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Rule — a divider, or a section head with a serif title                     */
/* -------------------------------------------------------------------------- */

export function Rule({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cx('border-0 border-t border-line', className)} />;
  return (
    <div className={cx('flex items-baseline gap-4', className)}>
      <span className="font-display text-[1.625rem] leading-none text-ink">{label}</span>
      <span className="h-px flex-1 translate-y-[-0.35em] bg-line" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Material — a finish sample. `finish` is one of the CSS finishes in the     */
/* app stylesheet (plaster, oak, linen, terracotta, brass, walnut).           */
/* -------------------------------------------------------------------------- */

export type Finish = 'plaster' | 'oak' | 'linen' | 'terracotta' | 'brass' | 'walnut';

export function Material({ finish, className }: { finish: Finish; className?: string }) {
  return <span aria-hidden className={cx('material block', `m-${finish}`, className)} />;
}

/* -------------------------------------------------------------------------- */
/* Marginal — a small index number set out in the left margin                 */
/* -------------------------------------------------------------------------- */

export function Marginal({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute top-1 -left-14 hidden font-display text-xl text-ink-faint lg:block"
      >
        {n}
      </span>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Fields                                                                     */
/* -------------------------------------------------------------------------- */

const FIELD_INPUT =
  'w-full rounded-sm bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-faint ' +
  'shadow-[0_0_0_1px_var(--line)] outline-none transition-shadow ' +
  'focus:shadow-[0_0_0_2px_var(--clay)]';

export function Field({
  label,
  hint,
  id,
  children,
}: {
  label: string;
  hint?: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-[15px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(FIELD_INPUT, className)} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} rows={3} className={cx(FIELD_INPUT, 'resize-none', className)} />;
}

/* -------------------------------------------------------------------------- */
/* Choice — a selectable pill. Clay fills it when chosen.                     */
/* -------------------------------------------------------------------------- */

export function Choice({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="group inline-flex cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="rounded-full bg-surface px-4 py-2 text-[15px] text-ink-muted shadow-[0_0_0_1px_var(--line)] transition-colors group-hover:text-ink peer-checked:bg-clay peer-checked:text-clay-fg peer-checked:shadow-none peer-focus-visible:ring-2 peer-focus-visible:ring-clay peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas">
        {label}
      </span>
    </label>
  );
}
