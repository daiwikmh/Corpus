"use client";

import { useConnect } from 'wagmi';
import type { Connector } from 'wagmi';
import { Spinner } from '../ui';
import { NATIVE_SYMBOL } from '../../utils/constants';
import { FRONT_LILY } from '../landing/orbit.css';

const BUILT_ON = ['FAssets', 'FTSOv2', 'Data Connector', 'XRPL', 'Xaman'];

/** Several connectors can surface the same wallet; show each name once. */
function dedupe(connectors: readonly Connector[]): Connector[] {
  const seen = new Set<string>();
  return connectors.filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const WalletIcon = ({ name }: { name: string }) => (
  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-medium">
    {name.charAt(0).toUpperCase()}
  </span>
);

export const LoginScreen = () => {
  const { connect, connectors, isPending, error, variables } = useConnect();
  const demo = connectors.find((c) => c.id === 'mock');
  const options = dedupe(connectors.filter((c) => c.id !== 'mock'));

  return (
    <div className="grid min-h-full grid-cols-1 lg:grid-cols-2">
      {/* ---------------- left: sign in ---------------- */}
      <div className="flex flex-col justify-between px-6 py-10 sm:px-12 lg:px-16">
        <svg viewBox="0 0 220 68" className="w-[92px] shrink-0" aria-label="Zylo">
          <text x="0" y="52" fill="#ffffff" fontSize="56" fontWeight="500" letterSpacing="-3">
            ZYLO
          </text>
        </svg>

        <div className="w-full max-w-sm py-16">
          <h1 className="text-[32px] leading-[1.05] font-medium tracking-[-0.04em] sm:text-[38px]">
            Your XRP, working on Flare
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/40">
            Connect a wallet to mint FXRP, earn on it, and redeem back to XRP.
          </p>

          <div className="mt-8 flex flex-col gap-2">
            {options.map((connector) => {
              const busy = isPending && variables?.connector === connector;
              return (
                <button
                  key={connector.uid}
                  type="button"
                  onClick={() => connect({ connector })}
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-white/15 bg-white/[0.03] px-5 py-3 text-[13px] font-medium tracking-[0.04em] text-white/80 uppercase transition-colors hover:border-white/40 hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                >
                  {busy ? <Spinner /> : <WalletIcon name={connector.name} />}
                  {busy ? 'Connecting' : `Continue with ${connector.name}`}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="mt-4 border border-red-400/40 px-4 py-3 text-[13px] leading-relaxed text-red-300">
              {error.message}
            </p>
          )}

          {demo && (
            <button
              type="button"
              onClick={() => connect({ connector: demo })}
              disabled={isPending}
              className="mt-3 inline-flex w-full items-center justify-center rounded-md px-5 py-3 text-[13px] font-medium tracking-[0.04em] text-white/40 uppercase transition-colors hover:text-white disabled:opacity-30"
            >
              Browse a read-only demo account
            </button>
          )}

          <div className="mt-8 flex items-center gap-4">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] tracking-[0.1em] text-white/25 uppercase">
              Coston2 testnet
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <p className="mt-6 text-center text-[12px] leading-relaxed text-white/25">
            Non-custodial. Zylo never holds your keys. You&apos;ll need a little {NATIVE_SYMBOL} for
            gas unless sponsored transactions are enabled.
          </p>
        </div>

        <p className="text-[12px] text-white/20">
          Unaudited testnet software. Do not use with real funds.
        </p>
      </div>

      {/* ---------------- right: hero ---------------- */}
      <div className="hidden flex-col lg:flex">
        <div
          className="relative flex-1 overflow-hidden"
          style={{
            background:
              'linear-gradient(165deg, #1b2a63 0%, #3b5fbf 42%, #8fb3f5 78%, #d8e6ff 100%)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(80% 60% at 70% 20%, rgba(255,255,255,0.35), transparent 70%)',
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={FRONT_LILY}
            alt=""
            aria-hidden="true"
            className="absolute bottom-0 left-1/2 h-[86%] w-auto -translate-x-1/2 object-contain"
          />
        </div>

        <div className="bg-black px-12 py-10">
          <p className="text-center text-[11px] font-medium tracking-[0.14em] text-white/40 uppercase">
            Built on Flare infrastructure
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {BUILT_ON.map((name) => (
              <span
                key={name}
                className="text-[15px] font-medium tracking-[-0.02em] text-white/70"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
