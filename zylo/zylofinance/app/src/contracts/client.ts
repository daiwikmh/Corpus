import { createPublicClient, defineChain, http, type PublicClient } from 'viem';
import { ACTIVE_CHAIN, CONTRACTS, FEED_IDS, TOKENS } from './config';
import { ASSET_MANAGER_ABI, REGISTRY_ABI } from './abis';

const FTSO_V2_ABI = [
  {
    inputs: [{ name: '_feedIds', type: 'bytes21[]' }],
    name: 'getFeedsById',
    outputs: [
      { name: '_values', type: 'uint256[]' },
      { name: '_decimals', type: 'int8[]' },
      { name: '_timestamp', type: 'uint64' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

let client: PublicClient | null = null;

export const publicClient = (): PublicClient => {
  if (!client) {
    client = createPublicClient({
      chain: defineChain(ACTIVE_CHAIN),
      transport: http(),
    }) as PublicClient;
  }
  return client;
};

const registryCache = new Map<string, `0x${string}`>();

/**
 * Resolves a Flare protocol contract through the canonical FlareContractRegistry,
 * so addresses survive protocol redeploys instead of being pinned in the bundle.
 */
export async function resolveContract(name: string): Promise<`0x${string}`> {
  const cached = registryCache.get(name);
  if (cached) return cached;

  const address = (await publicClient().readContract({
    address: CONTRACTS.FLARE_CONTRACT_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: 'getContractAddressByName',
    args: [name],
  })) as `0x${string}`;

  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Flare contract registry has no entry for "${name}"`);
  }

  registryCache.set(name, address);
  return address;
}

export interface Prices {
  xrpUsd: number;
  flrUsd: number;
}

/** Live FTSOv2 prices. Both feeds are read in one call. */
export async function fetchPrices(): Promise<Prices> {
  const [values, decimals] = (await publicClient().readContract({
    address: CONTRACTS.FTSO_V2,
    abi: FTSO_V2_ABI,
    functionName: 'getFeedsById',
    args: [[FEED_IDS['XRP/USD'], FEED_IDS['FLR/USD']]],
  })) as [bigint[], number[], bigint];

  return {
    xrpUsd: Number(values[0]) / 10 ** Number(decimals[0]),
    flrUsd: Number(values[1]) / 10 ** Number(decimals[1]),
  };
}

/** FXRP token address straight from the AssetManager, falling back to config. */
export async function fetchFxrpAddress(): Promise<`0x${string}`> {
  try {
    return (await publicClient().readContract({
      address: CONTRACTS.ASSET_MANAGER,
      abi: ASSET_MANAGER_ABI,
      functionName: 'fAsset',
    })) as `0x${string}`;
  } catch {
    return TOKENS.FXRP.address;
  }
}

const FALLBACK_LOT_UBA = 10n * 1_000_000n;

/** Lot size in UBA (drops for FXRP). Falls back to the documented 10 XRP test lot. */
export async function fetchLotSizeUBA(): Promise<bigint> {
  try {
    return (await publicClient().readContract({
      address: CONTRACTS.ASSET_MANAGER,
      abi: ASSET_MANAGER_ABI,
      functionName: 'lotSize',
    })) as bigint;
  } catch {
    return FALLBACK_LOT_UBA;
  }
}
