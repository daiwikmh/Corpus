"use client";

import { useEffect, useState } from 'react';
import { useSmartAccount } from '../../providers/smart-account';
import { fetchPortfolioValue, type PortfolioData } from '../../services/portfolioService';
import { errorMessage } from '../../utils/etherspot';
import { formatNumber, formatUsd } from '../../services/analyticsService';
import { explorerAddress } from '../../utils/constants';
import { Card, CardHead, Stat, Empty, Mono, Spinner } from '../ui';

export const PortfolioPanel = () => {
  const { address, eoaAddress, smartAccountAddress, isConnected } = useSmartAccount();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    const load = async () => {
      try {
        const next = await fetchPortfolioValue(smartAccountAddress, eoaAddress);
        if (cancelled) return;
        setData(next);
        setError('');
      } catch (e) {
        if (!cancelled) setError(errorMessage(e) || 'Could not load balances');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address, smartAccountAddress, eoaAddress]);

  if (!isConnected) {
    return <Empty title="Not signed in" body="Sign in to see what you're holding across Flare." />;
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 py-16 text-[13px] text-white/40">
        <Spinner /> Reading balances
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-px bg-white/10 sm:grid-cols-3">
        <Stat label="Total value" value={data ? formatUsd(data.totalUsd) : '—'} sub="Priced by FTSOv2" />
        <Stat
          label="FXRP held"
          value={data ? formatNumber(data.fxrpBalance, 4) : '—'}
          sub={data && data.xrpUsd ? `XRP at ${formatUsd(data.xrpUsd)}` : 'XRP price unavailable'}
        />
        <Stat
          label="FLR price"
          value={data && data.flrUsd ? `$${data.flrUsd.toFixed(5)}` : '—'}
          sub="Live oracle feed"
        />
      </div>

      {error && <p className="text-[13px] text-red-300">{error}</p>}

      {data?.accounts.map((account) => (
        <Card key={account.address}>
          <CardHead
            title={account.type}
            hint={account.type === 'Smart Account' ? 'Where Zylo transacts on your behalf' : 'Your signing key'}
            aside={
              <span className="text-right text-[15px] font-medium tracking-[-0.03em] tabular-nums">
                {formatUsd(account.totalUsd)}
              </span>
            }
          />

          <div className="px-5 py-3">
            <a
              href={explorerAddress(account.address)}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-white/20 hover:decoration-white"
            >
              <Mono>{account.address}</Mono>
            </a>
          </div>

          <div className="flex flex-col divide-y divide-white/10 border-t border-white/10">
            {account.assets.map((asset) => (
              <div key={asset.symbol} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-[15px] font-medium tracking-[-0.02em]">{asset.symbol}</p>
                  <p className="mt-0.5 text-[12px] text-white/40 tabular-nums">
                    {formatNumber(asset.balance, 4)}
                  </p>
                </div>
                <p className="text-[15px] font-medium tracking-[-0.02em] tabular-nums">
                  {formatUsd(asset.valueUsd)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};
