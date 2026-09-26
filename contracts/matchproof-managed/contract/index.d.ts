import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Credential = { holder: Uint8Array;
                           salt: Uint8Array;
                           annualIncomeKrw: bigint;
                           incomeYear: bigint;
                           notCurrentlyMarried: boolean;
                           checkedAt: bigint;
                           validUntil: bigint
                         };

export type ReviewRequest = { requestedAt: bigint; expiresAt: bigint };

export type Witnesses<PS> = {
  issuerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  agencySecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  holderSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  credential(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Credential];
  membershipPath(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { leaf: Uint8Array,
                                                                               path: { sibling: { field: bigint
                                                                                                },
                                                                                       goes_left: boolean
                                                                                     }[]
                                                                             }];
  requestNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  issue(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  openRequest(context: __compactRuntime.CircuitContext<PS>,
              request_0: Uint8Array,
              requestedAt_0: bigint,
              expiresAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveEligibility(context: __compactRuntime.CircuitContext<PS>,
                   request_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  issue(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  openRequest(context: __compactRuntime.CircuitContext<PS>,
              request_0: Uint8Array,
              requestedAt_0: bigint,
              expiresAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveEligibility(context: __compactRuntime.CircuitContext<PS>,
                   request_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  issuerCommitment(secret_0: Uint8Array): Uint8Array;
  agencyCommitment(secret_0: Uint8Array): Uint8Array;
  holderCommitment(secret_0: Uint8Array): Uint8Array;
  credentialCommitment(program_0: Uint8Array, evidence_0: Credential): Uint8Array;
  requestCommitment(program_0: Uint8Array,
                    holder_0: Uint8Array,
                    nonce_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  issuerCommitment(context: __compactRuntime.CircuitContext<PS>,
                   secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  agencyCommitment(context: __compactRuntime.CircuitContext<PS>,
                   secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  holderCommitment(context: __compactRuntime.CircuitContext<PS>,
                   secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  credentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                       program_0: Uint8Array,
                       evidence_0: Credential): __compactRuntime.CircuitResults<PS, Uint8Array>;
  requestCommitment(context: __compactRuntime.CircuitContext<PS>,
                    program_0: Uint8Array,
                    holder_0: Uint8Array,
                    nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  issue(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  openRequest(context: __compactRuntime.CircuitContext<PS>,
              request_0: Uint8Array,
              requestedAt_0: bigint,
              expiresAt_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveEligibility(context: __compactRuntime.CircuitContext<PS>,
                   request_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly programId: Uint8Array;
  readonly issuerKeyHash: Uint8Array;
  readonly agencyKeyHash: Uint8Array;
  readonly minimumIncomeKrw: bigint;
  readonly requiredIncomeYear: bigint;
  readonly maxEvidenceAgeSeconds: bigint;
  credentials: {
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
  requests: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): ReviewRequest;
    [Symbol.iterator](): Iterator<[Uint8Array, ReviewRequest]>
  };
  approvals: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
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
               agency_0: Uint8Array,
               incomeFloor_0: bigint,
               incomeYear_0: bigint,
               maxEvidenceAge_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
