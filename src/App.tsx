import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  GraduationCap,
  Info,
  Leaf,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Store,
  Utensils,
  X,
  CircleAlert,
  CalendarDays,
  Plus,
  EyeOff,
} from "lucide-react";
import type {
  ActionResult,
  DemoState,
  MerchantId,
  ProfileId,
  PublicState,
  Receipt,
} from "./types.ts";

type View = "student" | "merchant" | "issuer";
type Notice = { type: "success" | "error"; message: string };
const views = [
  { id: "student" as const, label: "내 식사 패스", icon: CreditCard },
  { id: "merchant" as const, label: "가맹점 확인", icon: Store },
  { id: "issuer" as const, label: "학교 관리", icon: GraduationCap },
];
const short = (text: string) => `${text.slice(0, 8)}…${text.slice(-6)}`;
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${date}T12:00:00+09:00`));
const timeLabel = (date: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(date));

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message ?? "요청을 처리하지 못했어요.");
  return data as T;
}

function ReceiptList({
  receipts,
  showDay = false,
}: {
  receipts: Receipt[];
  showDay?: boolean;
}) {
  if (!receipts.length)
    return (
      <div className="empty">
        <span className="empty-icon">
          <Utensils size={21} />
        </span>
        <p>아직 사용 내역이 없어요</p>
        <span>패스를 사용하면 이곳에서 확인할 수 있어요.</span>
      </div>
    );
  return (
    <div className="receipt-list">
      {receipts.map((receipt) => (
        <div className="receipt-row" key={receipt.nullifier}>
          <span className="receipt-icon">
            <ArrowDownLeft size={19} />
          </span>
          <div className="receipt-main">
            <strong>{receipt.merchantName}</strong>
            <span>
              {showDay
                ? `${new Date(receipt.at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} · `
                : ""}
              {timeLabel(receipt.at)} · 식사 패스
            </span>
          </div>
          <div className="receipt-end">
            <strong>1회 사용</strong>
            <code title={receipt.nullifier}>{short(receipt.nullifier)}</code>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("student");
  const [state, setState] = useState<DemoState | null>(null);
  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [profileId, setProfileId] = useState<ProfileId>("student-a");
  const [merchantId, setMerchantId] = useState<MerchantId>("campus-kitchen");
  const [history, setHistory] = useState<Receipt[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [fatal, setFatal] = useState("");
  const [info, setInfo] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView({ block: "nearest" });
  }, [notice]);

  const refresh = useCallback(async () => {
    const next = await api<DemoState>("/state");
    setState(next);
    setPublicState(await api<PublicState>("/merchant-state"));
    setFatal("");
  }, []);
  useEffect(() => {
    refresh().catch(() =>
      setFatal(
        "로컬 시연 서버에 연결하지 못했어요. 서버가 실행 중인지 확인해 주세요.",
      ),
    );
  }, [refresh]);
  useEffect(() => {
    let active = true;
    api<Receipt[]>(`/history/${profileId}`)
      .then((value) => {
        if (active) setHistory(value);
      })
      .catch(() => {
        if (active) setHistory([]);
      });
    return () => {
      active = false;
    };
  }, [profileId, state]);
  useEffect(() => {
    const titles = {
      student: "내 식사 패스",
      merchant: "가맹점 확인",
      issuer: "학교 관리",
    };
    document.title = `QuietPass · ${titles[view]}`;
  }, [view]);
  useEffect(() => {
    if (!info && !resetConfirm) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setInfo(false);
        setResetConfirm(false);
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input, select, [tabindex="0"]',
        ),
      ];
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [info, resetConfirm]);

  async function action(path: string, body: unknown = {}) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    setLastReceipt(null);
    try {
      const result = await api<ActionResult>(path, body);
      setNotice({ type: "success", message: result.message });
      if (result.receipt) setLastReceipt(result.receipt);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error ? error.message : "처리 중 문제가 생겼어요.",
      });
    } finally {
      try {
        await refresh();
      } catch {
        setFatal("최신 상태를 가져오지 못했어요. 다시 연결해 주세요.");
      }
      setBusy(false);
    }
  }
  function navigate(next: View) {
    setView(next);
    setNotice(null);
    setLastReceipt(null);
  }

  const profile = state?.profiles.find((p) => p.id === profileId);
  const merchant = state?.merchants.find((m) => m.id === merchantId);
  const available = !!profile?.issued && !profile.usedToday;
  const merchantReceipts =
    publicState?.receipts.filter((r) => r.merchantId === merchantId) ?? [];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        본문으로 바로가기
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("student");
          }}
          aria-label="QuietPass 홈"
        >
          <span className="brand-mark">
            q<span>·</span>
          </span>
          <span>
            quietpass<span className="brand-period">.</span>
          </span>
        </a>
        <div className="workspace-label">CAMPUS MEAL PROGRAM</div>
        <nav aria-label="시연 역할">
          {views.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
              {view === id && <ChevronRight size={16} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={24} />
            <p>
              필요한 자격만 확인하고,
              <br />
              개인정보는 지켜요.
            </p>
            <button onClick={() => setInfo(true)}>
              어떻게 보호하나요? <ArrowRight size={14} />
            </button>
          </div>
          <div className="built-on">
            <span className="midnight-moon">◒</span>
            <span>Built for Midnight</span>
          </div>
          <span className="sidebar-caption">KOREA HACKATHON 2026</span>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <a className="text-link" href="/network">
            개발용 네트워크 연결
          </a>
          <div className="breadcrumb">
            캠퍼스 식사 지원<span>/</span>
            <strong>{views.find((v) => v.id === view)?.label}</strong>
          </div>
          <button className="demo-badge" onClick={() => setInfo(true)}>
            <span />
            로컬 데모
            <Info size={14} />
          </button>
        </header>
        <main id="main" tabIndex={-1}>
          {fatal ? (
            <div className="connection-error" role="alert">
              <CircleAlert size={26} />
              <h1>연결을 확인해 주세요</h1>
              <p>{fatal}</p>
              <button
                className="primary"
                onClick={() => refresh().catch(() => {})}
              >
                다시 연결하기
              </button>
            </div>
          ) : !state || !profile ? (
            <div className="loading" role="status">
              식사 패스를 불러오고 있어요…
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    {view === "student"
                      ? "A LITTLE LESS SHARED. A LITTLE MORE CARE."
                      : view === "merchant"
                        ? "VERIFY THE PASS. RESPECT THE PERSON."
                        : "SUPPORT STARTS HERE."}
                  </p>
                  <h1>
                    {view === "student"
                      ? "오늘의 식사 패스"
                      : view === "merchant"
                        ? "패스 사용 확인"
                        : "학생에게 전하는 한 끼"}
                  </h1>
                  <p className="page-description">
                    {view === "student"
                      ? "지원 자격만 확인하고, 편안하게 식사하세요."
                      : view === "merchant"
                        ? "개인정보 없이 승인된 사용 기록을 확인하세요."
                        : "확인된 지원 대상에게 식사 패스를 발급하세요."}
                  </p>
                </div>
                <div className="today">
                  <CalendarDays size={17} />
                  <span>{dateLabel(state.date)}</span>
                </div>
              </div>

              {notice && (
                <div
                  ref={noticeRef}
                  className={`notice ${notice.type}`}
                  role={notice.type === "error" ? "alert" : "status"}
                >
                  {notice.type === "success" ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <CircleAlert size={20} />
                  )}
                  <span>{notice.message}</span>
                  <button
                    aria-label="알림 닫기"
                    onClick={() => setNotice(null)}
                  >
                    <X size={17} />
                  </button>
                </div>
              )}

              {view === "student" && (
                <>
                  <div className="student-toolbar">
                    <div className="person">
                      <span className="avatar">{profile.name.slice(0, 1)}</span>
                      <div>
                        <strong>
                          {profile.name}
                          {profileId !== "visitor" ? " 학생" : ""}
                        </strong>
                        <span>가상의 시연 사용자</span>
                      </div>
                    </div>
                    <label className="select-label">
                      <span>시연 사용자</span>
                      <select
                        aria-label="시연 사용자"
                        value={profileId}
                        disabled={busy}
                        onChange={(e) => {
                          setProfileId(e.target.value as ProfileId);
                          setNotice(null);
                          setLastReceipt(null);
                        }}
                      >
                        {state.profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.eligible ? "" : " · 자격 없음"}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="student-grid">
                    <section className="pass-column" aria-label="내 패스">
                      <div
                        className={`meal-pass ${!available ? "inactive-pass" : ""}`}
                      >
                        <div className="pass-top">
                          <span>
                            <Utensils size={17} /> CAMPUS MEAL PASS
                          </span>
                          <span className="pass-state">
                            {profile.usedToday
                              ? "오늘 사용 완료"
                              : profile.issued
                                ? "사용 가능"
                                : "발급 대기"}
                          </span>
                        </div>
                        <div className="pass-balance">
                          <span>오늘 남은 식사</span>
                          <div>
                            {available ? "1" : "0"}
                            <span>회</span>
                          </div>
                        </div>
                        <div className="pass-rule">
                          <span>어느 제휴 식당에서든, 하루 한 번.</span>
                          <ArrowRight size={21} />
                        </div>
                        <div className="pass-bottom">
                          <span>
                            <LockKeyhole size={14} /> 가맹점에 이름을 전달하지
                            않아요
                          </span>
                          <span>quietpass.</span>
                        </div>
                      </div>
                      <div className="pass-helper">
                        <Clock3 size={16} />
                        <span>
                          {profile.usedToday
                            ? "다음 식사 패스는 한국 시간 자정에 사용할 수 있어요."
                            : profile.issued
                              ? "한국 시간 자정까지 사용할 수 있어요."
                              : "학교에서 패스를 발급하면 사용할 수 있어요."}
                        </span>
                      </div>
                      {!profile.issued && (
                        <button
                          className="outline wide"
                          onClick={() => navigate("issuer")}
                        >
                          학교 발급 화면으로 <ArrowRight size={16} />
                        </button>
                      )}
                      <div className="privacy-note">
                        <span className="privacy-icon">
                          <EyeOff size={21} />
                        </span>
                        <div>
                          <strong>설명하지 않아도 괜찮아요.</strong>
                          <p>
                            가맹점에는 패스의 사용 가능 여부만 전달해요.
                            <br />
                            이름, 학번, 지원 사유는 전달하지 않아요.
                          </p>
                          <button
                            className="text-link"
                            onClick={() => setInfo(true)}
                          >
                            데이터 공개 범위 보기 <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </section>
                    <section className="panel redeem-panel">
                      <div className="section-heading">
                        <h2>어디에서 식사할까요?</h2>
                        <span className="subtle">제휴 식당 2곳</span>
                      </div>
                      <p className="section-description">
                        식당을 선택하고 패스를 사용하세요.
                      </p>
                      <fieldset className="merchant-options">
                        <legend className="sr-only">사용할 식당</legend>
                        {state.merchants.map((m) => (
                          <label
                            key={m.id}
                            className={`merchant-option ${merchantId === m.id ? "selected" : ""}`}
                          >
                            <input
                              type="radio"
                              name="merchant"
                              value={m.id}
                              checked={merchantId === m.id}
                              disabled={busy}
                              onChange={() => {
                                setMerchantId(m.id);
                                setNotice(null);
                                setLastReceipt(null);
                              }}
                            />
                            <span
                              className={`merchant-avatar ${m.id === "green-table" ? "green" : ""}`}
                            >
                              {m.id === "green-table" ? (
                                <Leaf size={23} />
                              ) : (
                                <Utensils size={23} />
                              )}
                            </span>
                            <span className="merchant-info">
                              <strong>{m.name}</strong>
                              <span>{m.description}</span>
                            </span>
                            <span className="radio-visual">
                              {merchantId === m.id && <span />}
                            </span>
                          </label>
                        ))}
                      </fieldset>
                      <div className="redeem-summary">
                        <span>사용할 패스</span>
                        <strong>식사 1회</strong>
                      </div>
                      <button
                        className="primary wide"
                        disabled={busy || !available}
                        onClick={() =>
                          action("/redeem", { profileId, merchantId })
                        }
                      >
                        {busy
                          ? "확인하고 있어요…"
                          : profile.usedToday
                            ? "오늘의 패스를 사용했어요"
                            : !profile.issued
                              ? "패스 발급이 필요해요"
                              : "이 식당에서 사용하기"}
                        {available && !busy && <ArrowRight size={18} />}
                      </button>
                      <p className="action-caption">
                        {available
                          ? "사용하면 오늘의 식사 횟수가 1회 차감돼요."
                          : "아래 시연 도구에서 거절되는 상황도 확인할 수 있어요."}
                      </p>
                    </section>
                  </div>

                  {lastReceipt && (
                    <div className="success-receipt">
                      <CheckCircle2 size={24} />
                      <div>
                        <strong>
                          {lastReceipt.merchantName}에서 사용이 승인됐어요.
                        </strong>
                        <p>
                          공개 사용 번호{" "}
                          <code>{short(lastReceipt.nullifier)}</code>
                        </p>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => navigate("merchant")}
                      >
                        가맹점에서 보기 <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                  <section className="panel history-panel">
                    <div className="section-heading">
                      <h2>나의 사용 내역</h2>
                      <span className="subtle">이 시연 사용자에게만 표시</span>
                    </div>
                    <ReceiptList receipts={history} showDay />
                  </section>
                  <details className="demo-tools">
                    <summary>
                      <span>
                        <ShieldCheck size={16} />
                        거절 상황 시연하기
                      </span>
                      <Plus size={16} />
                    </summary>
                    <p>
                      선택한 사용자와 식당으로 컨트랙트에 직접 요청해요. 중복
                      사용 또는 미발급 패스는 거절됩니다.
                    </p>
                    <button
                      className="outline"
                      disabled={busy}
                      onClick={() =>
                        action("/redeem", { profileId, merchantId })
                      }
                    >
                      {busy ? "확인 중…" : "선택한 패스로 사용 요청 보내기"}
                      <ArrowRight size={16} />
                    </button>
                  </details>
                </>
              )}

              {view === "merchant" && publicState && (
                <>
                  <div className="merchant-toolbar">
                    <label className="select-label">
                      <span>가맹점</span>
                      <select
                        value={merchantId}
                        onChange={(e) =>
                          setMerchantId(e.target.value as MerchantId)
                        }
                      >
                        {state.merchants.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="privacy-pill">
                      <LockKeyhole size={14} />
                      학생 개인정보 미표시
                    </span>
                  </div>
                  <div className="stats-grid">
                    <div className="stat">
                      <span>오늘 승인한 식사</span>
                      <strong>
                        {
                          merchantReceipts.filter((r) => r.day === state.day)
                            .length
                        }
                        <small>회</small>
                      </strong>
                    </div>
                    <div className="stat">
                      <span>누적 승인</span>
                      <strong>
                        {merchantReceipts.length}
                        <small>회</small>
                      </strong>
                    </div>
                    <div className="stat stat-dark">
                      <ShieldCheck size={24} />
                      <div>
                        <strong>자격만 확인해요</strong>
                        <p>이름 · 학번 · 지원 사유 미표시</p>
                      </div>
                    </div>
                  </div>
                  <section className="panel">
                    <div className="section-heading">
                      <h2>{merchant?.name} 사용 기록</h2>
                      <button
                        className="text-link"
                        onClick={() =>
                          refresh().catch(() =>
                            setFatal("최신 상태를 가져오지 못했어요."),
                          )
                        }
                      >
                        <RotateCcw size={14} />
                        새로고침
                      </button>
                    </div>
                    <ReceiptList receipts={merchantReceipts} showDay />
                  </section>
                  <div className="explanation-strip">
                    <Info size={19} />
                    <p>
                      사용 번호는 패스별·날짜별로 달라져요. 같은 날 다른
                      식당에서 다시 사용해도 중복 요청으로 거절돼요.
                    </p>
                  </div>
                  <details className="public-record">
                    <summary>
                      공개 기록 살펴보기 <ChevronRight size={16} />
                    </summary>
                    <dl>
                      <dt>프로그램 식별자</dt>
                      <dd>
                        <code>{publicState.programId}</code>
                      </dd>
                      <dt>자격 목록의 Merkle root</dt>
                      <dd>
                        <code>{publicState.root}</code>
                      </dd>
                      <dt>공개하는 항목</dt>
                      <dd>
                        프로그램, 사용 날짜, 가맹점, 사용 번호, 발급·사용 수
                      </dd>
                      <dt>포함하지 않는 항목</dt>
                      <dd>이름, 학번, 지원 사유, 학생의 비밀키</dd>
                    </dl>
                  </details>
                </>
              )}

              {view === "issuer" && (
                <>
                  <div className="school-banner">
                    <div className="school-icon">
                      <GraduationCap size={27} />
                    </div>
                    <div>
                      <strong>QuietPass 데모 대학교</strong>
                      <p>2026 가을학기 식사 지원 · 하루 1회 · 가맹점 2곳</p>
                    </div>
                    <span className="small-badge">모의 발급기관</span>
                  </div>
                  <div className="stats-grid">
                    <div className="stat">
                      <span>패스 발급</span>
                      <strong>
                        {state.issuedCount}
                        <small>명</small>
                      </strong>
                    </div>
                    <div className="stat">
                      <span>오늘 사용</span>
                      <strong>
                        {state.todayCount}
                        <small>회</small>
                      </strong>
                    </div>
                    <div className="stat">
                      <span>누적 식사 지원</span>
                      <strong>
                        {state.redeemedCount}
                        <small>회</small>
                      </strong>
                    </div>
                  </div>
                  <section className="panel issuer-panel">
                    <div className="section-heading">
                      <h2>지원 대상 및 패스 발급</h2>
                      <span className="subtle">
                        실제 개인정보가 아닌 시연 데이터
                      </span>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>학생</th>
                            <th>지원 자격</th>
                            <th>패스 상태</th>
                            <th>
                              <span className="sr-only">발급 작업</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.profiles.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <strong>{p.name}</strong>
                                <span className="table-secondary">
                                  {p.studentNumber}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`status-tag ${p.eligible ? "positive" : "neutral"}`}
                                >
                                  {p.eligible ? (
                                    <Check size={13} />
                                  ) : (
                                    <X size={13} />
                                  )}
                                  {p.eligible ? "확인 완료" : "대상 아님"}
                                </span>
                              </td>
                              <td>{p.issued ? "발급 완료" : "미발급"}</td>
                              <td>
                                <button
                                  className="table-action"
                                  disabled={busy || p.issued || !p.eligible}
                                  onClick={() =>
                                    action("/issue", { profileId: p.id })
                                  }
                                >
                                  {p.issued
                                    ? "발급 완료"
                                    : p.eligible
                                      ? "패스 발급"
                                      : "발급 불가"}
                                  {!p.issued && p.eligible && (
                                    <Plus size={14} />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="table-footnote">
                      <LockKeyhole size={15} />이 목록의 이름과 학번은 가맹점
                      공개 기록에 포함되지 않아요.
                    </div>
                  </section>
                  <div className="issuer-bottom">
                    <div className="panel">
                      <h2>발급 후에는</h2>
                      <p className="section-description">
                        학생 화면에서 사용자를 선택하고 식당에서 패스를 사용해
                        보세요.
                      </p>
                      <button
                        className="text-link"
                        onClick={() => navigate("student")}
                      >
                        학생 화면 열기 <ArrowRight size={16} />
                      </button>
                    </div>
                    <div className="panel">
                      <h2>다음 날도 확인해 보세요</h2>
                      <p className="section-description">
                        로컬 시연 시간을 하루 옮겨 새 패스 사용과 날짜별 사용
                        번호를 확인해요.
                      </p>
                      <button
                        className="text-link"
                        disabled={busy}
                        onClick={() => action("/next-day")}
                      >
                        시연 날짜 하루 넘기기 <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              <footer className="page-footer">
                <span>
                  실제 Compact 컨트랙트 실행 · ZK 증명 및 테스트넷 연결 전
                </span>
                <button disabled={busy} onClick={() => setResetConfirm(true)}>
                  <RotateCcw size={13} />
                  시연 초기화
                </button>
              </footer>
            </>
          )}
        </main>
      </div>

      {info && (
        <div className="modal-backdrop" onClick={() => setInfo(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="설명 닫기"
              onClick={() => setInfo(false)}
              autoFocus
            >
              <X size={20} />
            </button>
            <span className="modal-icon">
              <ShieldCheck size={29} />
            </span>
            <p className="eyebrow">PRIVACY, WITH CLEAR BOUNDARIES</p>
            <h2 id="privacy-title">무엇을 공개하나요?</h2>
            <div className="disclosure-row">
              <span>가맹점에 표시</span>
              <p>사용 승인, 날짜, 가맹점, 일회성 사용 번호</p>
            </div>
            <div className="disclosure-row">
              <span>가맹점에 미표시</span>
              <p>학생 이름, 학번, 지원 사유, 비밀키</p>
            </div>
            <div className="demo-disclosure">
              <strong>현재는 로컬 시뮬레이터예요.</strong>
              <p>
                실제 Compact 컨트랙트의 규칙을 실행하지만 ZK 증명을 생성하거나
                블록체인에 제출하지 않아요. 시연 서버는 가상 사용자의 비밀키를
                보유해요. 실제 서비스에서는 학생 기기에서 증명을 생성해야 해요.
              </p>
              <p>
                발급기관은 자격 확인을 위해 신원을 알고 있어요. 지갑·접속 시간
                등에서 생길 수 있는 연결 가능성은 별도로 검토해야 해요.
              </p>
            </div>
            <button className="primary wide" onClick={() => setInfo(false)}>
              확인했어요
            </button>
          </section>
        </div>
      )}
      {resetConfirm && (
        <div className="modal-backdrop">
          <section
            className="modal small-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">시연을 처음부터 시작할까요?</h2>
            <p>이 브라우저의 가상 패스와 사용 내역이 초기화돼요.</p>
            <div className="modal-actions">
              <button
                className="outline"
                onClick={() => setResetConfirm(false)}
                autoFocus
              >
                취소
              </button>
              <button
                className="primary"
                onClick={() => {
                  setResetConfirm(false);
                  action("/reset");
                }}
              >
                초기화하기
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
