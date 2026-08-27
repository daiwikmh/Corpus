import {
  type CircuitContext,
  ChargedState,
  ContractState,
  CompactTypeBytes,
  CompactTypeField,
  CompactTypeVector,
  createCircuitContext,
  createConstructorContext,
  persistentHash,
  sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, type Ledger, ledger } from '../managed/darkpool/contract/index.js';

const COIN_PUBLIC_KEY = '0'.repeat(64);

export type DarkPoolPrivateState = { readonly orderSecret: Uint8Array };

export const witnesses = {
  orderSecret: (
    ctx: { privateState: DarkPoolPrivateState },
  ): [DarkPoolPrivateState, Uint8Array] => [ctx.privateState, ctx.privateState.orderSecret],
};

export function makeSecret(fill: number): Uint8Array {
  return new Uint8Array(32).fill(fill);
}

const V3_FIELD = new CompactTypeVector(3, CompactTypeField);
const V3_BYTES = new CompactTypeVector(3, new CompactTypeBytes(32));

function domainTag(text: string): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set(new TextEncoder().encode(text));
  return bytes;
}

export function orderCommitment(
  secret: Uint8Array,
  side: bigint,
  limitPrice: bigint,
  size: bigint,
): Uint8Array {
  const terms = persistentHash(V3_FIELD, [side, limitPrice, size]);
  return persistentHash(V3_BYTES, [domainTag('zylo:order:v1'), secret, terms]);
}

export class DarkPoolSimulator {
  private readonly contract: Contract<DarkPoolPrivateState>;
  private contractState: ContractState;
  private privateState: DarkPoolPrivateState;
  readonly address = sampleContractAddress();

  private constructor(contractState: ContractState, privateState: DarkPoolPrivateState) {
    this.contract = new Contract<DarkPoolPrivateState>(witnesses);
    this.contractState = contractState;
    this.privateState = privateState;
  }

  static async deploy(secret: Uint8Array): Promise<DarkPoolSimulator> {
    const contract = new Contract<DarkPoolPrivateState>(witnesses);
    const privateState: DarkPoolPrivateState = { orderSecret: secret };
    const { currentContractState, currentPrivateState } = await contract.initialState(
      createConstructorContext(privateState, COIN_PUBLIC_KEY),
    );
    return new DarkPoolSimulator(currentContractState, currentPrivateState);
  }

  useSecret(secret: Uint8Array): void {
    this.privateState = { orderSecret: secret };
  }

  ledger(): Ledger {
    return ledger(this.contractState.data);
  }

  rawLedgerState(): string {
    return this.contractState.data.toString();
  }

  private context(circuitId: string): CircuitContext<DarkPoolPrivateState> {
    return createCircuitContext(
      circuitId,
      this.address,
      COIN_PUBLIC_KEY,
      this.contractState,
      this.privateState,
    );
  }

  private commit(context: CircuitContext<DarkPoolPrivateState>): void {
    this.privateState = context.callContext.currentPrivateState;
    const next = new ContractState();
    next.data = new ChargedState(context.callContext.currentQueryContext.state.state);
    this.contractState = next;
  }

  async placeOrder(side: bigint, limitPrice: bigint, size: bigint): Promise<void> {
    const { context } = await this.contract.impureCircuits.placeOrder(
      this.context('placeOrder'),
      side,
      limitPrice,
      size,
    );
    this.commit(context);
  }

  async settle(
    side: bigint,
    limitPrice: bigint,
    size: bigint,
    clearingPrice: bigint,
  ): Promise<void> {
    const { context } = await this.contract.impureCircuits.settle(
      this.context('settle'),
      side,
      limitPrice,
      size,
      clearingPrice,
    );
    this.commit(context);
  }

  async lastClearingPrice(): Promise<{ is_some: boolean; value: bigint }> {
    const { result, context } = await this.contract.impureCircuits.lastClearingPrice(
      this.context('lastClearingPrice'),
    );
    this.commit(context);
    return result;
  }
}

export const BUY = 0n;
export const SELL = 1n;
