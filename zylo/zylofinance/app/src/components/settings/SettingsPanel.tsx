"use client";

import { useAccount, useChainId, useDisconnect, useSwitchChain } from 'wagmi';
import { useSmartAccount } from '../../providers/smart-account';
import { CONTRACTS, TOKENS } from '../../contracts/config';
import {
  CHAIN_ID,
  EXPLORER_URL,
  EXTERNAL_LINKS,
  NATIVE_SYMBOL,
  RPC_URL,
  explorerAddress,
} from '../../utils/constants';
import { Card, CardHead, Row, Button, Chip, Empty, Mono } from '../ui';

const ZERO = '0x0000000000000000000000000000000000000000';

const AddressRow = ({ label, address }: { label: string; address: string }) => {
  const unset = !address || address === ZERO;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-[13px] text-white/40">{label}</span>
      {unset ? (
        <Chip tone="warn">Not set</Chip>
      ) : (
        <a
          href={explorerAddress(address)}
          target="_blank"
          rel="noreferrer"
          className="text-right underline decoration-white/20 hover:decoration-white"
        >
          <Mono>
            {address.slice(0, 10)}…{address.slice(-8)}
          </Mono>
        </a>
      )}
    </div>
  );
};

export const SettingsPanel = () => {
  const { connector } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { address, eoaAddress, smartAccountAddress, mode, isConnected, wrongChain, error } =
    useSmartAccount();

  if (!isConnected) {
    return <Empty title="Not connected" body="Connect a wallet to see your account details." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHead
          title="Account"
          hint={
            mode === 'smart-account'
              ? 'Transactions run through an Etherspot smart account with sponsored gas.'
              : 'Transactions are sent straight from your wallet, which pays its own gas.'
          }
          aside={
            <Chip tone={mode === 'smart-account' ? 'good' : 'neutral'}>
              {mode === 'smart-account' ? 'Sponsored' : 'Wallet'}
            </Chip>
          }
        />
        <div className="px-5 py-3">
          <Row label="Wallet" value={connector?.name ?? '—'} />
          <AddressRow label="Signer" address={eoaAddress ?? ''} />
          {smartAccountAddress && (
            <AddressRow label="Smart account" address={smartAccountAddress} />
          )}
          <AddressRow label="Active address" address={address ?? ''} />
        </div>
        {error && (
          <p className="border-t border-white/10 px-5 py-3 text-[12px] leading-relaxed text-amber-300/80">
            {error} — falling back to sending from your wallet.
          </p>
        )}
        <div className="border-t border-white/10 p-5">
          <Button variant="ghost" onClick={() => disconnect()}>
            Disconnect
          </Button>
        </div>
      </Card>

      <Card>
        <CardHead
          title="Network"
          aside={
            wrongChain ? <Chip tone="bad">Wrong network</Chip> : <Chip tone="live">Connected</Chip>
          }
        />
        <div className="px-5 py-3">
          <Row label="Expected chain" value={`${CHAIN_ID}`} />
          <Row label="Wallet chain" value={`${chainId}`} />
          <Row label="Native token" value={NATIVE_SYMBOL} />
          <Row
            label="RPC"
            value={<Mono>{RPC_URL.replace('https://', '')}</Mono>}
          />
          <Row
            label="Explorer"
            value={
              <a
                href={EXPLORER_URL}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/20 hover:decoration-white"
              >
                open
              </a>
            }
          />
        </div>
        {wrongChain && (
          <div className="border-t border-white/10 p-5">
            <Button onClick={() => switchChain({ chainId: CHAIN_ID })} busy={switching}>
              Switch to chain {CHAIN_ID}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <CardHead
          title="Contracts"
          hint="Set these in .env.local to point Zylo at your own deployment."
        />
        <div className="px-5 py-3">
          <AddressRow label="Zylo vault" address={CONTRACTS.ZYLO_VAULT} />
          <AddressRow label="FAssets AssetManager" address={CONTRACTS.ASSET_MANAGER} />
          <AddressRow label="FXRP token" address={TOKENS.FXRP.address} />
          <AddressRow label="WNat" address={CONTRACTS.WNAT} />
          <AddressRow label="FTSOv2" address={CONTRACTS.FTSO_V2} />
          <AddressRow label="Contract registry" address={CONTRACTS.FLARE_CONTRACT_REGISTRY} />
        </div>
      </Card>

      <Card>
        <CardHead title="Testnet faucets" />
        <div className="flex flex-col gap-2 p-5">
          <a
            className="text-[13px] text-white/50 underline hover:text-white"
            href={EXTERNAL_LINKS.COSTON2_FAUCET}
            target="_blank"
            rel="noreferrer"
          >
            Get {NATIVE_SYMBOL} for gas
          </a>
          <a
            className="text-[13px] text-white/50 underline hover:text-white"
            href={EXTERNAL_LINKS.XRP_TESTNET_FAUCET}
            target="_blank"
            rel="noreferrer"
          >
            Get testnet XRP to mint against
          </a>
        </div>
      </Card>
    </div>
  );
};
