import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
export { cx };

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ReactNode;
};

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary text-primary-ink font-semibold hover:bg-primary-strong active:bg-primary',
  secondary:
    'border border-line bg-raised text-ink hover:border-line-strong hover:bg-hover active:bg-raised',
  ghost: 'text-muted hover:bg-hover hover:text-ink active:bg-raised',
  danger: 'text-neg hover:bg-neg/15 active:bg-neg/10',
};

export function Button({ variant = 'secondary', icon, children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] transition-colors duration-150 disabled:opacity-45 disabled:hover:bg-transparent',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  variant = 'ghost',
  className,
  children,
  ...rest
}: Omit<ButtonProps, 'icon'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150 disabled:opacity-40 disabled:hover:bg-transparent',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;
const toText = (v: number) => String(round(v)).replace('.', ',');
function parse(text: string): number | null {
  const t = text.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return 0;
  if (!/^-?\d*\.?\d*$/.test(t)) return null;
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : null;
}

interface NumberFieldProps {
  value: number;
  onChange: (v: number) => void;
  label: string;
  step?: number;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  quiet?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
  placeholder?: string;
  /** mostra vazio quando o valor é este (campos opcionais) */
  emptyWhen?: number;
}

/**
 * Campo numérico que aceita vírgula ou ponto, com ↑/↓ para incrementar.
 * O texto digitado é mantido enquanto o campo tem foco, para não brigar com
 * quem está digitando "0," antes do decimal.
 */
export function NumberField({
  value,
  onChange,
  label,
  step = 1,
  min = 0,
  max = Infinity,
  prefix,
  suffix,
  quiet,
  className,
  inputClassName,
  id,
  placeholder,
  emptyWhen,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const shown = draft ?? (emptyWhen !== undefined && value === emptyWhen ? '' : toText(value));
  const invalid = draft !== null && parse(draft) === null;

  return (
    <div
      className={cx(
        quiet ? 'field-quiet' : 'field',
        'flex items-center gap-1',
        invalid && 'border-neg! ',
        className,
      )}
    >
      {prefix && <span className="shrink-0 text-faint select-none">{prefix}</span>}
      <input
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={shown}
        className={cx(
          'num h-full w-full min-w-0 bg-transparent text-right outline-none',
          inputClassName,
        )}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = parse(e.target.value);
          if (v !== null) onChange(clamp(v));
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          e.preventDefault();
          const dir = e.key === 'ArrowUp' ? 1 : -1;
          const mult = e.shiftKey ? 10 : 1;
          setDraft(null);
          onChange(clamp(round(value + dir * step * mult)));
        }}
      />
      {suffix && <span className="shrink-0 text-faint select-none">{suffix}</span>}
    </div>
  );
}

export function Labeled({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={htmlFor} className="text-[12px] text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-[12px] text-faint">{hint}</p>}
    </div>
  );
}
