import { concat, keccak256 } from 'viem';
import { CONTRACTS, TOKENS } from './config';
import { IS_TESTNET, NATIVE_SYMBOL } from '../utils/constants';

/**
 * Every address here is a live deployment read off Coston2 — the FAsset comes
 * from the AssetManagerController, WNat and USD₮0 from the registry. Nothing
 * in the tradeable set is a mock.
 *
 * Native C2FLR is tracked under the zero address, matching the escrow.
 */
export const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000' as const;

export interface TokenMeta {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}

export const TRADEABLE: Record<string, TokenMeta> = {
  NATIVE: { address: NATIVE_TOKEN, symbol: NATIVE_SYMBOL, decimals: 18 },
  FXRP: {
    address: TOKENS.FXRP.address,
    symbol: TOKENS.FXRP.symbol,
    decimals: TOKENS.FXRP.decimals,
  },
  USDT0: {
    address: TOKENS.USDT0.address,
    symbol: IS_TESTNET ? 'USD₮0' : 'USDT0',
    decimals: TOKENS.USDT0.decimals,
  },
  WNAT: { address: CONTRACTS.WNAT, symbol: IS_TESTNET ? 'WC2FLR' : 'WFLR', decimals: 18 },
};

/** Mirrors keccak256(base.Bytes() ++ quote.Bytes()) in the enclave. */
export const marketId = (base: `0x${string}`, quote: `0x${string}`): `0x${string}` =>
  keccak256(concat([base, quote]));

export interface MarketDef {
  id: `0x${string}`;
  base: TokenMeta;
  quote: TokenMeta;
  label: string;
  /**
   * Reference symbol for the underlying asset. The dark pool's own book cannot
   * be charted — that is the entire point of it — so the chart shows the public
   * market for the same asset alongside the pool's last clearing price.
   */
  tradingViewSymbol: string;
}

const define = (base: TokenMeta, quote: TokenMeta, tradingViewSymbol: string): MarketDef => ({
  id: marketId(base.address, quote.address),
  base,
  quote,
  label: `${base.symbol}/${quote.symbol}`,
  tradingViewSymbol,
});

export const MARKETS: MarketDef[] = [
  define(TRADEABLE.FXRP, TRADEABLE.NATIVE, 'CRYPTO:XRPUSD'),
  define(TRADEABLE.FXRP, TRADEABLE.USDT0, 'CRYPTO:XRPUSD'),
  define(TRADEABLE.NATIVE, TRADEABLE.USDT0, 'CRYPTO:FLRUSD'),
];

export const marketById = (id: string): MarketDef | undefined =>
  MARKETS.find((m) => m.id.toLowerCase() === id.toLowerCase());

export const tokenByAddress = (address: string): TokenMeta | undefined =>
  Object.values(TRADEABLE).find((t) => t.address.toLowerCase() === address.toLowerCase());
