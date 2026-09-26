import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

test("compile check cannot delete the proving keys used by the next demo", async () => {
  const directory = await mkdtemp(join(tmpdir(), "matchproof-tooling-"));
  try {
    const compiler = join(directory, "compiler.mjs");
    await writeFile(compiler, `#!/usr/bin/env node
import { rmSync, mkdirSync } from 'node:fs';
if (process.argv.includes('--version')) { console.log('0.31.1'); process.exit(0); }
const output = process.argv.at(-1);
rmSync(output, {recursive:true, force:true}); mkdirSync(output, {recursive:true});
`, { mode: 0o755 });
    const keys = join(directory, "contracts/matchproof-managed/keys");
    await mkdir(keys, { recursive: true });
    const key = join(keys, "issue.prover");
    await writeFile(key, "existing-valid-key");
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/compile.mjs", import.meta.url)), "--matchproof", "--skip-zk"], {
      cwd: directory, env: { ...process.env, COMPACTC: compiler }, encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(key, "utf8"), "existing-valid-key");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
