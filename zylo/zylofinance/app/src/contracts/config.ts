import { CHAIN_ID, IS_TESTNET, RPC_URL, NATIVE_SYMBOL, EXPLORER_URL } from '../utils/constants';

/**
 * Each NEXT_PUBLIC_* reference has to be written out literally. Next.js
 * substitutes these at build time by matching the source text, so a computed
 * lookup like process.env[key] is never replaced and silently resolves to
 * undefined in the browser — every override falling back to its default.
 */
const env = (value: string | undefined, fallback: string) => value?.trim() || fallback;

export const CONTRACTS = {
  /** Deployed ERC-4626 vault that issues yFLR. */
  ZYLO_VAULT: env(
    process.env.NEXT_PUBLIC_ZYLO_VAULT,
    '0xEBeE2004E3D8cE6aD0E1aC6467Bc39da3907966E',
  ) as `0x${string}`,
  /** Wrapped native token. Coston2 WNat — NOT the Ethereum WETH address. */
  WNAT: env(process.env.NEXT_PUBLIC_WNAT, '0xC67DCE33D7A8efA5FfEB961899C73fe01bCe9273') as `0x${string}`,
  /** FAssets FXRP AssetManager. */
  ASSET_MANAGER: env(
    process.env.NEXT_PUBLIC_ASSET_MANAGER,
    '0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA',
  ) as `0x${string}`,
  /** Canonical FlareContractRegistry — identical across all Flare networks. */
  FLARE_CONTRACT_REGISTRY: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as `0x${string}`,
  FTSO_V2: env(process.env.NEXT_PUBLIC_FTSO_V2, '0x3d893C53D9e8056135C26C8c638B76C8b60Df726') as `0x${string}`,
  /** Escrow backing the confidential orderbook. Unset until deployed. */
  DARK_POOL: env(
    process.env.NEXT_PUBLIC_DARK_POOL,
    '0x0000000000000000000000000000000000000000',
  ) as `0x${string}`,
} as const;

export const DARK_POOL_CONFIGURED =
  CONTRACTS.DARK_POOL !== '0x0000000000000000000000000000000000000000';

export const TOKENS = {
  /** FXRP resolved on-chain from the AssetManager at runtime; this is the fallback. */
  FXRP: {
    address: env(process.env.NEXT_PUBLIC_FXRP, '0x0b6A3645c240605887a5532109323A3E12273dc7') as `0x${string}`,
    symbol: IS_TESTNET ? 'testFXRP' : 'FXRP',
    decimals: 6,
  },
  USDT0: {
    address: env(process.env.NEXT_PUBLIC_USDT0, '0xC1A5B41512496B80903D1f32d6dEa3a73212E71F') as `0x${string}`,
    symbol: 'USDT0',
    decimals: 6,
  },
  NATIVE: { symbol: NATIVE_SYMBOL, decimals: 18 },
  YFLR: { symbol: 'yFLR', decimals: 18 },
} as const;

export const FEED_IDS = {
  'XRP/USD': '0x015852502f55534400000000000000000000000000',
  'FLR/USD': '0x01464c522f55534400000000000000000000000000',
} as const;

export type FeedId = keyof typeof FEED_IDS;

export const ACTIVE_CHAIN = {
  id: CHAIN_ID,
  name: IS_TESTNET ? 'Coston2' : 'Flare',
  network: IS_TESTNET ? 'coston2' : 'flare',
  nativeCurrency: { decimals: 18, name: NATIVE_SYMBOL, symbol: NATIVE_SYMBOL },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: `${IS_TESTNET ? 'Coston2' : 'Flare'} Explorer`, url: EXPLORER_URL },
  },
} as const;
