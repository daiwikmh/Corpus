"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { PrimeSdk } from '@etherspot/prime-sdk';
import { initEtherspotSDK, errorMessage } from '../utils/etherspot';
import { CHAIN_ID } from '../utils/constants';

/**
 * Two ways to transact:
 *  - `smart-account`: an Etherspot ERC-4337 account with sponsored gas, used
 *    when NEXT_PUBLIC_ETHERSPOT_API_KEY is configured.
 *  - `wallet`: the connected EOA pays its own gas. No keys needed.
 */
export type AccountMode = 'smart-account' | 'wallet';

interface SmartAccountState {
  primeSdk: PrimeSdk | null;
  /** Whichever address actually holds funds and sends transactions. */
  address: `0x${string}` | undefined;
  eoaAddress: `0x${string}` | undefined;
  smartAccountAddress: `0x${string}` | undefined;
  mode: AccountMode;
  isConnected: boolean;
  isReady: boolean;
  wrongChain: boolean;
  error: string | null;
}

const ETHERSPOT_KEY = process.env.NEXT_PUBLIC_ETHERSPOT_API_KEY;
const AA_ENABLED = Boolean(ETHERSPOT_KEY && !ETHERSPOT_KEY.startsWith('YOUR_'));

const SmartAccountContext = createContext<SmartAccountState>({
  primeSdk: null,
  address: undefined,
  eoaAddress: undefined,
  smartAccountAddress: undefined,
  mode: 'wallet',
  isConnected: false,
  isReady: false,
  wrongChain: false,
  error: null,
});

export const SmartAccountProvider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const [primeSdk, setPrimeSdk] = useState<PrimeSdk | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!AA_ENABLED || !isConnected || !address || !connector) {
        if (mounted) {
          setPrimeSdk(null);
          setSmartAccountAddress(undefined);
        }
        return;
      }

      try {
        const provider = await connector.getProvider();
        const sdk = await initEtherspotSDK(provider as never);
        const counterfactual = (await sdk.getCounterFactualAddress()) as `0x${string}`;
        if (!mounted) return;
        setPrimeSdk(sdk);
        setSmartAccountAddress(counterfactual);
        setError(null);
      } catch (e) {
        if (!mounted) return;
        // Falling back to the plain wallet keeps the app usable.
        console.error('Smart account init failed, using the wallet directly:', e);
        setPrimeSdk(null);
        setSmartAccountAddress(undefined);
        setError(errorMessage(e) || 'Smart account unavailable');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isConnected, address, connector]);

  const mode: AccountMode = primeSdk && smartAccountAddress ? 'smart-account' : 'wallet';
  const active = mode === 'smart-account' ? smartAccountAddress : address;

  return (
    <SmartAccountContext.Provider
      value={{
        primeSdk,
        address: active,
        eoaAddress: address,
        smartAccountAddress,
        mode,
        isConnected,
        isReady: isConnected && Boolean(active) && chainId === CHAIN_ID,
        wrongChain: isConnected && chainId !== CHAIN_ID,
        error,
      }}
    >
      {children}
    </SmartAccountContext.Provider>
  );
};

export const useSmartAccount = () => useContext(SmartAccountContext);
