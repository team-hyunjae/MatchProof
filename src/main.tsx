import "./polyfills.ts";
import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import App from "./App.tsx";
import "./styles.css";

const NetworkApp = lazy(() => import("./network/NetworkApp.tsx"));
const MatchProofApp = lazy(() => import("./matchproof/MatchProofApp.tsx"));
createRoot(document.getElementById("root")!).render(
  location.pathname === "/" || location.pathname === "/matchproof" ? (
    <Suspense
      fallback={<p role="status">MatchProof 심사 도구를 불러오는 중…</p>}
    >
      <MatchProofApp />
    </Suspense>
  ) : location.pathname === "/network" ? (
    <Suspense fallback={<p role="status">Midnight 연결 도구를 불러오는 중…</p>}>
      <NetworkApp />
    </Suspense>
  ) : (
    <App />
  ),
);
