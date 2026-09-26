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
  type Credential,
  type Witnesses,
} from "./matchproof-managed/contract/index.js";

export const randomSecret = () => Uint8Array.from(randomBytes(32));
export { pureCircuits, type Credential };

type PrivateState =
  | { role: "observer" }
  | { role: "issuer"; secret: Uint8Array; evidence: Credential }
  | { role: "agency"; secret: Uint8Array }
  | {
      role: "applicant";
      secret: Uint8Array;
      evidence: Credential;
      nonce: Uint8Array;
      path?: MerkleTreePath<Uint8Array>;
    };

const witnesses: Witnesses<PrivateState> = {
  issuerSecret: ({ privateState: state }) => {
    if (state.role !== "issuer") throw new Error("ISSUER_ROLE_REQUIRED");
    return [state, state.secret];
  },
  agencySecret: ({ privateState: state }) => {
    if (state.role !== "agency") throw new Error("AGENCY_ROLE_REQUIRED");
    return [state, state.secret];
  },
  holderSecret: ({ privateState: state }) => {
    if (state.role !== "applicant") throw new Error("APPLICANT_ROLE_REQUIRED");
    return [state, state.secret];
  },
  credential: ({ privateState: state }) => {
    if (state.role !== "issuer" && state.role !== "applicant") {
      throw new Error("CREDENTIAL_ROLE_REQUIRED");
    }
    return [state, state.evidence];
  },
  membershipPath: ({ privateState: state }) => {
    if (state.role !== "applicant" || !state.path) {
      throw new Error("CREDENTIAL_PATH_MISSING");
    }
    return [state, state.path];
  },
  requestNonce: ({ privateState: state }) => {
    if (state.role !== "applicant") throw new Error("APPLICANT_ROLE_REQUIRED");
    return [state, state.nonce];
  },
};

export interface SyntheticRequest {
  key: Uint8Array;
  nonce: Uint8Array;
  requestedAt: bigint;
  expiresAt: bigint;
}

/** In-memory execution of compiled Compact circuits, using synthetic data ONLY.
 * This does not generate a ZK proof, submit transactions or isolate real users.
 * Session authentication and agency/account mapping are not implemented here.
 */
export class MatchProofSimulator {
  readonly contract = new Contract<PrivateState>(witnesses);
  readonly issuerSecret = randomSecret();
  readonly agencySecret = randomSecret();
  readonly programId = randomSecret();
  readonly address = sampleContractAddress();
  context: CircuitContext<PrivateState>;

  constructor(public now = Math.floor(Date.now() / 1000)) {
    const empty: PrivateState = { role: "observer" };
    const initial = this.contract.initialState(
      createConstructorContext(empty, "0".repeat(64)),
      this.programId,
      pureCircuits.issuerCommitment(this.issuerSecret),
      pureCircuits.agencyCommitment(this.agencySecret),
      50_000_000n, // An arbitrary demo policy, not a recommended admission rule.
      2025n,
      7n * 86400n,
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

  private freshContext(state: PrivateState) {
    return createCircuitContext(
      this.address,
      this.context.currentZswapLocalState,
      this.context.currentQueryContext.state,
      state,
      undefined,
      undefined,
      this.now,
    );
  }

  commitment(evidence: Credential) {
    return pureCircuits.credentialCommitment(this.programId, evidence);
  }

  issue(evidence: Credential, secret = this.issuerSecret) {
    const result = this.contract.impureCircuits.issue(
      this.freshContext({ role: "issuer", secret, evidence }),
    );
    this.context = result.context;
    return result.result;
  }

  requestFor(holder: Uint8Array): SyntheticRequest {
    const nonce = randomSecret();
    return {
      key: pureCircuits.requestCommitment(this.programId, holder, nonce),
      nonce,
      requestedAt: BigInt(this.now),
      expiresAt: BigInt(this.now + 600),
    };
  }

  openRequest(request: SyntheticRequest, secret = this.agencySecret) {
    this.context = this.contract.impureCircuits.openRequest(
      this.freshContext({ role: "agency", secret }),
      request.key,
      request.requestedAt,
      request.expiresAt,
    ).context;
  }

  prove(
    evidence: Credential,
    secret: Uint8Array,
    request: SyntheticRequest,
    overridePath?: MerkleTreePath<Uint8Array>,
  ) {
    const path =
      overridePath ??
      this.state.credentials.findPathForLeaf(this.commitment(evidence));
    this.context = this.contract.impureCircuits.proveEligibility(
      this.freshContext({
        role: "applicant",
        secret,
        evidence,
        path,
        nonce: request.nonce,
      }),
      request.key,
    ).context;
  }

  isApprovedNow(request: SyntheticRequest) {
    return (
      this.state.approvals.member(request.key) &&
      this.state.approvals.lookup(request.key) > BigInt(this.now)
    );
  }
}
