import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Check,
  CheckCheck,
  CircleHelp,
  FileCheck2,
  FileDown,
  Fingerprint,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
import {
  MatchClient,
  publicSnapshot,
  reviewStatus,
  type Snapshot,
} from "./client.ts";
import { MatchError, type Role, type Fixture } from "./model.ts";
import { hasErrorCode } from "../network/errors.ts";
import "./matchproof.css";

const roles = {
  agency: "결혼정보업체",
  applicant: "신청자",
  issuer: "모의 검증기관",
} as const;
const formatTime = (seconds: number) =>
  new Date(seconds * 1000).toLocaleString("ko-KR", { hour12: false });
const money = (n: string | bigint) =>
  new Intl.NumberFormat("ko-KR").format(BigInt(n));
function download(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Section({
  step,
  title,
  children,
}: {
  step?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mp-card">
      <h2>
        {step && <span className="mp-step">{step}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}
export default function MatchProofApp() {
  const params = new URLSearchParams(location.search);
  const role: Role =
    params.get("role") === "issuer"
      ? "issuer"
      : params.get("role") === "applicant"
        ? "applicant"
        : "agency";
  const [address, setAddress] = useState(params.get("address") ?? "");
  const [password, setPassword] = useState("");
  const [client, setClient] = useState<MatchClient>();
  const [details, setDetails] =
    useState<Awaited<ReturnType<MatchClient["details"]>>>();
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(
    "가상 자료로 개인정보를 공개하지 않는 심사를 체험하세요.",
  );
  const [error, setError] = useState(false);
  const [tx, setTx] = useState("");
  const [holder, setHolder] = useState("");
  const [agencyKey, setAgencyKey] = useState("");
  const [fixture, setFixture] = useState<Fixture>("eligible");
  const [label, setLabel] = useState("DEMO-001");
  const [file, setFile] = useState<{ name: string; text: string }>();
  const [consent, setConsent] = useState(false);
  const [now, setNow] = useState(Date.now() / 1000);
  useEffect(() => {
    document.title = "MatchProof · 필요한 사실만 확인하는 심사";
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, []);
  const joined = !!client?.address;
  const request = snapshot?.requests.find(
    (r) => r.key === details?.request?.key,
  );
  async function refresh(active = client, target = address) {
    if (target.length === 64) setSnapshot(await publicSnapshot(target));
    if (active) setDetails(await active.details());
  }
  async function run(message: string, work: () => Promise<void>) {
    setBusy(true);
    setError(false);
    setNotice(message);
    setTx("");
    try {
      await work();
    } catch (e) {
      setError(true);
      const codes: Record<string, string> = {
        REQUEST_ALREADY_USED:
          "이미 처리된 요청이에요. 업체가 새 심사 요청을 만들어야 해요.",
        REQUEST_EXPIRED:
          "심사 요청이 만료됐어요. 업체에서 새 요청을 받아 주세요.",
        REQUEST_START_TOO_OLD:
          "요청 생성 중 시간이 지났어요. 원장을 확인한 뒤 새 요청을 만들어 주세요.",
        REQUEST_FROM_FUTURE: "기기 시각과 개발 네트워크 시각을 확인해 주세요.",
        INCOME_BELOW_POLICY:
          "이 가상 자료는 소득 기준을 충족하지 않아요. 이 사유는 업체에 전송하지 않아요.",
        MARITAL_POLICY_NOT_MET:
          "이 가상 자료는 혼인 상태 조건을 충족하지 않아요. 이 사유는 업체에 전송하지 않아요.",
        INCOME_YEAR_MISMATCH: "요구하는 소득 기준연도와 자료가 달라요.",
        CREDENTIAL_EXPIRES_BEFORE_REQUEST:
          "자료의 유효기간이 부족해요. 검증기관에서 갱신해 주세요.",
        EVIDENCE_EXPIRES_BEFORE_REQUEST:
          "확인한 지 오래된 자료예요. 검증기관에서 갱신해 주세요.",
        CREDENTIAL_NOT_ISSUED:
          "발급 목록이 변경됐거나 아직 발급되지 않은 자료예요. 새로 확인해 주세요.",
        PasswordValidationError:
          "보관 암호는 16자 이상, 대문자·소문자·숫자·기호 중 3종류 이상이어야 해요.",
      };
      const code = Object.keys(codes).find((k) => hasErrorCode(e, k));
      setNotice(
        e instanceof MatchError
          ? e.message
          : code
            ? codes[code]
            : "작업을 완료하지 못했어요. 지갑 승인·개발용 잔액·로컬 증명 서버·보관 암호를 확인하세요. 제출 후 오류라면 체인 기록부터 새로 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function readFile(
    file: File | undefined,
    kind: "credential" | "request",
  ) {
    if (!file || !client) return;
    await run("파일과 체인 발급 기록을 확인하고 있어요…", async () => {
      if (file.size > 8192)
        throw new MatchError(
          "8KB 이하의 MatchProof 데모 파일만 가져올 수 있어요.",
        );
      const text = await file.text();
      if (kind === "credential") await client.acceptCredential(text);
      else await client.acceptRequest(text);
      setConsent(false);
      await refresh();
      setNotice(
        "기기의 암호화 보관함에 저장했어요. 파일은 서버로 업로드하지 않았어요.",
      );
    });
  }
  function fileInput(kind: "credential" | "request", children: ReactNode) {
    return (
      <label className={`mp-file ${busy ? "mp-disabled" : ""}`}>
        <Upload size={17} />
        {children}
        <input
          aria-label={
            kind === "credential" ? "자격증명 파일" : "심사 요청 파일"
          }
          type="file"
          accept="application/json,.json"
          disabled={busy || !joined}
          onChange={(e) => {
            void readFile(e.target.files?.[0], kind);
            e.target.value = "";
          }}
        />
      </label>
    );
  }
  const confirmed = snapshot?.requests.filter((r) => r.confirmed).length ?? 0;
  return (
    <div className="mp">
      <header className="mp-header">
        <a className="mp-logo" href="/matchproof">
          <span>
            <ShieldCheck size={22} />
          </span>
          matchproof<span className="mp-logo-dot">.</span>
        </a>
        <span className="mp-network">
          <i />
          로컬 개발 네트워크 <code>undeployed</code>
        </span>
      </header>
      <main className="mp-main">
        <div className="mp-heading">
          <div>
            <p className="mp-eyebrow">LESS DISCLOSURE. MORE CONFIDENCE.</p>
            <h1>
              관계의 시작에,
              <br />
              필요한 사실만.
            </h1>
            <p className="mp-lead">
              소득과 혼인 관련 서류를 다시 보내지 않아도,
              <br className="mp-desktop" /> 가입에 필요한 조건을 확인할 수
              있어요.
            </p>
          </div>
          <div className="mp-seal">
            <LockKeyhole size={26} />
            <div>
              <strong>서류 대신, 조건 확인</strong>
              <p>
                정확한 소득과 원본은 공개하지 않고
                <br />
                동의한 심사 결과만 전달해요.
              </p>
            </div>
            <span>POWERED BY MIDNIGHT</span>
          </div>
        </div>
        <div className="mp-demo-note">
          <span>DEVELOPMENT DEMO</span>
          {window.midnight?.matchproofTest
            ? "개발용 테스트 지갑 연결 준비됨 · 개발 거래 자동 서명 · "
            : ""}
          가상 자료 전용 · 공공기관 서류 연동 없음 · 확인 기준일의 상태를
          증명해요
        </div>
        <nav className="mp-tabs" aria-label="시연 역할">
          {(Object.keys(roles) as Role[]).map((r) => (
            <a
              aria-current={role === r ? "page" : undefined}
              className={role === r ? "active" : ""}
              key={r}
              href={
                busy
                  ? undefined
                  : `/matchproof?role=${r}${/^[a-f0-9]{64}$/i.test(address) ? `&address=${address}` : ""}`
              }
              aria-disabled={busy}
            >
              {r === "agency" ? (
                <Building2 size={18} />
              ) : r === "applicant" ? (
                <Fingerprint size={18} />
              ) : (
                <FileCheck2 size={18} />
              )}
              {roles[r]}
            </a>
          ))}
        </nav>
        <div className="mp-workspace">
          <div className="mp-primary">
            <div className="mp-section-heading">
              <div>
                <span className="mp-overline">
                  {role === "agency"
                    ? "REVIEW DESK"
                    : role === "applicant"
                      ? "MY PRIVATE CREDENTIALS"
                      : "DEMO ISSUER"}
                </span>
                <h2>
                  {role === "agency"
                    ? "서류 없는 가입 심사"
                    : role === "applicant"
                      ? "내 정보로, 내가 동의한 확인만"
                      : "가상 자료 확인과 자격 발급"}
                </h2>
              </div>
              <span className="mp-pill">
                {joined ? "배포 연결됨" : "연결 준비"}
              </span>
            </div>
            <details className="mp-card mp-setup" open={!snapshot && !joined}>
              <summary>
                <Wallet size={18} /> 개발 네트워크 연결 설정{" "}
                <span>{joined ? "연결됨" : "시작하기"}</span>
              </summary>
              <label>
                프로그램 배포 주소
                <input
                  value={address}
                  disabled={busy || joined}
                  spellCheck={false}
                  placeholder="64자리 배포 주소"
                  onChange={(e) => {
                    setAddress(e.target.value.trim());
                    setSnapshot(undefined);
                    setConsent(false);
                  }}
                />
              </label>
              <div className="mp-actions">
                <button
                  className="mp-button secondary"
                  disabled={busy || address.length !== 64}
                  onClick={() =>
                    run("로컬 체인에서 기록을 읽고 있어요…", async () => {
                      await refresh();
                      setNotice(
                        "별도 공개 인덱서에서 기록을 읽었어요. 신청자의 비공개 자료는 사용하지 않았어요.",
                      );
                    })
                  }
                >
                  <RefreshCw size={15} />
                  체인 기록 조회
                </button>
                <button
                  className="mp-text-button"
                  disabled={busy || joined}
                  onClick={() =>
                    run("최근 로컬 시연 배포를 확인하고 있어요…", async () => {
                      const response = await fetch("/matchproof-demo.json", {
                        cache: "no-store",
                      });
                      const locator = await response.json();
                      if (!/^[0-9a-f]{64}$/.test(locator.address))
                        throw new MatchError(
                          "먼저 로컬 네트워크 시연을 실행해 주세요.",
                        );
                      const next = await publicSnapshot(locator.address);
                      setAddress(locator.address);
                      setSnapshot(next);
                      setNotice(
                        "최근 시연 주소로 체인을 직접 조회했어요. 오래된 심사 결과는 기한 만료로 표시해요.",
                      );
                    })
                  }
                >
                  최근 시연 불러오기 <ArrowRight size={14} />
                </button>
              </div>
              {!client ? (
                <>
                  <div className="mp-rule" />
                  <label>
                    이 기기의 보관 암호
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder="16자 이상 · 문자/숫자/기호 조합"
                      disabled={busy}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <p className="mp-help">
                    지갑 복구 구문이 아닌 별도의 암호예요. 같은 지갑·역할·암호로
                    다시 연결하면 이 기기의 보관함을 열어요.
                  </p>
                  <button
                    className="mp-button"
                    disabled={busy || password.length < 16}
                    onClick={() =>
                      run(
                        "개발용 지갑과 암호화 보관함을 연결하고 있어요…",
                        async () => {
                          const next = await MatchClient.connect(
                            role,
                            password,
                          );
                          setClient(next);
                          setPassword("");
                          setDetails(await next.details());
                          setNotice(
                            "지갑이 연결됐어요. 배포 주소에 연결하거나, 검증기관에서 새로 배포해 주세요.",
                          );
                        },
                      )
                    }
                  >
                    <Wallet size={16} />
                    개발용 지갑 연결
                  </button>
                </>
              ) : (
                <>
                  <p className="mp-help">
                    {roles[role]}의 기기 보관함이 열렸어요. 역할을 바꾸면 화면을
                    새로 불러와요.
                  </p>
                  {!joined && (
                    <button
                      className="mp-button"
                      disabled={busy || address.length !== 64}
                      onClick={() =>
                        run("배포와 역할을 확인하고 있어요…", async () => {
                          await client.join(address);
                          await refresh();
                          setNotice(
                            "배포에 연결했어요. 저장된 개인 상태를 불러왔어요.",
                          );
                        })
                      }
                    >
                      이 배포에 연결 <ArrowRight size={16} />
                    </button>
                  )}
                </>
              )}
              {client && role === "agency" && (
                <label>
                  검증기관에 전달할 업체 등록값
                  <code className="mp-code">{details?.identity}</code>
                  <span className="mp-help">
                    새 배포 전에 검증기관에 이 공개 등록값을 전달해 주세요.
                  </span>
                </label>
              )}
              {client && role === "issuer" && !joined && (
                <>
                  <label>
                    업체가 전달한 등록값
                    <input
                      spellCheck={false}
                      value={agencyKey}
                      onChange={(e) => setAgencyKey(e.target.value.trim())}
                      disabled={busy}
                      placeholder="64자리 업체 등록값"
                    />
                  </label>
                  <button
                    className="mp-button"
                    disabled={busy || agencyKey.length !== 64}
                    onClick={() =>
                      run(
                        "새 심사 계약 배포 중 · 지갑 승인과 체인 확정을 기다려 주세요…",
                        async () => {
                          const hash = await client.deploy(agencyKey);
                          setAddress(client.address);
                          setTx(hash);
                          await refresh(client, client.address);
                          setNotice(
                            "개발 네트워크에 배포됐어요. 주소를 신청자와 업체에 공유해 주세요.",
                          );
                        },
                      )
                    }
                  >
                    개발 네트워크에 배포
                  </button>
                </>
              )}
            </details>
            <div
              className={`mp-notice ${error ? "error" : ""}`}
              role={error ? "alert" : "status"}
            >
              {busy ? (
                <RefreshCw className="mp-spin" size={18} />
              ) : error ? (
                <CircleHelp size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
              <span>{notice}</span>
            </div>
            {tx && (
              <details className="mp-transaction">
                <summary>
                  <CheckCheck size={16} /> 체인에서 확정된 거래
                </summary>
                <code>{tx}</code>
              </details>
            )}
            {role === "agency" && (
              <>
                <Section title="심사 현황">
                  <div className="mp-stats">
                    <div>
                      <span>등록된 심사 요청</span>
                      <strong>
                        {snapshot ? snapshot.requests.length : "—"}
                        <small>건</small>
                      </strong>
                    </div>
                    <div>
                      <span>확정된 심사 기록</span>
                      <strong>
                        {snapshot ? confirmed : "—"}
                        <small>건</small>
                      </strong>
                    </div>
                    <div>
                      <span>업체로 전달하는 원본</span>
                      <strong>
                        0<small>건</small>
                      </strong>
                    </div>
                  </div>
                  {snapshot ? (
                    <div className="mp-reviews">
                      {snapshot.requests.length === 0 ? (
                        <p className="mp-empty">
                          등록된 요청이 없어요. 아래에서 첫 심사를 시작해
                          주세요.
                        </p>
                      ) : (
                        snapshot.requests.map((r) => {
                          const state = reviewStatus(r, now);
                          return (
                            <article className="mp-review" key={r.key}>
                              <span className="mp-review-icon">
                                <FileCheck2 size={20} />
                              </span>
                              <div>
                                <strong>
                                  {details?.reviews[r.key]?.label ??
                                    `공개 요청 ${r.key.slice(0, 8)}`}
                                </strong>
                                <p>확인 기한 · {formatTime(r.expiresAt)}</p>
                                <code>{r.key.slice(0, 16)}…</code>
                                {r.confirmed && state === "expired" && (
                                  <p>
                                    과거 승인 기록 있음 · 현재 유효한 인증 아님
                                  </p>
                                )}
                              </div>
                              <span className={`mp-badge ${state}`}>
                                {state === "approved"
                                  ? "조건 충족"
                                  : state === "expired"
                                    ? "기한 만료"
                                    : "확인 미완료"}
                              </span>
                              {details?.reviews[r.key] && (
                                <button
                                  className="mp-icon-button"
                                  aria-label={`${details.reviews[r.key].label} 요청 파일 다시 받기`}
                                  onClick={() =>
                                    download(
                                      "matchproof-request.json",
                                      JSON.stringify(
                                        details.reviews[r.key].request,
                                        null,
                                        2,
                                      ),
                                    )
                                  }
                                >
                                  <FileDown size={18} />
                                </button>
                              )}
                            </article>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div className="mp-empty">
                      <FileCheck2 size={32} />
                      <h3>확인할 서류 대신, 확인할 결과.</h3>
                      <p>
                        배포 주소로 조회하거나 최근 시연을 불러오세요.
                        <br />
                        조회에는 지갑이나 신청자 자료가 필요하지 않아요.
                      </p>
                    </div>
                  )}
                </Section>
                <Section step="01" title="새 심사 요청">
                  <p className="mp-help">
                    신청자가 전달한 등록값으로 10분 동안 유효한 요청을 만들어요.
                    접수번호는 이 업체 기기에만 보관돼요.
                  </p>
                  <div className="mp-fields">
                    <label>
                      가상 접수번호
                      <input
                        value={label}
                        disabled={busy || !joined}
                        onChange={(e) => {
                          setLabel(e.target.value);
                          setFile(undefined);
                        }}
                      />
                    </label>
                    <label>
                      신청자 등록값
                      <input
                        value={holder}
                        disabled={busy || !joined}
                        spellCheck={false}
                        placeholder="신청자가 전달한 64자리 값"
                        onChange={(e) => {
                          setHolder(e.target.value.trim());
                          setFile(undefined);
                        }}
                      />
                    </label>
                  </div>
                  <button
                    className="mp-button"
                    disabled={busy || !joined || holder.length !== 64}
                    onClick={() =>
                      run(
                        "심사 요청 등록 중 · 아직 확정되지 않았어요…",
                        async () => {
                          const result = await client!.openReview(
                            holder,
                            label,
                          );
                          setTx(result.hash);
                          setFile({
                            name: "matchproof-request.json",
                            text: result.file,
                          });
                          await refresh();
                          setNotice(
                            "심사 요청이 확정됐어요. 요청 파일을 해당 신청자에게 전달해 주세요.",
                          );
                        },
                      )
                    }
                  >
                    심사 요청 만들기 <ArrowRight size={16} />
                  </button>
                  <p className="mp-help">
                    접수번호는 가상 세션 구분용이며, 실제 회원 로그인과 연결되지
                    않았어요.
                  </p>
                </Section>
              </>
            )}
            {role === "issuer" && (
              <Section step="01" title="모의 기관 자격 발급">
                <p className="mp-help">
                  가상 자료를 확인한 기관을 시연해요. 실제 서류를 입력하거나
                  업로드하지 마세요.
                </p>
                <label>
                  신청자 등록값
                  <input
                    spellCheck={false}
                    value={holder}
                    disabled={busy || !joined}
                    placeholder="신청자가 전달한 64자리 값"
                    onChange={(e) => {
                      setHolder(e.target.value.trim());
                      setFile(undefined);
                    }}
                  />
                </label>
                <label>
                  가상 확인 자료
                  <select
                    value={fixture}
                    disabled={busy || !joined}
                    onChange={(e) => {
                      setFixture(e.target.value as Fixture);
                      setFile(undefined);
                    }}
                  >
                    <option value="eligible">
                      2025년 6,500만 원 · 확인일에 혼인 중 아님
                    </option>
                    <option value="low-income">
                      2025년 3,000만 원 · 소득 조건 미충족
                    </option>
                    <option value="married">
                      2025년 6,500만 원 · 확인일에 혼인 중
                    </option>
                    <option value="stale">
                      8일 전 확인 · 최신성 조건 미충족
                    </option>
                  </select>
                </label>
                <button
                  className="mp-button"
                  disabled={busy || !joined || holder.length !== 64}
                  onClick={() =>
                    run(
                      "자격 발급 증명과 체인 확정을 기다리고 있어요…",
                      async () => {
                        const result = await client!.issue(holder, fixture);
                        setTx(result.hash ?? "");
                        setFile({
                          name: "matchproof-credential.json",
                          text: result.file,
                        });
                        await refresh();
                        setNotice(
                          "발급을 확인했어요. 자격증명 파일은 해당 신청자에게만 전달해 주세요.",
                        );
                      },
                    )
                  }
                >
                  가상 자격 발급 <ShieldCheck size={16} />
                </button>
                <p className="mp-help">
                  발급기관은 가상 원본 정보를 알아요. 업체에 원본을 다시
                  제출하지 않는 흐름을 검증해요.
                </p>
              </Section>
            )}
            {role === "applicant" && (
              <>
                <Section step="01" title="내 자격증명 준비">
                  <p className="mp-help">
                    배포에 연결한 뒤 등록값을 검증기관과 업체에 전달하세요. 이
                    값에 신청자 비밀키는 포함되지 않아요.
                  </p>
                  {joined && (
                    <label>
                      신청자 등록값
                      <code className="mp-code">{details?.identity}</code>
                    </label>
                  )}
                  <div className="mp-actions">
                    {fileInput("credential", "자격증명 가져오기")}
                    {fileInput("request", "심사 요청 가져오기")}
                  </div>
                  {details?.evidence && (
                    <div className="mp-private-data">
                      <span>
                        <LockKeyhole size={14} /> 나만 보는 가상 자료
                      </span>
                      <p>
                        {details.evidence.incomeYear.toString()}년 연간 소득{" "}
                        {money(details.evidence.annualIncomeKrw)}원
                      </p>
                      <p>
                        확인일에{" "}
                        {details.evidence.notCurrentlyMarried
                          ? "혼인 중 아님"
                          : "혼인 중"}
                      </p>
                      <p>
                        자료 확인 ·{" "}
                        {formatTime(Number(details.evidence.checkedAt))}
                      </p>
                    </div>
                  )}
                  <p className="mp-help">
                    가상 자료 파일은 이 기기에서만 읽어요. 실제 개인정보는
                    사용하지 않아요.
                  </p>
                </Section>
                <Section step="02" title="공개할 내용을 확인해 주세요">
                  {snapshot && details?.request && request ? (
                    <>
                      <dl className="mp-consent-details">
                        <div>
                          <dt>수신 업체</dt>
                          <dd>
                            이 배포에 등록된 데모 업체
                            <code>{snapshot.agency.slice(0, 16)}…</code>
                          </dd>
                        </div>
                        <div>
                          <dt>확인할 조건</dt>
                          <dd>
                            {snapshot.incomeYear}년 연간 소득{" "}
                            {money(snapshot.minimumIncomeKrw)}원 이상
                            <br />
                            확인 기준일에 혼인 중이 아님
                          </dd>
                        </div>
                        <div>
                          <dt>자료의 최신성</dt>
                          <dd>
                            심사 종료까지 확인 후 {snapshot.maxAgeDays}일 이내
                          </dd>
                        </div>
                        <div>
                          <dt>전달할 결과</dt>
                          <dd>조건 충족 사실과 요청 유효기간</dd>
                        </div>
                        <div>
                          <dt>확인 기한</dt>
                          <dd>{formatTime(request.expiresAt)}</dd>
                        </div>
                      </dl>
                      <p className="mp-help">
                        원본·정확한 소득·과거 혼인 이력은 전달하지 않아요. 성공
                        기록과 정책은 공개되므로, 요청이 본인과 연결되면 조건
                        충족 사실을 추론할 수 있어요.
                      </p>
                      <label className="mp-checkbox">
                        <input
                          type="checkbox"
                          checked={consent}
                          disabled={busy}
                          onChange={(e) => setConsent(e.target.checked)}
                        />
                        <span>
                          수신 업체와 위 조건을 확인했고, 이 요청의 심사 결과
                          공개에 동의해요.
                        </span>
                      </label>
                      <button
                        className="mp-button"
                        disabled={
                          busy ||
                          !consent ||
                          !details.evidence ||
                          reviewStatus(request, now) !== "pending"
                        }
                        onClick={() =>
                          run(
                            "증명 생성 → 지갑 승인 → 체인 확정 중 · 아직 심사 완료가 아니에요…",
                            async () => {
                              setTx(await client!.prove());
                              setConsent(false);
                              await refresh();
                              setNotice(
                                "심사 증명이 확정됐어요. 업체는 원본 없이 같은 기록을 확인할 수 있어요.",
                              );
                            },
                          )
                        }
                      >
                        <ShieldCheck size={17} />
                        동의하고 조건 증명하기
                      </button>
                      {reviewStatus(request, now) !== "pending" && (
                        <p className="mp-help">
                          {reviewStatus(request, now) === "expired"
                            ? "요청 기한이 만료됐어요. 새 요청을 받아 주세요."
                            : "이미 조건을 확인한 요청이에요."}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mp-empty">
                      업체가 만든 심사 요청 파일을 가져오면
                      <br />
                      수신자·조건·유효기간을 확인할 수 있어요.
                    </p>
                  )}
                </Section>
              </>
            )}
            {file && (
              <div className="mp-download">
                <FileDown size={24} />
                <div>
                  <strong>
                    {role === "issuer"
                      ? "신청자에게 전달할 자격증명"
                      : "신청자에게 전달할 심사 요청"}
                  </strong>
                  <p>
                    가상 비공개 자료가 포함돼요. 해당 신청자에게만 전달하세요.
                  </p>
                </div>
                <button
                  className="mp-button secondary"
                  onClick={() => download(file.name, file.text)}
                >
                  파일 받기
                </button>
              </div>
            )}
            {snapshot && (
              <div className="mp-bottom-actions">
                <button
                  disabled={busy}
                  className="mp-text-button"
                  onClick={() =>
                    run("최신 체인 상태를 확인하고 있어요…", async () => {
                      await refresh();
                      setNotice("최신 체인 기록을 확인했어요.");
                    })
                  }
                >
                  <RefreshCw size={15} />
                  최신 상태 확인
                </button>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`/matchproof?role=agency&address=${address}`}
                >
                  별도 업체 화면 열기 ↗
                </a>
              </div>
            )}
          </div>
          <aside className="mp-aside">
            <div className="mp-policy">
              <span className="mp-overline">DEMO POLICY</span>
              <h3>확인할 것은 두 가지.</h3>
              <div>
                <Check size={17} />
                <p>
                  {snapshot?.incomeYear ?? 2025}년 연간 소득
                  <br />
                  <strong>
                    {money(snapshot?.minimumIncomeKrw ?? "50000000")}원 이상
                  </strong>
                </p>
              </div>
              <div>
                <Check size={17} />
                <p>
                  자료 확인 기준일에
                  <br />
                  <strong>혼인 중이 아님</strong>
                </p>
              </div>
              <p className="mp-help">
                설명을 위한 가상 심사 기준이에요.
                <br />
                현재 연봉이나 현재 혼인 상태를 보증하지 않아요.
              </p>
            </div>
            <div className="mp-flow">
              <span className="mp-overline">HOW IT WORKS</span>
              <div>
                <span>1</span>
                <p>
                  <strong>기관이 확인하고</strong>가상 자료에 자격을 발급해요.
                </p>
              </div>
              <ArrowDown size={15} />
              <div>
                <span>2</span>
                <p>
                  <strong>신청자가 동의하면</strong>기기에서 조건을 증명해요.
                </p>
              </div>
              <ArrowDown size={15} />
              <div>
                <span>3</span>
                <p>
                  <strong>업체는 결과만</strong>원본 없이 확정 기록을 읽어요.
                </p>
              </div>
            </div>
            <div className="mp-boundary">
              <LockKeyhole size={20} />
              <h3>정보를 덜 보관하는 심사</h3>
              <p>
                원본을 보는 검증기관은 존재해요. 이 데모는 업체에 사본을 다시
                넘기지 않는 경계를 보여줘요.
              </p>
            </div>
          </aside>
        </div>
        <footer className="mp-footer">
          <span>matchproof · privacy by purpose</span>
          <span>Midnight 개발 네트워크 · 가상 자료만 사용</span>
        </footer>
      </main>
    </div>
  );
}
