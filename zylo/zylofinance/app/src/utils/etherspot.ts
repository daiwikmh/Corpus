import { EtherspotBundler, PrimeSdk, Web3WalletProvider } from '@etherspot/prime-sdk';
import { encodeFunctionData, decodeEventLog } from 'viem';
import { ZYLO_VAULT_ABI, ASSET_MANAGER_ABI, ERC20_ABI, FDC_HUB_ABI } from '../contracts/abis';
import { CONTRACTS } from '../contracts/config';
import { CHAIN_ID, getPaymasterUrl, TIMEOUTS } from './constants';

type InjectedProvider = ConstructorParameters<typeof Web3WalletProvider>[0];

export async function initEtherspotSDK(provider: InjectedProvider) {
  const mappedProvider = new Web3WalletProvider(provider);
  await mappedProvider.refresh();

  return new PrimeSdk(mappedProvider, {
    chainId: CHAIN_ID,
    bundlerProvider: new EtherspotBundler(
      CHAIN_ID,
      process.env.NEXT_PUBLIC_ETHERSPOT_API_KEY || '',
    ),
  });
}

export interface Call {
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
}

interface RawLog {
  address?: string;
  data: `0x${string}`;
  topics: [`0x${string}`, ...`0x${string}`[]];
}

export interface UserOpReceipt {
  success: boolean;
  reason?: string;
  logs?: RawLog[];
  receipt?: { logs?: RawLog[] };
}

/** IPayment.Proof — the decoded Response struct plus its Merkle branch. */
export interface PaymentProof {
  merkleProof: readonly `0x${string}`[];
  data: unknown;
}

/**
 * Queues a batch of calls as one sponsored UserOperation. Every write in the app
 * funnels through here so paymaster config stays in a single place.
 */
export async function sendBatch(primeSdk: PrimeSdk, calls: Call[]): Promise<string> {
  await primeSdk.clearUserOpsFromBatch();

  for (const call of calls) {
    await primeSdk.addUserOpsToBatch({
      to: call.to,
      data: call.data,
      value: call.value,
    });
  }

  const userOp = await primeSdk.estimate({
    paymasterDetails: {
      url: getPaymasterUrl(),
      context: { mode: 'sponsor', calculateGasLimits: true },
    },
  });

  return primeSdk.send(userOp);
}

export async function waitForUserOpReceipt(
  primeSdk: PrimeSdk,
  userOpHash: string,
): Promise<UserOpReceipt> {
  const deadline = Date.now() + TIMEOUTS.USER_OP_RECEIPT;
  let receipt: UserOpReceipt | null = null;

  while (receipt === null && Date.now() < deadline) {
    receipt = await primeSdk.getUserOpReceipt(userOpHash);
    if (!receipt) await new Promise((r) => setTimeout(r, TIMEOUTS.POLLING_INTERVAL));
  }

  if (!receipt) {
    throw new Error('Transaction timed out. Check the hash on the explorer before retrying.');
  }

  return receipt;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
}

/** Turns Etherspot / paymaster failure codes into something a user can act on. */
export function humaniseTxError(error: unknown): string {
  const message = errorMessage(error) || 'Transaction failed';

  if (message.includes('AA21') || message.includes('paymaster balance')) {
    return 'Gas sponsorship is unavailable right now — the Zylo paymaster needs topping up.';
  }
  if (message.includes('AA10')) {
    return 'Your smart account could not be deployed. Try reconnecting.';
  }
  if (message.includes('AA31') || message.includes('prefund')) {
    return 'Your smart account is short on funds for this transaction.';
  }
  if (message.includes('execution reverted')) {
    return 'The network rejected this transaction. Agent availability may have changed — try again.';
  }
  return message;
}

export const depositCall = (flrAmount: bigint): Call => ({
  to: CONTRACTS.ZYLO_VAULT,
  data: encodeFunctionData({ abi: ZYLO_VAULT_ABI, functionName: 'depositFLR' }),
  value: flrAmount,
});

export const withdrawCall = (shares: bigint): Call => ({
  to: CONTRACTS.ZYLO_VAULT,
  data: encodeFunctionData({ abi: ZYLO_VAULT_ABI, functionName: 'withdrawFLR', args: [shares] }),
});

export const transferCall = (
  token: `0x${string}`,
  to: `0x${string}`,
  amount: bigint,
): Call => ({
  to: token,
  data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'transfer', args: [to, amount] }),
});

export const approveCall = (
  token: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
): Call => ({
  to: token,
  data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [spender, amount] }),
});

export const reserveCollateralCall = (
  agent: `0x${string}`,
  lots: bigint,
  maxMintingFeeBIPS: bigint,
  executor: `0x${string}`,
  collateralReservationFee: bigint,
): Call => ({
  to: CONTRACTS.ASSET_MANAGER,
  data: encodeFunctionData({
    abi: ASSET_MANAGER_ABI,
    functionName: 'reserveCollateral',
    args: [agent, lots, maxMintingFeeBIPS, executor],
  }),
  value: collateralReservationFee,
});

export const requestAttestationCall = (
  fdcHub: `0x${string}`,
  abiEncodedRequest: `0x${string}`,
  fee: bigint,
): Call => ({
  to: fdcHub,
  data: encodeFunctionData({
    abi: FDC_HUB_ABI,
    functionName: 'requestAttestation',
    args: [abiEncodedRequest],
  }),
  value: fee,
});

export const executeMintingCall = (
  proof: PaymentProof,
  collateralReservationId: bigint,
): Call => ({
  to: CONTRACTS.ASSET_MANAGER,
  data: encodeFunctionData({
    abi: ASSET_MANAGER_ABI,
    functionName: 'executeMinting',
    args: [proof as never, collateralReservationId],
  }),
});

export const redeemCall = (
  lots: bigint,
  redeemerUnderlyingAddress: string,
  executor: `0x${string}`,
): Call => ({
  to: CONTRACTS.ASSET_MANAGER,
  data: encodeFunctionData({
    abi: ASSET_MANAGER_ABI,
    functionName: 'redeem',
    args: [lots, redeemerUnderlyingAddress, executor],
  }),
});

/** The XRPL memo wants the payment reference as bare uppercase hex. */
export function formatPaymentReferenceForMemo(paymentReference: string): string {
  const hex = paymentReference.startsWith('0x') ? paymentReference.slice(2) : paymentReference;
  return hex.replace(/0+$/, '').toUpperCase();
}

function logsFrom(receipt: UserOpReceipt): RawLog[] {
  return receipt?.logs || receipt?.receipt?.logs || [];
}

export interface CollateralReservation {
  agentVault: `0x${string}`;
  minter: `0x${string}`;
  collateralReservationId: bigint;
  valueUBA: bigint;
  feeUBA: bigint;
  lastUnderlyingBlock: bigint;
  lastUnderlyingTimestamp: bigint;
  paymentAddress: string;
  paymentReference: string;
}

export function parseCollateralReservedEvent(receipt: UserOpReceipt): CollateralReservation {
  const logs = logsFrom(receipt);
  if (!logs.length) throw new Error('No logs found in transaction receipt');

  for (const log of logs) {
    if (log.address?.toLowerCase() !== CONTRACTS.ASSET_MANAGER.toLowerCase()) continue;

    try {
      const decoded = decodeEventLog({
        abi: ASSET_MANAGER_ABI,
        data: log.data,
        topics: log.topics,
        eventName: 'CollateralReserved',
      });

      const args = decoded.args;
      return {
        agentVault: args.agentVault,
        minter: args.minter,
        collateralReservationId: BigInt(args.collateralReservationId),
        valueUBA: BigInt(args.valueUBA),
        feeUBA: BigInt(args.feeUBA),
        lastUnderlyingBlock: BigInt(args.lastUnderlyingBlock),
        lastUnderlyingTimestamp: BigInt(args.lastUnderlyingTimestamp),
        paymentAddress: args.paymentAddress,
        paymentReference: args.paymentReference,
      };
    } catch {
      // Not the event we're after — keep scanning the rest of the receipt.
    }
  }

  throw new Error('Could not find a CollateralReserved event in this transaction');
}

export interface RedemptionRequest {
  requestId: bigint;
  valueUBA: bigint;
  feeUBA: bigint;
  paymentAddress: string;
}

/** Best-effort: redemption still succeeds even if the event shape shifts. */
export function parseRedemptionRequestedEvent(receipt: UserOpReceipt): RedemptionRequest | null {
  for (const log of logsFrom(receipt)) {
    if (log.address?.toLowerCase() !== CONTRACTS.ASSET_MANAGER.toLowerCase()) continue;

    try {
      const decoded = decodeEventLog({
        abi: ASSET_MANAGER_ABI,
        data: log.data,
        topics: log.topics,
        eventName: 'RedemptionRequested',
      });

      const args = decoded.args;
      return {
        requestId: BigInt(args.requestId),
        valueUBA: BigInt(args.valueUBA),
        feeUBA: BigInt(args.feeUBA),
        paymentAddress: args.paymentAddress,
      };
    } catch {
      // Ignore and continue.
    }
  }

  return null;
}
