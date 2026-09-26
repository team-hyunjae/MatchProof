import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  QuietPassSimulator,
  MERCHANTS,
  hex,
  koreanDay,
} from "../contracts/simulator.ts";

const secret = () => Uint8Array.from(randomBytes(32));
const now = Date.parse("2026-09-19T03:00:00Z") / 1000;
const setup = () => {
  const sim = new QuietPassSimulator(now);
  const alice = secret();
  sim.issueCommitment(sim.commitment(alice));
  return { sim, alice };
};

test("issued credential redeems and produces a public receipt without a student identifier", () => {
  const { sim, alice } = setup();
  const receipt = sim.redeem(alice, MERCHANTS[0].key);
  assert.equal(sim.state.issuedCount, 1n);
  assert.equal(sim.state.redeemedCount, 1n);
  assert.equal(receipt, hex(sim.nullifier(alice)));
  assert.notEqual(receipt, hex(alice));
  assert.notEqual(receipt, hex(sim.commitment(alice)));
  assert.deepEqual(
    sim.state.receipts.lookup(sim.nullifier(alice)),
    MERCHANTS[0].key,
  );
});

test("changing merchant cannot bypass the daily limit; rejection leaves the ledger unchanged", () => {
  const { sim, alice } = setup();
  sim.redeem(alice, MERCHANTS[0].key);
  assert.throws(() => sim.redeem(alice, MERCHANTS[1].key), /ALREADY_REDEEMED/);
  assert.equal(sim.state.spent.size(), 1n);
  assert.equal(sim.state.redeemedCount, 1n);
});

test("an unissued student cannot redeem", () => {
  const { sim } = setup();
  assert.throws(
    () => sim.redeem(secret(), MERCHANTS[0].key),
    /MEMBERSHIP_MISSING/,
  );
  assert.equal(sim.state.redeemedCount, 0n);
});

test("possession of somebody else’s public Merkle path is insufficient", () => {
  const { sim, alice } = setup();
  const path = sim.state.members.findPathForLeaf(sim.commitment(alice))!;
  assert.throws(
    () => sim.redeem(secret(), MERCHANTS[0].key, sim.day, path),
    /CREDENTIAL_MISMATCH/,
  );
});

test("a fabricated Merkle path is rejected by the contract", () => {
  const { sim, alice } = setup();
  const path = sim.state.members.findPathForLeaf(sim.commitment(alice))!;
  const forged = {
    ...path,
    path: path.path.map((entry, i) =>
      i === 0
        ? { ...entry, sibling: { field: entry.sibling.field + 1n } }
        : entry,
    ),
  };
  assert.throws(
    () => sim.redeem(alice, MERCHANTS[0].key, sim.day, forged),
    /MEMBERSHIP_INVALID/,
  );
});

test("issuer authorization is enforced inside Compact", () => {
  const sim = new QuietPassSimulator(now);
  assert.throws(
    () => sim.issueCommitment(sim.commitment(secret()), secret()),
    /ISSUER_UNAUTHORIZED/,
  );
  assert.equal(sim.state.issuedCount, 0n);
});

test("a credential cannot be issued twice", () => {
  const { sim, alice } = setup();
  assert.throws(
    () => sim.issueCommitment(sim.commitment(alice)),
    /CREDENTIAL_EXISTS/,
  );
  assert.equal(sim.state.issuedCount, 1n);
});

test("unregistered merchants cannot consume an allowance", () => {
  const { sim, alice } = setup();
  assert.throws(() => sim.redeem(alice, secret()), /MERCHANT_UNKNOWN/);
  assert.equal(sim.state.redeemedCount, 0n);
});

test("a caller cannot claim yesterday or tomorrow to obtain an extra meal", () => {
  const { sim, alice } = setup();
  assert.throws(
    () => sim.redeem(alice, MERCHANTS[0].key, sim.day - 1n),
    /DAY_EXPIRED/,
  );
  assert.throws(
    () => sim.redeem(alice, MERCHANTS[0].key, sim.day + 1n),
    /DAY_NOT_STARTED/,
  );
  assert.equal(sim.state.redeemedCount, 0n);
});

test("the next Korean day permits redemption with a different nullifier", () => {
  const { sim, alice } = setup();
  const first = sim.redeem(alice, MERCHANTS[0].key);
  sim.advanceDay();
  const second = sim.redeem(alice, MERCHANTS[1].key);
  assert.notEqual(first, second);
  assert.equal(sim.state.redeemedCount, 2n);
});

test("Korean midnight is the boundary, not UTC midnight", () => {
  const before = Date.parse("2026-09-19T14:59:59Z") / 1000;
  const after = Date.parse("2026-09-19T15:00:00Z") / 1000;
  assert.equal(koreanDay(after), koreanDay(before) + 1n);
  const sim = new QuietPassSimulator(before);
  const alice = secret();
  sim.issueCommitment(sim.commitment(alice));
  const first = sim.redeem(alice, MERCHANTS[0].key);
  sim.now = after;
  assert.notEqual(first, sim.redeem(alice, MERCHANTS[1].key));
});

test("student and programme secrets separate nullifiers", () => {
  const sim = new QuietPassSimulator(now);
  const other = new QuietPassSimulator(now);
  const alice = secret();
  assert.notEqual(hex(sim.nullifier(alice)), hex(other.nullifier(alice)));
  assert.notEqual(hex(sim.nullifier(alice)), hex(sim.nullifier(secret())));
});
