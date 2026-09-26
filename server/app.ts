import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomBytes } from "node:crypto";
import { DemoSession, DemoError } from "./demo.ts";

export function createApp(port: number) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    const boundPort = port === 0 ? req.socket.localPort : port;
    const allowedHosts = [`127.0.0.1:${boundPort}`, `localhost:${boundPort}`];
    if (!allowedHosts.includes(req.headers.host ?? ""))
      return res
        .status(403)
        .json({ message: "로컬 데모 주소에서 접속해 주세요." });
    if (
      req.method !== "GET" &&
      req.headers.origin &&
      !allowedHosts.map((h) => `http://${h}`).includes(req.headers.origin)
    ) {
      return res
        .status(403)
        .json({ message: "다른 사이트에서 보낸 요청은 허용되지 않아요." });
    }
    next();
  });
  app.use(express.json({ limit: "2kb" }));
  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      mode: "local-simulator",
      network: null,
      zkProofs: false,
    }),
  );

  const sessions = new Map<string, { demo: DemoSession; lastSeen: number }>();
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    for (const [id, session] of sessions)
      if (Date.now() - session.lastSeen > 3600000) sessions.delete(id);
    const cookie = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("quietpass_demo="))
      ?.slice(15);
    let session = cookie ? sessions.get(cookie) : undefined;
    if (!session) {
      if (sessions.size >= 50)
        return res
          .status(429)
          .json({ message: "시연 세션이 많아요. 잠시 후 다시 접속해 주세요." });
      const id = randomBytes(24).toString("hex");
      session = { demo: new DemoSession(), lastSeen: Date.now() };
      sessions.set(id, session);
      res.cookie("quietpass_demo", id, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 3600000,
      });
    }
    session.lastSeen = Date.now();
    res.locals.session = session;
    next();
  });

  const demo = (res: Response): DemoSession => res.locals.session.demo;
  app.get("/api/state", (_req, res) => res.json(demo(res).state()));
  app.get("/api/merchant-state", (_req, res) =>
    res.json(demo(res).publicState()),
  );
  app.get("/api/history/:profileId", (req, res) => {
    const actor = demo(res).actor(req.params.profileId);
    res.json([...(demo(res).privateHistory.get(actor.id) ?? [])].reverse());
  });
  app.post("/api/issue", (req, res) =>
    res.json(demo(res).issue(req.body?.profileId)),
  );
  app.post("/api/redeem", (req, res) =>
    res.json(demo(res).redeem(req.body?.profileId, req.body?.merchantId)),
  );
  app.post("/api/next-day", (_req, res) => {
    demo(res).sim.advanceDay();
    res.json({ message: "시연 날짜를 하루 앞으로 옮겼어요." });
  });
  app.post("/api/reset", (_req, res) => {
    res.locals.session.demo = new DemoSession();
    res.json({ message: "이 브라우저의 시연 데이터를 초기화했어요." });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ message: "요청한 기능을 찾을 수 없어요." }),
  );
  app.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) return next(error);
      if (error instanceof DemoError)
        return res
          .status(error.status)
          .json({ code: error.code, message: error.message });
      if (error instanceof SyntaxError)
        return res.status(400).json({ message: "요청 형식을 확인해 주세요." });
      // No private witness material or stack traces are returned to the browser.
      return res
        .status(500)
        .json({
          code: "INTERNAL_ERROR",
          message:
            "처리하지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.",
        });
    },
  );
  return app;
}
