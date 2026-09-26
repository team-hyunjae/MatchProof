import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import pino from "pino";
import { firstValueFrom, filter, timeout } from "rxjs";
import {
  DAppConnectorWalletAdapter,
  FluentWalletBuilder,
  LocalTestConfiguration,
  MidnightWalletProvider,
  syncWallet,
  logger as testkitLogger,
} from "@midnight-ntwrk/testkit-js";
import {
  DustSecretKey,
  ZswapSecretKeys,
  LedgerParameters,
} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";

// Test harness only. Uses the public local genesis wallet, never an extension or real funds.
const env = new LocalTestConfiguration({
  indexer: 8088,
  node: 9944,
  proofServer: 6300,
});
setNetworkId("undeployed");
const logger = pino({ level: "silent" });
testkitLogger.level = "silent";
let walletProvider: MidnightWalletProvider | undefined;
for (const endpoint of [
  "http://127.0.0.1:9944/health",
  "http://127.0.0.1:6300/version",
]) {
  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(5000),
  });
  assert(response.ok, "Local node and proof server must be running.");
}
console.log("Preparing local genesis wallet (no real funds).");
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
console.log("Wallet synced. Preparing transaction fees.");
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

const adapter = new DAppConnectorWalletAdapter(walletProvider!, env);
const origin = "http://127.0.0.1:4180";
const token = randomBytes(32).toString("hex");
const allowed = new Set([
  "getConfiguration",
  "getShieldedAddresses",
  "balanceUnsealedTransaction",
  "submitTransaction",
]);
const server = createServer(async (request, response) => {
  if (request.headers.origin !== origin) {
    response.writeHead(403).end();
    return;
  }
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader(
    "Access-Control-Allow-Headers",
    "content-type,x-matchproof-test",
  );
  response.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }
  if (
    request.method !== "POST" ||
    request.headers["x-matchproof-test"] !== token
  ) {
    response.writeHead(403).end();
    return;
  }
  try {
    const chunks: Buffer[] = [];
    let length = 0;
    for await (const chunk of request) {
      length += chunk.length;
      if (length > 8 * 1024 * 1024) throw new Error("body limit");
      chunks.push(Buffer.from(chunk));
    }
    const { method, args } = JSON.parse(Buffer.concat(chunks).toString());
    if (!allowed.has(method) || !Array.isArray(args))
      throw new Error("method denied");
    const result = await (
      adapter as unknown as Record<
        string,
        (...args: unknown[]) => Promise<unknown>
      >
    )[method](...args);
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ result: result ?? null }));
  } catch {
    response
      .writeHead(500)
      .end(
        JSON.stringify({ error: "Local development wallet operation failed" }),
      );
  }
});
await mkdir("artifacts", { recursive: true });
const injection = `(() => {
  const call = async (method, ...args) => {
    const response = await fetch("http://127.0.0.1:4181/", { method: "POST", headers: { "content-type": "application/json", "x-matchproof-test": ${JSON.stringify(token)} }, body: JSON.stringify({method,args}) });
    if (!response.ok) throw new Error("Local development wallet operation failed");
    return (await response.json()).result;
  };
  window.midnight = { matchproofTest: {
    apiVersion: "4.0.1", name: "Local public genesis test wallet",
    connect: async (network) => {
      if (network !== "undeployed") throw new Error("Local network only");
      return { getConfiguration: () => call("getConfiguration"), getShieldedAddresses: () => call("getShieldedAddresses"), balanceUnsealedTransaction: tx => call("balanceUnsealedTransaction", tx), submitTransaction: tx => call("submitTransaction", tx) };
    }
  }};
})();`;
await writeFile("artifacts/browser-wallet-connector.js", injection, {
  mode: 0o600,
});
server.listen(4181, "127.0.0.1", () => {
  console.log(
    "Local development browser wallet ready on 4181 (undeployed, test funds only).",
  );
  // Only the explicitly started demo launcher receives this process-scoped connector.
  process.send?.({ type: "ready", injection });
});
async function stop() {
  server.close();
  await walletProvider?.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("error", () => {
  console.error("Cannot start development wallet on 127.0.0.1:4181.");
  void stop();
});
setTimeout(stop, 30 * 60_000);
