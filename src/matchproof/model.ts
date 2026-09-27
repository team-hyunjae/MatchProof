import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import type { MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import {
  Contract,
  pureCircuits,
  type Credential,
  type Witnesses,
} from "../../contracts/matchproof-managed/contract/index.js";
import { hex, fromHex } from "./encoding.ts";
export { hex, fromHex, pureCircuits, type Credential };

export const PRIVATE_ID = "matchproof-v1";
export type Role = "issuer" | "applicant" | "agency";
export type Operation = "issue" | "openRequest" | "proveEligibility";
export type RequestPackage = {
  kind: "matchproof-request";
  version: 1;
  network: "undeployed";
  address: string;
  key: string;
  nonce: string;
  holder: string;
};
export type ActorState = {
  role: Role;
  secret: Uint8Array;
  evidence?: Credential;
  activeRequest?: RequestPackage;
  issued: Record<string, Credential>;
  reviews: Record<string, { label: string; request: RequestPackage }>;
};
export type MatchContract = Contract<ActorState>;
export type Providers = MidnightProviders<
  Operation,
  typeof PRIVATE_ID,
  ActorState
>;
export class MatchError extends Error {}
export const randomSecret = () => crypto.getRandomValues(new Uint8Array(32));
export function createActor(role: Role): ActorState {
  return { role, secret: randomSecret(), issued: {}, reviews: {} };
}
function requireRole(state: ActorState, role: Role) {
  if (state.role !== role)
    throw new MatchError("선택한 역할로 실행할 수 없는 작업이에요.");
  return state.secret;
}
export const witnesses: Witnesses<ActorState> = {
  issuerSecret: ({ privateState: s }) => [s, requireRole(s, "issuer")],
  agencySecret: ({ privateState: s }) => [s, requireRole(s, "agency")],
  holderSecret: ({ privateState: s }) => [s, requireRole(s, "applicant")],
  credential: ({ privateState: s }) => {
    if ((s.role !== "issuer" && s.role !== "applicant") || !s.evidence)
      throw new MatchError("자격증명을 먼저 준비해 주세요.");
    return [s, s.evidence];
  },
  requestNonce: ({ privateState: s }) => {
    requireRole(s, "applicant");
    if (!s.activeRequest)
      throw new MatchError("심사 요청 파일을 먼저 가져와 주세요.");
    return [s, fromHex(s.activeRequest.nonce)];
  },
  membershipPath: ({ privateState: s, ledger }) => {
    requireRole(s, "applicant");
    if (!s.evidence) throw new MatchError("자격증명을 먼저 가져와 주세요.");
    const leaf = pureCircuits.credentialCommitment(
      ledger.programId,
      s.evidence,
    );
    const path = ledger.credentials.findPathForLeaf(leaf);
    if (!path) throw new Error("CREDENTIAL_NOT_ISSUED");
    return [s, path];
  },
};
export const compiledContract = CompiledContract.make<MatchContract>(
  "MatchProof",
  Contract<ActorState>,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets("contracts/matchproof-managed"),
);

export type Fixture = "eligible" | "low-income" | "married" | "stale";
export function syntheticEvidence(
  holder: string,
  fixture: Fixture,
  now = Math.floor(Date.now() / 1000),
): Credential {
  if (!["eligible", "low-income", "married", "stale"].includes(fixture))
    throw new MatchError("가상 자료 종류를 확인해 주세요.");
  return {
    holder: fromHex(holder),
    salt: randomSecret(),
    annualIncomeKrw: fixture === "low-income" ? 30_000_000n : 65_000_000n,
    incomeYear: 2025n,
    notCurrentlyMarried: fixture !== "married",
    checkedAt: BigInt(now - (fixture === "stale" ? 8 : 1) * 86400),
    validUntil: BigInt(now + 86400),
  };
}

export function evidenceForIssue(
  previous: Credential | undefined,
  holder: string,
  fixture: Fixture,
  now = Math.floor(Date.now() / 1000),
) {
  // Keep an uncertain submission's commitment stable while it is useful.
  // Regenerate expired fixtures so a returning developer can issue fresh evidence.
  if (previous && previous.validUntil > BigInt(now + 1200)) return previous;
  return syntheticEvidence(holder, fixture, now);
}

// These transfer files contain synthetic PRIVATE data and must never be URL parameters.
// Files are parsed locally; no API upload, browser localStorage or analytics is used.
function parseObject(text: string) {
  if (text.length > 8192)
    throw new MatchError(
      "파일이 너무 커요. MatchProof 데모 파일만 선택해 주세요.",
    );
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new MatchError("올바른 MatchProof JSON 파일이 아니에요.");
  }
}
function bytes(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/i.test(value))
    throw new MatchError("파일의 등록값 형식이 잘못됐어요.");
  return fromHex(value);
}
function uint(value: unknown, bits: number) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,19})$/.test(value))
    throw new MatchError("파일의 숫자 형식이 잘못됐어요.");
  const n = BigInt(value);
  if (n >= 2n ** BigInt(bits))
    throw new MatchError("파일의 숫자가 허용 범위를 벗어났어요.");
  return n;
}
function scope(o: Record<string, unknown>, address: string, kind: string) {
  bytes(o.address);
  if (
    o.kind !== kind ||
    o.version !== 1 ||
    o.network !== "undeployed" ||
    o.address !== address
  )
    throw new MatchError(
      "현재 로컬 개발 네트워크·배포와 일치하는 파일이 아니에요.",
    );
}
export function exportCredential(address: string, c: Credential) {
  return JSON.stringify(
    {
      kind: "matchproof-credential",
      version: 1,
      network: "undeployed",
      address,
      evidence: {
        holder: hex(c.holder),
        salt: hex(c.salt),
        annualIncomeKrw: c.annualIncomeKrw.toString(),
        incomeYear: c.incomeYear.toString(),
        notCurrentlyMarried: c.notCurrentlyMarried,
        checkedAt: c.checkedAt.toString(),
        validUntil: c.validUntil.toString(),
      },
    },
    null,
    2,
  );
}
export function importCredential(text: string, address: string): Credential {
  const o = parseObject(text);
  scope(o, address, "matchproof-credential");
  const c = o.evidence as Record<string, unknown> | undefined;
  if (!c || typeof c !== "object" || typeof c.notCurrentlyMarried !== "boolean")
    throw new MatchError("자격증명 항목이 올바르지 않아요.");
  const result = {
    holder: bytes(c.holder),
    salt: bytes(c.salt),
    annualIncomeKrw: uint(c.annualIncomeKrw, 64),
    incomeYear: uint(c.incomeYear, 16),
    notCurrentlyMarried: c.notCurrentlyMarried,
    checkedAt: uint(c.checkedAt, 64),
    validUntil: uint(c.validUntil, 64),
  };
  if (result.validUntil <= result.checkedAt)
    throw new MatchError("자격증명 유효기간이 잘못됐어요.");
  return result;
}
export function importRequest(text: string, address: string): RequestPackage {
  const o = parseObject(text);
  scope(o, address, "matchproof-request");
  return {
    kind: "matchproof-request",
    version: 1,
    network: "undeployed",
    address,
    key: hex(bytes(o.key)),
    nonce: hex(bytes(o.nonce)),
    holder: hex(bytes(o.holder)),
  };
}
