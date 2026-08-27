"use client";

import { useState } from 'react';
import { completeMinting, STAGE_COPY, type MintStage } from '../../services/fdcService';
import { useTxSender } from '../../hooks/useTxSender';
import { humaniseTxError } from '../../utils/etherspot';
import type { MintSession } from '../../services/mintSessionStore';
import { xrplExplorerTx } from '../../utils/constants';
import { Card, CardHead, Row, Button, Notice, Chip, Mono, Spinner } from '../ui';

const STAGES: MintStage[] = ['preparing', 'requesting', 'awaiting-round', 'executing'];

interface CompleteStepProps {
  session: MintSession;
  onPatch: (patch: Partial<MintSession>) => void;
}

export const CompleteStep = ({ session, onPatch }: CompleteStepProps) => {
  const { send } = useTxSender();
  const [stage, setStage] = useState<MintStage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!session.xrplTxHash) return;

    setBusy(true);
    setError('');

    try {
      const mintTxHash = await completeMinting({
        send,
        xrplTxHash: session.xrplTxHash,
        collateralReservationId: BigInt(session.collateralReservationId),
        onStage: setStage,
      });
      onPatch({ status: 'minted', mintTxHash });
    } catch (e) {
      console.error('Minting failed:', e);
      setError(humaniseTxError(e));
      setStage(null);
    } finally {
      setBusy(false);
    }
  };

  const activeIndex = stage ? STAGES.indexOf(stage) : -1;

  return (
    <Card>
      <CardHead
        title="Finish the mint"
        hint="Your payment is proved to Flare through the Data Connector, then the FXRP is released."
        aside={<Chip tone="live">Step 3 of 3</Chip>}
      />

      <div className="flex flex-col gap-5 p-5">
        <div className="border-b border-white/10 pb-2">
          <Row label="Reservation" value={`#${session.collateralReservationId}`} />
          <Row label="Paid" value={`${session.totalAmountXRP.toFixed(6)} XRP`} />
          <Row
            label="XRPL payment"
            value={
              session.xrplTxHash ? (
                <a
                  className="underline"
                  href={xrplExplorerTx(session.xrplTxHash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Mono>{session.xrplTxHash.slice(0, 10)}…{session.xrplTxHash.slice(-8)}</Mono>
                </a>
              ) : (
                '—'
              )
            }
          />
        </div>

        <ol className="flex flex-col gap-3">
          {STAGES.map((s, i) => {
            const done = activeIndex > i || session.status === 'minted';
            const active = activeIndex === i;
            return (
              <li key={s} className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    done
                      ? 'border-white bg-white text-black'
                      : active
                        ? 'border-white text-white'
                        : 'border-white/20 text-white/20'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span
                  className={`text-[13px] ${
                    done ? 'text-white/70' : active ? 'text-white' : 'text-white/25'
                  }`}
                >
                  {STAGE_COPY[s]}
                </span>
                {active && busy && <Spinner className="text-white/50" />}
              </li>
            );
          })}
        </ol>

        {busy && stage === 'awaiting-round' && (
          <Notice tone="warn">
            FDC voting rounds settle every 90 seconds and proofs appear shortly after. Leave this
            tab open — if you navigate away, reopen the mint and press finish again.
          </Notice>
        )}

        {error && <Notice tone="bad">{error}</Notice>}

        <Button onClick={run} busy={busy} disabled={!session.xrplTxHash}>
          {busy ? 'Working' : error ? 'Try again' : 'Finish mint'}
        </Button>
      </div>
    </Card>
  );
};
