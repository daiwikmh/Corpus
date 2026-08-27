"use client";

import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';
import { useSmartAccount } from '../../providers/smart-account';
import { ERC20_ABI } from '../../contracts/abis';
import { TOKENS } from '../../contracts/config';
import { publicClient, fetchFxrpAddress, fetchLotSizeUBA } from '../../contracts/client';
import { redeemCall, parseRedemptionRequestedEvent, humaniseTxError } from '../../utils/etherspot';
import { useTxSender } from '../../hooks/useTxSender';
import { DROPS_PER_XRP, explorerTx } from '../../utils/constants';
import { Card, CardHead, Row, Button, Notice, Chip, Empty, Mono } from '../ui';

const XRP_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

interface Result {
  txHash: string;
  requestId?: string;
  amountXRP?: number;
  paymentAddress?: string;
}

export const RedeemCard = () => {
  const { address, isConnected, isReady } = useSmartAccount();
  const { send } = useTxSender();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [lotSizeUBA, setLotSizeUBA] = useState<bigint | null>(null);
  const [lots, setLots] = useState(1);
  const [destination, setDestination] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    (async () => {
      try {
        const [fxrp, lotSize] = await Promise.all([fetchFxrpAddress(), fetchLotSizeUBA()]);
        const bal = (await publicClient().readContract({
          address: fxrp,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        })) as bigint;

        if (cancelled) return;
        setBalance(bal);
        setLotSizeUBA(lotSize);
      } catch (e) {
        console.error('Could not read FXRP balance:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, result]);

  const maxLots = balance !== null && lotSizeUBA ? Number(balance / lotSizeUBA) : 0;
  const lotXRP = lotSizeUBA ? Number(lotSizeUBA) / DROPS_PER_XRP : 0;
  const validAddress = XRP_ADDRESS.test(destination.trim());
  const enoughBalance = lots > 0 && lots <= maxLots;

  const redeem = async () => {
    if (!address) return;

    setBusy(true);
    setError('');

    try {
      const { hash, receipt } = await send([
        redeemCall(BigInt(lots), destination.trim(), address),
      ]);

      if (!receipt.success) throw new Error('Redemption reverted on-chain');

      const event = parseRedemptionRequestedEvent(receipt);

      setResult({
        txHash: hash,
        requestId: event?.requestId.toString(),
        amountXRP: event ? Number(event.valueUBA - event.feeUBA) / DROPS_PER_XRP : undefined,
        paymentAddress: event?.paymentAddress,
      });
    } catch (e) {
      console.error('Redemption failed:', e);
      setError(humaniseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!isConnected) {
    return <Empty title="Not signed in" body="Sign in to turn FXRP back into XRP." />;
  }

  if (result) {
    return (
      <Card>
        <CardHead title="Redemption requested" aside={<Chip tone="good">Done</Chip>} />
        <div className="flex flex-col gap-4 p-5">
          <p className="text-[15px] leading-relaxed text-white/60">
            Your FXRP has been burned. The agent now has a fixed window to pay
            {result.amountXRP ? ` ${result.amountXRP.toFixed(6)} XRP` : ' your XRP'} to{' '}
            <Mono>{result.paymentAddress ?? destination}</Mono> on the XRP Ledger. If they miss it,
            FAssets pays you out of their collateral instead.
          </p>
          {result.requestId && <Row label="Request" value={`#${result.requestId}`} />}
          <a
            className="text-[13px] text-white/40 underline"
            href={explorerTx(result.txHash)}
            target="_blank"
            rel="noreferrer"
          >
            View the redemption transaction
          </a>
          <Button
            onClick={() => {
              setResult(null);
              setLots(1);
            }}
          >
            Redeem more
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHead
        title="Redeem FXRP"
        hint="Burn FXRP on Flare and receive XRP back on the XRP Ledger."
        aside={
          <Chip>
            {balance === null
              ? '—'
              : `${Number(formatUnits(balance, TOKENS.FXRP.decimals)).toFixed(4)} ${TOKENS.FXRP.symbol}`}
          </Chip>
        }
      />

      <div className="flex flex-col gap-5 p-5">
        <div>
          <label className="mb-2 block text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase">
            Your XRP address
          </label>
          <input
            className="field"
            placeholder="r…"
            value={destination}
            disabled={busy}
            onChange={(e) => {
              setDestination(e.target.value);
              setError('');
            }}
          />
          {destination && !validAddress && (
            <p className="mt-2 text-[12px] text-amber-300">That is not a valid XRPL address.</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase">
            Lots
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={Math.max(1, maxLots)}
              step={1}
              className="field"
              value={lots}
              disabled={busy}
              onChange={(e) => setLots(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
            <Button
              variant="ghost"
              className="w-auto shrink-0"
              disabled={maxLots < 1 || busy}
              onClick={() => setLots(Math.max(1, maxLots))}
            >
              Max
            </Button>
          </div>
          <p className="mt-2 text-[12px] text-white/40">
            {`1 lot = ${lotXRP ? lotXRP.toFixed(2) : '—'} XRP · you hold ${maxLots} redeemable lot${
              maxLots === 1 ? '' : 's'
            }`}
          </p>
        </div>

        <div className="border-t border-white/10 pt-2">
          <Row label="You burn" value={`${(lots * lotXRP).toFixed(6)} ${TOKENS.FXRP.symbol}`} />
          <Row label="You receive" value={`≈ ${(lots * lotXRP).toFixed(6)} XRP less the agent fee`} />
        </div>

        {maxLots < 1 && balance !== null && (
          <Notice tone="warn">
            You need at least one full lot of FXRP to redeem. Partial lots stay on Flare until you
            top up to the next lot.
          </Notice>
        )}

        {error && <Notice tone="bad">{error}</Notice>}

        <Button
          onClick={redeem}
          busy={busy}
          disabled={!isReady || !validAddress || !enoughBalance}
        >
          {busy ? 'Redeeming' : 'Redeem'}
        </Button>

        <p className="text-[12px] leading-relaxed text-white/30">
          Double-check the address. Redemptions pay out to exactly what you type here and cannot be
          reversed.
        </p>
      </div>
    </Card>
  );
};
