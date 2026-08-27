import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activeSession,
  clearSession,
  formatCountdown,
  getSnapshot,
  listSessions,
  saveSession,
  secondsRemaining,
  subscribe,
  ubaToXrp,
  updateSession,
  withExpiryStatus,
  type MintSession,
} from '../app/src/services/mintSessionStore';

const MINTER = '0xAbC0000000000000000000000000000000000001';

const session = (over: Partial<MintSession> = {}): MintSession => ({
  collateralReservationId: '42',
  agentVault: '0xagent',
  paymentAddress: 'rAgentXRPAddress',
  paymentReference: '0x00ff00',
  lots: 1,
  valueUBA: '10000000',
  feeUBA: '40000',
  lastUnderlyingTimestamp: String(Math.floor(Date.now() / 1000) + 900),
  totalAmountXRP: 10.04,
  status: 'reserved',
  createdAt: Date.now(),
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  // A same-window clear fires no storage event, so signal it the way another
  // tab would — this is the path the store actually listens on.
  window.dispatchEvent(new StorageEvent('storage', { key: 'zylo.mint-sessions' }));
});

describe('mint session store', () => {
  it('round-trips a session for a minter', () => {
    saveSession(MINTER, session());
    const all = listSessions(MINTER);
    expect(all).toHaveLength(1);
    expect(all[0].collateralReservationId).toBe('42');
  });

  it('keys sessions by minter, case-insensitively', () => {
    saveSession(MINTER, session());
    expect(listSessions(MINTER.toLowerCase())).toHaveLength(1);
    expect(listSessions('0xdead0000000000000000000000000000000000ff')).toHaveLength(0);
  });

  it('returns nothing when no minter is given', () => {
    saveSession(MINTER, session());
    expect(listSessions(undefined)).toEqual([]);
  });

  it('updates in place rather than duplicating', () => {
    saveSession(MINTER, session());
    updateSession(MINTER, '42', { status: 'paid', xrplTxHash: 'A'.repeat(64) });

    const all = listSessions(MINTER);
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe('paid');
    expect(all[0].xrplTxHash).toBe('A'.repeat(64));
  });

  it('ignores updates for an unknown reservation', () => {
    saveSession(MINTER, session());
    expect(updateSession(MINTER, '999', { status: 'minted' })).toBeUndefined();
    expect(listSessions(MINTER)[0].status).toBe('reserved');
  });

  it('clears a single session without touching the others', () => {
    saveSession(MINTER, session({ collateralReservationId: '1' }));
    saveSession(MINTER, session({ collateralReservationId: '2' }));

    clearSession(MINTER, '1');

    const remaining = listSessions(MINTER);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].collateralReservationId).toBe('2');
  });

  it('surfaces the newest session first', () => {
    saveSession(MINTER, session({ collateralReservationId: 'old', createdAt: 1000 }));
    saveSession(MINTER, session({ collateralReservationId: 'new', createdAt: 2000 }));
    expect(listSessions(MINTER)[0].collateralReservationId).toBe('new');
  });

  it('caps stored history at 20 sessions', () => {
    for (let i = 0; i < 25; i++) {
      saveSession(MINTER, session({ collateralReservationId: String(i), createdAt: i }));
    }
    expect(listSessions(MINTER).length).toBeLessThanOrEqual(20);
  });

  it('picks reserved or paid as the active session, never minted', () => {
    saveSession(MINTER, session({ collateralReservationId: 'done', status: 'minted', createdAt: 5 }));
    expect(activeSession(MINTER)).toBeUndefined();

    saveSession(MINTER, session({ collateralReservationId: 'live', status: 'paid', createdAt: 9 }));
    expect(activeSession(MINTER)?.collateralReservationId).toBe('live');
  });

  it('survives corrupt storage instead of throwing', () => {
    localStorage.setItem('zylo.mint-sessions', 'not json');
    expect(() => listSessions(MINTER)).not.toThrow();
    expect(listSessions(MINTER)).toEqual([]);
  });
});

describe('snapshot stability', () => {
  it('returns an identical reference until a write happens', () => {
    saveSession(MINTER, session());
    const first = getSnapshot(MINTER);
    expect(getSnapshot(MINTER)).toBe(first);

    saveSession(MINTER, session({ collateralReservationId: '43' }));
    expect(getSnapshot(MINTER)).not.toBe(first);
  });

  it('notifies subscribers on write', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    saveSession(MINTER, session());
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    saveSession(MINTER, session({ collateralReservationId: '44' }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('expiry', () => {
  it('counts down toward the underlying deadline', () => {
    const future = session({
      lastUnderlyingTimestamp: String(Math.floor(Date.now() / 1000) + 120),
    });
    const remaining = secondsRemaining(future);
    expect(remaining).toBeGreaterThan(110);
    expect(remaining).toBeLessThanOrEqual(120);
  });

  it('reports a lapsed reservation as expired', () => {
    const past = session({
      lastUnderlyingTimestamp: String(Math.floor(Date.now() / 1000) - 10),
    });
    expect(secondsRemaining(past)).toBeLessThanOrEqual(0);
    expect(withExpiryStatus(past).status).toBe('expired');
  });

  it('leaves a minted session alone even once the deadline passes', () => {
    const minted = session({
      status: 'minted',
      lastUnderlyingTimestamp: String(Math.floor(Date.now() / 1000) - 10),
    });
    expect(withExpiryStatus(minted).status).toBe('minted');
  });

  it('treats a missing deadline as unbounded', () => {
    expect(secondsRemaining(session({ lastUnderlyingTimestamp: '0' }))).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it('formats countdowns', () => {
    expect(formatCountdown(0)).toBe('expired');
    expect(formatCountdown(-5)).toBe('expired');
    expect(formatCountdown(65)).toBe('1m 05s');
    expect(formatCountdown(3700)).toBe('1h 1m');
    expect(formatCountdown(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('unit conversion', () => {
  it('converts UBA drops to XRP', () => {
    expect(ubaToXrp(10_000_000n)).toBe(10);
    expect(ubaToXrp('40000')).toBeCloseTo(0.04, 6);
  });
});
