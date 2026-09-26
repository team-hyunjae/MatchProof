import { createServer } from "vite";
import { createApp } from "./app.ts";

const port = Number(process.env.PORT ?? 4173);
const app = createApp(port);
const vite = await createServer({
  server: { middlewareMode: true, hmr: { port: port + 1 } },
  appType: "spa",
});
app.use(vite.middlewares);
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`QuietPass simulator: http://127.0.0.1:${port}`);
  console.log(`QuietPass Midnight client: http://127.0.0.1:${port}/network`);
  console.log(
    `MatchProof development client: http://127.0.0.1:${port}/matchproof`,
  );
});
async function close() {
  server.close();
  await vite.close();
  process.exit(0);
}
process.on("SIGTERM", close);
process.on("SIGINT", close);
