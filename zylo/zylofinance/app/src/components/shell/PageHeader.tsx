import type { ReactNode } from 'react';

export const PageHeader = ({
  eyebrow,
  title,
  aside,
}: {
  eyebrow: string;
  title: string;
  aside?: ReactNode;
}) => (
  <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
    <div>
      <p className="text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase sm:text-[13px]">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-[44px] leading-[0.9] font-medium tracking-[-0.04em] sm:text-[64px]">
        {title}
      </h1>
    </div>
    {aside}
  </header>
);
