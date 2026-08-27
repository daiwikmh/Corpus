import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { marketId, MARKETS, TRADEABLE } from '../app/src/contracts/markets';

/**
 * The enclave derives market ids in Go and the frontend derives them in
 * TypeScript. A mismatch would not fail loudly — every order would simply be
 * rejected as an unknown market — so the two are pinned against each other.
 *
 * Regenerate with: cd ../tee && go test -run CrossCheck ./...
 */
const fixture = JSON.parse(
  readFileSync(join(__dirname, '../../flare/test/fixtures/crosscheck.json'), 'utf8'),
) as { markets: { id: string; base: string; quote: string }[] };

describe('market id conformance with the enclave', () => {
  it('derives every enclave market id', () => {
    expect(fixture.markets.length).toBeGreaterThan(0);

    for (const market of fixture.markets) {
      const derived = marketId(
        market.base as `0x${string}`,
        market.quote as `0x${string}`,
      );
      expect(derived.toLowerCase()).toBe(market.id.toLowerCase());
    }
  });

  it('ships the same market set the enclave serves', () => {
    const fromGo = fixture.markets.map((m) => m.id.toLowerCase()).sort();
    const fromApp = MARKETS.map((m) => m.id.toLowerCase()).sort();
    expect(fromApp).toEqual(fromGo);
  });

  it('quotes only real deployed tokens', () => {
    const zero = '0x0000000000000000000000000000000000000000';
    for (const market of MARKETS) {
      for (const side of [market.base, market.quote]) {
        if (side.address === zero) continue;
        expect(side.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(side.address.toLowerCase()).not.toBe(zero);
      }
    }
  });

  it('uses the live Coston2 FAsset and stablecoin addresses', () => {
    expect(TRADEABLE.FXRP.address.toLowerCase()).toBe(
      '0x0b6a3645c240605887a5532109323a3e12273dc7',
    );
    expect(TRADEABLE.USDT0.address.toLowerCase()).toBe(
      '0xc1a5b41512496b80903d1f32d6dea3a73212e71f',
    );
    expect(TRADEABLE.FXRP.decimals).toBe(6);
    expect(TRADEABLE.USDT0.decimals).toBe(6);
  });
});
