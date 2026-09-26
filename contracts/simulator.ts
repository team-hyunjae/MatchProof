import { randomBytes } from "node:crypto";
import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
  type CircuitContext,
  type MerkleTreePath,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  ledger,
  pureCircuits,
  type Witnesses,
} from "./managed/contract/index.js";

export const hex = (value: Uint8Array) => Buffer.from(value).toString("hex");
export const tag = (value: string) =>
  Uint8Array.from(Buffer.from(value.padEnd(32, "\0")));
export const MERCHANTS = [
  {
    id: "campus-kitchen",
    name: "캠퍼스 키친",
    description: "학생회관 1층 · 한식",
    initials: "CK",
    key: tag("quietpass:campus-kitchen"),
  },
  {
    id: "green-table",
    name: "그린 테이블",
    description: "중앙도서관 옆 · 샐러드 & 덮밥",
    initials: "GT",
    key: tag("quietpass:green-table"),
  },
] as const;
export const koreanDay = (seconds: number) =>
  BigInt(Math.floor((seconds + 32400) / 86400));

export interface PrivateState {
  issuerSecret: Uint8Array;
  studentSecret: Uint8Array;
  path?: MerkleTreePath<Uint8Array>;
}

const witnesses: Witnesses<PrivateState> = {
  issuerSecret: ({ privateState }) => [privateState, privateState.issuerSecret],
  studentSecret: ({ privateState }) => [
    privateState,
    privateState.studentSecret,
  ],
  membershipPath: ({ privateState }) => {
    if (!privateState.path) throw new Error("MEMBERSHIP_MISSING");
    return [privateState, privateState.path];
  },
};

/** Executes the real compiled Compact contract. Does NOT generate or verify a ZK proof.
 * Never expose this simulator as a production validator or use it with real student data.
 */
export class QuietPassSimulator {
  readonly contract = new Contract<PrivateState>(witnesses);
  readonly issuerSecret = Uint8Array.from(randomBytes(32));
  readonly programId: Uint8Array;
  readonly address = sampleContractAddress();
  context: CircuitContext<PrivateState>;
  now: number;

  constructor(
    now = Math.floor(Date.now() / 1000),
    program = Uint8Array.from(randomBytes(32)),
  ) {
    this.programId = program;
    this.now = now;
    const empty: PrivateState = {
      issuerSecret: new Uint8Array(32),
      studentSecret: new Uint8Array(32),
    };
    const initial = this.contract.initialState(
      createConstructorContext(empty, "0".repeat(64)),
      program,
      pureCircuits.issuerCommitment(this.issuerSecret),
      MERCHANTS[0].key,
      MERCHANTS[1].key,
    );
    this.context = createCircuitContext(
      this.address,
      initial.currentZswapLocalState,
      initial.currentContractState,
      empty,
      undefined,
      undefined,
      now,
    );
  }

  get state() {
    return ledger(this.context.currentQueryContext.state);
  }
  get day() {
    return koreanDay(this.now);
  }

  commitment(secret: Uint8Array) {
    return pureCircuits.credentialCommitment(this.programId, secret);
  }
  nullifier(secret: Uint8Array, day = this.day) {
    return pureCircuits.dailyNullifier(this.programId, secret, day);
  }
  isIssued(secret: Uint8Array) {
    return this.state.registered.member(this.commitment(secret));
  }
  isSpent(secret: Uint8Array) {
    return this.state.spent.member(this.nullifier(secret));
  }

  private freshContext(privateState: PrivateState) {
    return createCircuitContext(
      this.address,
      this.context.currentZswapLocalState,
      this.context.currentQueryContext.state,
      privateState,
      undefined,
      undefined,
      this.now,
    );
  }

  issueCommitment(commitment: Uint8Array, issuerSecret = this.issuerSecret) {
    const context = this.freshContext({
      issuerSecret,
      studentSecret: new Uint8Array(32),
    });
    // Commit only on success. Failed assertions must never change public state.
    this.context = this.contract.impureCircuits.issue(
      context,
      commitment,
    ).context;
  }

  redeem(
    secret: Uint8Array,
    merchant: Uint8Array,
    day = this.day,
    overridePath?: MerkleTreePath<Uint8Array>,
  ) {
    const path =
      overridePath ??
      this.state.members.findPathForLeaf(this.commitment(secret));
    const context = this.freshContext({
      issuerSecret: new Uint8Array(32),
      studentSecret: secret,
      path,
    });
    const result = this.contract.impureCircuits.redeem(context, day, merchant);
    this.context = result.context;
    return hex(result.result);
  }

  advanceDay() {
    this.now += 86400;
  }
}
