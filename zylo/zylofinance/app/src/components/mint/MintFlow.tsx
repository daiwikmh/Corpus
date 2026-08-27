"use client";

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useSmartAccount } from '../../providers/smart-account';
import {
  clearSession,
  getServerSnapshot,
  getSnapshot,
  saveSession,
  subscribe,
  updateSession,
  withExpiryStatus,
  type MintSession,
} from '../../services/mintSessionStore';
import { ReserveStep } from './ReserveStep';
import { PayStep } from './PayStep';
import { CompleteStep } from './CompleteStep';
import { explorerTx } from '../../utils/constants';
import { Card, CardHead, Row, Button, Chip, Mono, Empty } from '../ui';

export const MintFlow = () => {
  const { address, isConnected } = useSmartAccount();

  const raw = useSyncExternalStore(
    subscribe,
    useCallback(() => getSnapshot(address), [address]),
    getServerSnapshot,
  );

  const sessions = useMemo(() => raw.map(withExpiryStatus), [raw]);

  const session = useMemo(
    () => sessions.find((s) => s.status !== 'minted') ?? null,
    [sessions],
  );

  const history = useMemo(() => sessions.filter((s) => s.status === 'minted'), [sessions]);

  const handleReserved = (next: MintSession) => {
    if (!address) return;
    saveSession(address, next);
  };

  const patch = useCallback(
    (changes: Partial<MintSession>) => {
      if (!address || !session) return;
      updateSession(address, session.collateralReservationId, changes);
    },
    [address, session],
  );

  const abandon = () => {
    if (!address || !session) return;
    clearSession(address, session.collateralReservationId);
  };

  if (!isConnected) {
    return <Empty title="Not signed in" body="Sign in to mint FXRP against your XRP." />;
  }

  const lastMint = history[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-6">
        {!session && !lastMint && <ReserveStep onReserved={handleReserved} />}

        {!session && lastMint && (
          <Card>
            <CardHead title="FXRP minted" aside={<Chip tone="good">Done</Chip>} />
            <div className="flex flex-col gap-4 p-5">
              <p className="text-[15px] leading-relaxed text-white/60">
                {lastMint.lots} lot{lastMint.lots > 1 ? 's' : ''} landed in your smart account,
                backed one-for-one by the XRP you sent.
              </p>
              {lastMint.mintTxHash && (
                <a
                  className="text-[13px] text-white/40 underline"
                  href={explorerTx(lastMint.mintTxHash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View the minting transaction
                </a>
              )}
              <Button
                onClick={() =>
                  address &&
                  clearSession(address, lastMint.collateralReservationId)
                }
              >
                Mint again
              </Button>
            </div>
          </Card>
        )}

        {session?.status === 'reserved' && (
          <PayStep session={session} onPatch={patch} onAbandon={abandon} />
        )}

        {session?.status === 'paid' && <CompleteStep session={session} onPatch={patch} />}

        {(session?.status === 'expired' || session?.status === 'failed') && (
          <Card>
            <CardHead title="Reservation expired" hint="The agent released the collateral." />
            <div className="flex flex-col gap-4 p-5">
              <p className="text-[13px] leading-relaxed text-white/50">
                Reservation #{session.collateralReservationId} lapsed before the XRP arrived. The
                reservation fee stays with the agent — that is how FAssets discourages abandoned
                mints.
              </p>
              <Button onClick={abandon}>Start over</Button>
            </div>
          </Card>
        )}
      </div>

      <aside className="flex flex-col gap-6">
        <Card>
          <CardHead title="How it works" />
          <ol className="flex flex-col gap-4 p-5">
            {[
              ['Reserve', 'An agent locks collateral for your lots and quotes an XRP address.'],
              ['Pay', 'You send XRP with a payment reference in the memo.'],
              ['Prove', 'The Flare Data Connector attests your XRPL payment and releases FXRP.'],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/30 text-[10px]">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[13px] font-medium tracking-[-0.02em]">{title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/40">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        {history.length > 0 && (
          <Card>
            <CardHead title="Past mints" />
            <div className="flex flex-col divide-y divide-white/10">
              {history.slice(0, 5).map((s) => (
                <div key={s.collateralReservationId} className="px-5 py-3">
                  <Row
                    label={`#${s.collateralReservationId}`}
                    value={`${s.totalAmountXRP.toFixed(2)} XRP`}
                  />
                  {s.mintTxHash && (
                    <a
                      className="text-[11px] text-white/30 underline"
                      href={explorerTx(s.mintTxHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Mono>{s.mintTxHash.slice(0, 12)}…</Mono>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </aside>
    </div>
  );
};
