import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
let failures = 0;
function report(ok, label) {
  console.log(`${ok ? "OK" : "MISSING"} ${label}`);
  if (!ok) failures++;
}
const [major, minor] = process.versions.node.split(".").map(Number);
report(
  major > 22 || (major === 22 && minor >= 12),
  `Node ${process.versions.node} (requires >=22.12)`,
);
try {
  await import("@midnight-ntwrk/midnight-js-contracts");
  report(true, "Midnight dependencies");
} catch {
  report(false, "Dependencies: run npm ci");
}
const compiler = spawnSync(
  process.env.COMPACTC ?? resolve(".tools/compactc-0.31.1/compactc"),
  ["--version"],
  { encoding: "utf8" },
);
report(
  compiler.status === 0 && compiler.stdout.trim() === "0.31.1",
  "Compact compiler 0.31.1 (or set COMPACTC)",
);
for (const circuit of ["issue", "openRequest", "proveEligibility"]) {
  for (const path of [
    `keys/${circuit}.prover`,
    `keys/${circuit}.verifier`,
    `zkir/${circuit}.bzkir`,
  ]) {
    try {
      await access(`contracts/matchproof-managed/${path}`);
      report(true, path);
    } catch {
      report(false, `${path}: run npm run matchproof:compile`);
    }
  }
}
if (process.argv.includes("--network")) {
  for (const [label, url, init] of [
    ["Development node", "http://127.0.0.1:9944/health", {}],
    ["Proof server", "http://127.0.0.1:6300/version", {}],
    [
      "Indexer",
      "http://127.0.0.1:8088/api/v4/graphql",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"query":"{__typename}"}',
      },
    ],
  ]) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(5000),
      });
      const body = await response.text();
      const valid =
        label === "Proof server"
          ? body.trim() === "8.1.0"
          : label === "Indexer"
            ? JSON.parse(body).data?.__typename === "Query"
            : JSON.parse(body).isSyncing === false;
      report(response.ok && valid, label);
    } catch {
      report(false, `${label}: ${url}`);
    }
  }
}
console.log(
  "Network: undeployed only. Loopback endpoints may be SSH forwards; do not use real personal data.",
);
process.exitCode = failures ? 1 : 0;
