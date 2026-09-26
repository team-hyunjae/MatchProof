import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  readdir,
  copyFile,
  chmod,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const destination = resolve(".tools/compactc-0.31.1");
const executable = process.env.COMPACTC ?? join(destination, "compactc");
const version = spawnSync(executable, ["--version"], { encoding: "utf8" });
if (version.status === 0 && version.stdout.trim() === "0.31.1") {
  console.log("Compact compiler 0.31.1 already available.");
  process.exit(0);
}
if (process.env.COMPACTC)
  throw new Error("COMPACTC does not point to compiler 0.31.1.");
// SHA-256 digests from the official compactc-v0.31.1 GitHub release metadata.
const assets = {
  "darwin-arm64": [
    "aarch64-darwin",
    "57af9b0449aa96b2905ea3d7a175b6b42ab38d725612a9cb2d73eb4ef253cce2",
  ],
  "darwin-x64": [
    "x86_64-darwin",
    "eebae2d04b1ec05fe07d06398e36d78e60cf4927ddbc0dae7d5f5ebb9ac6721c",
  ],
  "linux-arm64": [
    "aarch64-unknown-linux-musl",
    "7c7e38581808779d2671687c3378017bcf2fb3111a192fd1253f3472012df549",
  ],
  "linux-x64": [
    "x86_64-unknown-linux-musl",
    "e291b4bab4d4e857707008f8b1c25c2b8e0c843f6c737d0ee6c0d9ac69a6bbfb",
  ],
};
const asset = assets[`${process.platform}-${process.arch}`];
if (!asset)
  throw new Error("Use macOS, Linux, or WSL with Compact compiler 0.31.1.");
const [platform, digest] = asset;
const name = `compactc_v0.31.1_${platform}.zip`;
const url = `https://github.com/midnightntwrk/compact/releases/download/compactc-v0.31.1/${name}`;
const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
if (!response.ok)
  throw new Error(`Compiler download failed: ${response.status}`);
const archive = Buffer.from(await response.arrayBuffer());
if (createHash("sha256").update(archive).digest("hex") !== digest)
  throw new Error("Compiler checksum mismatch.");
const temporary = await mkdtemp(join(tmpdir(), "matchproof-compiler-"));
try {
  const zip = join(temporary, name);
  const extracted = join(temporary, "extracted");
  await writeFile(zip, archive);
  const unzip = spawnSync("unzip", ["-q", zip, "-d", extracted], {
    stdio: "inherit",
  });
  if (unzip.status !== 0) throw new Error("Install unzip, then retry.");
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(extracted, { withFileTypes: true })) {
    if (!entry.isFile()) throw new Error("Unexpected compiler archive layout.");
    await copyFile(join(extracted, entry.name), join(destination, entry.name));
    await chmod(join(destination, entry.name), 0o755);
  }
  const check = spawnSync(executable, ["--version"], { encoding: "utf8" });
  if (check.status !== 0 || check.stdout.trim() !== "0.31.1")
    throw new Error("Compiler validation failed.");
  console.log("Installed and verified Compact compiler 0.31.1.");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
