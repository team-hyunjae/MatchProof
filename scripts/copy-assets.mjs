import { mkdir, copyFile, access } from "node:fs/promises";

for (const [name, source, destination, circuits, compile] of [
  [
    "QuietPass",
    "contracts/managed",
    "public/network-assets",
    ["issue", "redeem"],
    "contract:compile",
  ],
  [
    "MatchProof",
    "contracts/matchproof-managed",
    "public/matchproof-assets",
    ["issue", "openRequest", "proveEligibility"],
    "matchproof:compile",
  ],
]) {
  const files = circuits.flatMap((circuit) => [
    `keys/${circuit}.prover`,
    `keys/${circuit}.verifier`,
    `zkir/${circuit}.bzkir`,
  ]);
  try {
    for (const file of files) await access(`${source}/${file}`);
  } catch {
    console.error(`${name}: ZK assets missing. Run npm run ${compile}.`);
    if (process.argv.includes("--optional")) continue;
    process.exit(1);
  }
  for (const file of files) {
    await mkdir(`${destination}/${file.split("/")[0]}`, { recursive: true });
    await copyFile(`${source}/${file}`, `${destination}/${file}`);
  }
  console.log(`${name} ZK assets copied.`);
}
