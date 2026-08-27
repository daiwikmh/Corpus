"use client";

import { useCallback, useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useSmartAccount } from '../../src/providers/smart-account';
import { usePoolSession } from '../../src/hooks/usePoolSession';
import { PageHeader } from '../../src/components/shell/PageHeader';
import { PriceChart } from '../../src/components/pool/PriceChart';
import { OrderTicket } from '../../src/components/pool/OrderTicket';
import { OpenOrders } from '../../src/components/pool/OpenOrders';
import { PoolBalances } from '../../src/components/pool/PoolBalances';
import { MARKETS } from '../../src/contracts/markets';
import { CONTRACTS, DARK_POOL_CONFIGURED } from '../../src/contracts/config';
import { DARK_POOL_ABI } from '../../src/contracts/abis';
import { CHAIN_ID } from '../../src/utils/constants';
import {
  fetchBalances,
  fetchHealth,
  fetchMarkets,
  fetchOrders,
  type EnclaveHealth,
  type MarketSummary,
  type PoolBalance,
  type PoolOrder,
  type Session,
} from '../../src/services/darkPoolService';
import { Button, Card, CardHead, Chip, Notice, Row, Stat, Mono } from '../../src/components/ui';

export default function PoolPage() {
  const { address, isConnected } = useSmartAccount();
  const { session, authorise, error: sessionError } = usePoolSession(address);

  const [selected, setSelected] = useState(MARKETS[0]);
  const [health, setHealth] = useState<EnclaveHealth | null>(null);
  const [summaries, setSummaries] = useState<MarketSummary[]>([]);
  const [balances, setBalances] = useState<PoolBalance[]>([]);
  const [orders, setOrders] = useState<PoolOrder[]>([]);
  const [enclaveError, setEnclaveError] = useState('');

  const { data: enclaveLive } = useReadContract({
    address: CONTRACTS.DARK_POOL,
    abi: DARK_POOL_ABI,
    functionName: 'enclaveIsLive',
    chainId: CHAIN_ID,
    query: { enabled: DARK_POOL_CONFIGURED, refetchInterval: 30_000 },
  });

  const { data: epoch } = useReadContract({
    address: CONTRACTS.DARK_POOL,
    abi: DARK_POOL_ABI,
    functionName: 'rootEpoch',
    chainId: CHAIN_ID,
    query: { enabled: DARK_POOL_CONFIGURED, refetchInterval: 30_000 },
  });

  const loadPrivate = useCallback(async (active: Session) => {
    try {
      const [b, o] = await Promise.all([fetchBalances(active), fetchOrders(active)]);
      setBalances(b);
      setOrders(o);
      setEnclaveError('');
    } catch (err) {
      setEnclaveError(err instanceof Error ? err.message : 'Could not read your account');
    }
  }, []);

  const refresh = useCallback(() => {
    if (session) void loadPrivate(session);
  }, [session, loadPrivate]);

  const startSession = useCallback(async () => {
    const active = await authorise();
    if (active) await loadPrivate(active);
  }, [authorise, loadPrivate]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [h, m] = await Promise.all([fetchHealth(), fetchMarkets()]);
        if (cancelled) return;
        setHealth(h);
        setSummaries(m);
        setEnclaveError('');
      } catch (err) {
        if (cancelled) return;
        setEnclaveError(err instanceof Error ? err.message : 'Enclave unreachable');
      }
    };

    load();
    const interval = setInterval(load, 20_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [b, o] = await Promise.all([fetchBalances(session), fetchOrders(session)]);
        if (cancelled) return;
        setBalances(b);
        setOrders(o);
        setEnclaveError('');
      } catch (err) {
        if (cancelled) return;
        setEnclaveError(err instanceof Error ? err.message : 'Could not read your account');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const shownBalances = session ? balances : [];
  const shownOrders = session ? orders : [];

  const summary = summaries.find((s) => s.market.toLowerCase() === selected.id.toLowerCase());
  const clearing = summary?.lastClearingPrice
    ? formatUnits(BigInt(summary.lastClearingPrice), 18)
    : null;

  if (!DARK_POOL_CONFIGURED) {
    return (
      <>
        <PageHeader eyebrow="Confidential matching" title="Dark pool" />
        <Notice tone="warn">
          The escrow is not deployed yet. Set <Mono>NEXT_PUBLIC_DARK_POOL</Mono> to the deployed{' '}
          <Mono>ZyloDarkPool</Mono> address to enable trading.
        </Notice>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Confidential matching inside a TEE" title="Dark pool" />

      <div className="mb-8 grid gap-px bg-white/10 sm:grid-cols-3">
        <Stat
          label="Enclave"
          value={enclaveLive === false ? 'Offline' : health ? 'Live' : '—'}
          sub={health ? `epoch ${health.epoch}` : 'awaiting heartbeat'}
        />
        <Stat
          label="Last clearing price"
          value={clearing ? Number(clearing).toFixed(6) : '—'}
          sub={`${selected.quote.symbol} per ${selected.base.symbol}`}
        />
        <Stat
          label="Committed epoch"
          value={epoch !== undefined ? String(epoch) : '—'}
          sub="balance root on-chain"
        />
      </div>

      {enclaveLive === false && (
        <div className="mb-6">
          <Notice tone="bad">
            The enclave has stopped publishing balance roots. Withdrawals through it are
            unavailable, but your funds are not stuck — you can exit directly against the last
            published root using <Mono>emergencyWithdraw</Mono>.
          </Notice>
        </div>
      )}

      {enclaveError && (
        <div className="mb-6">
          <Notice tone="warn">{enclaveError}</Notice>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-px bg-white/10">
        {MARKETS.map((market) => (
          <button
            key={market.id}
            onClick={() => setSelected(market)}
            className={`px-4 py-2 text-[13px] transition-colors ${
              market.id === selected.id
                ? 'bg-white text-black'
                : 'bg-black text-white/60 hover:text-white'
            }`}
          >
            {market.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHead title={`${selected.base.symbol} reference market`} />
            <div className="px-5 pb-2 pt-4">
              <PriceChart symbol={selected.tradingViewSymbol} />
            </div>
            <div className="border-t border-white/10 px-5 py-3">
              <Row
                label="Pool clearing price"
                value={clearing ? `${Number(clearing).toFixed(6)} ${selected.quote.symbol}` : 'No batch cleared yet'}
              />
              <Row
                label="Last batch"
                value={
                  summary?.lastClearedAt
                    ? new Date(summary.lastClearedAt).toLocaleTimeString()
                    : '—'
                }
              />
              <p className="pt-2 text-[12px] leading-relaxed text-white/40">
                The chart is the public market for {selected.base.symbol}. The pool&apos;s own book
                has no public feed by design — only its clearing price is ever revealed, and only
                after a batch has settled.
              </p>
            </div>
          </Card>

          <OpenOrders orders={shownOrders} onCancelled={refresh} />
        </div>

        <div className="flex flex-col gap-6">
          {!isConnected ? (
            <Notice tone="warn">Connect a wallet to trade.</Notice>
          ) : !session ? (
            <Card>
              <CardHead title="Authorise a session" />
              <div className="flex flex-col gap-4 p-5">
                <p className="text-[13px] leading-relaxed text-white/50">
                  Your balances and resting orders are not a public endpoint. Sign a short-lived
                  session — 10 minutes, held in memory only — so the enclave will answer for your
                  account.
                </p>
                {sessionError && <Notice tone="bad">{sessionError}</Notice>}
                <Button onClick={startSession}>Sign session</Button>
              </div>
            </Card>
          ) : (
            <Chip tone="good">Session active</Chip>
          )}

          <PoolBalances balances={shownBalances} onChanged={refresh} />
          <OrderTicket market={selected} balances={shownBalances} onPlaced={refresh} />
        </div>
      </div>
    </>
  );
}
