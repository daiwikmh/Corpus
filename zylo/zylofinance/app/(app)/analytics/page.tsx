"use client";

import { useEffect, useState } from 'react';
import { useSmartAccount } from '../../src/providers/smart-account';
import { PageHeader } from '../../src/components/shell/PageHeader';
import { VaultCard } from '../../src/components/vault/VaultCard';
import {
  fetchVaultAnalytics,
  fetchUserYieldStats,
  formatNumber,
  formatUsd,
  type VaultAnalytics,
  type UserYieldStats,
} from '../../src/services/analyticsService';
import { NATIVE_SYMBOL } from '../../src/utils/constants';
import { Card, CardHead, Row, Stat } from '../../src/components/ui';

export default function EarnPage() {
  const { address } = useSmartAccount();
  const [vault, setVault] = useState<VaultAnalytics | null>(null);
  const [user, setUser] = useState<UserYieldStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const analytics = await fetchVaultAnalytics();
      if (cancelled) return;
      setVault(analytics);

      if (address) {
        const stats = await fetchUserYieldStats(address);
        if (!cancelled) setUser(stats);
      }
    };

    load();
    const interval = setInterval(load, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address]);

  return (
    <>
      <PageHeader eyebrow="FTSO delegation, compounded" title="Earn" />

      <div className="mb-10 grid gap-px bg-white/10 sm:grid-cols-3">
        <Stat
          label="Total value locked"
          value={vault ? formatUsd(vault.tvlUsd) : '—'}
          sub={vault ? `${formatNumber(vault.totalAssets, 2)} ${NATIVE_SYMBOL}` : undefined}
        />
        <Stat
          label="Share price"
          value={vault ? vault.sharePrice.toFixed(6) : '—'}
          sub={`${NATIVE_SYMBOL} per yFLR`}
        />
        <Stat
          label="Rewards compounded"
          value={vault ? `${formatNumber(vault.totalYield, 4)}` : '—'}
          sub={`${NATIVE_SYMBOL} above deposits`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <VaultCard />

        <div className="flex flex-col gap-6">
          <Card>
            <CardHead title="Your position" />
            <div className="px-5 py-3">
              <Row
                label="yFLR held"
                value={user ? formatNumber(user.userShares, 4) : '—'}
              />
              <Row
                label="Worth today"
                value={user ? `${formatNumber(user.userAssets, 4)} ${NATIVE_SYMBOL}` : '—'}
              />
              <Row
                label="Rewards earned"
                value={user ? `${formatNumber(user.userYieldEarned, 6)} ${NATIVE_SYMBOL}` : '—'}
              />
              <Row
                label="Share of vault"
                value={user ? `${formatNumber(user.userPercentageOfPool, 3)}%` : '—'}
              />
            </div>
          </Card>

          <Card>
            <CardHead title="What the vault does" />
            <div className="flex flex-col gap-3 p-5 text-[13px] leading-relaxed text-white/50">
              <p>
                Deposited FLR is wrapped and delegated to FTSO data providers. Rewards land every
                few days and are folded back into the pool, so yFLR buys more FLR over time rather
                than paying out separately.
              </p>
              <p>
                Yield is shown as realised rewards, not a projected APY — there is no forecast here
                that the contract cannot back up.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
