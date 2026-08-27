# Zylo

**XRP, working on Flare.** Bring XRP across as FXRP, put it to work, and take it back out — from any wallet, with the cross-chain proof step actually completed.

Built for Flare's *Interoperable Asset Products* bounty. Runs on **Coston2** (chain 114).

---

## The problem

Moving XRP onto Flare is a three-legged process, and most FAsset front-ends only implement two of them:

1. **Reserve** collateral from an agent and pay the reservation fee on Flare.
2. **Pay** the agent in XRP on the XRP Ledger, with a payment reference in the memo.
3. **Prove** that payment to Flare via the Data Connector, then call `executeMinting`.

Skip step 3 and nothing arrives. The reservation lapses, the agent keeps the fee, and the user is left watching a spinner. Because the minter is named as executor, no agent bot finishes the job on their behalf — the app has to.

Zylo implements all three, plus the return trip.

---

## What it does

| Surface | What happens |
|---|---|
| **Portfolio** `/dashboard` | Balances across your wallet and smart account, priced live off FTSOv2, with on-chain activity. |
| **Mint** `/fxrp` | Pick an agent from live on-chain availability, reserve collateral, pay via Xaman QR or deep link, then the app requests a `Payment` attestation from the FDC, waits for the voting round to finalise, and submits `executeMinting` with the Merkle proof. |
| **Redeem** `/redeem` | Burn FXRP and request XRP back to an XRPL address you control. |
| **Trade** `/pool` | A confidential orderbook. Orders are signed, sent straight to a Flare Confidential Compute enclave, and matched there in sealed batch auctions — never touching the mempool. Only custody and a Merkle commitment to balances reach the chain. See [DARKPOOL.md](./DARKPOOL.md). |
| **Earn** `/analytics` | Deposit FLR into an ERC-4626 vault that delegates to FTSO providers and compounds rewards into the yFLR share price. |
| **Send** `/send` | Move FXRP or FLR out of your account. |
| **Settings** `/settings` | Wallet, network, active addresses, every contract address in use, and faucet links. |

`/` serves a standalone poster landing page; the app lives behind it.

### Two ways to transact

Zylo works with **no API keys at all**. Connect MetaMask, Rabby, Coinbase Wallet or any injected wallet and it transacts straight from your EOA.

Set `NEXT_PUBLIC_ETHERSPOT_API_KEY` and it upgrades: an ERC-4337 smart account with a paymaster sponsors gas, so a new user can complete a mint holding zero FLR. Both paths go through one `useTxSender()` abstraction and return the same receipt shape, so nothing downstream cares which is active.

### Mint sessions survive a refresh

A reservation is only valid for a limited number of XRPL ledgers. Zylo persists the in-flight mint — reservation id, agent address, payment reference, expiry — keyed by account, shows a live countdown, and resumes at the right step after a reload. It invalidates across tabs via the `storage` event. Closing the tab mid-mint no longer costs the reservation fee.

---

## Flare infrastructure used

- **FAssets** — `reserveCollateral`, `executeMinting` and `redeem` against the FXRP AssetManager.
- **Flare Data Connector** — `Payment` attestations over XRPL transactions; proofs pulled from the DA layer and verified on-chain by the AssetManager.
- **FTSOv2** — live XRP/USD and FLR/USD feeds for portfolio and TVL pricing.
- **FTSO delegation** — the vault's yield source.
- **FlareContractRegistry** — `FdcHub`, `FdcRequestFeeConfigurations` and `FlareSystemsManager` are resolved on-chain rather than pinned in the bundle.
- **Confidential Compute** — the dark pool's matching engine, order book and balance ledger run inside an enclave; the escrow trusts only its signing key. See the status note below on what is and is not attested today.

---

## Layout

```
zylo/
├── flare/          Foundry contracts — ZyloVault (ERC-4626) + FTSOStakingModule
│                   + ZyloDarkPool (escrow, balance root, emergency exit)
├── tee/            Go enclave runtime for Flare Confidential Compute —
│                   sealed order book, batch auction, private ledger
└── zylofinance/    Next.js 16 app + Capacitor mobile shells
    ├── app/                landing poster at /
    ├── app/(app)/          dashboard · fxrp · redeem · pool · analytics · send · settings
    ├── app/api/            fdc/* · xaman/* · pool/* (proxy to the enclave)
    ├── app/src/            contracts · services · hooks · components · providers
    └── tests/              vitest unit tests
```

`tee/` is a separate binary by necessity: a Confidential Compute extension is a
Go HTTP server running inside a CVM, so it cannot live inside the Next.js app.

---

## Running it

```bash
cd zylofinance
cp .env.example .env.local
npm install
npm run dev
```

Then connect a wallet. Nothing in `.env.local` is required to browse, connect, or read on-chain state.

**Contract addresses** are all environment-overridable with working Coston2 defaults — see `.env.example`. Point `NEXT_PUBLIC_ZYLO_VAULT` and friends at your own deployment when you have one; Settings shows exactly what the app is using and flags anything unset.

**To complete a mint** you also need Xaman and FDC credentials:

| Variable | Needed for |
|---|---|
| `XUMM_API_KEY` / `XUMM_API_SECRET` | Xaman payment request (server-side) |
| `FDC_VERIFIER_URL` / `FDC_VERIFIER_API_KEY` | Attestation request (server-side) |
| `FDC_DA_LAYER_URL` | Merkle proof retrieval (server-side) |

Without them, reserve and pay still work but the final proof step cannot run.

### Commands

```bash
npm run dev         # dev server
npm run build       # production build
npm test            # vitest unit tests
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

Contracts:

```bash
cd flare
forge soldeer install
forge test
```

**To use the Trade tab** you need the escrow deployed and the enclave running:

```bash
# 1. deploy the escrow (TEE_SIGNER is the enclave's address)
cd flare
TEE_SIGNER=0x... forge script script/DeployZyloDarkPool.s.sol --rpc-url coston2 --broadcast

# 2. run the enclave
cd ../tee
SIMULATED_TEE=true ENCLAVE_PRIVATE_KEY=0x... DARKPOOL_ADDRESS=0x... go run .

# 3. point the app at both
#    NEXT_PUBLIC_DARK_POOL=0x...   ENCLAVE_URL=http://127.0.0.1:8088
```

The enclave signer needs its own C2FLR — it pays gas for `publishRoot` and
`withdraw`. Without `NEXT_PUBLIC_DARK_POOL` the Trade tab says so and stays
inert rather than erroring.

```bash
cd tee
go test ./...      # enclave: matching, ledger, fail-closed withdrawals
go run . 2>&1      # start the runtime
```

Mobile shells: see [HOW_TO_RUN_MOBILE.md](./zylofinance/HOW_TO_RUN_MOBILE.md).

---

## Tests

58 unit tests covering the logic that would silently corrupt a mint if it broke:

- **Mint sessions** — persistence, per-account keying, in-place updates, history cap, active-session selection, corrupt-storage recovery, snapshot reference stability for `useSyncExternalStore`, cross-tab invalidation.
- **Expiry** — countdown maths, lapsed-reservation detection, unbounded deadlines, formatting.
- **Call encoding** — every contract call decoded back and asserted, including that value rides on `depositFLR` and `reserveCollateral` and not elsewhere.
- **Event parsing** — `CollateralReserved` decoded from synthetic logs, nested receipt shapes, foreign-contract logs skipped, readable failures.
- **Error surfacing** — paymaster and AA codes translated to something a user can act on.
- **Trail geometry** — the landing page's blob renderer.

- **Market ids** — pinned against the enclave's Go derivation, because a mismatch would silently reject every order as an unknown market rather than failing loudly.

Plus **30 Foundry tests** (6 on `ZyloVault`, 19 on `ZyloDarkPool` custody and its
adversarial cases, 5 cross-language conformance) and **17 Go tests** on the
enclave — batch clearing, value conservation, collateral double-spend, replayed
deposits, fail-closed withdrawals.

### Cross-language conformance

The enclave and the escrow independently implement the same leaf encoding and
EIP-712 hashing, in two languages; the frontend derives market ids in a third.
A divergence in the first pair would only surface when a user tried to exit an
enclave that had gone dark — the worst possible moment — so agreement is
asserted rather than assumed:

```bash
cd tee && go test -run CrossCheck ./...        # emits the vector
cd ../flare && forge test --match-contract CrossCheck
cd ../zylofinance && npm test -- markets
```

---

## Honest status

- Coston2 testnet only. Nothing is deployed to Flare mainnet.
- **Not audited.** Do not put real value in it.
- **The dark pool is not running on Confidential Compute hardware yet.** It runs
  today with `SIMULATED_TEE=true`, which generates or loads an ordinary key on
  an ordinary machine. The architecture is built for FCC — a Go HTTP server with
  persistent in-enclave state and outbound network access — and the escrow's
  trust model is written around an enclave key it cannot forge. But there is **no
  CVM and no remote attestation in the current deployment**, so the privacy
  guarantee presently rests on trusting whoever runs the process, not on
  hardware. Moving to a real CVM and having governance register the signer only
  against a verified attestation quote is the remaining step, and it is the
  difference between "confidential by design" and "confidential in fact".
- The enclave is driven by directly signed EIP-712 intents rather than through
  `TeeExtensionRegistry`'s on-chain instruction model. That is a deliberate
  trade — it keeps order placement off-chain, which is the point — but it means
  this is not a drop-in FCC extension.
- The operator can censor an order. Users cannot force inclusion; they can only
  exit against the last published balance root. That is the honest weak point of
  the design.
- The FDC attestation path — verifier payload shapes, voting-round bracketing, the `IPayment.Proof` tuple — is ported from `script/fassets/FAssetsExecuteMinting.s.sol` but **has not yet been run end to end against a live round.** That is the highest-risk area and the next thing to validate.
- Redemption is likewise implemented but unexercised on-chain.
- Mint sessions are per-device. Clearing site data mid-mint loses the resume state, though the reservation still exists on-chain.
- Yield is reported as realised rewards and share price. There is deliberately no projected APY, because the contract cannot yet back one up with history.
- The landing poster ships with its two display faces unembedded and falls back to Arial/Times.

## Beyond the hackathon

1. Run one real mint on Coston2 end to end — it validates the verifier, the DA layer, round bracketing and the proof ABI in a single pass.
2. Deploy the enclave to a real Confidential Compute CVM and gate `rotateTeeSigner` on a verified attestation quote. Until that lands, the dark pool's confidentiality is a design property rather than a hardware one.
3. Mainnet FXRP behind a feature flag, using the same registry-driven addressing.
4. A TEE-based executor so `executeMinting` completes even if the user closes the tab — the same enclave already holds a key and could be named as `executor` in `reserveCollateral`.
5. FXRP as vault collateral, so bridged XRP earns instead of sitting idle.
