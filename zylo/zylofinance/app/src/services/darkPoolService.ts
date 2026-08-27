import { CONTRACTS } from '../contracts/config';
import { CHAIN_ID } from '../utils/constants';

/**
 * Typed-data definitions mirroring tee/eip712.go and ZyloDarkPool.sol. The
 * enclave recovers the signer from these exact structs, so any drift here is
 * rejected as a forged intent rather than failing loudly.
 */
export const DARK_POOL_DOMAIN = {
  name: 'ZyloDarkPool',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: CONTRACTS.DARK_POOL,
} as const;

export const SESSION_TYPES = {
  Session: [
    { name: 'account', type: 'address' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'ttl', type: 'uint256' },
  ],
} as const;

export const ORDER_TYPES = {
  Order: [
    { name: 'account', type: 'address' },
    { name: 'market', type: 'bytes32' },
    { name: 'side', type: 'uint8' },
    { name: 'price', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

export const CANCEL_TYPES = {
  Cancel: [
    { name: 'account', type: 'address' },
    { name: 'orderId', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

export const WITHDRAW_TYPES = {
  WithdrawRequest: [
    { name: 'account', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

/** Enclave caps sessions at 15 minutes; stay inside it. */
export const SESSION_TTL_SECONDS = 600;

export interface Session {
  account: `0x${string}`;
  issuedAt: bigint;
  ttl: bigint;
  signature: `0x${string}`;
}

export interface PoolBalance {
  token: `0x${string}`;
  available: string;
  locked: string;
}

export interface PoolOrder {
  orderId: `0x${string}`;
  market: `0x${string}`;
  side: 'buy' | 'sell';
  price: string;
  amount: string;
  filled: string;
  remaining: string;
  deadline: string;
  placedAt: string;
}

export interface MarketSummary {
  market: `0x${string}`;
  base: `0x${string}`;
  quote: `0x${string}`;
  priceScale: string;
  lastClearingPrice?: string;
  lastClearedAt?: string;
}

export interface EnclaveHealth {
  signer: `0x${string}`;
  epoch: number;
  root: `0x${string}`;
  lastRootAt?: string;
}

export interface ExitClaim {
  token: `0x${string}`;
  amount: string;
  proof: `0x${string}`[];
}

const authHeaders = (session: Session): HeadersInit => ({
  'X-Zylo-Account': session.account,
  'X-Zylo-Issued-At': session.issuedAt.toString(),
  'X-Zylo-Ttl': session.ttl.toString(),
  'X-Zylo-Signature': session.signature,
});

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/pool/${path}`, init);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || `Enclave returned ${response.status}`);
  }
  return body as T;
}

export const fetchHealth = () => call<EnclaveHealth>('health');

export const fetchMarkets = () => call<MarketSummary[]>('market');

export const fetchBalances = async (session: Session) => {
  const data = await call<{ balances: PoolBalance[] }>('account', {
    headers: authHeaders(session),
  });
  return data.balances;
};

export const fetchOrders = (session: Session) =>
  call<PoolOrder[]>('orders', { headers: authHeaders(session) });

export const fetchExitProof = (session: Session) =>
  call<{ root: `0x${string}`; claims: ExitClaim[] }>('exit-proof', {
    headers: authHeaders(session),
  });

const post = <T>(path: string, body: unknown) =>
  call<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const submitOrder = (body: {
  account: string;
  market: string;
  side: 'buy' | 'sell';
  price: string;
  amount: string;
  nonce: string;
  deadline: string;
  signature: string;
}) => post<{ orderId: `0x${string}` }>('order', body);

export const submitCancel = (body: {
  account: string;
  orderId: string;
  nonce: string;
  deadline: string;
  signature: string;
}) => post<{ cancelled: boolean }>('cancel', body);

export const submitWithdrawal = (body: {
  account: string;
  token: string;
  amount: string;
  nonce: string;
  deadline: string;
  signature: string;
}) => post<{ status: string; nonce: string }>('withdraw', body);

/** Nonces only need to be unique per account inside the enclave. */
export const freshNonce = () =>
  BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));

export const deadlineIn = (seconds: number) =>
  BigInt(Math.floor(Date.now() / 1000) + seconds);
