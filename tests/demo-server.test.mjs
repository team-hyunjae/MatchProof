import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { createDemoApp } from "../scripts/demo-web.mjs";

test("demo server: connector stays in explicit local demo pages; hostile hosts and private paths are denied", async () => {
  const directory = await mkdtemp(join(tmpdir(), "matchproof-demo-server-"));
  let server;
  try {
    await writeFile(
      join(directory, "index.html"),
      "<html><head></head><body>MatchProof</body></html>",
    );
    await writeFile(join(directory, "app.js"), "console.log('public bundle');");
    const app = await createDemoApp(
      directory,
      "window.midnight={testToken:'synthetic-token'};",
    );
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const port = server.address().port;
    const get = (path, host = "127.0.0.1:4180") =>
      new Promise((resolve, reject) => {
        const req = request(
          { hostname: "127.0.0.1", port, path, headers: { Host: host } },
          (res) => {
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () =>
              resolve({ status: res.statusCode, headers: res.headers, body }),
            );
          },
        );
        req.on("error", reject);
        req.end();
      });
    for (const route of ["/", "/matchproof?role=agency"]) {
      const result = await get(route);
      assert.equal(result.status, 200);
      assert.match(result.body, /synthetic-token/);
      assert.equal(result.headers["cache-control"], "no-store");
      assert.equal(result.headers["referrer-policy"], "no-referrer");
    }
    const publicBundle = await get("/app.js");
    assert.equal(publicBundle.status, 200);
    assert(!publicBundle.body.includes("synthetic-token"));
    assert.equal((await get("/matchproof", "attacker.example")).status, 403);
    assert.equal(
      (await get("/artifacts/browser-wallet-connector.js")).status,
      404,
    );
    assert.equal((await get("/.env")).status, 404);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
