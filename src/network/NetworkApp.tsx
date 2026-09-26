import { useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Store,
  GraduationCap,
  CreditCard,
} from "lucide-react";
import {
  NetworkClient,
  publicSnapshot,
  type Network,
  type PublicSnapshot,
} from "./client.ts";
import { merchants, type ActorRole } from "./model.ts";
import "./network.css";
import { hasErrorCode } from "./errors.ts";

export default function NetworkApp() {
  const params = new URLSearchParams(location.search);
  const [network, setNetwork] = useState<Network>(
    params.get("network") === "preprod" ? "preprod" : "undeployed",
  );
  const [role, setRole] = useState<ActorRole | "merchant">(
    params.get("role") === "merchant" ? "merchant" : "student",
  );
  const [address, setAddress] = useState(params.get("address") ?? "");
  const [password, setPassword] = useState("");
  const [client, setClient] = useState<NetworkClient>();
  const [snapshot, setSnapshot] = useState<PublicSnapshot>();
  const [student, setStudent] =
    useState<Awaited<ReturnType<NetworkClient["studentStatus"]>>>();
  const [commitment, setCommitment] = useState("");
  const [studentId, setStudentId] = useState("DEMO-001");
  const [merchant, setMerchant] = useState("campus-kitchen");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "프로그램 주소로 연결하거나, 학교 역할에서 새 프로그램을 배포하세요.",
  );
  const [failed, setFailed] = useState(false);
  const [txHash, setTxHash] = useState("");
  async function refresh(target = address, activeClient = client) {
    setSnapshot(await publicSnapshot(network, target));
    if (activeClient?.address && role === "student")
      setStudent(await activeClient.studentStatus());
  }
  async function run(label: string, action: () => Promise<void>) {
    setBusy(true);
    setFailed(false);
    setMessage(label);
    setTxHash("");
    try {
      await action();
    } catch (error) {
      setFailed(true);
      const raw = error instanceof Error ? error.message : "";
      const known: Record<string, string> = {
        ALREADY_REDEEMED:
          "오늘은 이미 사용했어요. 다른 식당에서도 재사용할 수 없어요.",
        MEMBERSHIP_MISSING: "학교에서 아직 발급하지 않은 패스예요.",
        DAY_EXPIRED: "증명 중 날짜가 바뀌었어요. 상태를 새로 확인해 주세요.",
        MEMBERSHIP_INVALID:
          "발급 목록이 변경됐어요. 상태를 갱신한 뒤 다시 시도해 주세요.",
        PasswordValidationError:
          "보관 암호는 16자 이상, 대문자·소문자·숫자·기호 중 3종류 이상으로 설정해 주세요.",
      };
      const match = Object.keys(known).find((k) => hasErrorCode(error, k));
      // SDK errors may contain transaction internals. Never render arbitrary payloads.
      setMessage(
        match
          ? known[match]
          : /[가-힣]/.test(raw) && raw.length < 220
            ? raw
            : "연결 또는 거래를 완료하지 못했어요. 지갑 승인·잔액, 보관 암호, 로컬 증명 서버와 네트워크 상태를 확인하세요. 제출 후 오류라면 원장에서 결과를 먼저 확인하세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  const connected = !!client?.address;
  return (
    <div className="network-page">
      <header className="network-header">
        <a className="brand" href="/">
          quietpass<span className="brand-period">.</span>
        </a>
        <a href="/">
          시뮬레이터 보기 <ArrowRight size={14} />
        </a>
      </header>
      <main>
        <p className="eyebrow">PRIVATE ELIGIBILITY. SHARED VERIFICATION.</p>
        <h1>한 끼를 위한, 필요한 확인만.</h1>
        <p className="network-intro">
          학교는 자격을 발급하고, 학생은 패스를 사용하고, 식당은 확정된 사용을
          확인해요.
        </p>
        <div className="network-mode">
          <ShieldCheck size={18} />
          <strong>개발용 네트워크 연결</strong>
          <span>
            {network === "undeployed" ? "로컬 개발 네트워크 (undeployed)" : "Preprod 테스트넷"} ·
            시뮬레이터로 자동 전환하지 않아요
          </span>
        </div>
        <section className="panel">
          <div className="network-roles">
            {[
              { id: "student", name: "학생", Icon: CreditCard },
              { id: "issuer", name: "학교", Icon: GraduationCap },
              { id: "merchant", name: "식당", Icon: Store },
            ].map(({ id, name, Icon }) => (
              <button
                key={id}
                className={`outline ${role === id ? "selected" : ""}`}
                disabled={busy || !!client}
                onClick={() => {
                  setRole(id as typeof role);
                  setSnapshot(undefined);
                  setStudent(undefined);
                }}
              >
                <Icon size={18} />
                {name}
              </button>
            ))}
          </div>
          <div className="network-fields">
            <label>
              네트워크
              <select
                disabled={busy || !!client}
                value={network}
                onChange={(e) => {
                  setNetwork(e.target.value as Network);
                  setSnapshot(undefined);
                }}
              >
                <option value="undeployed">로컬 개발 네트워크 (undeployed)</option>
                <option value="preprod">Preprod 테스트넷</option>
              </select>
            </label>
            <label className="network-wide">
              프로그램 배포 주소
              <input
                spellCheck={false}
                value={address}
                disabled={busy || connected}
                placeholder="64자리 컨트랙트 주소"
                onChange={(e) => {
                  setAddress(e.target.value.trim());
                  setSnapshot(undefined);
                }}
              />
            </label>
          </div>
          {role !== "merchant" && !client && (
            <>
              <label>
                이 기기의 패스 보관 암호
                <input
                  type="password"
                  value={password}
                  autoComplete="off"
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="16자 이상 · 문자/숫자/기호 조합"
                />
              </label>
              <p className="section-description">
                이 암호로 기기의 개인 상태를 암호화해요. 새로고침 후 같은 지갑과
                암호로 연결하세요. 지갑 복구 구문을 입력하지 마세요.
                암호·브라우저 데이터 분실 복구는 지원하지 않아요.
              </p>
              <button
                className="primary"
                disabled={busy || password.length < 16}
                onClick={() =>
                  run(
                    "지갑 연결과 개인 보관함을 확인하고 있어요…",
                    async () => {
                      const next = await NetworkClient.connect(
                        network,
                        role,
                        password,
                      );
                      setClient(next);
                      setPassword("");
                      setMessage(
                        "지갑이 연결됐어요. 프로그램에 연결하거나 학교에서 새로 배포하세요.",
                      );
                    },
                  )
                }
              >
                지갑 연결
              </button>
            </>
          )}
          <div className="network-actions">
            {role === "merchant" ? (
              <button
                className="primary"
                disabled={busy || address.length !== 64}
                onClick={() =>
                  run("체인에서 사용 기록을 읽고 있어요…", async () => {
                    await refresh();
                    setMessage("공개 원장에서 사용 기록을 확인했어요.");
                  })
                }
              >
                공개 원장 확인
              </button>
            ) : (
              client && (
                <>
                  <button
                    className="primary"
                    disabled={busy || connected || address.length !== 64}
                    onClick={() =>
                      run(
                        "프로그램과 개인 패스를 연결하고 있어요…",
                        async () => {
                          await client.join(address);
                          await refresh();
                          setMessage("프로그램에 연결했어요.");
                        },
                      )
                    }
                  >
                    프로그램 연결
                  </button>
                  {role === "issuer" && (
                    <button
                      className="outline"
                      disabled={busy || connected}
                      onClick={() =>
                        run(
                          "배포 중 · 지갑 승인과 체인 확정을 기다려 주세요…",
                          async () => {
                            const hash = await client.deploy();
                            setAddress(client.address);
                            setTxHash(hash);
                            setMessage(
                              "프로그램 배포가 체인에서 확정됐어요. 주소를 학생과 식당에 공유하세요.",
                            );
                            await refresh(client.address);
                          },
                        )
                      }
                    >
                      새 프로그램 배포
                    </button>
                  )}
                  {connected && (
                    <button
                      className="outline"
                      disabled={busy}
                      onClick={() =>
                        run("최신 원장을 읽고 있어요…", async () => {
                          await refresh();
                          setMessage("최신 상태를 확인했어요.");
                        })
                      }
                    >
                      상태 새로 확인
                    </button>
                  )}
                  <a href="/network">역할·지갑 변경</a>
                </>
              )
            )}
          </div>
        </section>
        <div
          className={`notice ${failed ? "error" : "success"}`}
          role={failed ? "alert" : "status"}
        >
          {busy && <span className="network-spinner" />}
          <span>{message}</span>
        </div>
        {txHash && (
          <div className="panel network-hash">
            <strong>확정된 거래</strong>
            <code>{txHash}</code>
          </div>
        )}
        {connected && role === "student" && student && (
          <section className="panel">
            <h2>내 식사 패스</h2>
            <p>
              {!student.issued
                ? "학교 발급 대기"
                : student.used
                  ? "오늘 이용 완료"
                  : "오늘 이용 가능"}
            </p>
            <label>
              학교에 전달할 자격 등록값
              <textarea readOnly value={student.commitment} />
            </label>
            <p className="section-description">
              이 등록값만 학교에 전달하세요. 학생 비밀키는 화면에 표시하거나
              학교로 보내지 않아요.
            </p>
            <label>
              이용 식당
              <select
                disabled={busy}
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              >
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                run(
                  "증명 생성·지갑 승인·체인 확정 중 · 아직 사용 승인이 아니에요…",
                  async () => {
                    const hash = await client.redeem(merchant);
                    setTxHash(hash);
                    setMessage(
                      "식사 패스 사용이 체인에서 확정됐어요. 식당 화면에서도 확인하세요.",
                    );
                    await refresh();
                  },
                )
              }
            >
              {student.used || !student.issued
                ? "거절 시나리오 확인"
                : "이 식당에서 사용하기"}
            </button>
          </section>
        )}
        {connected && role === "issuer" && (
          <section className="panel">
            <h2>모의 자격 발급</h2>
            <p className="section-description">
              가상 명부만 사용해요. 학사 시스템 연동은 없으며 동일 학생의 중복
              발급은 이 학교 브라우저에서 통제해요.
            </p>
            <label>
              학생
              <select
                value={studentId}
                disabled={busy}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option>DEMO-001</option>
                <option>DEMO-002</option>
                <option value="VISITOR">미등록 방문자</option>
              </select>
            </label>
            <label>
              학생이 전달한 자격 등록값
              <textarea
                value={commitment}
                spellCheck={false}
                disabled={busy}
                onChange={(e) => setCommitment(e.target.value.trim())}
              />
            </label>
            <button
              className="primary"
              disabled={busy || commitment.length !== 64}
              onClick={() =>
                run(
                  "발급 중 · 지갑 승인과 체인 확정을 기다려 주세요…",
                  async () => {
                    const hash = await client.issue(studentId, commitment);
                    setTxHash(hash);
                    setMessage("자격 발급이 체인에서 확정됐어요.");
                    await refresh();
                  },
                )
              }
            >
              자격 발급
            </button>
          </section>
        )}
        {snapshot && (
          <section className="panel">
            <h2>식당이 확인하는 공개 기록</h2>
            <p>
              발급 {snapshot.issued}건 · 누적 사용 {snapshot.redeemed}건
            </p>
            <p className="section-description">
              이름·학번·지원 사유는 포함되지 않아요. 날짜와 식당 등 공개 정보로
              생기는 연결 가능성은 남아 있어요.
            </p>
            <a
              href={`/network?role=merchant&network=${network}&address=${address}`}
              target="_blank"
              rel="noreferrer"
            >
              별도 식당 화면 열기 ↗
            </a>
            {snapshot.receipts.length ? (
              <ul className="network-receipts">
                {snapshot.receipts.map((r) => (
                  <li key={r.nullifier}>
                    <strong>{r.merchant}</strong>
                    <span>확정된 사용 1건</span>
                    <code>{r.nullifier}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="subtle">아직 확정된 사용 기록이 없어요.</p>
            )}
          </section>
        )}
        <footer className="page-footer">
          학교 1곳 · 식당 2곳 · 하루 1회 · 실제 결제·정산 제외
        </footer>
      </main>
    </div>
  );
}
