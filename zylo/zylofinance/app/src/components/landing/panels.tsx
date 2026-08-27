import type { ReactNode } from 'react';

export type PanelId = 'resources' | 'benefits' | 'contact';

interface PanelItem {
  title: string;
  body: string;
}

interface PanelLink {
  label: string;
  href: string;
}

export interface PanelContent {
  eyebrow: string;
  title: string;
  lede: string;
  items: PanelItem[];
  links?: PanelLink[];
  foot?: ReactNode;
}

export const PANELS: Record<PanelId, PanelContent> = {
  resources: {
    eyebrow: 'Resources',
    title: 'How it works',
    lede: 'Moving XRP onto Flare is three steps across two chains. Most interfaces stop after two, which is exactly where the money gets stuck.',
    items: [
      {
        title: '1 — Reserve collateral',
        body: 'An agent locks collateral against your lots and quotes an XRPL address plus a payment reference. You pay a reservation fee on Flare.',
      },
      {
        title: '2 — Pay on the XRP Ledger',
        body: 'Send the exact amount to the agent with the payment reference in the memo. Zylo builds the Xaman request for you and counts down the deadline.',
      },
      {
        title: '3 — Prove it back to Flare',
        body: 'The Flare Data Connector attests your XRPL payment. Zylo waits for the voting round, fetches the Merkle proof and calls executeMinting. Skip this and the reservation simply lapses.',
      },
      {
        title: 'Going back',
        body: 'Redemption burns FXRP on Flare and an agent pays XRP to an address you control. If they miss the window, FAssets pays you out of their collateral instead.',
      },
    ],
    links: [
      { label: 'FAssets docs', href: 'https://dev.flare.network/fassets/overview' },
      { label: 'Data Connector', href: 'https://dev.flare.network/fdc/overview' },
      { label: 'FTSOv2', href: 'https://dev.flare.network/ftso/overview' },
      { label: 'Coston2 faucet', href: 'https://faucet.flare.network/coston2' },
      { label: 'XRP testnet faucet', href: 'https://test.bithomp.com/faucet/' },
    ],
  },

  benefits: {
    eyebrow: 'Benefits',
    title: 'Why Zylo',
    lede: 'A round trip you can actually finish, from whatever wallet you already use.',
    items: [
      {
        title: 'The proof step is built in',
        body: 'Zylo requests the attestation, waits out the voting round and submits executeMinting. The mint completes instead of quietly expiring.',
      },
      {
        title: 'Any wallet, no keys required',
        body: 'MetaMask, Rabby, Coinbase Wallet or anything injected. No API keys needed to connect, read balances or transact.',
      },
      {
        title: 'Sponsored gas, optionally',
        body: 'Add an Etherspot key and transactions run through an ERC-4337 smart account with a paymaster, so a new user can mint holding zero FLR.',
      },
      {
        title: 'Priced by Flare itself',
        body: 'Portfolio and vault values come from live FTSOv2 feeds on-chain, not a third-party price API.',
      },
      {
        title: 'A refresh will not cost you',
        body: 'In-flight mints persist with a live expiry countdown and resume at the right step, so closing a tab never forfeits the reservation fee.',
      },
      {
        title: 'No invented numbers',
        body: 'Yield is reported as realised rewards and share price. There is no projected APY, because the contract cannot back one up yet.',
      },
    ],
  },

  contact: {
    eyebrow: 'Contact',
    title: 'Get in touch',
    lede: 'Built for Flare’s Interoperable Asset Products bounty. Running on Coston2.',
    items: [
      {
        title: 'Status',
        body: 'Testnet only and unaudited. The FAssets and FTSO paths are wired end to end; the Data Connector leg has not yet been exercised against a live voting round.',
      },
      {
        title: 'What is next',
        body: 'One real Coston2 mint to validate the attestation path, then mainnet FXRP behind a feature flag and a TEE-based executor so mints finish without the tab open.',
      },
    ],
    links: [
      { label: 'Flare Developer Hub', href: 'https://dev.flare.network/' },
      { label: 'Flare Network', href: 'https://flare.network/' },
    ],
    foot: 'Unaudited testnet software. Do not use it with funds you care about.',
  },
};
