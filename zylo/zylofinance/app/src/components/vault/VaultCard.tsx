"use client";

import { useState } from 'react';
import { useBalance, useReadContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { useSmartAccount } from '../../providers/smart-account';
import { ZYLO_VAULT_ABI } from '../../contracts/abis';
import { CONTRACTS } from '../../contracts/config';
import { depositCall, withdrawCall, humaniseTxError } from '../../utils/etherspot';
import { useTxSender } from '../../hooks/useTxSender';
import { CHAIN_ID, DECIMAL_PLACES, NATIVE_SYMBOL, explorerTx } from '../../utils/constants';
import { Card, CardHead, Row, Button, Notice, Empty } from '../ui';

type Mode = 'deposit' | 'withdraw';

export const VaultCard = () => {
  const { address, isConnected, isReady } = useSmartAccount();
  const { send, sponsored } = useTxSender();
  const [mode, setMode] = useState<Mode>('deposit');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
    chainId: CHAIN_ID,
  });

  const { data: shares, refetch: refetchShares } = useReadContract({
    address: CONTRACTS.ZYLO_VAULT,
    abi: ZYLO_VAULT_ABI,
    functionName: 'balanceOf',
    chainId: CHAIN_ID,
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: shareValue } = useReadContract({
    address: CONTRACTS.ZYLO_VAULT,
    abi: ZYLO_VAULT_ABI,
    functionName: 'convertToAssets',
    chainId: CHAIN_ID,
    args: shares ? [shares as bigint] : undefined,
    query: { enabled: Boolean(shares) },
  });

  const switchMode = (next: Mode) => {
    setMode(next);
    setAmount('');
    setError('');
  };

  const available =
    mode === 'deposit'
      ? balance?.value ?? 0n
      : (shares as bigint | undefined) ?? 0n;

  const submit = async () => {
    if (!amount) return;

    const parsed = parseEther(amount);
    if (parsed <= 0n || parsed > available) {
      setError('Enter an amount you actually hold.');
      return;
    }

    setBusy(true);
    setError('');
    setTxHash('');

    try {
      const call = mode === 'deposit' ? depositCall(parsed) : withdrawCall(parsed);
      const { hash, receipt } = await send([call]);
      if (!receipt.success) throw new Error(`${mode} reverted on-chain`);

      setTxHash(hash);
      setAmount('');
      refetchBalance();
      refetchShares();
    } catch (e) {
      console.error(`${mode} failed:`, e);
      setError(humaniseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!isConnected) {
    return <Empty title="Not signed in" body="Sign in to deposit into the vault." />;
  }

  return (
    <Card>
      <CardHead
        title="Zylo vault"
        hint="Deposit FLR, receive yFLR. The vault delegates to FTSO providers and compounds rewards for you."
      />

      <div className="flex gap-1 px-5 pt-5">
        {(['deposit', 'withdraw'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`rounded-full px-4 py-1.5 text-[12px] font-medium tracking-[-0.02em] uppercase transition-colors ${
              mode === m ? 'bg-white text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div>
          <label className="mb-2 block text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase">
            {mode === 'deposit' ? `Amount in ${NATIVE_SYMBOL}` : 'Shares to burn (yFLR)'}
          </label>
          <div className="flex gap-2">
            <input
              className="field"
              placeholder="0.0"
              inputMode="decimal"
              value={amount}
              disabled={busy}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9.]/g, ''));
                setError('');
              }}
            />
            <Button
              variant="ghost"
              className="w-auto shrink-0"
              disabled={busy || available === 0n}
              onClick={() => setAmount(formatEther(available))}
            >
              Max
            </Button>
          </div>
        </div>

        <div className="border-t border-white/10 pt-2">
          <Row
            label={`Available ${NATIVE_SYMBOL}`}
            value={
              balance
                ? `${parseFloat(formatEther(balance.value)).toFixed(DECIMAL_PLACES.BALANCE)}`
                : '—'
            }
          />
          <Row
            label="Your yFLR"
            value={shares ? parseFloat(formatEther(shares as bigint)).toFixed(DECIMAL_PLACES.BALANCE) : '0.0000'}
          />
          <Row
            label="Redeemable for"
            value={
              shareValue
                ? `${parseFloat(formatEther(shareValue as bigint)).toFixed(DECIMAL_PLACES.BALANCE)} ${NATIVE_SYMBOL}`
                : '—'
            }
          />
        </div>

        {error && <Notice tone="bad">{error}</Notice>}

        {txHash && (
          <Notice tone="good">
            Done.{' '}
            <a className="underline" href={explorerTx(txHash)} target="_blank" rel="noreferrer">
              View transaction
            </a>
          </Notice>
        )}

        <Button onClick={submit} busy={busy} disabled={!isReady || !amount}>
          {busy ? 'Working' : mode === 'deposit' ? 'Deposit' : 'Withdraw'}
        </Button>

        <p className="text-[12px] leading-relaxed text-white/30">
          {sponsored
            ? `Gas is sponsored, so you do not need ${NATIVE_SYMBOL} set aside for fees.`
            : `Your wallet pays gas, so keep a little ${NATIVE_SYMBOL} spare.`}
        </p>
      </div>
    </Card>
  );
};
