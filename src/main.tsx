import "./polyfills.ts";
import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import "./styles.css";

const MatchProofApp = lazy(() => import("./matchproof/MatchProofApp.tsx"));
createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<p role="status">MatchProof 심사 도구를 불러오는 중…</p>}>
    <MatchProofApp />
  </Suspense>,
);
