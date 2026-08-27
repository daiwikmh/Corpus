"use client";

import { useEffect, useState } from 'react';
import { useSmartAccount } from '../../providers/smart-account';
import {
  fetchTransactionHistory,
  formatTimestamp,
  getTransactionExplorerLink,
  type Transaction,
} from '../../services/transactionService';
import { NATIVE_SYMBOL } from '../../utils/constants';
import { Card, CardHead, Chip } from '../ui';

export const ActivityList = () => {
  const { address } = useSmartAccount();
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    (async () => {
      const txs = await fetchTransactionHistory(address, 8);
      if (cancelled) return;
      setItems(txs);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <Card>
      <CardHead title="Recent activity" hint="On-chain history for your account" />

      {loading ? (
        <p className="px-5 py-8 text-[13px] text-white/40">Loading…</p>
      ) : items.length === 0 ? (
        <p className="px-5 py-8 text-[13px] text-white/40">
          Nothing yet. Your first mint or deposit will show up here.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-white/10">
          {items.map((tx) => {
            const outgoing = tx.from.toLowerCase() === address?.toLowerCase();
            return (
              <a
                key={tx.hash}
                href={getTransactionExplorerLink(tx.hash)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium tracking-[-0.02em]">
                    {tx.method || (outgoing ? 'Sent' : 'Received')}
                  </p>
                  <p className="mt-0.5 text-[12px] text-white/40">{formatTimestamp(tx.timestamp)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {tx.status === 'failed' && <Chip tone="bad">Failed</Chip>}
                  <span className="text-[13px] tabular-nums text-white/60">
                    {outgoing ? '−' : '+'}
                    {parseFloat(tx.value).toFixed(4)} {NATIVE_SYMBOL}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </Card>
  );
};
