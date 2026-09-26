// Real LOCAL network integration, with separate actor states in a test harness.
// The public genesis seed below MUST NOT be used on Preprod/Mainnet.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pino from "pino";
import { hasErrorCode } from "../src/network/errors.ts";
import { firstValueFrom, filter, timeout } from "rxjs";
import {
  FluentWalletBuilder,
  LocalTestConfiguration,
  MidnightWalletProvider,
  inMemoryPrivateStateProvider,
  syncWallet,
  logger as testkitLogger,
} from "@midnight-ntwrk/testkit-js";
import {
  DustSecretKey,
  ZswapSecretKeys,
  LedgerParameters,
} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import {
  deployContract,
  findDeployedContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import {
  MatchClient,
  publicSnapshot,
  reviewStatus,
} from "../src/matchproof/client.ts";
import {
  PRIVATE_ID,
  type ActorState,
  type Providers,
  type Operation,
} from "../src/matchproof/model.ts";

const env = new LocalTestConfiguration({
  indexer: 8088,
  node: 9944,
  proofServer: 6300,
});
setNetworkId("undeployed");
const logger = pino({ level: "silent" }); // Testkit otherwise logs wallet seeds.
testkitLogger.level = "silent";
const report: Record<string, unknown> = {
  network: "undeployed",
  started: new Date().toISOString(),
  mode: "real-local-chain",
  proofs: false,
};
const status = (message: string) => console.log(message);
let walletProvider: MidnightWalletProvider | undefined;
const watchdog = setTimeout(() => {
  console.error("Network smoke test timed out. No success claimed.");
  process.exit(1);
}, 12 * 60_000);
try {
  for (const endpoint of [
    "http://127.0.0.1:9944/health",
    "http://127.0.0.1:6300/version",
  ]) {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(5000),
    });
    assert(response.ok, "Local node and proof server must be running.");
  }
  status("Preparing local genesis wallet (no real funds).");
  const built = await FluentWalletBuilder.forEnvironment(env)
    .withSeed("0".repeat(63) + "1")
    .withDustOptions({
      ledgerParams: LedgerParameters.initialParameters(),
      additionalFeeOverhead: 500_000_000_000_000_000n,
      feeBlocksMargin: 5,
    })
    .buildWithoutStarting();
  walletProvider = await MidnightWalletProvider.withWallet(
    logger,
    env,
    built.wallet,
    ZswapSecretKeys.fromSeed(built.seeds.shielded),
    DustSecretKey.fromSeed(built.seeds.dust),
    built.keystore,
  );
  await walletProvider.start(false);
  await syncWallet(built.wallet);
  status("Wallet synced. Preparing transaction fees.");
  const night = await built.wallet.unshielded.waitForSyncedState();
  const dust = await built.wallet.dust.waitForSyncedState();
  const utxos = night.availableCoins.filter(
    (c) => !c.meta.registeredForDustGeneration,
  );
  if (utxos.length) {
    const recipe = await built.wallet.registerNightUtxosForDustGeneration(
      utxos,
      built.keystore.getPublicKey(),
      (data) => built.keystore.signData(data),
      dust.address,
    );
    const tx = await built.wallet.finalizeRecipe(recipe);
    await built.wallet.submitTransaction(tx);
  }
  await firstValueFrom(
    built.wallet.state().pipe(
      filter((s) => s.dust.balance(new Date()) > 0n),
      timeout(120000),
    ),
  );
  await syncWallet(built.wallet);
  const zk = new NodeZkConfigProvider<Operation>(
    resolve("contracts/matchproof-managed"),
  );
  const makeProviders = (): Providers => ({
    privateStateProvider: inMemoryPrivateStateProvider<
      typeof PRIVATE_ID,
      ActorState
    >(),
    publicDataProvider: indexerPublicDataProvider(env.indexer, env.indexerWS),
    zkConfigProvider: zk,
    proofProvider: httpClientProofProvider(env.proofServer, zk),
    walletProvider: walletProvider!,
    midnightProvider: walletProvider!,
  });
  const agency = await MatchClient.withProviders("agency", makeProviders());
  const issuer = await MatchClient.withProviders("issuer", makeProviders());
  const applicant = await MatchClient.withProviders(
    "applicant",
    makeProviders(),
  );
  status("Deploying MatchProof to the local development network.");
  report.deployTx = await issuer.deploy(await agency.identity());
  const address = issuer.address;
  report.address = address;
  await agency.join(address);
  await applicant.join(address);
  const holder = await applicant.identity();
  status("Deployment confirmed. Issuing synthetic evidence.");
  const issued = await issuer.issue(holder, "eligible");
  report.issueTx = issued.hash;
  await applicant.acceptCredential(issued.file);
  const opened = await agency.openReview(holder, "DEMO-001");
  report.requestTx = opened.hash;
  await applicant.acceptRequest(opened.file);
  const started = performance.now();
  report.proveTx = await applicant.prove();
  report.proveMilliseconds = Math.round(performance.now() - started);
  report.proofs = true;
  status("Eligibility proof accepted and transaction finalized.");
  const request = JSON.parse(opened.file);
  report.requestKey = request.key;
  await assert.rejects(
    () => applicant.prove(),
    (error: unknown) => hasErrorCode(error, "REQUEST_ALREADY_USED"),
  );
  report.replay = "rejected-before-submission";
  // A separate public provider reads the chain; no issuer/applicant private state.
  const snapshot = await publicSnapshot(address);
  const receipt = snapshot.requests.find((r) => r.key === request.key);
  assert(receipt);
  assert.equal(reviewStatus(receipt), "approved");
  report.expiresAt = receipt.expiresAt;
  report.agencyRead = "verified-without-private-state";
  // Test the application's encrypted/private-state handoff logic before adding a new proof.
  const outsider = await MatchClient.withProviders(
    "applicant",
    makeProviders(),
  );
  await outsider.join(address);
  await assert.rejects(() => outsider.acceptCredential(issued.file));
  await assert.rejects(() => outsider.acceptRequest(opened.file));
  report.otherApplicant = "credential-and-request-import-rejected";
  // Validly issued but ineligible evidence must be rejected by the actual SDK circuit.
  const low = await issuer.issue(holder, "low-income");
  await applicant.acceptCredential(low.file);
  const negativeRequest = await agency.openReview(holder, "DEMO-NEGATIVE");
  await applicant.acceptRequest(negativeRequest.file);
  await assert.rejects(
    () => applicant.prove(),
    (error: unknown) => hasErrorCode(error, "INCOME_BELOW_POLICY"),
  );
  report.lowIncome = "rejected-before-submission";
  const final = await publicSnapshot(address);
  assert.equal(final.requests.filter((r) => r.confirmed).length, 1);
  report.finished = new Date().toISOString();
  report.passed = true;
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/matchproof-smoke.json",
    JSON.stringify(report, null, 2),
  );
  // Public locator only. The browser must independently query the chain.
  await writeFile(
    "public/matchproof-demo.json",
    JSON.stringify({ address, requestKey: request.key }),
  );
  status(
    `PASS: local development chain, proofs, rejections and independent review. Address: ${address}`,
  );
} catch (error) {
  // Do not dump SDK errors: they can include unproven transaction/witness data.
  const message = error instanceof Error ? error.message : "";
  const codes = [
    "CREDENTIAL_NOT_ISSUED",
    "REQUEST_ALREADY_USED",
    "Insufficient",
    "ECONNREFUSED",
    "Timeout",
    "Unable to prove",
    "Connection",
  ];
  console.error(
    `Network smoke failed (${codes.find((c) => message.includes(c)) ?? (error instanceof Error ? error.name : "unknown")}). No success claimed.`,
  );
  console.error(
    message
      .split("\n")[0]
      .replace(/[0-9a-f]{32,}/gi, "[redacted]")
      .slice(0, 500),
  );
  // Stack locations only, never the exception payload.
  if (error instanceof Error)
    console.error(
      error.stack
        ?.split("\n")
        .filter((l) => /^\s+at /.test(l))
        .slice(0, 6)
        .join("\n"),
    );
  process.exitCode = 1;
} finally {
  await walletProvider?.stop();
  clearTimeout(watchdog);
}
