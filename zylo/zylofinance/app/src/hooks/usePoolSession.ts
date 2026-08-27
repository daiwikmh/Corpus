"use client";

import { useCallback, useEffect, useState } from 'react';
import { useSignTypedData } from 'wagmi';
import {
  DARK_POOL_DOMAIN,
  SESSION_TYPES,
  SESSION_TTL_SECONDS,
  type Session,
} from '../services/darkPoolService';

/**
 * A session is a short-lived EIP-712 signature the enclave checks on every
 * account-scoped read. It is held in memory only — never persisted — and drops
 * itself the moment it lapses, so a stale grant cannot linger on the page.
 */
export const usePoolSession = (address?: `0x${string}`) => {
  const { signTypedDataAsync } = useSignTypedData();
  const [stored, setStored] = useState<Session | null>(null);

  const session = stored && stored.account === address ? stored : null;
  const [error, setError] = useState('');

  useEffect(() => {
    if (!stored) return;

    const remaining = Number(stored.issuedAt + stored.ttl) * 1000 - Date.now();
    const timer = setTimeout(() => setStored(null), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [stored]);

  const authorise = useCallback(async () => {
    if (!address) return null;

    const issuedAt = BigInt(Math.floor(Date.now() / 1000));
    const ttl = BigInt(SESSION_TTL_SECONDS);

    try {
      const signature = await signTypedDataAsync({
        domain: DARK_POOL_DOMAIN,
        types: SESSION_TYPES,
        primaryType: 'Session',
        message: { account: address, issuedAt, ttl },
      });

      const next: Session = { account: address, issuedAt, ttl, signature };
      setError('');
      setStored(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signature rejected');
      return null;
    }
  }, [address, signTypedDataAsync]);

  return { session, authorise, error };
};
