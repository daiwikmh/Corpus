"use client";

import { useEffect, useState } from 'react';
import { formatEther, formatUnits, isAddress, parseEther, parseUnits } from 'viem';
import { useBalance } from 'wagmi';
import { useSmartAccount } from '../../providers/smart-account';
import { ERC20_ABI } from '../../contracts/abis';
import { TOKENS } from '../../contracts/config';
import { publicClient, fetchFxrpAddress } from '../../contracts/client';
import { transferCall, humaniseTxError } from '../../utils/etherspot';
import { useTxSender } from '../../hooks/useTxSender';
import { CHAIN_ID, NATIVE_SYMBOL, explorerTx } from '../../utils/constants';
import { Card, CardHead, Row, Button, Notice, Empty, Mono } from '../ui';

type Asset = 'FXRP' | 'NATIVE';

export const SendCard = () => {
  const { address, isConnected, isReady } = useSmartAccount();
  const { send } = useTxSender();
  const [asset, setAsset] = useState<Asset>('FXRP');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [fxrpAddress, setFxrpAddress] = useState<`0x${string}` | null>(null);
  const [fxrpBalance, setFxrpBalance] = useState<bigint>(0n);

  const { data: nativeBalance } = useBalance({ address, chainId: CHAIN_ID });

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    (async () => {
      const token = await fetchFxrpAddress();
      const balance = (await publicClient()
        .readContract({
          address: token,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        })
        .catch(() => 0n)) as bigint;

      if (cancelled) return;
      setFxrpAddress(token);
      setFxrpBalance(balance);
    })();

    return () => {
      cancelled = true;
    };
  }, [address, txHash]);

  const available =
    asset === 'FXRP'
      ? formatUnits(fxrpBalance, TOKENS.FXRP.decimals)
      : nativeBalance
        ? formatEther(nativeBalance.value)
        : '0';

  const symbol = asset === 'FXRP' ? TOKENS.FXRP.symbol : NATIVE_SYMBOL;
  const validTo = isAddress(to.trim());

  const submit = async () => {
    if (!amount || !validTo) return;

    setBusy(true);
    setError('');
    setTxHash('');

    try {
      const recipient = to.trim() as `0x${string}`;

      const call =
        asset === 'FXRP'
          ? transferCall(fxrpAddress!, recipient, parseUnits(amount, TOKENS.FXRP.decimals))
          : { to: recipient, value: parseEther(amount) };

      const { hash, receipt } = await send([call]);
      if (!receipt.success) throw new Error('Transfer reverted on-chain');

      setTxHash(hash);
      setAmount('');
      setTo('');
    } catch (e) {
      console.error('Send failed:', e);
      setError(humaniseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!isConnected) {
    return <Empty title="Not signed in" body="Sign in to send assets from your smart account." />;
  }

  return (
    <Card>
      <CardHead title="Send" hint="Move FXRP or FLR out of your smart account. Gas is sponsored." />

      <div className="flex gap-1 px-5 pt-5">
        {(['FXRP', 'NATIVE'] as Asset[]).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => {
              setAsset(a);
              setAmount('');
              setError('');
            }}
            className={`rounded-full px-4 py-1.5 text-[12px] font-medium tracking-[-0.02em] uppercase transition-colors ${
              asset === a ? 'bg-white text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            {a === 'FXRP' ? TOKENS.FXRP.symbol : NATIVE_SYMBOL}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div>
          <label className="mb-2 block text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase">
            Recipient
          </label>
          <input
            className="field"
            placeholder="0x…"
            value={to}
            disabled={busy}
            onChange={(e) => {
              setTo(e.target.value);
              setError('');
            }}
          />
          {to && !validTo && (
            <p className="mt-2 text-[12px] text-amber-300">That is not a valid Flare address.</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase">
            Amount
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
              disabled={busy}
              onClick={() => setAmount(available)}
            >
              Max
            </Button>
          </div>
        </div>

        <div className="border-t border-white/10 pt-2">
          <Row label={`Available ${symbol}`} value={parseFloat(available).toFixed(6)} />
          <Row label="From" value={<Mono>{address ?? '—'}</Mono>} />
        </div>

        {error && <Notice tone="bad">{error}</Notice>}

        {txHash && (
          <Notice tone="good">
            Sent.{' '}
            <a className="underline" href={explorerTx(txHash)} target="_blank" rel="noreferrer">
              View transaction
            </a>
          </Notice>
        )}

        <Button
          onClick={submit}
          busy={busy}
          disabled={!isReady || !amount || !validTo || (asset === 'FXRP' && !fxrpAddress)}
        >
          {busy ? 'Sending' : `Send ${symbol}`}
        </Button>
      </div>
    </Card>
  );
};
