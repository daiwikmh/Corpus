# Zylo Dark Pool — confidential matching on Flare

A sealed-bid FXRP/C2FLR exchange whose order book lives inside a Flare
Confidential Compute enclave. Orders are never public, matching happens off the
mempool entirely, and the chain sees only custody and a commitment.

Built for the Flare Confidential Compute bounty. Runs on Coston2.

---

## What runs privately inside the TEE

Everything that would leak trading intent:

| Held in the enclave | Why it cannot be on-chain |
|---|---|
| Every resting order — account, side, limit price, size | A limit price on-chain is a free option for anyone watching |
| The full book, both sides | Visible depth is what makes size costly to trade |
| Per-account balances and locked collateral | Position sizes identify participants across trades |
| The matching itself | Ordering is only fair if nobody can observe it first |
| Fills, and who traded against whom | Counterparty leakage is most of the information |

The enclave holds a signing key sealed to the CVM. That key is the only thing
the escrow contract trusts, and it never leaves the hardware.

## What is verified and consumed on-chain

Three things, and nothing else:

1. **Deposits.** `ZyloDarkPool.deposit` / `depositNative` take custody. The
   enclave watches `Deposited` and credits its internal ledger, keyed on the
   transaction hash so a reorg or a replayed log cannot credit twice.

2. **A balance commitment.** Every batch, the enclave publishes a Merkle root
   over `(account, token, amount)` via `publishRoot`, signed EIP-712 with the
   enclave key and carrying a strictly increasing epoch. This is the *entire*
   on-chain footprint of the book: no order, no fill, no counterparty, no price
   beyond the clearing print.

3. **Withdrawals.** The enclave signs a `Withdrawal` voucher; the contract
   recovers it against the registered signer and pays out. Nonces are
   single-use and vouchers carry a deadline.

## Why this needs confidential compute

A normal smart-contract order book cannot keep a limit price secret. State is
public and the mempool is public, so:

- Resting orders are free optionality for anyone who can read them.
- Any match that touches the mempool can be front-run or sandwiched.
- Commit–reveal hides price only until reveal, and reveal is where execution
  happens, so the leak just moves.
- ZK proves a matching was done correctly but does not give you a *private
  book with shared state* — participants still have to reveal to someone.

The TEE gives the one thing missing: a place where mutually distrusting orders
can sit together, be compared, and be matched, without any of them becoming
visible — while still producing an output a contract can act on.

**Batch auctions, not a continuous book.** Every order resting when the batch
closes is treated as arriving at the same instant. A single clearing price is
chosen to maximise executed volume, and every crossing order settles at that
price — buyers who bid above it are refunded the difference rather than paying
their limit. This removes latency advantage *inside* the enclave too, so
neither a user nor the operator can profit from ordering. That is a deliberate
narrowing of what the operator could otherwise extract.

## Trust assumptions

Stated plainly, including what is not covered.

**What you must trust**

- The CVM's attestation and isolation. If the hardware is broken, the book is
  readable and matching can be biased.
- That the enclave runs the audited binary. Attestation covers the measurement;
  reproducing the build is on the operator.

**What you do not have to trust**

- *Custody.* The escrow contract only ever pays `account` — the address named
  in the voucher. A malicious enclave signing itself a voucher moves funds to
  the user in that voucher, not to itself. This is asserted directly in
  `test_enclaveCannotRedirectFundsToItself`.
- *Liveness.* If the enclave stops publishing roots for
  `rootStalenessWindow`, anyone may exit unilaterally via `emergencyWithdraw`,
  proving their balance against the last published root. The operator cannot
  freeze funds by going dark.
- *Withdrawal integrity.* The runtime is fail-closed: a balance is moved out of
  the spendable pool, the escrow call is awaited, and only a receipt with
  status 1 retires it. A reverted or dropped transaction restores the balance
  rather than burning it (`TestWithdrawalIsFailClosed`).
- *Account privacy from other users.* Reads are gated behind short-lived
  EIP-712 session signatures, so balances and orders are not an open API.

**What is genuinely not covered**

- **Censorship.** The operator can refuse to include an order. Users cannot
  force inclusion; they can only exit. This is the honest weak point.
- **Root withholding within the window.** A root can be stale by up to
  `rootStalenessWindow` before exit unlocks, so an exit may settle against a
  slightly old balance. Shortening the window trades this against gas.
- **`SIMULATED_TEE=true` provides no security.** It exists so the exchange can
  be developed and demonstrated without CVM hardware. It is not a trust
  equivalent, and the runtime logs a warning on every start.

## Architecture

```
  user wallet                    enclave (FCC CVM)              Coston2
  ───────────                    ─────────────────              ───────
  deposit ─────────────────────────────────────────────────▶ ZyloDarkPool
                                 watch Deposited ◀──────────── (custody)
  EIP-712 signed order ────────▶ verify signature
                                 lock collateral
                                 order rests, sealed
                                       │
                                 batch closes
                                 uniform-price auction
                                 settle internally
                                       │
                                 Merkle root ───────────────▶ publishRoot
  EIP-712 withdraw ────────────▶ debit, sign voucher ───────▶ withdraw
                                 await receipt ◀────────────── payout
                                 confirm or restore

  enclave silent > window:
  user ────────────────────────────────────────────────────▶ emergencyWithdraw
                                                              (Merkle proof)
```

## Layout

| Path | Contents |
|---|---|
| `flare/src/ZyloDarkPool.sol` | Escrow, root commitment, vouchers, emergency exit |
| `flare/test/ZyloDarkPool.t.sol` | 19 custody and adversarial tests |
| `flare/test/ZyloDarkPoolCrossCheck.t.sol` | Go↔Solidity hashing conformance |
| `tee/book.go` | Sealed order book and uniform-price batch auction |
| `tee/ledger.go` | Private balances, Merkle commitment |
| `tee/eip712.go` | Typed-data hashing and signature recovery |
| `tee/exchange.go` | Orchestration, fail-closed withdrawals, root publication |
| `tee/server.go` | HTTP surface, session-gated reads |
| `tee/chain.go` | Escrow client, deposit watcher |

## Cross-language conformance

The enclave and the contract independently implement the same leaf encoding and
the same EIP-712 hashing, in two languages. If they ever diverge, the emergency
exit would reject valid proofs — and it would only be discovered at the exact
moment users needed it.

So agreement is asserted, not assumed. `go test -run CrossCheck ./...` writes a
vector from the Go implementation; `ZyloDarkPoolCrossCheck.t.sol` recomputes it
in Solidity and fails on any mismatch of leaf encoding, Merkle root, proof
verification, domain separator or withdrawal digest.

## Running it

```bash
# contracts
cd flare && forge test

# enclave
cd tee && go test ./...

# regenerate the conformance vector after changing either side
cd tee && go test -run CrossCheck ./... && cd ../flare && forge test --match-contract CrossCheck
```

Local run against Coston2:

```bash
export SIMULATED_TEE=true          # no CVM hardware; development only
export DARKPOOL_ADDRESS=0x...      # deployed ZyloDarkPool
export RPC_URL=https://coston2-api.flare.network/ext/C/rpc
export CHAIN_ID=114
export BATCH_SECONDS=30
cd tee && go run .
```

| Variable | Purpose | Default |
|---|---|---|
| `ENCLAVE_PRIVATE_KEY` | Signing identity; sealed to the CVM in production | required unless simulated |
| `SIMULATED_TEE` | Generate an ephemeral key, skip attestation | `false` |
| `DARKPOOL_ADDRESS` | Escrow contract | required |
| `BATCH_SECONDS` | Auction cadence | `30` |
| `START_BLOCK` | First block to scan for deposits | `0` |

## Markets

Every tradeable address is a live deployment, resolved from the
FlareContractRegistry and the AssetManagerController rather than hand-picked.
Nothing here is a mock.

| Market | Base | Quote |
|---|---|---|
| FXRP / C2FLR | `0x0b6A…3dc7` (6dp) | native |
| FXRP / USD₮0 | `0x0b6A…3dc7` (6dp) | `0xC1A5…E71F` (6dp) |
| C2FLR / USD₮0 | native | `0xC1A5…E71F` (6dp) |

Coston2 carries exactly one FAsset, so FXRP is the only bridged asset there.
Overriding `TOKEN_FXRP` / `TOKEN_USDT0` repoints the same markets at Flare
mainnet, where FXRP is `0xAd552A648C74D49E10027AB8a618A3ad4901c5bE`.

Market ids are derived identically on both sides — `keccak256(base ++ quote)`
in `markets.go` and `markets.ts` — and pinned against each other by
`tests/markets.test.ts`, because a mismatch would silently reject every order
as an unknown market rather than failing loudly.

## In the app

The **Trade** tab (`/pool`) carries the whole flow: deposit, sealed order
entry, your resting orders, and withdrawal. It reads `enclaveIsLive()` straight
from the escrow, so if the enclave stops publishing roots the UI says so and
points at the emergency exit rather than pretending the venue is healthy.

Charts come from TradingView and show the **public market for the underlying
asset**. The pool's own book has no public feed — that is the product — so only
its clearing price is surfaced, and only after a batch settles.

## Status

Contracts, enclave runtime and the Trade tab are complete and tested —
30 Forge tests, 17 Go tests, 58 frontend tests, including cross-language
conformance in both directions. Not audited.

The escrow is not yet deployed to Coston2. Deploy it, point
`NEXT_PUBLIC_DARK_POOL` and `DARKPOOL_ADDRESS` at the result, and the venue is
live:

```bash
cd flare
TEE_SIGNER=<enclave /health signer> \
  forge script script/DeployZyloDarkPool.s.sol --rpc-url coston2 --broadcast
```
