import { DROPS_PER_XRP } from '../utils/constants';

export type MintStatus = 'reserved' | 'paid' | 'minted' | 'expired' | 'failed';

export interface MintSession {
  collateralReservationId: string;
  agentVault: string;
  paymentAddress: string;
  paymentReference: string;
  lots: number;
  valueUBA: string;
  feeUBA: string;
  /** XRPL ledger close time (seconds) after which the reservation lapses. */
  lastUnderlyingTimestamp: string;
  totalAmountXRP: number;
  status: MintStatus;
  xamanUuid?: string;
  xrplTxHash?: string;
  mintTxHash?: string;
  error?: string;
  createdAt: number;
}

const KEY = 'zylo.mint-sessions';

/**
 * Reservations live for a limited number of XRPL ledgers, so an in-flight mint
 * has to survive a refresh — otherwise the CRF is simply lost. Kept on the
 * device rather than a database: no backend to provision, and the session is
 * only ever useful to the browser that started it.
 */
function readAll(): Record<string, MintSession[]> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();
let version = 0;

function invalidate() {
  version++;
  listeners.forEach((listener) => listener());
}

// Another tab (or a storage clear) can move this out from under us, and the
// snapshot cache would otherwise keep serving a stale array forever.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) invalidate();
  });
}
let cache: { key: string; version: number; value: MintSession[] } | null = null;
const NONE: MintSession[] = [];

function writeAll(all: Record<string, MintSession[]>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked — the mint still works, it just won't resume */
  }
  invalidate();
}

const normalise = (address: string) => address.toLowerCase();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Stable snapshot for useSyncExternalStore — the same array identity is handed
 * back until a write bumps the version, otherwise React would loop forever.
 */
export function getSnapshot(minter?: string): MintSession[] {
  const key = minter ? normalise(minter) : '';
  if (!key) return NONE;
  if (cache && cache.key === key && cache.version === version) return cache.value;

  const value = (readAll()[key] ?? []).sort((a, b) => b.createdAt - a.createdAt);
  cache = { key, version, value };
  return value;
}

export const getServerSnapshot = (): MintSession[] => NONE;

export function listSessions(minter?: string): MintSession[] {
  if (!minter) return [];
  return getSnapshot(minter).map(withExpiry);
}

export function activeSession(minter?: string): MintSession | undefined {
  return listSessions(minter).find((s) => s.status === 'reserved' || s.status === 'paid');
}

export const withExpiryStatus = withExpiry;

export function saveSession(minter: string, session: MintSession) {
  const all = readAll();
  const key = normalise(minter);
  const existing = all[key] ?? [];
  const index = existing.findIndex(
    (s) => s.collateralReservationId === session.collateralReservationId,
  );

  if (index >= 0) existing[index] = session;
  else existing.unshift(session);

  all[key] = existing.slice(0, 20);
  writeAll(all);
}

export function updateSession(
  minter: string,
  collateralReservationId: string,
  patch: Partial<MintSession>,
): MintSession | undefined {
  const all = readAll();
  const key = normalise(minter);
  const existing = all[key] ?? [];
  const index = existing.findIndex((s) => s.collateralReservationId === collateralReservationId);
  if (index < 0) return undefined;

  existing[index] = { ...existing[index], ...patch };
  all[key] = existing;
  writeAll(all);
  return existing[index];
}

export function clearSession(minter: string, collateralReservationId: string) {
  const all = readAll();
  const key = normalise(minter);
  all[key] = (all[key] ?? []).filter(
    (s) => s.collateralReservationId !== collateralReservationId,
  );
  writeAll(all);
}

function withExpiry(session: MintSession): MintSession {
  if (session.status !== 'reserved' && session.status !== 'paid') return session;
  return secondsRemaining(session) <= 0 ? { ...session, status: 'expired' } : session;
}

export function secondsRemaining(session: MintSession): number {
  const deadline = Number(session.lastUnderlyingTimestamp);
  if (!Number.isFinite(deadline) || deadline === 0) return Number.POSITIVE_INFINITY;
  return Math.floor(deadline - Date.now() / 1000);
}

export function formatCountdown(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds <= 0) return 'expired';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

export const ubaToXrp = (uba: bigint | string) => Number(uba) / DROPS_PER_XRP;
