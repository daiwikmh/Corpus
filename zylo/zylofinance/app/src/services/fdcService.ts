import { decodeAbiParameters } from 'viem';
import { publicClient, resolveContract } from '../contracts/client';
import { FDC_FEE_ABI, PAYMENT_RESPONSE_COMPONENTS } from '../contracts/abis';
import { requestAttestationCall, executeMintingCall } from '../utils/etherspot';
import type { TxSender } from '../hooks/useTxSender';
import { TIMEOUTS } from '../utils/constants';

export type MintStage =
  | 'preparing'
  | 'requesting'
  | 'awaiting-round'
  | 'executing'
  | 'done';

export const STAGE_COPY: Record<MintStage, string> = {
  preparing: 'Asking the FDC verifier to attest your XRPL payment',
  requesting: 'Submitting the attestation request on Flare',
  'awaiting-round': 'Waiting for the FDC voting round to finalise',
  executing: 'Minting your FXRP',
  done: 'FXRP minted',
};

interface CompleteMintingArgs {
  send: TxSender;
  /** 64-char XRPL transaction hash of the payment to the agent. */
  xrplTxHash: string;
  collateralReservationId: bigint;
  onStage?: (stage: MintStage) => void;
}

async function prepareRequest(xrplTxHash: string): Promise<`0x${string}`> {
  const response = await fetch('/api/fdc/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId: xrplTxHash.replace(/^0x/, '') }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      body.error ||
        'The verifier could not attest this payment. It may not be confirmed on the XRP Ledger yet.',
    );
  }

  return body.abiEncodedRequest as `0x${string}`;
}

async function fetchProof(votingRoundId: number, requestBytes: string) {
  const response = await fetch('/api/fdc/proof', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ votingRoundId, requestBytes }),
  });

  if (response.status === 404) return null;

  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Failed to fetch attestation proof');

  return body as { responseHex: `0x${string}`; proof: `0x${string}`[] };
}

async function currentVotingRound(): Promise<number> {
  const manager = await resolveContract('FlareSystemsManager');
  const round = (await publicClient().readContract({
    address: manager,
    abi: [
      {
        inputs: [],
        name: 'getCurrentVotingEpochId',
        outputs: [{ name: '', type: 'uint32' }],
        stateMutability: 'view',
        type: 'function',
      },
    ] as const,
    functionName: 'getCurrentVotingEpochId',
  })) as number;

  return Number(round);
}

/**
 * Finishes a FAsset mint: attest the XRPL payment through the FDC, wait for the
 * voting round to finalise, then call `executeMinting` with the Merkle proof.
 *
 * Collateral reservations name the minter as executor, so nobody else will do
 * this for the user — without this step the reserved collateral simply expires.
 */
export async function completeMinting({
  send,
  xrplTxHash,
  collateralReservationId,
  onStage,
}: CompleteMintingArgs): Promise<string> {
  onStage?.('preparing');
  const abiEncodedRequest = await prepareRequest(xrplTxHash);

  onStage?.('requesting');
  const [fdcHub, feeConfig] = await Promise.all([
    resolveContract('FdcHub'),
    resolveContract('FdcRequestFeeConfigurations'),
  ]);

  const fee = (await publicClient().readContract({
    address: feeConfig,
    abi: FDC_FEE_ABI,
    functionName: 'getRequestFee',
    args: [abiEncodedRequest],
  })) as bigint;

  // The request lands in whichever round is open when the tx is mined, so we
  // bracket it and poll every candidate round rather than guessing one.
  const roundBefore = await currentVotingRound();

  const requested = await send([requestAttestationCall(fdcHub, abiEncodedRequest, fee)]);

  if (!requested.receipt.success) {
    throw new Error('The attestation request was rejected on-chain');
  }

  const roundAfter = await currentVotingRound();
  const candidates: number[] = [];
  for (let round = roundBefore; round <= roundAfter + 1; round++) candidates.push(round);

  onStage?.('awaiting-round');
  const deadline = Date.now() + TIMEOUTS.FDC_ROUND;
  let resolved: { responseHex: `0x${string}`; proof: `0x${string}`[] } | null = null;

  while (!resolved && Date.now() < deadline) {
    for (const round of candidates) {
      resolved = await fetchProof(round, abiEncodedRequest);
      if (resolved) break;
    }
    if (!resolved) await new Promise((r) => setTimeout(r, TIMEOUTS.FDC_POLL_INTERVAL));
  }

  if (!resolved) {
    throw new Error(
      'The attestation round has not finalised yet. Your reservation is still valid — reopen this mint to retry.',
    );
  }

  const [data] = decodeAbiParameters(
    [{ type: 'tuple', components: PAYMENT_RESPONSE_COMPONENTS }] as const,
    resolved.responseHex,
  );

  onStage?.('executing');
  const minted = await send([
    executeMintingCall({ merkleProof: resolved.proof, data }, collateralReservationId),
  ]);

  if (!minted.receipt.success) {
    throw new Error('executeMinting reverted. The reservation may have expired.');
  }

  onStage?.('done');
  return minted.hash;
}
