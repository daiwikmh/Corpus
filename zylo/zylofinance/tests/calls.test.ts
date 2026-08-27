import { describe, expect, it } from 'vitest';
import {
  decodeFunctionData,
  encodeEventTopics,
  encodeAbiParameters,
  parseEther,
  toEventSelector,
  toFunctionSelector,
} from 'viem';
import {
  depositCall,
  withdrawCall,
  transferCall,
  approveCall,
  reserveCollateralCall,
  requestAttestationCall,
  redeemCall,
  formatPaymentReferenceForMemo,
  parseCollateralReservedEvent,
  parseRedemptionRequestedEvent,
  humaniseTxError,
  errorMessage,
  type UserOpReceipt,
} from '../app/src/utils/etherspot';
import { ASSET_MANAGER_ABI, ZYLO_VAULT_ABI, ERC20_ABI } from '../app/src/contracts/abis';
import { CONTRACTS } from '../app/src/contracts/config';

const AGENT = '0x1111111111111111111111111111111111111111' as const;
const USER = '0x2222222222222222222222222222222222222222' as const;
const TOKEN = '0x3333333333333333333333333333333333333333' as const;

describe('call encoding', () => {
  it('encodes a native vault deposit with value attached', () => {
    const call = depositCall(parseEther('2.5'));
    expect(call.to).toBe(CONTRACTS.ZYLO_VAULT);
    expect(call.value).toBe(parseEther('2.5'));
    expect(decodeFunctionData({ abi: ZYLO_VAULT_ABI, data: call.data! }).functionName).toBe(
      'depositFLR',
    );
  });

  it('encodes a withdrawal carrying no value', () => {
    const call = withdrawCall(parseEther('1'));
    const decoded = decodeFunctionData({ abi: ZYLO_VAULT_ABI, data: call.data! });
    expect(decoded.functionName).toBe('withdrawFLR');
    expect(decoded.args?.[0]).toBe(parseEther('1'));
    expect(call.value).toBeUndefined();
  });

  it('targets the token contract for transfers, not the recipient', () => {
    const call = transferCall(TOKEN, USER, 5_000_000n);
    expect(call.to).toBe(TOKEN);

    const decoded = decodeFunctionData({ abi: ERC20_ABI, data: call.data! });
    expect(decoded.functionName).toBe('transfer');
    expect(decoded.args).toEqual([USER, 5_000_000n]);
  });

  it('encodes approvals', () => {
    const decoded = decodeFunctionData({
      abi: ERC20_ABI,
      data: approveCall(TOKEN, CONTRACTS.ASSET_MANAGER, 1n).data!,
    });
    expect(decoded.functionName).toBe('approve');
    expect(decoded.args).toEqual([CONTRACTS.ASSET_MANAGER, 1n]);
  });

  it('sends the collateral reservation fee as msg.value', () => {
    const fee = parseEther('0.31');
    const call = reserveCollateralCall(AGENT, 3n, 250n, USER, fee);

    expect(call.to).toBe(CONTRACTS.ASSET_MANAGER);
    expect(call.value).toBe(fee);

    const decoded = decodeFunctionData({ abi: ASSET_MANAGER_ABI, data: call.data! });
    expect(decoded.functionName).toBe('reserveCollateral');
    expect(decoded.args).toEqual([AGENT, 3n, 250n, USER]);
  });

  it('pays the FDC request fee when asking for an attestation', () => {
    const call = requestAttestationCall(AGENT, '0xdeadbeef', 7n);
    expect(call.to).toBe(AGENT);
    expect(call.value).toBe(7n);
  });

  it('passes the XRPL destination through redeem untouched', () => {
    const decoded = decodeFunctionData({
      abi: ASSET_MANAGER_ABI,
      data: redeemCall(2n, 'rDestinationAddress', USER).data!,
    });
    expect(decoded.functionName).toBe('redeem');
    expect(decoded.args).toEqual([2n, 'rDestinationAddress', USER]);
  });
});

describe('payment reference formatting', () => {
  it('strips the 0x prefix and trailing padding, and uppercases', () => {
    expect(formatPaymentReferenceForMemo('0x00ff2a0000')).toBe('00FF2A');
  });

  it('accepts input that already lacks a prefix', () => {
    expect(formatPaymentReferenceForMemo('abc000')).toBe('ABC');
  });

  it('leaves an unpadded reference intact', () => {
    expect(formatPaymentReferenceForMemo('0x1234')).toBe('1234');
  });
});

function collateralReservedLog(over: Partial<Record<string, unknown>> = {}) {
  const args = {
    agentVault: AGENT,
    minter: USER,
    collateralReservationId: 77n,
    valueUBA: 10_000_000n,
    feeUBA: 40_000n,
    firstUnderlyingBlock: 1n,
    lastUnderlyingBlock: 500n,
    lastUnderlyingTimestamp: 1_800_000_000n,
    paymentAddress: 'rAgentAddress',
    paymentReference: `0x${'ab'.repeat(32)}`,
    executor: USER,
    executorFeeNatWei: 0n,
    ...over,
  };

  const topics = encodeEventTopics({
    abi: ASSET_MANAGER_ABI,
    eventName: 'CollateralReserved',
    args: {
      agentVault: args.agentVault as `0x${string}`,
      minter: args.minter as `0x${string}`,
      collateralReservationId: args.collateralReservationId as bigint,
    },
  });

  const data = encodeAbiParameters(
    [
      { name: 'valueUBA', type: 'uint256' },
      { name: 'feeUBA', type: 'uint256' },
      { name: 'firstUnderlyingBlock', type: 'uint256' },
      { name: 'lastUnderlyingBlock', type: 'uint256' },
      { name: 'lastUnderlyingTimestamp', type: 'uint256' },
      { name: 'paymentAddress', type: 'string' },
      { name: 'paymentReference', type: 'bytes32' },
      { name: 'executor', type: 'address' },
      { name: 'executorFeeNatWei', type: 'uint256' },
    ],
    [
      args.valueUBA as bigint,
      args.feeUBA as bigint,
      args.firstUnderlyingBlock as bigint,
      args.lastUnderlyingBlock as bigint,
      args.lastUnderlyingTimestamp as bigint,
      args.paymentAddress as string,
      args.paymentReference as `0x${string}`,
      args.executor as `0x${string}`,
      args.executorFeeNatWei as bigint,
    ],
  );

  return { address: CONTRACTS.ASSET_MANAGER, topics, data };
}

describe('CollateralReserved parsing', () => {
  it('extracts the fields the mint flow depends on', () => {
    const receipt = { success: true, logs: [collateralReservedLog()] } as UserOpReceipt;
    const event = parseCollateralReservedEvent(receipt);

    expect(event.collateralReservationId).toBe(77n);
    expect(event.paymentAddress).toBe('rAgentAddress');
    expect(event.valueUBA + event.feeUBA).toBe(10_040_000n);
    expect(event.lastUnderlyingTimestamp).toBe(1_800_000_000n);
  });

  it('finds the event when the receipt nests logs under receipt.logs', () => {
    const receipt = {
      success: true,
      receipt: { logs: [collateralReservedLog()] },
    } as UserOpReceipt;
    expect(parseCollateralReservedEvent(receipt).collateralReservationId).toBe(77n);
  });

  it('skips logs emitted by other contracts', () => {
    const unrelated = { ...collateralReservedLog(), address: TOKEN };
    const receipt = {
      success: true,
      logs: [unrelated, collateralReservedLog()],
    } as UserOpReceipt;
    expect(parseCollateralReservedEvent(receipt).collateralReservationId).toBe(77n);
  });

  it('throws a readable error when the receipt has no logs', () => {
    expect(() => parseCollateralReservedEvent({ success: true, logs: [] })).toThrow(/No logs/);
  });

  it('throws when the AssetManager emitted something else entirely', () => {
    const receipt = {
      success: true,
      logs: [{ ...collateralReservedLog(), topics: ['0x00'] as never }],
    } as UserOpReceipt;
    expect(() => parseCollateralReservedEvent(receipt)).toThrow(/CollateralReserved/);
  });
});

describe('RedemptionRequested parsing', () => {
  it('returns null rather than throwing when the event is absent', () => {
    expect(parseRedemptionRequestedEvent({ success: true, logs: [] })).toBeNull();
  });
});

describe('error surfacing', () => {
  it('reads messages out of unknown throwables', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain string')).toBe('plain string');
    expect(errorMessage({ weird: true })).toBe('');
  });

  it('translates paymaster and account-abstraction codes', () => {
    expect(humaniseTxError(new Error('AA21 didnt pay prefund'))).toMatch(/sponsorship/i);
    expect(humaniseTxError(new Error('AA10 sender already constructed'))).toMatch(/smart account/i);
    expect(humaniseTxError(new Error('execution reverted'))).toMatch(/rejected/i);
  });

  it('passes unrecognised messages through unchanged', () => {
    expect(humaniseTxError(new Error('something specific'))).toBe('something specific');
  });

  it('falls back when there is no message at all', () => {
    expect(humaniseTxError(undefined)).toBe('Transaction failed');
  });
});

/**
 * Ground truth taken verbatim from flare-periphery 0.1.37 (src/coston2):
 * IAssetManagerEvents.sol, IAssetManager.sol, IPayment.sol and data/AgentInfo.sol.
 *
 * These pin the ABI against the canonical Solidity rather than against itself.
 * Encoding a synthetic log with the same ABI that decodes it round-trips even
 * when both are wrong, which is how a uint64 collateralReservationId survived
 * a green suite while being unable to match a single real topic0.
 */
describe('ABI conformance with flare-periphery', () => {
  const CANONICAL_COLLATERAL_RESERVED =
    'CollateralReserved(address,address,uint256,uint256,uint256,uint256,uint256,uint256,string,bytes32,address,uint256)';
  const CANONICAL_REDEMPTION_REQUESTED =
    'RedemptionRequested(address,address,uint256,string,uint256,uint256,uint256,uint256,uint256,bytes32,address,uint256)';

  it('derives the real CollateralReserved topic0', () => {
    expect(
      encodeEventTopics({ abi: ASSET_MANAGER_ABI, eventName: 'CollateralReserved' })[0],
    ).toBe(toEventSelector(CANONICAL_COLLATERAL_RESERVED));
  });

  it('derives the real RedemptionRequested topic0', () => {
    expect(
      encodeEventTopics({ abi: ASSET_MANAGER_ABI, eventName: 'RedemptionRequested' })[0],
    ).toBe(toEventSelector(CANONICAL_REDEMPTION_REQUESTED));
  });

  it('matches IAssetManager function signatures', () => {
    const selector = (name: string) =>
      toFunctionSelector(
        (ASSET_MANAGER_ABI.find((e) => e.type === 'function' && e.name === name) ?? {}) as never,
      );

    expect(selector('reserveCollateral')).toBe(
      toFunctionSelector('reserveCollateral(address,uint256,uint256,address)'),
    );
    expect(selector('redeem')).toBe(toFunctionSelector('redeem(uint256,string,address)'));
    expect(selector('collateralReservationFee')).toBe(
      toFunctionSelector('collateralReservationFee(uint256)'),
    );
    expect(selector('getAvailableAgentsDetailedList')).toBe(
      toFunctionSelector('getAvailableAgentsDetailedList(uint256,uint256)'),
    );
    expect(selector('getAgentInfo')).toBe(toFunctionSelector('getAgentInfo(address)'));
  });

  it('encodes executeMinting against the real IPayment.Proof tuple', () => {
    expect(
      toFunctionSelector(
        (ASSET_MANAGER_ABI.find(
          (e) => e.type === 'function' && e.name === 'executeMinting',
        ) ?? {}) as never,
      ),
    ).toBe(
      toFunctionSelector(
        'executeMinting((bytes32[],(bytes32,bytes32,uint64,uint64,(bytes32,uint256,uint256),(uint64,uint64,bytes32,bytes32,bytes32,bytes32,int256,int256,int256,int256,bytes32,bool,uint8))),uint256)',
      ),
    );
  });

  it('declares AgentInfo.Info in the order the struct is laid out', () => {
    const info = ASSET_MANAGER_ABI.find(
      (e) => e.type === 'function' && e.name === 'getAgentInfo',
    ) as { outputs: readonly [{ components: readonly { name: string; type: string }[] }] };

    const fields = info.outputs[0].components;
    expect(fields).toHaveLength(40);
    expect(fields.slice(0, 7).map((f) => `${f.type} ${f.name}`)).toEqual([
      'uint8 status',
      'address ownerManagementAddress',
      'address ownerWorkAddress',
      'address collateralPool',
      'address collateralPoolToken',
      'string underlyingAddressString',
      'bool publiclyAvailable',
    ]);
    expect(fields[fields.length - 1]).toEqual({
      name: 'redemptionPoolFeeShareBIPS',
      type: 'uint256',
    });
  });
});
