"use client";

import { useState } from 'react';
import { formatUnits } from 'viem';
import { useSignTypedData } from 'wagmi';
import { useSmartAccount } from '../../providers/smart-account';
import { marketById } from '../../contracts/markets';
import {
  CANCEL_TYPES,
  DARK_POOL_DOMAIN,
  deadlineIn,
  freshNonce,
  submitCancel,
  type PoolOrder,
} from '../../services/darkPoolService';
import { Card, CardHead, Empty, Notice, Chip, Mono } from '../ui';

const PRICE_DECIMALS = 18;

export const OpenOrders = ({
  orders,
  onCancelled,
}: {
  orders: PoolOrder[];
  onCancelled: () => void;
}) => {
  const { address } = useSmartAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const cancel = async (order: PoolOrder) => {
    if (!address) return;

    setBusy(order.orderId);
    setError('');

    try {
      const nonce = freshNonce();
      const deadline = deadlineIn(300);

      const signature = await signTypedDataAsync({
        domain: DARK_POOL_DOMAIN,
        types: CANCEL_TYPES,
        primaryType: 'Cancel',
        message: { account: address, orderId: order.orderId, nonce, deadline },
      });

      await submitCancel({
        account: address,
        orderId: order.orderId,
        nonce: nonce.toString(),
        deadline: deadline.toString(),
        signature,
      });
      onCancelled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel');
    } finally {
      setBusy('');
    }
  };

  return (
    <Card>
      <CardHead title="Your resting orders" />

      {error && (
        <div className="px-5 pt-4">
          <Notice tone="bad">{error}</Notice>
        </div>
      )}

      {orders.length === 0 ? (
        <Empty
          title="Nothing resting"
          body="Sealed orders appear here. Only you can see them — the enclave will not reveal them to anyone else."
        />
      ) : (
        <div className="divide-y divide-white/10">
          {orders.map((order) => {
            const market = marketById(order.market);
            const baseDecimals = market?.base.decimals ?? 18;

            return (
              <div key={order.orderId} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Chip tone={order.side === 'buy' ? 'good' : 'warn'}>{order.side}</Chip>
                    <span className="text-[13px] text-white/80">
                      {market?.label ?? 'Unknown market'}
                    </span>
                  </div>
                  <div className="mt-1 text-[12px] text-white/45">
                    {formatUnits(BigInt(order.remaining), baseDecimals)} of{' '}
                    {formatUnits(BigInt(order.amount), baseDecimals)} left @{' '}
                    {formatUnits(BigInt(order.price), PRICE_DECIMALS)}
                  </div>
                  <div className="mt-1">
                    <Mono>{order.orderId.slice(0, 14)}…</Mono>
                  </div>
                </div>

                <button
                  onClick={() => cancel(order)}
                  disabled={busy === order.orderId}
                  className="shrink-0 border border-white/20 px-3 py-1.5 text-[12px] text-white/70 transition-colors hover:border-white/50 hover:text-white disabled:opacity-40"
                >
                  {busy === order.orderId ? 'Cancelling…' : 'Cancel'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
