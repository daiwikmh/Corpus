# Zylo Dark Pool

> A sealed-bid exchange where orders are placed, held and matched without their
> price, side or size ever becoming public — now built on Midnight with Compact
> and zero-knowledge proofs.

This repository was previously a Flare build (FAssets mint/redeem plus a
TEE-based confidential order book). It is being rebuilt on **Midnight**: the
confidentiality that used to depend on trusting an enclave now comes from
zero-knowledge circuits, and the order book's terms live in private witnesses
instead of sealed hardware. `DARKPOOL.md` and `PLAN.md` describe the retired
Flare design and are kept only for reference.

This is **Level 1** of the Midnight Builder Challenge: the smallest slice of the
dark pool that still carries its thesis — a sealed-order commitment contract with
a public book size, hidden order terms, and a single public clearing price.

## Contract Address

| Network | Address |
|---------|---------|
| Preview | _not deployed yet_ |
| Preprod | _not deployed yet_ |

Deployment needs a funded testnet wallet; the address is pasted here after the
first deploy.

## What This Does

`contracts/darkpool.compact` is a confidential order primitive with three
circuits:

- **`placeOrder(side, limitPrice, size)`** — the trader commits to an order. The
  terms are private circuit inputs; only a hiding hash of them reaches the
  ledger, and a public counter ticks up so the book's *size* is known while its
  *contents* are not.
- **`settle(side, limitPrice, size, clearingPrice)`** — the trader re-supplies
  the order's private terms and proves, in zero knowledge, that they match a live
  commitment, have not been settled before, and cross the clearing price. Only a
  nullifier and the clearing price become public.
- **`lastClearingPrice()`** — reads back the one figure a batch auction is
  allowed to reveal.

A batch auction on top of this would collect many `placeOrder` commitments,
choose one uniform `clearingPrice` off-chain, and call `settle` for each crossing
order — no order ever revealed, only the print.

## Privacy Model

**PUBLIC** (on the ledger, anyone can read):

- `orderCount` — how many sealed orders have ever been placed
- `orderCommitments` — one hiding hash per order; reveals nothing about its terms
- `settled` — nullifiers of orders already matched (prevents double-fill)
- `lastPrint` — the clearing price of the most recent settlement, and the only
  price this contract ever discloses

**PRIVATE** (circuit inputs and witness, never written in the clear):

- `side`, `limitPrice`, `size` of every order
- `orderSecret()` — the trader's per-order secret; without it a commitment cannot
  be reproduced, so it also gates who may settle an order

**PROVED without revealing:**

- *placeOrder* — "I committed to a well-formed order (`size > 0`, `price > 0`)"
  without exposing side, price or size.
- *settle* — "this fill corresponds to a real prior commitment, has not been
  settled before, and crosses the clearing price" without exposing which order it
  was or what its terms were.

An on-chain observer sees the number of resting orders, a list of opaque hashes,
a list of spent nullifiers, and the last clearing price. They cannot see any
order's side, price or size, cannot link an order to a settlement, and cannot
tell whether two commitments came from the same trader.

## Tech Stack

- **Midnight** network (Preview / Preprod testnets)
- **Compact** language — `pragma language_version 0.26`, compiler `0.34.0`
- `@midnight-ntwrk/compact-runtime` `0.19.0` for the test harness
- **Node.js v22**, **Docker** (proof server), **Vitest**

## Prerequisites

- Node.js **v22** (`nvm install 22`)
- Docker Desktop, running
- The Compact toolchain:

  ```bash
  curl --proto '=https' --tlsv1.2 -LsSf \
    https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
  compact update
  compact --version          # expect the dev-tools version
  compact compile --version  # expect 0.34.0
  ```

- The proof server image (needed for deploy, not for tests):

  ```bash
  docker pull midnightntwrk/proof-server:8.1.0
  docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v
  ```

## Setup

```bash
git clone <this-repo>
cd zylo
nvm use 22
npm install
npm run compile        # compact compile -> managed/darkpool/
```

`npm run compile` regenerates `managed/darkpool/` — the TypeScript contract, the
ZK circuits (`placeOrder`, `settle`, `lastClearingPrice`) and their proving and
verifying keys.

## Run Tests

```bash
npm test
```

12 tests in `tests/darkpool.test.ts`, covering:

- **circuit logic** — the buy/sell crossing rule, rejection of orders that were
  never placed, rejection of malformed orders
- **state transitions** — `orderCount` and `orderCommitments` growth, `lastPrint`
  moving from `none` to the settled price, and an order being unsettleable twice
- **privacy** — the ledger exposes only counts, commitments, nullifiers and the
  print; the raw ledger state contains none of the order's side/price/size; the
  commitment matches only the exact terms and secret; and a trader who cannot
  reconstruct an order cannot settle it

## Initial Idea

_[LEAVE PLACEHOLDER — fill in manually]_

## Screenshots

_[LEAVE PLACEHOLDER — add `compact compile` output and the deployed contract
address]_
