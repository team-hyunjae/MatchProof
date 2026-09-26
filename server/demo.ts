import { randomBytes } from "node:crypto";
import { QuietPassSimulator, MERCHANTS, hex } from "../contracts/simulator.ts";
import type {
  DemoState,
  PublicState,
  ProfileId,
  MerchantId,
  Receipt,
} from "../src/types.ts";

export class DemoError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const descriptions: Record<string, string> = {
  ALREADY_REDEEMED:
    "오늘의 식사 패스를 이미 사용했어요. 다른 식당에서도 하루 한 번만 사용할 수 있어요.",
  MEMBERSHIP_MISSING:
    "발급된 패스가 없어요. 학교에서 자격을 확인하고 패스를 발급해야 해요.",
  CREDENTIAL_EXISTS: "이미 발급된 패스예요.",
  MERCHANT_UNKNOWN: "등록된 가맹점에서만 사용할 수 있어요.",
  DAY_EXPIRED: "사용 날짜가 지났어요. 현재 날짜로 다시 시도해 주세요.",
  DAY_NOT_STARTED: "아직 사용 가능한 날짜가 아니에요.",
};

/** Fictional actors are intentionally colocated for local demos, NOT a privacy-preserving backend. */
export class DemoSession {
  readonly sim = new QuietPassSimulator();
  readonly actors = [
    {
      id: "student-a" as const,
      name: "김민지",
      studentNumber: "DEMO-001",
      eligible: true,
      secret: Uint8Array.from(randomBytes(32)),
    },
    {
      id: "student-b" as const,
      name: "이서준",
      studentNumber: "DEMO-002",
      eligible: true,
      secret: Uint8Array.from(randomBytes(32)),
    },
    {
      id: "visitor" as const,
      name: "미등록 방문자",
      studentNumber: "DEMO-003",
      eligible: false,
      secret: Uint8Array.from(randomBytes(32)),
    },
  ];
  readonly receipts: Receipt[] = [];
  readonly privateHistory = new Map<ProfileId, Receipt[]>();

  actor(id: unknown) {
    const actor = this.actors.find((a) => a.id === id);
    if (!actor)
      throw new DemoError("PROFILE_UNKNOWN", "시연할 사용자를 선택해 주세요.");
    return actor;
  }

  publicState(): PublicState {
    return {
      mode: "local-simulator",
      date: new Date(this.sim.now * 1000 + 32400000).toISOString().slice(0, 10),
      day: this.sim.day.toString(),
      programId: hex(this.sim.programId),
      root: this.sim.state.members.root().field.toString(16).padStart(64, "0"),
      issuedCount: Number(this.sim.state.issuedCount),
      redeemedCount: Number(this.sim.state.redeemedCount),
      todayCount: this.receipts.filter((r) => r.day === this.sim.day.toString())
        .length,
      merchants: MERCHANTS.map(({ key: _key, ...merchant }) => merchant),
      receipts: [...this.receipts].reverse(),
    };
  }

  state(): DemoState {
    return {
      ...this.publicState(),
      profiles: this.actors.map(({ secret, ...actor }) => ({
        ...actor,
        issued: this.sim.isIssued(secret),
        usedToday: this.sim.isSpent(secret),
      })),
    };
  }

  issue(profileId: unknown) {
    const actor = this.actor(profileId);
    if (!actor.eligible)
      throw new DemoError(
        "NOT_ELIGIBLE",
        "학교가 확인한 지원 대상이 아니어서 발급할 수 없어요.",
        403,
      );
    this.run(() => this.sim.issueCommitment(this.sim.commitment(actor.secret)));
    return { message: `${actor.name} 학생의 식사 패스를 발급했어요.` };
  }

  redeem(profileId: unknown, merchantId: unknown) {
    const actor = this.actor(profileId);
    const merchant = MERCHANTS.find((m) => m.id === merchantId);
    if (!merchant)
      throw new DemoError("MERCHANT_UNKNOWN", descriptions.MERCHANT_UNKNOWN);
    const nullifier = this.run(() =>
      this.sim.redeem(actor.secret, merchant.key),
    );
    const receipt: Receipt = {
      nullifier,
      merchantId: merchant.id as MerchantId,
      merchantName: merchant.name,
      day: this.sim.day.toString(),
      at: new Date(this.sim.now * 1000).toISOString(),
    };
    this.receipts.push(receipt);
    this.privateHistory.set(actor.id, [
      ...(this.privateHistory.get(actor.id) ?? []),
      receipt,
    ]);
    return { message: "식사 패스를 사용했어요. 맛있는 식사 하세요!", receipt };
  }

  private run<T>(fn: () => T): T {
    try {
      return fn();
    } catch (error) {
      const text = error instanceof Error ? error.message : "";
      const code = Object.keys(descriptions).find((code) =>
        text.includes(code),
      );
      if (code)
        throw new DemoError(
          code,
          descriptions[code],
          code === "ALREADY_REDEEMED" ? 409 : 400,
        );
      throw error;
    }
  }
}
