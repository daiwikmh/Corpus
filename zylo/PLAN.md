# Road through the Midnight Builder Challenge — Zylo Dark Pool

**One contract, six levels, New Moon to Supermoon.** Each level adds one real
capability to the dark pool and retires a specific unknown. The contract is the
spine; the frontend, the batch operator and custody hang off it in that order.

| Circuits | Contract tests | Frontend | Transactions sent |
|---|---|---|---|
| 3 (`placeOrder`, `settle`, `lastClearingPrice`) | 12 passing | none yet | **0, ever** |

---

## L1 · New Moon — Setup & First Contract — *done*

Verified, not asserted. `npm run compile` emits three circuits into
`managed/darkpool/`; `npm test` runs 12 tests green.

| Requirement | Evidence |
|---|---|
| Compiles with `compact compile` | `managed/darkpool/{contract,zkir,keys}` regenerated on demand |
| `managed/` present | committed |
| 3+ tests passing | 12 — crossing rule, malformed/phantom rejection, `orderCount`/`orderCommitments`/`lastPrint`/`settled` transitions, no-double-settle, 4 privacy assertions |
| Public ledger state | `orderCount`, `orderCommitments`, `settled`, `lastPrint` |
| Private witness as input | `orderSecret()`; plus `side`/`limitPrice`/`size` as private circuit inputs |
| Deliberate `disclose()` | 4×, each annotated — every one is a hash or the agreed clearing price |
| README with all sections | `README.md` |

**Not done in L1:** deploy. It needs a funded testnet wallet and the proof
server, and is the first task of L2.

---

## L2 · Waxing Crescent — Frontend Integration

Strictly sequential. Each step is a prerequisite for the next.

### 2.1 Deploy the contract — *start here*

Nothing else can run until `darkpool.compact` is on Preprod.

Stand up a Node deploy script using `@midnight-ntwrk/midnight-js-contracts` with
the four providers (indexer, node, proof server, wallet). Fund a wallet with
tDUST from the faucet, run the local proof server, deploy.

- **Verify:** a contract address prints; `lastClearingPrice()` reads back
  `{ is_some: false }` from a fresh deployment.
- **If it fails:** proof-server URL and the ZK config provider path are the usual
  culprits — confirm `managed/darkpool/keys/*` are the ones the deployed verifier
  expects.

### 2.2 Wallet connect

`WalletConnect.tsx` — connect and disconnect Lace via
`@midnight-ntwrk/dapp-connector-api`. Show the address when connected, a clear
disconnected state otherwise. Handle: wallet absent, user rejected, wrong
network.

- **Verify:** address appears on connect, clears on disconnect.

### 2.3 Place an order from the browser

`CircuitCall.tsx` — a form for side / limit price / size that calls `placeOrder`.
The three terms are collected, passed straight into the circuit, and **never
rendered back, logged, or put in the URL**. The proof is generated locally.

`orderSecret()` is supplied by the dapp's private-state provider — a fresh random
32 bytes per order, stored locally keyed by wallet address, because nothing
on-chain identifies an order as yours.

- **Verify:** after submit, `orderCount` increments and the new commitment is a
  member of `orderCommitments`; the UI shows "proved without revealing your
  order" and none of the three terms.
- **Watch:** the private-state store is the resting-order book from the user's
  side. Lose it and the order can be seen to exist but never settled.

### 2.4 Resting orders view

List the caller's own orders from the local private-state store, each marked
*resting* or *settled* by checking `settled.member(nullifier)` against the chain.

- **Verify:** an order placed in 2.3 shows as resting; nothing that isn't the
  caller's appears.

### 2.5 Deploy the frontend

`vercel.json` or `netlify.toml`, exact CLI commands in the README. The live URL
points at the Preprod contract.

- **Verify:** the deployed site connects Lace and places an order end to end.

**L2 risks**

- **Browser proof generation.** `placeOrder`'s circuit is small, but proof time
  and WASM/proof-server wiring in the browser is the first real unknown. De-risk
  by proving `placeOrder` from a Node script before touching React.
- **Private state is per-device.** Same failure mode as any local key store —
  clearing site data orphans orders. Say so in the UI.

---

## L3 · First Quarter — Production-Grade dApp

### 3.1 Tests — hold the line at 12+

Keep the three categories green (circuit logic, state transitions, privacy). Add
a test for any bug L2 surfaces, with the real shape that broke it.

### 3.2 CI/CD — `.github/workflows/ci.yml`

On push to `main` and on PR: checkout → Node 22 → install the Compact toolchain
(`compact-installer.sh` + `compact update`) → `npm run compile` → `npm test`.
Cache the toolchain download. CI badge at the top of the README.

- **Verify:** a green run on a pushed branch; badge renders.

### 3.3 Polish

Every error state has a user-facing message. A spinner during proof generation.
Privacy behaviour labelled in the UI, not buried. Mobile-responsive. `npm run
build` with zero console errors.

### 3.4 `PROPOSAL.md`

Product, users, why Midnight specifically (a private limit price is impossible on
a transparent chain), the data model table (public ledger vs private witness),
and whether Mainnet by L6 is realistic. Placeholders for the answers — that is
the product argument and is written by hand.

---

## L4 · Waxing Gibbous — MVP Goes Live

Only after the proposal is approved.

### 4.1 The batch operator

The missing half of the venue: an off-chain service that watches
`orderCommitments`, closes a batch on a cadence, picks one clearing price, and
calls `settle` for each crossing order.

It never learns an order's terms — traders submit their private terms to it over
an authenticated channel only at settlement, or the operator is handed
pre-built `settle` proofs. Decide which at design time; the second keeps terms on
the trader's machine entirely.

- **Verify:** two crossing orders placed independently both settle in one batch
  at the same `lastPrint`; a non-crossing order is left resting.

### 4.2 Clearing-price honesty

Add an in-circuit bound: the clearing price must lie between the best resting bid
and ask the batch includes. Removes the operator's "legal but unfavourable price"
lever. New tests for the bound.

### 4.3 Custody — settle moves value

Extend `settle` to debit and credit shielded token balances (Zswap) so a fill is
a transfer, not just a proof of a match. This is the largest single addition and
may warrant its own contract module.

- **Verify:** balances change by exactly the fill; value is conserved across a
  batch; a replayed `settle` still reverts.

### 4.4 `docs/USAGE.md`

Plain-English: what you need, step-by-step, what gets proved and what stays
private, troubleshooting.

### 4.5 Redeploy to Preprod, update every address

Contract address into the README table (mandatory), frontend re-pointed, codebase
swept for stale addresses.

---

## L5 · Full Moon — Users & Feedback

- `USERS.md` — 50 verified Preprod wallet addresses, filled as they arrive.
- `docs/FEEDBACK.md` — collection method, raw log, themes, what changed.
- Acquisition copy — Discord/Telegram, X, a DM template.
- Iterate: implement the top 2–3 improvements, record them in `FEEDBACK.md`,
  update the README if behaviour changed.

The 50 users and the feedback itself are collected by hand.

---

## L6 · Supermoon — Launch

- Implement the top feedback items; `docs/FEEDBACK.md` gets an `L6 Improvements`
  section.
- Redeploy to Preprod with the updated contract; update the address everywhere.
- `docs/USAGE.md` final pass — "Getting Started on Preprod", "Your First
  Transaction".
- `LAUNCH_USERS.md` — 20 onboarded wallet addresses.
- Brand brief (tagline, three messages, palette, X bio), onboarding script, final
  README with every section, demo video showing the contract address, the full
  place→settle flow, and the privacy model end to end.
- Mainnet behind a flag if 4.3 custody is solid and audited-enough to say so.

---

## Open risks

**Deploy tooling is unbuilt.** The whole midnight-js provider stack (indexer,
node, proof server, wallet) has to be wired before anything writes to a testnet.
Budget L2.1 generously and validate each provider independently.

**The batch operator is a trust surface, not a convenience.** It can censor and,
until 4.2 lands, it can pick a bad price. The design in 4.1 decides how much it
ever sees; get that right before building it.

**Custody (4.3) is the hard part.** Matching orders privately is done. Moving
value privately, conserving it across a batch, and keeping the replay guards
intact is a second project inside this one.

**Private state is the resting-order book.** There is no on-chain "my orders"
query by design. The local store's persistence and portability across devices is
a real product problem, not an afterthought.

**Proof generation in the browser is unproven here.** Circuit sizes are small
today but grow with 4.2 and 4.3. Measure proof time at every level, not just at
the end.

---

*Zylo runs on Midnight Preview / Preprod testnets and is unaudited. Status
reflects the repository as verified: `npm run compile` and `npm test` green, zero
transactions sent.*
