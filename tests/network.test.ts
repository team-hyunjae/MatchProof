import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { assertLocalProver } from "../src/matchproof/network.ts";
import {
  createActor,
  PRIVATE_ID,
  type ActorState,
} from "../src/matchproof/model.ts";
import { StateValue as ContractStateValue } from "@midnight-ntwrk/compact-runtime";
import { StateValue as ProtocolStateValue } from "@midnight-ntwrk/midnight-js-protocol/onchain-runtime";
import { hasErrorCode } from "../src/matchproof/errors.ts";

test("witness rejection is recognized through SDK error wrappers without masking unrelated failures", () => {
  const inner = new Error("MEMBERSHIP_MISSING");
  const wrapped = new Error("Scoped transaction failed", {
    cause: new Error("Error executing circuit", { cause: inner }),
  });
  assert(hasErrorCode(wrapped, "MEMBERSHIP_MISSING"));
  assert(!hasErrorCode(wrapped, "REQUEST_ALREADY_APPROVED"));
  const cycle = new Error("Unrelated network error");
  cycle.cause = cycle;
  assert(!hasErrorCode(cycle, "MEMBERSHIP_MISSING"));
});

test("contract and network SDK share one WASM runtime instance", () => {
  assert.equal(
    ContractStateValue,
    ProtocolStateValue,
    "Duplicate runtime installations break real contract calls",
  );
});

test("private proving inputs can only be sent to a loopback proof server", () => {
  for (const url of [
    "http://127.0.0.1:6300",
    "http://localhost:6300",
    "http://[::1]:6300",
  ])
    assert.doesNotThrow(() => assertLocalProver(url));
  for (const url of [
    "https://proof.example.com",
    "http://localhost.evil.example",
    "http://127.0.0.1@evil.example",
    "file:///tmp/proof",
    "http://user:secret@localhost:6300",
  ])
    assert.throws(() => assertLocalProver(url));
});

test("encrypted actor state survives reopening and isolates network, wallet and contract", async () => {
  const dir = await mkdtemp(join(tmpdir(), "matchproof-network-vault-"));
  const password = "Test-Only!Cedar7926";
  const account = "undeployed:applicant:wallet-a";
  const address = "1".repeat(64);
  const provider = (accountId = account, pwd = password) =>
    levelPrivateStateProvider<typeof PRIVATE_ID, ActorState>({
      midnightDbName: join(dir, "vault"),
      accountId,
      privateStateStoreName: "actors",
      signingKeyStoreName: "signing",
      privateStoragePasswordProvider: () => pwd,
    });
  try {
    const initial = provider();
    initial.setContractAddress(address);
    const state = createActor("applicant");
    await initial.set(PRIVATE_ID, state);
    const reopened = provider();
    reopened.setContractAddress(address);
    assert.deepEqual(await reopened.get(PRIVATE_ID), state);
    const exported = await reopened.exportPrivateStates();
    assert(
      !exported.encryptedPayload.includes(Array.from(state.secret).join(",")),
    );
    const wrongPassword = provider(account, "Wrong-Only!Birch5826");
    wrongPassword.setContractAddress(address);
    await assert.rejects(() => wrongPassword.get(PRIVATE_ID));
    for (const scope of [
      "preprod:applicant:wallet-a",
      "undeployed:issuer:wallet-a",
      "undeployed:applicant:wallet-b",
    ]) {
      const other = provider(scope);
      other.setContractAddress(address);
      assert.equal(await other.get(PRIVATE_ID), null);
    }
    reopened.setContractAddress("2".repeat(64));
    assert.equal(await reopened.get(PRIVATE_ID), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
