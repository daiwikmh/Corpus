"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { useSmartAccount } from '../../providers/smart-account';
import { CHAIN_ID, NATIVE_SYMBOL } from '../../utils/constants';

const TABS = [
  { href: '/dashboard', label: 'Portfolio', icon: 'portfolio' },
  { href: '/fxrp', label: 'Mint', icon: 'mint' },
  { href: '/redeem', label: 'Redeem', icon: 'redeem' },
  { href: '/pool', label: 'Trade', icon: 'trade' },
  { href: '/analytics', label: 'Earn', icon: 'earn' },
  { href: '/send', label: 'Send', icon: 'send' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
] as const;

const ICONS: Record<(typeof TABS)[number]['icon'], ReactNode> = {
  portfolio: (
    <>
      <rect x="2.6" y="4.4" width="10.8" height="8.2" rx="1.4" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M2.6 7h10.8" stroke="currentColor" strokeWidth="1.3" />
    </>
  ),
  mint: (
    <>
      <circle cx="8" cy="8" r="5.4" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M8 5.2v5.6M5.2 8h5.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  redeem: (
    <>
      <circle cx="8" cy="8" r="5.4" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M5.2 8h5.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  trade: (
    <>
      <path d="M3.4 5.6h9.2M10.4 3.4l2.2 2.2-2.2 2.2" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.6 10.4H3.4M5.6 8.2L3.4 10.4l2.2 2.2" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  earn: (
    <>
      <path d="M3 11.4l3.2-3.4 2.4 2.2L13 5.4" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.2 5.4H13v2.8" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  send: (
    <>
      <path d="M13 3L7.2 8.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13 3l-3.8 10-2-4.2L3 6.8 13 3z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </>
  ),
  settings: (
    <>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M8 2.2v1.6M8 12.2v1.6M13.8 8h-1.6M3.8 8H2.2M12.1 3.9l-1.1 1.1M5 11l-1.1 1.1M12.1 12.1L11 11M5 5L3.9 3.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
};

const Wordmark = ({ width }: { width: string }) => (
  <svg viewBox="0 0 220 68" className={width} aria-label="Zylo">
    <text x="0" y="52" fill="#ffffff" fontSize="56" fontWeight="500" letterSpacing="-3">
      ZYLO
    </text>
  </svg>
);

const NavIcon = ({ icon }: { icon: (typeof TABS)[number]['icon'] }) => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      {ICONS[icon]}
    </svg>
  </span>
);

const toggleSidebar = () => {
  const collapsed = document.documentElement.classList.toggle('sidebar-collapsed');
  try {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
  } catch {
    /* private mode — collapse just won't persist */
  }
};

export const DashboardShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { address, mode, wrongChain } = useSmartAccount();
  const disconnecting = false;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.09), transparent 60%)',
        }}
      />

      <div className="relative z-10 flex h-full">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 transition-[width] duration-150 sm:flex [.sidebar-collapsed_&]:w-20">
          <div className="flex items-center justify-between px-6 py-6 [.sidebar-collapsed_&]:px-5">
            <Link href="/dashboard" className="[.sidebar-collapsed_&]:hidden">
              <Wordmark width="w-[92px]" />
            </Link>
            <button
              type="button"
              aria-label="Toggle sidebar"
              onClick={toggleSidebar}
              className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="transition-transform duration-150 [.sidebar-collapsed_&]:rotate-180"
              >
                <path
                  d="M10 3L5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                title={tab.label}
                className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-[15px] font-medium tracking-[-0.02em] uppercase transition-colors ${
                  isActive(tab.href)
                    ? 'bg-white text-black'
                    : 'text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                <NavIcon icon={tab.icon} />
                <span className="[.sidebar-collapsed_&]:hidden">{tab.label}</span>
              </Link>
            ))}
          </nav>

          <div className="px-3 pb-6">
            {address && (
              <div className="mb-3 px-3 [.sidebar-collapsed_&]:hidden">
                <p className="truncate font-mono text-[11px] text-white/40">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </p>
                <p className="mt-0.5 text-[10px] tracking-[-0.02em] text-white/25 uppercase">
                  {mode === 'smart-account' ? 'Smart account' : (connector?.name ?? 'Wallet')}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => disconnect()}
              disabled={disconnecting}
              className="flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-[15px] font-medium tracking-[-0.02em] text-white/40 uppercase transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-[11px]">
                &times;
              </span>
              <span className="[.sidebar-collapsed_&]:hidden">
                {disconnecting ? 'Signing out' : 'Sign out'}
              </span>
            </button>
          </div>
        </aside>

        <div className="flex min-h-full flex-1 flex-col overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur sm:hidden">
            <div className="flex items-center justify-between">
              <Link href="/dashboard">
                <Wordmark width="w-[64px]" />
              </Link>
              <button
                type="button"
                onClick={() => disconnect()}
                disabled={disconnecting}
                className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-medium tracking-[-0.02em] text-white/50 uppercase"
              >
                Sign out
              </button>
            </div>
            <nav className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-1">
              {TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-[-0.02em] uppercase ${
                    isActive(tab.href) ? 'bg-white text-black' : 'text-white/50'
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          </header>

          {connector?.id === 'mock' && (
            <p className="border-b border-white/15 bg-white/[0.04] px-4 py-2.5 text-[12px] leading-relaxed text-white/50 sm:px-8">
              Read-only demo. Balances and prices are live from Coston2, but nothing can be signed —
              connect a wallet to transact.
            </p>
          )}

          {wrongChain && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/25 bg-amber-400/[0.06] px-4 py-2.5 sm:px-8">
              <p className="text-[12px] leading-relaxed text-amber-300/80">
                Your wallet is on a different network. Switch to Flare {NATIVE_SYMBOL} to use Zylo.
              </p>
              <button
                type="button"
                onClick={() => switchChain({ chainId: CHAIN_ID })}
                disabled={switching}
                className="shrink-0 rounded-full border border-amber-300/50 px-3 py-1 text-[11px] font-medium tracking-[-0.02em] text-amber-200 uppercase hover:bg-amber-300/10 disabled:opacity-40"
              >
                {switching ? 'Switching' : 'Switch network'}
              </button>
            </div>
          )}

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};
