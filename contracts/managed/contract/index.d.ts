import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  issuerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  studentSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  membershipPath(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { leaf: Uint8Array,
                                                                               path: { sibling: { field: bigint
                                                                                                },
                                                                                       goes_left: boolean
                                                                                     }[]
                                                                             }];
}

export type ImpureCircuits<PS> = {
  issue(context: __compactRuntime.CircuitContext<PS>, commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  redeem(context: __compactRuntime.CircuitContext<PS>,
         day_0: bigint,
         merchant_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type ProvableCircuits<PS> = {
  issue(context: __compactRuntime.CircuitContext<PS>, commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  redeem(context: __compactRuntime.CircuitContext<PS>,
         day_0: bigint,
         merchant_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type PureCircuits = {
  issuerCommitment(secret_0: Uint8Array): Uint8Array;
  credentialCommitment(program_0: Uint8Array, secret_0: Uint8Array): Uint8Array;
  dailyNullifier(program_0: Uint8Array, secret_0: Uint8Array, day_0: bigint): Uint8Array;
}

export type Circuits<PS> = {
  issuerCommitment(context: __compactRuntime.CircuitContext<PS>,
                   secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  credentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                       program_0: Uint8Array,
                       secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  dailyNullifier(context: __compactRuntime.CircuitContext<PS>,
                 program_0: Uint8Array,
                 secret_0: Uint8Array,
                 day_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  issue(context: __compactRuntime.CircuitContext<PS>, commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  redeem(context: __compactRuntime.CircuitContext<PS>,
         day_0: bigint,
         merchant_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly programId: Uint8Array;
  readonly issuerKeyHash: Uint8Array;
  members: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined
  };
  registered: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  merchants: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  spent: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  receipts: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  readonly issuedCount: bigint;
  readonly redeemedCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               program_0: Uint8Array,
               issuer_0: Uint8Array,
               merchantA_0: Uint8Array,
               merchantB_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
