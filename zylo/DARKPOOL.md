# Zylo Dark Pool — confidential matching on Midnight

A sealed-bid exchange whose order terms live in zero-knowledge circuits instead
of public state. Orders are placed as hiding commitments, matched against a
single clearing price, and settled with a proof — the chain never sees a side, a
limit price or a size.

Built on **Midnight** with **Compact**. Runs on the Preview / Preprod testnets.

---

## What stays private

Everything that would leak trading intent is a private circuit input or a
witness, never a ledger cell:

| Private | Why it cannot be on-chain |
|---|---|
| Every order's side, limit price and size | A limit price on-chain is a free option for anyone watching |
| The link between an order and its settlement | Counterparty leakage is most of the information |
| The link between two orders from the same trader | `orderSecret()` is mixed into every commitment, so equal traders do not produce relatable hashes |
| Per-account balances and locked collateral *(later level)* | Position sizes identify participants across trades |

`orderSecret()` is a Compact `witness` — supplied by the trader's local state,
pulled into the circuit, and never disclosed. Without it a commitment cannot be
reproduced, so it doubles as the authority to settle an order.

## What reaches the ledger

Four things, and nothing else:

1. **`orderCount`** — a public `Counter`. The book's *size* is known; its
   *contents* are not.

2. **`orderCommitments`** — a `Set<Bytes<32>>` of hiding hashes, one per order.
   `commitment = persistentHash([tag, orderSecret(), persistentHash([side, price, size])])`.
   Binding (any change of terms changes the hash) and hiding (the 32-byte secret
   is mixed in before hashing).

3. **`settled`** — a `Set<Bytes<32>>` of nullifiers, one per matched order.
   `nullifier = persistentHash([tag, commitment])`. Publishing it is what stops
   an order being filled twice; it reveals nothing about the order.

4. **`lastPrint`** — a `Maybe<Uint<64>>`, the clearing price of the most recent
   settlement. This is the *only* price the contract ever discloses.

Every write derived from private data goes through `disclose()` explicitly — the
compiler refuses otherwise — and each `disclose()` in `contracts/darkpool.compact`
is annotated with why the disclosed value is safe (it is a hash, or it is the
agreed clearing price).

## Why zero knowledge, not a plain contract

A normal smart-contract order book cannot keep a limit price secret. State is
public and the mempool is public, so:

- Resting orders are free optionality for anyone who can read them.
- Any match that touches the mempool can be front-run or sandwiched.
- Commit–reveal hides price only until reveal, and reveal is where execution
  happens, so the leak just moves.

Midnight's model closes this: a circuit input is a *private witness*, proven in
zero knowledge and never written down. `placeOrder` proves "I committed to a
well-formed order" without the terms; `settle` proves "this fill matches a live
commitment, has not been settled before, and crosses the clearing price" without
saying which order it was. The proof is generated on the trader's machine by the
local proof server; the network verifies it against the circuit's verifying key.

**Batch auctions, not a continuous book.** Orders resting when a batch closes are
treated as arriving at the same instant. One clearing price is chosen off-chain
to maximise executed volume, and every crossing order settles at that price. The
circuit does not pick the price — it only proves each fill is consistent with it
— so the batch operator's single lever is *which* price to publish. That is the
residual trust and is stated below.

## Trust assumptions

Stated plainly, including what is not covered.

**What you must trust**

- The soundness of Midnight's proof system and the correctness of the Compact
  compiler. A broken proof would let a non-crossing order settle, or a
  fabricated commitment be "matched".
- The batch operator's choice of clearing price. The circuit proves each fill
  crosses the published price; it does not yet prove the price maximises volume
  or falls between the best bid and ask. A dishonest operator can pick a price
  that is legal but unfavourable.

**What you do not have to trust**

- *Confidentiality of order terms.* Side, price and size are private witnesses.
  They are not on the ledger, not in the transaction, and not recoverable from
  the commitment without the exact terms and the trader's secret. Asserted in
  `tests/darkpool.test.ts` — the raw ledger state is scanned and contains none of
  the order's values, and the commitment matches only the exact `(secret, side,
  price, size)` tuple.
- *No double-fill.* A nullifier is published on settlement and checked on the
  next; a second `settle` of the same order reverts. Asserted directly.
- *No settlement of a phantom order.* `settle` reconstructs the commitment from
  the supplied terms and requires it to be a member of `orderCommitments`;
  terms that were never placed revert with `no such sealed order`.
- *Authority.* Only a party holding the order's `orderSecret()` can reconstruct
  its commitment, so only they can settle it. A different secret produces a
  different hash and fails the membership check.

**What is genuinely not covered**

- **Censorship.** The batch operator can decline to settle an order. A trader
  cannot force a fill; placement, however, is a direct ledger transaction the
  operator cannot block.
- **Clearing-price honesty.** As above — bounding the price to `[bestBid,
  bestAsk]` or proving volume maximisation in-circuit is future work.
- **Balances and custody.** This contract matches orders; it does not yet hold or
  move assets. Settlement against shielded token balances (Zswap) is a later
  level. Until then "settle" proves a match, not a transfer.
- **Timing / size correlation.** Commitments are published as they arrive. An
  observer counting `orderCount` between blocks learns how many orders were
  placed and when, though not by whom or for what.

## Architecture

```
  trader (browser + local proof server)            Midnight ledger
  ────────────────────────────────────             ───────────────
  side / price / size  ── private witness ──┐
  orderSecret()        ── witness ──────────┤
                                            ▼
                              build commitment in-circuit
                              prove placeOrder ───────────▶ orderCommitments.insert(hash)
                                                           orderCount += 1
        (batch closes; operator picks one clearing price off-chain)

  re-supply the same private terms ─────────┐
                                            ▼
                    prove: commitment ∈ orderCommitments
                           nullifier ∉ settled
                           order crosses clearingPrice
                    prove settle ────────────────────────▶ settled.insert(nullifier)
                                                           lastPrint = some(clearingPrice)

  anyone ──────────────────────────────────────────────▶ lastClearingPrice()  (public read)
```

## Layout

| Path | Contents |
|---|---|
| `contracts/darkpool.compact` | The contract: `placeOrder`, `settle`, `lastClearingPrice`, the commitment/nullifier construction, and the public-vs-private comment block |
| `managed/darkpool/` | Compiler output — TypeScript contract, ZK circuits, proving and verifying keys (`npm run compile` regenerates it) |
| `tests/darkpool-simulator.ts` | Test harness: deploys the contract in-process, threads the circuit context, recomputes commitments off-chain |
| `tests/darkpool.test.ts` | 12 tests — circuit logic, state transitions, privacy |

## Running it

```bash
nvm use 22
npm install
npm run compile      # compact compile -> managed/darkpool/
npm test             # 12 tests, in-process, no proof server needed
```

The test harness runs the generated JavaScript contract directly and does not
generate real proofs, so it needs neither Docker nor the proof server. Those are
required only for deploy and for real transactions:

```bash
docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v
```

## Markets

There are none yet. Once settlement moves against shielded balances, a market is
a pair of Midnight shielded tokens and the clearing price is quoted in the quote
token.

## In the app

The frontend is built in Level 2. The intended surface is one **Trade** view
carrying sealed order entry, your resting orders (recognised locally by
`orderSecret()`, not by any on-chain identity), and — once custody lands —
deposit and withdrawal. Charts, if any, show a public reference market; the
pool's own book has no public feed by design, only its clearing price after a
batch settles.

## Status

**Level 1 complete.** The contract compiles (`compact` 0.34.0, language 0.26,
ledger 9.1.0) and 12 tests pass, covering the crossing rule, malformed-order and
phantom-order rejection, `orderCount` / `orderCommitments` / `lastPrint` /
`settled` transitions, no-double-settle, and four privacy assertions.

**Not done:** deploy to Preview / Preprod (needs a funded testnet wallet), the
batch-auction orchestration, clearing-price honesty in-circuit, shielded-balance
custody, and the frontend. Not audited.
