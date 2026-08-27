import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  orderSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  placeOrder(context: __compactRuntime.CircuitContext<PS>,
             side_0: bigint,
             limitPrice_0: bigint,
             size_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settle(context: __compactRuntime.CircuitContext<PS>,
         side_0: bigint,
         limitPrice_0: bigint,
         size_0: bigint,
         clearingPrice_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  lastClearingPrice(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                                 value: bigint
                                                                                                               }>>;
}

export type ProvableCircuits<PS> = {
  placeOrder(context: __compactRuntime.CircuitContext<PS>,
             side_0: bigint,
             limitPrice_0: bigint,
             size_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settle(context: __compactRuntime.CircuitContext<PS>,
         side_0: bigint,
         limitPrice_0: bigint,
         size_0: bigint,
         clearingPrice_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  lastClearingPrice(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                                 value: bigint
                                                                                                               }>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  placeOrder(context: __compactRuntime.CircuitContext<PS>,
             side_0: bigint,
             limitPrice_0: bigint,
             size_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settle(context: __compactRuntime.CircuitContext<PS>,
         side_0: bigint,
         limitPrice_0: bigint,
         size_0: bigint,
         clearingPrice_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  lastClearingPrice(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, { is_some: boolean,
                                                                                                                 value: bigint
                                                                                                               }>>;
}

export type Ledger = {
  readonly orderCount: bigint;
  orderCommitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  settled: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly lastPrint: { is_some: boolean, value: bigint };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
