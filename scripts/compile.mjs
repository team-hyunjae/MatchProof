import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";

const local = resolve(".tools/compactc-0.31.1/compactc");
const args = process.argv.slice(2);
const binary = process.env.COMPACTC ?? (existsSync(local) ? local : "compactc");
const version = spawnSync(binary, ["--version"], { encoding: "utf8" });
if (version.status !== 0 || version.stdout.trim() !== "0.31.1") {
  console.error(
    "Compact compiler 0.31.1 is required. See README.md. Set COMPACTC to its executable.",
  );
  process.exit(1);
}
// --skip-zk clears its output directory. Never run it over the usable proving keys.
const checkDirectory = args.includes("--skip-zk")
  ? mkdtempSync(join(tmpdir(), "matchproof-compact-check-"))
  : undefined;
const result = spawnSync(
  binary,
  [
    ...args.filter((arg) => arg !== "--matchproof"),
    "contracts/matchproof.compact",
    checkDirectory ?? "contracts/matchproof-managed",
  ],
  { stdio: "inherit" },
);
if (checkDirectory) rmSync(checkDirectory, { recursive: true, force: true });
process.exit(result.status ?? 1);
