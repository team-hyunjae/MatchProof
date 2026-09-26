import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import {
  createActor,
  exportCredential,
  importCredential,
  importRequest,
  hex,
  pureCircuits,
  syntheticEvidence,
  evidenceForIssue,
  randomSecret,
  PRIVATE_ID,
  type ActorState,
  type RequestPackage,
} from "../src/matchproof/model.ts";
import { reviewStatus } from "../src/matchproof/client.ts";

const address = "a".repeat(64);
test("matchproof issuance: retries reuse useful evidence, but expired fixtures can be renewed", () => {
  const holder = "1".repeat(64);
  const previous = syntheticEvidence(holder, "eligible", 1_000_000);
  assert.equal(
    evidenceForIssue(previous, holder, "eligible", 1_000_100),
    previous,
  );
  const renewed = evidenceForIssue(previous, holder, "eligible", 1_090_000);
  assert(renewed.validUntil > previous.validUntil);
  assert.notDeepEqual(renewed.salt, previous.salt);
  assert.equal(renewed.annualIncomeKrw, previous.annualIncomeKrw);
});
test("matchproof transfer: credential file preserves private values without exporting a holder secret", () => {
  const applicant = createActor("applicant");
  const credential = syntheticEvidence(
    hex(pureCircuits.holderCommitment(applicant.secret)),
    "eligible",
  );
  const text = exportCredential(address, credential);
  assert.deepEqual(importCredential(text, address), credential);
  assert(!text.includes(hex(applicant.secret)));
  assert.throws(() => importCredential(text, "b".repeat(64)));
  const raw = JSON.parse(text);
  for (const network of ["mainnet", "preprod", "testnet"]) {
    assert.throws(() =>
      importCredential(JSON.stringify({ ...raw, network }), address),
    );
  }
});

test("matchproof transfer: malformed, oversized and out-of-range private data is rejected", () => {
  const raw = JSON.parse(
    exportCredential(address, syntheticEvidence("1".repeat(64), "eligible")),
  );
  for (const text of ["{", "null", "[]", "x".repeat(8193)])
    assert.throws(() => importCredential(text, address));
  for (const patch of [
    { annualIncomeKrw: "-1" },
    { annualIncomeKrw: "18446744073709551616" },
    { annualIncomeKrw: 65000000 },
    { annualIncomeKrw: "1e8" },
    { incomeYear: "65536" },
    { holder: "bad" },
    { salt: "bad" },
    { notCurrentlyMarried: "false" },
    { validUntil: "0" },
  ])
    assert.throws(() =>
      importCredential(
        JSON.stringify({ ...raw, evidence: { ...raw.evidence, ...patch } }),
        address,
      ),
    );
});

test("matchproof transfer: request files cannot select another network or deployment", () => {
  const value: RequestPackage = {
    kind: "matchproof-request",
    version: 1,
    network: "undeployed",
    address,
    key: hex(randomSecret()),
    holder: hex(randomSecret()),
    nonce: hex(randomSecret()),
  };
  assert.deepEqual(importRequest(JSON.stringify(value), address), value);
  for (const patch of [
    { address: "b".repeat(64) },
    { network: "mainnet" },
    { version: 2 },
    { nonce: "" },
    { kind: "matchproof-credential" },
  ]) {
    assert.throws(() =>
      importRequest(JSON.stringify({ ...value, ...patch }), address),
    );
  }
});

test("matchproof review: pending, approved and expired states never promote old approvals", () => {
  const request = {
    key: "a".repeat(64),
    requestedAt: 100,
    expiresAt: 700,
    confirmed: false,
  };
  assert.equal(reviewStatus(request, 500), "pending");
  assert.equal(reviewStatus({ ...request, confirmed: true }, 699), "approved");
  assert.equal(reviewStatus({ ...request, confirmed: true }, 700), "expired");
  assert.equal(reviewStatus(request, 700), "expired");
});

test("matchproof vault: credential numbers, request nonce and key survive encrypted reopening with role isolation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "matchproof-vault-"));
  const provider = (role = "applicant", password = "Demo-Only!Cedar7926") =>
    levelPrivateStateProvider<typeof PRIVATE_ID, ActorState>({
      midnightDbName: join(dir, "vault"),
      accountId: `undeployed:${role}:wallet-a`,
      privateStateStoreName: "actors",
      signingKeyStoreName: "signing",
      privateStoragePasswordProvider: () => password,
    });
  try {
    const state = createActor("applicant");
    state.evidence = syntheticEvidence(
      hex(pureCircuits.holderCommitment(state.secret)),
      "eligible",
    );
    state.activeRequest = {
      kind: "matchproof-request",
      version: 1,
      network: "undeployed",
      address,
      key: hex(randomSecret()),
      holder: hex(state.evidence.holder),
      nonce: hex(randomSecret()),
    };
    const initial = provider();
    initial.setContractAddress(address);
    await initial.set(PRIVATE_ID, state);
    const reopened = provider();
    reopened.setContractAddress(address);
    assert.deepEqual(await reopened.get(PRIVATE_ID), state);
    const encrypted = await reopened.exportPrivateStates();
    for (const value of [
      hex(state.secret),
      state.activeRequest.nonce,
      "annualIncomeKrw",
      "notCurrentlyMarried",
    ])
      assert(!encrypted.encryptedPayload.includes(value));
    for (const role of ["issuer", "agency"]) {
      const other = provider(role);
      other.setContractAddress(address);
      assert.equal(await other.get(PRIVATE_ID), null);
    }
    const wrong = provider("applicant", "Wrong-Only!Birch5826");
    wrong.setContractAddress(address);
    await assert.rejects(() => wrong.get(PRIVATE_ID));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
