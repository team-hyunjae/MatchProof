import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../server/app.ts";

test("HTTP flow: issuance, simultaneous double-spend rejection, public data and isolated sessions", async () => {
  const app = createApp(0);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api`;
  try {
    const start = await fetch(`${url}/state`);
    assert.equal(start.status, 200);
    const cookie = start.headers.get("set-cookie")!.split(";")[0];
    const initial = await start.json();
    assert.equal(initial.issuedCount, 0);
    const request = (
      path: string,
      body?: unknown,
      extra: Record<string, string> = {},
    ) =>
      fetch(`${url}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
          ...extra,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    assert.equal(
      (await request("/issue", { profileId: "visitor" })).status,
      403,
    );
    assert.equal(
      (await request("/issue", { profileId: "student-a" })).status,
      200,
    );
    const attempts = await Promise.all([
      request("/redeem", {
        profileId: "student-a",
        merchantId: "campus-kitchen",
      }),
      request("/redeem", { profileId: "student-a", merchantId: "green-table" }),
    ]);
    assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 409]);
    const publicResponse = await (await request("/merchant-state")).json();
    assert.equal(publicResponse.redeemedCount, 1);
    for (const forbidden of [
      "김민지",
      "DEMO-001",
      "student-a",
      "studentNumber",
      "studentSecret",
      "issuerSecret",
      "profiles",
      "eligible",
    ]) {
      assert.equal(
        JSON.stringify(publicResponse).includes(forbidden),
        false,
        `merchant response leaked ${forbidden}`,
      );
    }
    assert.equal(
      (
        await request("/redeem", {
          profileId: "../../etc/passwd",
          merchantId: "campus-kitchen",
        })
      ).status,
      400,
    );
    assert.equal(
      (await request("/reset", {}, { Origin: "https://unrelated.example" }))
        .status,
      403,
    );
    const secondSession = await (await fetch(`${url}/state`)).json();
    assert.equal(secondSession.issuedCount, 0);
    assert.notEqual(initial.programId, secondSession.programId);
    assert.equal((await request("/next-day", {})).status, 200);
    assert.equal(
      (
        await request("/redeem", {
          profileId: "student-a",
          merchantId: "campus-kitchen",
        })
      ).status,
      200,
    );
    assert.equal((await request("/reset", {})).status, 200);
    assert.equal((await (await request("/state")).json()).redeemedCount, 0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
