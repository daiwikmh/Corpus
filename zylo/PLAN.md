# Road to First Mint — Zylo build plan

**Everything hinges on one completed mint.**

The app is built, tested, and confirmed reading live Coston2 data. It has never written to the chain. This plan front-loads the riskiest write path, because a single successful mint either validates or breaks the four most uncertain pieces at once.

| Unit tests | Contract tests | Routes | Transactions sent |
|---|---|---|---|
| 49 passing | 6 passing | 8 + 4 API | **0, ever** |

---

## 00 — Confirmed working

Verified by driving a real browser against a production build, not by inspection. Everything below reads live from Coston2.

| Capability | Evidence |
|---|---|
| FTSOv2 price feeds | XRP $1.01, FLR $0.00601 rendered on the portfolio |
| FAssets agent discovery | 4 live agents — 506 / 950 / 150 / 98 free lots, 0.25% fee |
| Collateral fee quote | `collateralReservationFee` returned 1.676255 C2FLR |
| Vault reads | TVL, share price and rewards render on Earn |
| Lot size | Redeem shows 1 lot = 10.00 XRP |
| All six tabs | Portfolio · Mint · Redeem · Earn · Send · Settings |
| Landing | Wordmark, nav panels, CTA, 0 console errors |
| Wallet connect | Injected · MetaMask · Coinbase · read-only demo |

---

## 01 — Prove the write path

Strictly sequential. Each step is a prerequisite for the next, and each one retires a specific unknown. **Do not reorder to do the easy parts first.**

### 1.1 Fund a wallet on Coston2 — *start here*

Nothing else can run until an address holds C2FLR.

Connect MetaMask, let Zylo add the network, then use the faucet linked in Settings. You need roughly 5 C2FLR to cover a reservation fee plus gas.

- **Verify:** Portfolio shows a non-zero C2FLR balance.

### 1.2 Deposit into the vault — *pending*

The simplest possible write. Proves the whole transaction layer before any FAssets complexity is involved.

Exercises `useTxSender`'s wallet branch, `walletClient.sendTransaction`, and receipt normalisation from viem's shape into `UserOpReceipt`.

- **Files:** `hooks/useTxSender.ts`, `components/vault/VaultCard.tsx`
- **Verify:** yFLR balance appears; withdraw returns the FLR.
- **If it fails:** Receipt normalisation is the likely culprit — check the `status === 'success'` mapping.

### 1.3 Reserve collateral — *unverified ABI*

First FAssets write, and the first test of a hand-written event decoder.

The `CollateralReserved` ABI was written by hand from the Foundry example. If any field ordering is wrong, decoding throws and the mint dies before the XRP leg. Unit tests cover the decoder against synthetic logs, but never against a real one.

- **Files:** `contracts/abis.ts`, `utils/etherspot.ts`, `components/mint/ReserveStep.tsx`
- **Verify:** Pay step opens with an r-address, memo hex and a live countdown.
- **If it fails:** Compare the decoded struct against the raw log in the explorer, field by field.

### 1.4 Pay the agent in XRP — *needs keys*

Cross-chain leg. Requires Xaman credentials the repo does not have.

Set `XUMM_API_KEY` and `XUMM_API_SECRET`, get testnet XRP, then scan the QR. The manual-hash input is the fallback if Xaman misbehaves — pay from any XRPL wallet with the memo set to Hex, and paste the transaction hash.

- **Files:** `api/xaman/payload`, `api/xaman/status/[uuid]`, `components/mint/PayStep.tsx`
- **Verify:** Status polling flips the session to `paid` and stores the XRPL hash.
- **Watch:** Send the exact amount before the countdown expires or the fee is forfeit.

### 1.5 Complete the mint through the FDC — *highest risk*

The step every other FAsset front-end skips, and the one thing that makes this project worth submitting.

Four unknowns fire at once: the verifier's request and response shapes, the DA layer's endpoint contract, the voting-round bracketing, and the hand-built `IPayment.Proof` tuple. Any single mismatch reverts `executeMinting`.

- **Files:** `services/fdcService.ts`, `api/fdc/prepare`, `api/fdc/proof`, `contracts/abis.ts`
- **Env:** `FDC_VERIFIER_URL`, `FDC_VERIFIER_API_KEY`, `FDC_DA_LAYER_URL`
- **Verify:** FXRP lands in the account; session flips to `minted`.
- **De-risk first:** Hit the verifier and DA layer with curl before wiring the UI — isolates payload bugs from contract bugs.

### 1.6 Redeem back to XRP — *unverified signature*

Closes the round trip, which is the product's actual thesis.

`redeem` is encoded as payable with an executor argument, and `RedemptionRequested` is parsed best-effort. A signature mismatch reverts; an event mismatch degrades gracefully to a generic success screen.

- **Files:** `components/redeem/RedeemCard.tsx`, `utils/etherspot.ts`
- **Verify:** FXRP burns; XRP arrives at the destination on the XRPL.

---

## 02 — Harden what phase 1 breaks

Do not write this code speculatively. Wait for the real failures, then fix exactly those.

### 2.1 Correct the ABIs against reality

Fix whatever field ordering or signature the live calls disprove, then add a regression test with the real log bytes so it can never silently break again.

- **Verify:** New test in `tests/calls.test.ts` using captured real-shaped data.

### 2.2 Handle the FDC timeout honestly

Voting rounds take roughly 90 seconds and proofs land shortly after. If polling regularly outlives the tab, move proof retrieval behind a resumable job rather than a blocking loop.

- **Files:** `services/fdcService.ts`

### 2.3 Turn on sponsored gas — *optional*

Set `NEXT_PUBLIC_ETHERSPOT_API_KEY` and re-run the whole of phase 1 through the smart-account branch. Both paths share one interface, but only the wallet branch will have been exercised.

- **Verify:** A zero-balance account completes a mint end to end.

---

## 03 — Submission readiness

### 3.1 Deploy the vault and fill in the addresses — *deferred by choice*

Every address already resolves through env with a Coston2 default, and Settings flags anything unset. Deploy when ready and populate the vars — **no code changes required**.

- **Command:** `forge script script/DeployZylo.s.sol --broadcast`
- **Env:** `NEXT_PUBLIC_ZYLO_VAULT`, `NEXT_PUBLIC_ASSET_MANAGER`, `NEXT_PUBLIC_FXRP`

### 3.2 Embed the display faces — *cosmetic*

The landing ships with two commented `@font-face` blocks and falls back to Arial and Times. Paste the base64 payloads into the marked slots.

- **Files:** `components/landing/orbit.css.ts`

### 3.3 Record the demo — *required*

Lead with the proof step — that is the differentiator. Show the countdown, the FDC stages, and FXRP arriving. Open on the read-only demo so judges can click through without a wallet.

### 3.4 Update the README status section — *required*

It currently states plainly that the FDC leg is unexercised. The moment a real mint completes, that line must change — and it must stay accurate if it does not.

- **Files:** `README.md`

---

## 04 — Open risks

**The FDC path may need several correction rounds.** Four independent contracts are inferred from a Foundry script. Budget more than one attempt, and validate the verifier and DA layer with curl before blaming the contract call.

**Reservation fees are spent on every failed attempt.** 1.676 C2FLR per reservation, non-refundable once it lapses. Debug the FDC leg against an existing reservation rather than starting a fresh mint each time.

**Agent availability moves.** Free lots are read live and Coston2 agents get restocked irregularly. An empty agent list is a testnet condition, not a bug — the UI already says so.

**Mint sessions are per-device.** Stored in localStorage, invalidated across tabs. Clearing site data mid-mint loses the resume state, though the reservation still exists on-chain and the fee is still at stake.

**Mobile shells are untested.** The Capacitor iOS and Android projects are present but have not been built or run since the wallet migration. Treat mobile as unshipped.

---

## 05 — Environment reference

Nothing is required to browse, connect or read. Requirements begin at the write path.

| Variable | Needed for | Without it |
|---|---|---|
| `NEXT_PUBLIC_DEMO_ADDRESS` | Read-only demo entry | Button hidden |
| `NEXT_PUBLIC_ETHERSPOT_API_KEY` | Sponsored gas | Wallet pays its own gas |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect option | Connector hidden |
| `XUMM_API_KEY` / `XUMM_API_SECRET` | Xaman payment request | Manual XRPL payment only |
| `FDC_VERIFIER_URL` / `FDC_VERIFIER_API_KEY` | Payment attestation | **Mint cannot complete** |
| `FDC_DA_LAYER_URL` | Merkle proof retrieval | **Mint cannot complete** |
| `NEXT_PUBLIC_ZYLO_VAULT` et al. | Pointing at your deployment | Coston2 defaults used |

---

## Deferred: Flare Confidential Compute

Researched and scoped, **no code written**. An FCC extension is a Go HTTP server in a confidential VM, driven by on-chain instructions through `TeeExtensionRegistry`, with outbound network access and persistent in-enclave state. `SIMULATED_TEE=true` allows development without CVM hardware.

The natural fit for this codebase is a **TEE mint executor**: the extension holds its own key, gets named as `executor` in `reserveCollateral` — a first-class FAssets parameter that already pays an executor fee — and completes step 1.5 on the user's behalf. Because FCC has no scheduler, it would need staging into two instructions rather than running as a background watcher.

Treat this as a separate project. It does not block anything above.

---

*Zylo runs on Coston2 testnet and is unaudited. Status reflects the repository as verified in a live browser session against a production build.*
