import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createDemoApp } from "./demo-web.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
for (const port of [4180, 4181]) {
  await new Promise((resolveReady, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(
        new Error(
          `Port ${port} is in use. Stop its preview/demo process first; no process was terminated.`,
        ),
      ),
    );
    probe.listen(port, "127.0.0.1", () => probe.close(resolveReady));
  });
}
for (const endpoint of [
  "http://127.0.0.1:9944/health",
  "http://127.0.0.1:6300/version",
]) {
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Not healthy");
  } catch {
    throw new Error(
      `Development service unavailable: ${endpoint}. See README.md / npm run doctor:network.`,
    );
  }
}

console.log(
  "Starting MatchProof local demonstration with the public development wallet.",
);
console.log(
  "Synthetic data only. This wallet signs development transactions automatically; no extension approval popup.",
);
const wallet = spawn(
  process.execPath,
  ["--import", "tsx", "scripts/matchproof-browser-wallet.ts"],
  {
    cwd: root,
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  },
);
let server;
let stopping = false;
const startupTimer = setTimeout(() => {
  console.error("Wallet preparation timed out. No ready state claimed.");
  stop(1);
}, 10 * 60_000);
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(startupTimer);
  server?.close();
  wallet.kill("SIGTERM");
  const forced = setTimeout(() => {
    wallet.kill("SIGKILL");
    process.exit(code);
  }, 5000);
  wallet.once("exit", () => {
    clearTimeout(forced);
    process.exit(code);
  });
  if (wallet.exitCode !== null || wallet.signalCode !== null)
    process.exit(code);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
wallet.on("error", (error) => {
  console.error(error.message);
  stop(1);
});
wallet.on("exit", (code) => {
  if (!stopping) {
    console.log(
      "Development wallet session ended. Run npm run demo to start a new 30-minute session.",
    );
    stop(code ?? 1);
  }
});
wallet.on("message", async (message) => {
  if (
    stopping ||
    server ||
    message?.type !== "ready" ||
    typeof message.injection !== "string"
  )
    return;
  try {
    const app = await createDemoApp(resolve(root, "dist"), message.injection);
    server = app.listen(4180, "127.0.0.1", () => {
      clearTimeout(startupTimer);
      console.log("MatchProof DEMO READY: http://127.0.0.1:4180/matchproof");
      console.log(
        "The page now includes the test wallet. Enter a vault password and connect each role. Keep this terminal running.",
      );
    });
    server.on("error", (error) => {
      console.error(error.message);
      stop(1);
    });
  } catch (error) {
    console.error(error.message);
    stop(1);
  }
});
