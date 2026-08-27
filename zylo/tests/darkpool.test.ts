import { describe, expect, it } from 'vitest';
import {
  BUY,
  DarkPoolSimulator,
  SELL,
  makeSecret,
  orderCommitment,
} from './darkpool-simulator.js';

const secretA = makeSecret(0xa1);
const secretB = makeSecret(0xb2);

describe('constructor', () => {
  it('starts with an empty book and no clearing price', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);
    const l = dp.ledger();
    expect(l.orderCount).toBe(0n);
    expect(l.orderCommitments.isEmpty()).toBe(true);
    expect(l.settled.isEmpty()).toBe(true);
    expect(l.lastPrint.is_some).toBe(false);
  });
});

describe('circuit logic — crossing rule', () => {
  it('a buy fills only at or above the clearing price', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);

    await dp.placeOrder(BUY, 100n, 5n);
    await dp.settle(BUY, 100n, 5n, 90n);
    expect((await dp.lastClearingPrice()).value).toBe(90n);

    await dp.placeOrder(BUY, 100n, 7n);
    await expect(dp.settle(BUY, 100n, 7n, 110n)).rejects.toThrow(
      /does not cross/,
    );
  });

  it('a sell fills only at or below the clearing price', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);

    await dp.placeOrder(SELL, 100n, 5n);
    await dp.settle(SELL, 100n, 5n, 110n);
    expect((await dp.lastClearingPrice()).value).toBe(110n);

    await dp.placeOrder(SELL, 100n, 7n);
    await expect(dp.settle(SELL, 100n, 7n, 90n)).rejects.toThrow(/does not cross/);
  });

  it('rejects a settlement for an order that was never placed', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);
    await expect(dp.settle(BUY, 42n, 1n, 42n)).rejects.toThrow(/no such sealed order/);
  });

  it('rejects malformed orders', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);
    await expect(dp.placeOrder(BUY, 100n, 0n)).rejects.toThrow(/size must be positive/);
    await expect(dp.placeOrder(BUY, 0n, 1n)).rejects.toThrow(/limit price must be positive/);
    await expect(dp.placeOrder(2n, 100n, 1n)).rejects.toThrow(/side must be/);
  });
});

describe('state transitions', () => {
  it('orderCount rises once per placed order', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);
    expect(dp.ledger().orderCount).toBe(0n);
    await dp.placeOrder(BUY, 100n, 1n);
    expect(dp.ledger().orderCount).toBe(1n);
    await dp.placeOrder(SELL, 105n, 2n);
    expect(dp.ledger().orderCount).toBe(2n);
    expect(dp.ledger().orderCommitments.size()).toBe(2n);
  });

  it('lastPrint moves from none to the settled clearing price', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);
    expect(dp.ledger().lastPrint.is_some).toBe(false);
    await dp.placeOrder(BUY, 100n, 5n);
    await dp.settle(BUY, 100n, 5n, 95n);
    expect(dp.ledger().lastPrint).toEqual({ is_some: true, value: 95n });
  });

  it('an order cannot be settled twice', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);
    await dp.placeOrder(BUY, 100n, 5n);
    await dp.settle(BUY, 100n, 5n, 90n);
    expect(dp.ledger().settled.size()).toBe(1n);
    await expect(dp.settle(BUY, 100n, 5n, 90n)).rejects.toThrow(/already settled/);
    expect(dp.ledger().settled.size()).toBe(1n);
  });
});

describe('privacy — private inputs never reach the ledger', () => {
  const PRICE = 3735928559n; // 0xDEADBEEF — distinctive enough to grep for
  const SIZE = 51966n; // 0xCAFE

  it('exposes only counts, commitments, nullifiers and the clearing print', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);
    await dp.placeOrder(BUY, PRICE, SIZE);

    const keys = Object.keys(dp.ledger()).sort();
    expect(keys).toEqual(['lastPrint', 'orderCommitments', 'orderCount', 'settled']);
  });

  it('does not store the order side, price or size anywhere in ledger state', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);
    await dp.placeOrder(BUY, PRICE, SIZE);

    const raw = dp.rawLedgerState();
    expect(raw).not.toContain(PRICE.toString());
    expect(raw).not.toContain(SIZE.toString());
  });

  it('the commitment is binding and hiding: it matches only the exact terms', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);
    await dp.placeOrder(BUY, PRICE, SIZE);

    const exact = orderCommitment(secretA, BUY, PRICE, SIZE);
    expect(dp.ledger().orderCommitments.member(exact)).toBe(true);

    const wrongPrice = orderCommitment(secretA, BUY, PRICE + 1n, SIZE);
    const wrongSide = orderCommitment(secretA, SELL, PRICE, SIZE);
    const wrongSecret = orderCommitment(secretB, BUY, PRICE, SIZE);
    expect(dp.ledger().orderCommitments.member(wrongPrice)).toBe(false);
    expect(dp.ledger().orderCommitments.member(wrongSide)).toBe(false);
    expect(dp.ledger().orderCommitments.member(wrongSecret)).toBe(false);
  });

  it('another trader cannot settle an order they cannot reconstruct', async () => {
    const dp = await DarkPoolSimulator.deploy(secretA);
    await dp.placeOrder(BUY, PRICE, SIZE);

    dp.useSecret(secretB);
    await expect(dp.settle(BUY, PRICE, SIZE, PRICE)).rejects.toThrow(/no such sealed order/);
  });
});
