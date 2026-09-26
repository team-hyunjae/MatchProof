import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import {
  Contract,
  pureCircuits,
  type Witnesses,
} from "../../contracts/managed/contract/index.js";
import type { MidnightProviders } from "@midnight-ntwrk/midnight-js-types";

export type ActorRole = "student" | "issuer";
export type Enrollment = {
  commitment: string;
  status: "pending" | "confirmed";
};
export type ActorState = {
  role: ActorRole;
  secret: Uint8Array;
  enrollments: Record<string, Enrollment>;
};
export const PRIVATE_ID = "quietpass-v1";
export type QuietContract = Contract<ActorState>;
export type Providers = MidnightProviders<
  "issue" | "redeem",
  typeof PRIVATE_ID,
  ActorState
>;
export const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
export function fromHex(value: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/i.test(value))
    throw new Error("32바이트(64자리 hex) 값을 입력해 주세요.");
  return Uint8Array.from(value.match(/../g)!, (x) => Number.parseInt(x, 16));
}
const tag = (text: string) => new TextEncoder().encode(text.padEnd(32, "\0"));
export const merchants = [
  {
    id: "campus-kitchen",
    name: "캠퍼스 키친",
    key: tag("quietpass:campus-kitchen"),
  },
  { id: "green-table", name: "그린 테이블", key: tag("quietpass:green-table") },
] as const;
export const koreanDay = (seconds = Date.now() / 1000) =>
  BigInt(Math.floor((seconds + 32400) / 86400));
export function createActor(role: ActorRole): ActorState {
  return {
    role,
    secret: crypto.getRandomValues(new Uint8Array(32)),
    enrollments: {},
  };
}
function requireRole(state: ActorState, role: ActorRole) {
  if (state.role !== role)
    throw new Error("이 기기의 역할로 실행할 수 없는 거래예요.");
  return state.secret;
}
export const witnesses: Witnesses<ActorState> = {
  issuerSecret: ({ privateState }) => [
    privateState,
    requireRole(privateState, "issuer"),
  ],
  studentSecret: ({ privateState }) => [
    privateState,
    requireRole(privateState, "student"),
  ],
  membershipPath: ({ privateState, ledger }) => {
    const secret = requireRole(privateState, "student");
    const commitment = pureCircuits.credentialCommitment(
      ledger.programId,
      secret,
    );
    const path = ledger.members.findPathForLeaf(commitment);
    if (!path)
      throw new Error(
        "MEMBERSHIP_MISSING: 학교에서 아직 발급하지 않은 패스예요.",
      );
    return [privateState, path];
  },
};
export const compiledContract = CompiledContract.make<QuietContract>(
  "QuietPass",
  Contract<ActorState>,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets("contracts/managed"),
);
