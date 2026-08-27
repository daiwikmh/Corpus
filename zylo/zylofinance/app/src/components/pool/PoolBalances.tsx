"use client";

import { useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useSignTypedData } from 'wagmi';
import { useSmartAccount } from '../../providers/smart-account';
import { useTxSender } from '../../hooks/useTxSender';
import { CONTRACTS } from '../../contracts/config';
import { DARK_POOL_ABI, ERC20_ABI } from '../../contracts/abis';
import { NATIVE_TOKEN, TRADEABLE, tokenByAddress } from '../../contracts/markets';
import {
  DARK_POOL_DOMAIN,
  WITHDRAW_TYPES,
  deadlineIn,
  freshNonce,
  submitWithdrawal,
  type PoolBalance,
} from '../../services/darkPoolService';
import { Card, CardHead, Button, Notice, Row } from '../ui';
import { encodeFunctionData } from 'viem';

type Mode = 'deposit' | 'withdraw';

export const PoolBalances = ({
  balances,
  onChanged,
}: {
  balances: PoolBalance[];
  onChanged: () => void;
}) => {
  const { address, isConnected } = useSmartAccount();
  const { send } = useTxSender();
  const { signTypedDataAsync } = useSignTypedData();

  const [mode, setMode] = useState<Mode>('deposit');
  const [token, setToken] = useState<`0x${string}`>(TRADEABLE.FXRP.address);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const meta = tokenByAddress(token) ?? TRADEABLE.FXRP;
  const held = balances.find((b) => b.token.toLowerCase() === token.toLowerCase());

  const deposit = async (units: bigint) => {
    if (token === NATIVE_TOKEN) {
      await send([
        {
          to: CONTRACTS.DARK_POOL,
          value: units,
          data: encodeFunctionData({ abi: DARK_POOL_ABI, functionName: 'depositNative' }),
        },
      ]);
      return;
    }

    await send([
      {
        to: token,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.DARK_POOL, units],
        }),
      },
      {
        to: CONTRACTS.DARK_POOL,
        data: encodeFunctionData({
          abi: DARK_POOL_ABI,
          functionName: 'deposit',
          args: [token, units],
        }),
      },
    ]);
  };

  const withdraw = async (units: bigint) => {
    if (!address) return;

    const nonce = freshNonce();
    const deadline = deadlineIn(1800);

    const signature = await signTypedDataAsync({
      domain: DARK_POOL_DOMAIN,
      types: WITHDRAW_TYPES,
      primaryType: 'WithdrawRequest',
      message: { account: address, token, amount: units, nonce, deadline },
    });

    await submitWithdrawal({
      account: address,
      token,
      amount: units.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      signature,
    });
  };

  const submit = async () => {
    if (!amount) return;

    setBusy(true);
    setError('');
    setDone('');

    try {
      const units = parseUnits(amount, meta.decimals);
      if (units <= 0n) throw new Error('Enter an amount above zero.');

      if (mode === 'deposit') {
        await deposit(units);
        setDone('Deposit confirmed. The enclave credits it once the log is seen.');
      } else {
        await withdraw(units);
        setDone('Withdrawal finalised on-chain.');
      }

      setAmount('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHead title="Pool balance" />

      <div className="grid grid-cols-2 gap-px border-b border-white/10 bg-white/10">
        {(['deposit', 'withdraw'] as const).map((option) => (
          <button
            key={option}
            onClick={() => {
              setMode(option);
              setAmount('');
              setError('');
              setDone('');
            }}
            className={`py-2.5 text-[13px] capitalize transition-colors ${
              mode === option ? 'bg-white text-black' : 'bg-black text-white/60 hover:text-white'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="px-5 py-3">
        {balances.length === 0 ? (
          <p className="py-2 text-[13px] text-white/40">
            Authorise a session to see your balances.
          </p>
        ) : (
          balances.map((b) => {
            const t = tokenByAddress(b.token);
            if (!t) return null;
            return (
              <Row
                key={b.token}
                label={t.symbol}
                value={`${formatUnits(BigInt(b.available), t.decimals)}${
                  BigInt(b.locked) > 0n
                    ? ` (${formatUnits(BigInt(b.locked), t.decimals)} locked)`
                    : ''
                }`}
              />
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-white/10 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-white/40">Asset</span>
          <select
            value={token}
            onChange={(e) => setToken(e.target.value as `0x${string}`)}
            className="border border-white/15 bg-black px-3 py-2 text-[14px] outline-none focus:border-white/40"
          >
            {Object.values(TRADEABLE)
              .filter((t) => t.address !== CONTRACTS.WNAT)
              .map((t) => (
                <option key={t.address} value={t.address}>
                  {t.symbol}
                </option>
              ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-white/40">Amount</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="border border-white/15 bg-transparent px-3 py-2 text-[15px] outline-none focus:border-white/40"
          />
        </label>

        {mode === 'withdraw' && held && (
          <Row
            label="Available to withdraw"
            value={formatUnits(BigInt(held.available), meta.decimals)}
          />
        )}

        {error && <Notice tone="bad">{error}</Notice>}
        {done && <Notice tone="good">{done}</Notice>}

        <Button onClick={submit} disabled={!isConnected || busy || !amount}>
          {busy ? 'Working…' : mode === 'deposit' ? 'Deposit to pool' : 'Withdraw from pool'}
        </Button>

        <p className="text-[12px] leading-relaxed text-white/40">
          Withdrawals are fail-closed. The enclave holds your balance aside, submits the escrow
          call, and only retires it once the transaction confirms — a failure puts it back.
        </p>
      </div>
    </Card>
  );
};
