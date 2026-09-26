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
import { ledger, pureCircuits } from "../contracts/managed/contract/index.js";
import {
  compiledContract,
  createActor,
  hex,
  koreanDay,
  merchants,
  PRIVATE_ID,
  type ActorState,
  type Providers,
  type QuietContract,
} from "../src/network/model.ts";

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
  const zk = new NodeZkConfigProvider<"issue" | "redeem">(
    resolve("contracts/managed"),
  );
  const publicDataProvider = indexerPublicDataProvider(
    env.indexer,
    env.indexerWS,
  );
  const makeProviders = (): Providers => ({
    privateStateProvider: inMemoryPrivateStateProvider<
      typeof PRIVATE_ID,
      ActorState
    >(),
    publicDataProvider,
    zkConfigProvider: zk,
    proofProvider: httpClientProofProvider(env.proofServer, zk),
    walletProvider: walletProvider!,
    midnightProvider: walletProvider!,
  });
  const issuer = createActor("issuer");
  const student = createActor("student");
  const program = crypto.getRandomValues(new Uint8Array(32));
  const schoolProviders = makeProviders();
  status("Deploying QuietPass to local Midnight chain.");
  const deployed = await deployContract(schoolProviders, {
    compiledContract,
    privateStateId: PRIVATE_ID,
    initialPrivateState: issuer,
    args: [
      program,
      pureCircuits.issuerCommitment(issuer.secret),
      merchants[0].key,
      merchants[1].key,
    ],
  });
  const address = deployed.deployTxData.public.contractAddress;
  schoolProviders.privateStateProvider.setContractAddress(address);
  report.address = address;
  report.deployTx = deployed.deployTxData.public.txHash;
  status(`Deployment finalized: ${address}`);
  const commitment = pureCircuits.credentialCommitment(program, student.secret);
  const issueStarted = performance.now();
  const issued = await deployed.callTx.issue(commitment);
  report.issueTx = issued.public.txHash;
  report.issueMilliseconds = Math.round(performance.now() - issueStarted);
  status("Issuance proof accepted and transaction finalized.");
  const studentProviders = makeProviders();
  const studentContract = await findDeployedContract<QuietContract>(
    studentProviders,
    {
      compiledContract,
      contractAddress: address,
      privateStateId: PRIVATE_ID,
      initialPrivateState: student,
    },
  );
  studentProviders.privateStateProvider.setContractAddress(address);
  const redeemStarted = performance.now();
  const redeemed = await studentContract.callTx.redeem(
    koreanDay(),
    merchants[0].key,
  );
  report.redeemTx = redeemed.public.txHash;
  report.redeemMilliseconds = Math.round(performance.now() - redeemStarted);
  report.proofs = true;
  status("Redemption proof accepted and transaction finalized.");
  await assert.rejects(
    () => studentContract.callTx.redeem(koreanDay(), merchants[1].key),
    (error: unknown) => hasErrorCode(error, "ALREADY_REDEEMED"),
  );
  report.crossMerchantReuse = "rejected-before-submission";
  const outsiderProviders = makeProviders();
  const outsider = await findDeployedContract<QuietContract>(
    outsiderProviders,
    {
      compiledContract,
      contractAddress: address,
      privateStateId: PRIVATE_ID,
      initialPrivateState: createActor("student"),
    },
  );
  outsiderProviders.privateStateProvider.setContractAddress(address);
  await assert.rejects(
    () => outsider.callTx.redeem(koreanDay(), merchants[0].key),
    (error: unknown) => hasErrorCode(error, "MEMBERSHIP_MISSING"),
  );
  report.unissued = "rejected-before-submission";
  // Independent public reader; no actor private state or wallet supplied.
  const merchantReader = indexerPublicDataProvider(env.indexer, env.indexerWS);
  const chainState = await merchantReader.queryContractState(address);
  assert(chainState);
  const publicLedger = ledger(chainState.data);
  assert.equal(publicLedger.issuedCount, 1n);
  assert.equal(publicLedger.redeemedCount, 1n);
  const nullifier = pureCircuits.dailyNullifier(
    program,
    student.secret,
    koreanDay(),
  );
  assert.equal(
    hex(publicLedger.receipts.lookup(nullifier)),
    hex(merchants[0].key),
  );
  report.merchantRead = "verified-without-private-state";
  report.finished = new Date().toISOString();
  report.passed = true;
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/network-smoke.json",
    JSON.stringify(report, null, 2),
  );
  status(
    "PASS: actual local proofs, transactions, rejection checks and independent merchant read.",
  );
} catch (error) {
  // Do not dump SDK errors: they can include unproven transaction/witness data.
  const message = error instanceof Error ? error.message : "";
  const codes = [
    "MEMBERSHIP_MISSING",
    "ALREADY_REDEEMED",
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
