"use client";

import type { ReactNode } from 'react';

export const Card = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={`border border-white/10 bg-white/[0.03] ${className}`}>{children}</div>
);

export const CardHead = ({
  title,
  hint,
  aside,
}: {
  title: string;
  hint?: string;
  aside?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
    <div>
      <h2 className="text-[17px] font-medium tracking-[-0.03em]">{title}</h2>
      {hint && <p className="mt-1 text-[13px] leading-snug text-white/40">{hint}</p>}
    </div>
    {aside}
  </div>
);

export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase sm:text-[13px]">
    {children}
  </p>
);

export const Stat = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) => (
  <div className="border border-white/10 bg-white/[0.03] px-5 py-5">
    <p className="text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase">{label}</p>
    <p className="mt-3 text-[30px] leading-none font-medium tracking-[-0.04em] tabular-nums">
      {value}
    </p>
    {sub && <p className="mt-2 text-[13px] text-white/40">{sub}</p>}
  </div>
);

type Tone = 'neutral' | 'live' | 'good' | 'warn' | 'bad';

const TONES: Record<Tone, string> = {
  neutral: 'border-white/20 text-white/60',
  live: 'border-white text-white',
  good: 'border-white bg-white text-black',
  warn: 'border-amber-400/50 text-amber-300',
  bad: 'border-red-400/50 text-red-300',
};

export const Chip = ({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) => (
  <span
    className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-[-0.02em] uppercase ${TONES[tone]}`}
  >
    {children}
  </span>
);

export const Button = ({
  children,
  onClick,
  disabled,
  busy,
  variant = 'solid',
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'solid' | 'ghost';
  type?: 'button' | 'submit';
  className?: string;
}) => {
  const base =
    'inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium tracking-[-0.02em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-30';
  const skin =
    variant === 'solid'
      ? 'bg-white text-black hover:bg-white/85'
      : 'border border-white/20 text-white/70 hover:border-white hover:text-white';

  return (
    <button type={type} onClick={onClick} disabled={disabled || busy} className={`${base} ${skin} ${className}`}>
      {busy && <Spinner />}
      {children}
    </button>
  );
};

export const Spinner = ({ className = '' }: { className?: string }) => (
  <span
    className={`inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
  />
);

export const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 py-2">
    <span className="text-[13px] text-white/40">{label}</span>
    <span className="text-right text-[13px] font-medium tracking-[-0.02em] tabular-nums">{value}</span>
  </div>
);

export const Empty = ({ title, body }: { title: string; body: string }) => (
  <div className="border border-dashed border-white/15 px-6 py-16 text-center">
    <p className="text-[20px] font-medium tracking-[-0.04em] sm:text-[30px]">{title}</p>
    <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-white/40 sm:text-[15px]">
      {body}
    </p>
  </div>
);

export const Notice = ({ tone, children }: { tone: 'warn' | 'bad' | 'good'; children: ReactNode }) => {
  const skin =
    tone === 'bad'
      ? 'border-red-400/40 text-red-300'
      : tone === 'warn'
        ? 'border-amber-400/40 text-amber-300'
        : 'border-white/30 text-white';

  return (
    <div className={`border ${skin} px-4 py-3 text-[13px] leading-relaxed`}>{children}</div>
  );
};

export const Mono = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[12px] break-all text-white/70">{children}</span>
);
