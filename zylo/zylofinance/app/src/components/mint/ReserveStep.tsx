"use client";

import { useMemo, useState } from 'react';
import { useBalance, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { useSmartAccount } from '../../providers/smart-account';
import { ASSET_MANAGER_ABI } from '../../contracts/abis';
import { CONTRACTS } from '../../contracts/config';
import {
  reserveCollateralCall,
  parseCollateralReservedEvent,
  humaniseTxError,
} from '../../utils/etherspot';
import { useTxSender } from '../../hooks/useTxSender';
import { CHAIN_ID, DECIMAL_PLACES, NATIVE_SYMBOL, EXTERNAL_LINKS } from '../../utils/constants';
import type { MintSession } from '../../services/mintSessionStore';
import { ubaToXrp } from '../../services/mintSessionStore';
import { Card, CardHead, Row, Button, Notice, Chip, Mono } from '../ui';

interface AvailableAgent {
  agentVault: `0x${string}`;
  feeBIPS: bigint;
  freeCollateralLots: bigint;
}

export const ReserveStep = ({ onReserved }: { onReserved: (session: MintSession) => void }) => {
  const { address, isReady } = useSmartAccount();
  const { send, sponsored } = useTxSender();
  const [lots, setLots] = useState(1);
  const [agentIndex, setAgentIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { data: balance } = useBalance({ address, chainId: CHAIN_ID });

  const { data: agentsData, isLoading: agentsLoading } = useReadContract({
    address: CONTRACTS.ASSET_MANAGER,
    abi: ASSET_MANAGER_ABI,
    functionName: 'getAvailableAgentsDetailedList',
    chainId: CHAIN_ID,
    args: [0n, 10n],
  });

  const agents = useMemo(
    () => (agentsData as readonly [readonly AvailableAgent[], bigint] | undefined)?.[0] ?? [],
    [agentsData],
  );
  const agent = agents[agentIndex];

  const { data: agentInfo } = useReadContract({
    address: CONTRACTS.ASSET_MANAGER,
    abi: ASSET_MANAGER_ABI,
    functionName: 'getAgentInfo',
    chainId: CHAIN_ID,
    args: agent ? [agent.agentVault] : undefined,
    query: { enabled: Boolean(agent) },
  });

  const { data: reservationFee } = useReadContract({
    address: CONTRACTS.ASSET_MANAGER,
    abi: ASSET_MANAGER_ABI,
    functionName: 'collateralReservationFee',
    chainId: CHAIN_ID,
    args: [BigInt(lots)],
  });

  const underlyingAddress = (agentInfo as { underlyingAddressString?: string } | undefined)
    ?.underlyingAddressString;
  const enoughLots = agent ? agent.freeCollateralLots >= BigInt(lots) : false;
  const enoughBalance = balance && reservationFee ? balance.value >= (reservationFee as bigint) : false;

  const reserve = async () => {
    if (!address || !agent || !reservationFee) return;

    setBusy(true);
    setError('');

    try {
      const { receipt } = await send([
        reserveCollateralCall(
          agent.agentVault,
          BigInt(lots),
          agent.feeBIPS,
          address,
          reservationFee as bigint,
        ),
      ]);

      if (!receipt.success) throw new Error('Reservation reverted on-chain');

      const event = parseCollateralReservedEvent(receipt);

      onReserved({
        collateralReservationId: event.collateralReservationId.toString(),
        agentVault: event.agentVault,
        paymentAddress: event.paymentAddress,
        paymentReference: event.paymentReference,
        lots,
        valueUBA: event.valueUBA.toString(),
        feeUBA: event.feeUBA.toString(),
        lastUnderlyingTimestamp: event.lastUnderlyingTimestamp.toString(),
        totalAmountXRP: ubaToXrp(event.valueUBA + event.feeUBA),
        status: 'reserved',
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error('Reservation failed:', e);
      setError(humaniseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHead
        title="Reserve collateral"
        hint="An agent locks collateral against your XRP before you send it."
        aside={<Chip>Step 1 of 3</Chip>}
      />

      <div className="flex flex-col gap-5 p-5">
        <div>
          <label className="mb-2 block text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase">
            Agent
          </label>
          {agentsLoading ? (
            <p className="text-[13px] text-white/40">Loading agents…</p>
          ) : agents.length === 0 ? (
            <Notice tone="warn">
              No agents are advertising free collateral right now. This happens on Coston2 when
              test agents are being restocked — try again shortly.
            </Notice>
          ) : (
            <>
              <select
                className="field"
                value={agentIndex}
                disabled={busy}
                onChange={(e) => {
                  setAgentIndex(Number(e.target.value));
                  setError('');
                }}
              >
                {agents.map((a, i) => (
                  <option key={a.agentVault} value={i}>
                    {a.agentVault.slice(0, 10)}…{a.agentVault.slice(-6)} · {a.freeCollateralLots.toString()} lots
                    free · {(Number(a.feeBIPS) / 100).toFixed(2)}% fee
                  </option>
                ))}
              </select>
              {underlyingAddress && (
                <p className="mt-2 text-[12px] text-white/40">
                  Pays out from <Mono>{underlyingAddress}</Mono>
                </p>
              )}
            </>
          )}
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase">
            Lots
          </label>
          <input
            type="number"
            min={1}
            step={1}
            className="field"
            value={lots}
            disabled={busy}
            onChange={(e) => {
              setLots(Math.max(1, parseInt(e.target.value, 10) || 1));
              setError('');
            }}
          />
          {agent && !enoughLots && (
            <p className="mt-2 text-[12px] text-amber-300">
              This agent only has {agent.freeCollateralLots.toString()} lots free.
            </p>
          )}
        </div>

        <div className="border-t border-white/10 pt-2">
          <Row
            label="Collateral reservation fee"
            value={
              reservationFee
                ? `${parseFloat(formatEther(reservationFee as bigint)).toFixed(6)} ${NATIVE_SYMBOL}`
                : '—'
            }
          />
          <Row label="Minting fee" value={agent ? `${(Number(agent.feeBIPS) / 100).toFixed(2)}%` : '—'} />
          <Row
            label={sponsored ? `Smart account ${NATIVE_SYMBOL}` : `Your ${NATIVE_SYMBOL}`}
            value={
              balance
                ? `${parseFloat(formatEther(balance.value)).toFixed(DECIMAL_PLACES.BALANCE)} ${NATIVE_SYMBOL}`
                : '—'
            }
          />
        </div>

        {balance && reservationFee && !enoughBalance && (
          <Notice tone="warn">
            You need {formatEther(reservationFee as bigint)} {NATIVE_SYMBOL} to cover the
            reservation fee.{' '}
            <a className="underline" href={EXTERNAL_LINKS.COSTON2_FAUCET} target="_blank" rel="noreferrer">
              Get testnet {NATIVE_SYMBOL}
            </a>
            , then send it to <Mono>{address}</Mono>.
          </Notice>
        )}

        {error && <Notice tone="bad">{error}</Notice>}

        <Button
          onClick={reserve}
          busy={busy}
          disabled={!isReady || !agent || !enoughLots || !enoughBalance || agentsLoading}
        >
          {busy ? 'Reserving' : 'Reserve collateral'}
        </Button>

        <p className="text-[12px] leading-relaxed text-white/30">
          {sponsored ? 'Gas is sponsored. ' : ''}The reservation fee is paid from your account and
          stays with the agent if you never complete the mint.
        </p>
      </div>
    </Card>
  );
};
