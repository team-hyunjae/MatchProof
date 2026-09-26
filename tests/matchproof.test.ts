import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MatchProofSimulator,
  pureCircuits,
  randomSecret,
  type Credential,
} from "../contracts/matchproof-simulator.ts";

const now = Date.parse("2026-09-21T03:00:00Z") / 1000;
function setup(overrides: Partial<Credential> = {}) {
  const sim = new MatchProofSimulator(now);
  const secret = randomSecret();
  const evidence: Credential = {
    holder: pureCircuits.holderCommitment(secret),
    salt: randomSecret(),
    annualIncomeKrw: 50_000_000n,
    incomeYear: 2025n,
    notCurrentlyMarried: true,
    checkedAt: BigInt(now - 86400),
    validUntil: BigInt(now + 86400),
    ...overrides,
  };
  sim.issue(evidence);
  const request = sim.requestFor(evidence.holder);
  sim.openRequest(request);
  return { sim, secret, evidence, request };
}

test("matchproof: issuer-attested income at the threshold and marital condition qualify", () => {
  const { sim, secret, evidence, request } = setup();
  sim.prove(evidence, secret, request);
  assert.equal(sim.isApprovedNow(request), true);
  assert.equal(sim.state.approvals.lookup(request.key), request.expiresAt);
  assert.deepEqual(
    Object.keys(sim.state).sort(),
    [
      "agencyKeyHash",
      "approvals",
      "credentials",
      "issuerKeyHash",
      "maxEvidenceAgeSeconds",
      "minimumIncomeKrw",
      "programId",
      "registered",
      "requests",
      "requiredIncomeYear",
    ].sort(),
  );
});

test("matchproof: issuer and agency authorization are independently enforced", () => {
  const { sim, evidence } = setup();
  assert.throws(
    () => sim.issue({ ...evidence, salt: randomSecret() }, randomSecret()),
    /ISSUER_UNAUTHORIZED/,
  );
  assert.throws(
    () => sim.openRequest(sim.requestFor(evidence.holder), sim.issuerSecret),
    /AGENCY_UNAUTHORIZED/,
  );
  assert.equal(sim.state.registered.size(), 1n);
  assert.equal(sim.state.requests.size(), 1n);
});

test("matchproof: changing an issued income value cannot create a valid claim", () => {
  const { sim, evidence, secret, request } = setup({
    annualIncomeKrw: 10_000_000n,
  });
  const realPath = sim.state.credentials.findPathForLeaf(
    sim.commitment(evidence),
  )!;
  assert.throws(
    () =>
      sim.prove(
        { ...evidence, annualIncomeKrw: 90_000_000n },
        secret,
        request,
        realPath,
      ),
    /CREDENTIAL_MISMATCH/,
  );
  assert.equal(sim.state.approvals.size(), 0n);
});

test("matchproof: fabricating the attestation tree is rejected inside the circuit", () => {
  const { sim, evidence, secret, request } = setup();
  const path = sim.state.credentials.findPathForLeaf(sim.commitment(evidence))!;
  const fakePath = {
    ...path,
    path: path.path.map((entry, i) =>
      i === 0
        ? {
            ...entry,
            sibling: { field: entry.sibling.field + 1n },
          }
        : entry,
    ),
  };
  assert.throws(
    () => sim.prove(evidence, secret, request, fakePath),
    /CREDENTIAL_NOT_ISSUED/,
  );
  assert.equal(sim.state.approvals.size(), 0n);
});

test("matchproof: a copied credential and its public path cannot replace the holder's secret", () => {
  const { sim, evidence, request } = setup();
  assert.throws(
    () => sim.prove(evidence, randomSecret(), request),
    /HOLDER_MISMATCH/,
  );
  assert.equal(sim.state.approvals.size(), 0n);
});

test("matchproof: income, income year and marital conditions are checked against the issued facts", () => {
  const cases: [Partial<Credential>, RegExp][] = [
    [{ annualIncomeKrw: 49_999_999n }, /INCOME_BELOW_POLICY/],
    [{ incomeYear: 2024n }, /INCOME_YEAR_MISMATCH/],
    [{ notCurrentlyMarried: false }, /MARITAL_POLICY_NOT_MET/],
  ];
  for (const [overrides, error] of cases) {
    const { sim, evidence, secret, request } = setup(overrides);
    assert.throws(() => sim.prove(evidence, secret, request), error);
    assert.equal(sim.state.approvals.size(), 0n);
  }
});

test("matchproof: future, expired and stale evidence cannot pass a current review", () => {
  const cases: [Partial<Credential>, RegExp][] = [
    [{ checkedAt: BigInt(now + 1) }, /EVIDENCE_FROM_FUTURE/],
    [{ validUntil: BigInt(now) }, /CREDENTIAL_EXPIRES_BEFORE_REQUEST/],
    [{ checkedAt: BigInt(now - 7 * 86400) }, /EVIDENCE_EXPIRES_BEFORE_REQUEST/],
  ];
  for (const [overrides, error] of cases) {
    const { sim, evidence, secret, request } = setup(overrides);
    assert.throws(() => sim.prove(evidence, secret, request), error);
    assert.equal(sim.state.approvals.size(), 0n);
  }
});

test("matchproof: proof validity covers the entire review window, including the expiry boundary", () => {
  const { sim, evidence, secret, request } = setup({
    validUntil: BigInt(now + 600),
  });
  sim.now = now + 599;
  sim.prove(evidence, secret, request);
  assert.equal(sim.isApprovedNow(request), true);
  sim.now = now + 600;
  assert.equal(sim.isApprovedNow(request), false);
  // A persisted historical receipt must not be mistaken for a currently valid badge.
  assert.equal(sim.state.approvals.member(request.key), true);
});

test("matchproof: another applicant or a substituted session nonce cannot consume the request", () => {
  const { sim, evidence, secret, request } = setup();
  assert.throws(
    () => sim.prove(evidence, secret, { ...request, nonce: randomSecret() }),
    /REQUEST_BINDING_MISMATCH/,
  );
  const otherSecret = randomSecret();
  const otherEvidence = {
    ...evidence,
    holder: pureCircuits.holderCommitment(otherSecret),
    salt: randomSecret(),
  };
  sim.issue(otherEvidence);
  assert.throws(
    () => sim.prove(otherEvidence, otherSecret, request),
    /REQUEST_BINDING_MISMATCH/,
  );
  assert.equal(sim.state.approvals.size(), 0n);
});

test("matchproof: an approved request is one-use; a fresh request remains possible", () => {
  const { sim, evidence, secret, request } = setup();
  sim.prove(evidence, secret, request);
  assert.throws(
    () => sim.prove(evidence, secret, request),
    /REQUEST_ALREADY_USED/,
  );
  assert.throws(() => sim.openRequest(request), /REQUEST_EXISTS/);
  const next = sim.requestFor(evidence.holder);
  assert.notDeepEqual(request.key, next.key);
  sim.openRequest(next);
  sim.prove(evidence, secret, next);
  assert.equal(sim.state.approvals.size(), 2n);
});

test("matchproof: expired and unregistered requests are rejected", () => {
  const { sim, evidence, secret, request } = setup();
  assert.throws(
    () => sim.prove(evidence, secret, sim.requestFor(evidence.holder)),
    /REQUEST_UNKNOWN/,
  );
  sim.now = now + 600;
  assert.throws(() => sim.prove(evidence, secret, request), /REQUEST_EXPIRED/);
  assert.equal(sim.state.approvals.size(), 0n);
});

test("matchproof: agency cannot authorize an arbitrarily long or backdated request", () => {
  const { sim, evidence } = setup();
  const request = sim.requestFor(evidence.holder);
  assert.throws(
    () => sim.openRequest({ ...request, expiresAt: BigInt(now + 601) }),
    /REQUEST_WINDOW_TOO_LONG/,
  );
  assert.throws(
    () => sim.openRequest({ ...request, requestedAt: BigInt(now - 60) }),
    /REQUEST_START_TOO_OLD/,
  );
  assert.throws(
    () => sim.openRequest({ ...request, requestedAt: BigInt(now + 1) }),
    /REQUEST_FROM_FUTURE/,
  );
});

test("matchproof: credentials and request bindings are separated between deployments", () => {
  const { sim, evidence, secret, request } = setup();
  const other = new MatchProofSimulator(now);
  other.issue(evidence);
  assert.notDeepEqual(sim.commitment(evidence), other.commitment(evidence));
  other.openRequest(request);
  assert.throws(
    () => other.prove(evidence, secret, request),
    /REQUEST_BINDING_MISMATCH/,
  );
});
