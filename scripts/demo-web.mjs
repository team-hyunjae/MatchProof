import express from "express";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// This server is only used by `npm run demo`; normal builds never embed a wallet.
export async function createDemoApp(directory, injection) {
  const index = await readFile(join(directory, "index.html"), "utf8");
  if (!index.includes("<head>"))
    throw new Error("Build index.html is missing <head>.");
  const html = index.replace("<head>", `<head><script>${injection}</script>`);
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    if (req.headers.host !== "127.0.0.1:4180") return res.sendStatus(403);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.get(["/", "/matchproof"], (_req, res) => res.type("html").send(html));
  app.use(express.static(directory, { index: false, dotfiles: "deny" }));
  app.use((_req, res) => res.sendStatus(404));
  return app;
}
