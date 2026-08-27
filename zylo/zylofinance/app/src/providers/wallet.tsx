"use client";

import { ReactNode, useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected, metaMask, coinbaseWallet, walletConnect, mock } from 'wagmi/connectors';
import { defineChain } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ACTIVE_CHAIN } from '../contracts/config';
import { RPC_URL } from '../utils/constants';

export const chain = defineChain(ACTIVE_CHAIN);

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/**
 * Optional read-only demo account. Every on-chain read still hits Coston2 for
 * real; only signing is unavailable, so the whole app is browsable without a
 * wallet installed.
 */
const demoAddress = process.env.NEXT_PUBLIC_DEMO_ADDRESS as `0x${string}` | undefined;

export const DEMO_ADDRESS = demoAddress;
export const DEMO_CONNECTOR_ID = 'mock';

/**
 * Plain wagmi — any Flare-capable wallet works with no API keys. `injected`
 * covers the MetaMask/Rabby/Brave extensions; the MetaMask SDK connector adds
 * the mobile deep-link path when the extension isn't present.
 */
export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [
    injected({ shimDisconnect: true }),
    metaMask({ dappMetadata: { name: 'Zylo', url: 'https://zylo.finance' } }),
    coinbaseWallet({ appName: 'Zylo' }),
    ...(wcProjectId ? [walletConnect({ projectId: wcProjectId })] : []),
    ...(demoAddress ? [mock({ accounts: [demoAddress] })] : []),
  ],
  transports: {
    [chain.id]: http(RPC_URL),
  },
  ssr: true,
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
};
