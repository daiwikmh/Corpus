"use client";

import { useEffect, useRef, useState } from 'react';
import { createXamanPayload, fetchXamanStatus } from '../../services/xamanService';
import {
  type MintSession,
  secondsRemaining,
  formatCountdown,
} from '../../services/mintSessionStore';
import { formatPaymentReferenceForMemo, errorMessage } from '../../utils/etherspot';
import { Card, CardHead, Row, Button, Notice, Chip, Mono, Spinner } from '../ui';

interface PayStepProps {
  session: MintSession;
  onPatch: (patch: Partial<MintSession>) => void;
  onAbandon: () => void;
}

export const PayStep = ({ session, onPatch, onAbandon }: PayStepProps) => {
  const [qrUrl, setQrUrl] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [loading, setLoading] = useState(!session.xamanUuid);
  const [error, setError] = useState('');
  const [manualHash, setManualHash] = useState('');
  const [remaining, setRemaining] = useState(() => secondsRemaining(session));
  const requested = useRef(false);

  const memo = formatPaymentReferenceForMemo(session.paymentReference);

  useEffect(() => {
    const tick = setInterval(() => setRemaining(secondsRemaining(session)), 1000);
    return () => clearInterval(tick);
  }, [session]);

  useEffect(() => {
    if (requested.current || session.xamanUuid) {
      setLoading(false);
      return;
    }
    requested.current = true;

    (async () => {
      try {
        const result = await createXamanPayload({
          agentUnderlyingAddress: session.paymentAddress,
          totalAmountXRP: session.totalAmountXRP,
          paymentReference: session.paymentReference,
        });
        setQrUrl(result.qrUrl);
        setDeepLink(result.deepLink);
        onPatch({ xamanUuid: result.uuid });
      } catch (e) {
        setError(errorMessage(e) || 'Could not reach Xaman. Pay manually with the details below.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll Xaman until the payment is signed, then hand the XRPL hash to the FDC step.
  useEffect(() => {
    if (!session.xamanUuid || session.xrplTxHash) return;

    let cancelled = false;
    const poll = setInterval(async () => {
      const status = await fetchXamanStatus(session.xamanUuid!);
      if (cancelled || !status) return;

      if (status.signed && status.txid) {
        clearInterval(poll);
        onPatch({ xrplTxHash: status.txid, status: 'paid' });
      } else if (status.cancelled || status.expired) {
        clearInterval(poll);
        setError('That Xaman request was cancelled. Pay manually or start over.');
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [session.xamanUuid, session.xrplTxHash, onPatch]);

  const submitManual = () => {
    const hash = manualHash.trim().replace(/^0x/, '');
    if (!/^[0-9a-fA-F]{64}$/.test(hash)) {
      setError('That does not look like an XRPL transaction hash (64 hex characters).');
      return;
    }
    setError('');
    onPatch({ xrplTxHash: hash.toUpperCase(), status: 'paid' });
  };

  const expired = remaining <= 0;

  return (
    <Card>
      <CardHead
        title="Send the XRP"
        hint="Pay the agent with the payment reference attached, exactly as shown."
        aside={<Chip tone={expired ? 'bad' : 'live'}>{expired ? 'Expired' : formatCountdown(remaining)}</Chip>}
      />

      <div className="flex flex-col gap-5 p-5">
        {expired ? (
          <Notice tone="bad">
            This reservation has lapsed, so the agent has released the collateral. The reservation
            fee is not recoverable — start a new mint.
          </Notice>
        ) : (
          <Notice tone="warn">
            Send the exact amount before the timer runs out. A short or late payment forfeits the
            reservation fee.
          </Notice>
        )}

        {loading ? (
          <div className="flex items-center gap-3 py-8 text-[13px] text-white/40">
            <Spinner /> Building your Xaman request…
          </div>
        ) : qrUrl ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <img src={qrUrl} alt="Xaman payment QR code" className="h-48 w-48 bg-white p-3" />
            <p className="text-[12px] text-white/40">Scan with Xaman</p>
          </div>
        ) : null}

        <div className="border-t border-white/10 pt-2">
          <Row label="Amount" value={`${session.totalAmountXRP.toFixed(6)} XRP`} />
          <Row label="Destination" value={<Mono>{session.paymentAddress}</Mono>} />
          <Row label="Reservation" value={`#${session.collateralReservationId}`} />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase">
            Memo — type Hex
          </p>
          <div className="flex items-start gap-2">
            <p className="flex-1 border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[12px] break-all text-white/70">
              {memo}
            </p>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(memo)}
              className="shrink-0 rounded-full border border-white/20 px-3 py-2 text-[11px] tracking-[-0.02em] text-white/60 uppercase hover:border-white hover:text-white"
            >
              Copy
            </button>
          </div>
        </div>

        {deepLink && !expired && (
          <a
            href={deepLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-[15px] font-medium tracking-[-0.02em] text-black uppercase hover:bg-white/85"
          >
            Open in Xaman
          </a>
        )}

        {error && <Notice tone="bad">{error}</Notice>}

        <div className="border-t border-white/10 pt-5">
          <p className="mb-2 text-[11px] font-medium tracking-[-0.02em] text-white/40 uppercase">
            Already paid from another wallet?
          </p>
          <div className="flex gap-2">
            <input
              className="field"
              placeholder="XRPL transaction hash"
              value={manualHash}
              onChange={(e) => setManualHash(e.target.value)}
            />
            <Button onClick={submitManual} variant="ghost" className="w-auto shrink-0">
              Use
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={onAbandon}
          className="self-start text-[12px] text-white/30 underline hover:text-white/60"
        >
          Discard this reservation
        </button>
      </div>
    </Card>
  );
};
