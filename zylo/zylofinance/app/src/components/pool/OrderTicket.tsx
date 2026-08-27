"use client";

import { useState } from 'react';
import { parseUnits } from 'viem';
import { useSignTypedData } from 'wagmi';
import { useSmartAccount } from '../../providers/smart-account';
import type { MarketDef } from '../../contracts/markets';
import {
  DARK_POOL_DOMAIN,
  ORDER_TYPES,
  deadlineIn,
  freshNonce,
  submitOrder,
  type PoolBalance,
} from '../../services/darkPoolService';
import { Card, CardHead, Button, Notice, Row, Mono } from '../ui';

type Side = 'buy' | 'sell';

const PRICE_DECIMALS = 18;

export const OrderTicket = ({
  market,
  balances,
  onPlaced,
}: {
  market: MarketDef;
  balances: PoolBalance[];
  onPlaced: () => void;
}) => {
  const { address, isConnected } = useSmartAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [side, setSide] = useState<Side>('buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [expiry, setExpiry] = useState('3600');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState('');

  const balanceOf = (token: `0x${string}`) =>
    balances.find((b) => b.token.toLowerCase() === token.toLowerCase());

  const baseBalance = balanceOf(market.base.address);
  const quoteBalance = balanceOf(market.quote.address);

  const reset = (next: Side) => {
    setSide(next);
    setError('');
    setPlaced('');
  };

  const submit = async () => {
    if (!address || !price || !amount) return;

    setBusy(true);
    setError('');
    setPlaced('');

    try {
      const priceWei = parseUnits(price, PRICE_DECIMALS);
      const amountWei = parseUnits(amount, market.base.decimals);
      if (priceWei <= 0n || amountWei <= 0n) throw new Error('Price and size must be positive.');

      const nonce = freshNonce();
      const deadline = deadlineIn(Number(expiry));

      const signature = await signTypedDataAsync({
        domain: DARK_POOL_DOMAIN,
        types: ORDER_TYPES,
        primaryType: 'Order',
        message: {
          account: address,
          market: market.id,
          side: side === 'buy' ? 0 : 1,
          price: priceWei,
          amount: amountWei,
          nonce,
          deadline,
        },
      });

      const { orderId } = await submitOrder({
        account: address,
        market: market.id,
        side,
        price: priceWei.toString(),
        amount: amountWei.toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString(),
        signature,
      });

      setPlaced(orderId);
      setPrice('');
      setAmount('');
      onPlaced();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place the order');
    } finally {
      setBusy(false);
    }
  };

  const spending = side === 'buy' ? market.quote : market.base;
  const spendingBalance = side === 'buy' ? quoteBalance : baseBalance;

  const estimatedCost =
    price && amount
      ? (Number(price) * Number(amount)).toLocaleString(undefined, {
          maximumFractionDigits: 6,
        })
      : '—';

  return (
    <Card>
      <CardHead title="Place a sealed order" />

      <div className="grid grid-cols-2 gap-px border-b border-white/10 bg-white/10">
        {(['buy', 'sell'] as const).map((option) => (
          <button
            key={option}
            onClick={() => reset(option)}
            className={`py-2.5 text-[13px] capitalize transition-colors ${
              side === option ? 'bg-white text-black' : 'bg-black text-white/60 hover:text-white'
            }`}
          >
            {option} {market.base.symbol}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-white/40">
            Limit price · {market.quote.symbol} per {market.base.symbol}
          </span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="border border-white/15 bg-transparent px-3 py-2 text-[15px] outline-none focus:border-white/40"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-white/40">
            Size · {market.base.symbol}
          </span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="border border-white/15 bg-transparent px-3 py-2 text-[15px] outline-none focus:border-white/40"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-white/40">
            Expires in
          </span>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="border border-white/15 bg-black px-3 py-2 text-[14px] outline-none focus:border-white/40"
          >
            <option value="900">15 minutes</option>
            <option value="3600">1 hour</option>
            <option value="86400">24 hours</option>
          </select>
        </label>

        <div className="border-t border-white/10 pt-3">
          <Row label={`Notional (${market.quote.symbol})`} value={estimatedCost} />
          <Row
            label={`${spending.symbol} in pool`}
            value={spendingBalance?.available ?? '0'}
          />
        </div>

        {error && <Notice tone="bad">{error}</Notice>}
        {placed && (
          <Notice tone="good">
            Order sealed. It rests in the enclave until the next batch —{' '}
            <Mono>{placed.slice(0, 10)}…</Mono>
          </Notice>
        )}

        <Button onClick={submit} disabled={!isConnected || busy || !price || !amount}>
          {busy ? 'Signing…' : `Seal ${side} order`}
        </Button>

        <p className="text-[12px] leading-relaxed text-white/40">
          Signing does not broadcast anything. The order goes straight to the enclave and never
          touches the mempool, so its price and size stay private until it clears.
        </p>
      </div>
    </Card>
  );
};
