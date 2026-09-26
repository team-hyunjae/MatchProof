# MatchProof / QuietPass 개발 작업공간

현재 우선 후보는 결혼정보업체의 소득·혼인 조건을 원본 서류 공유 없이 확인하는 **MatchProof**다. `/matchproof`에서 모의 검증기관·신청자·업체 화면을 실행한다. 로컬 개발 네트워크(`undeployed`)에서 새 계약의 발급·심사 요청·ZK 증명·별도 업체 조회를 검증했다.

- [MatchProof 실행·역할별 시연 순서](docs/matchproof-runbook.md)
- [심사위원 데모 가이드 — 역할·클릭 순서·검증 기준](docs/matchproof-judge-guide.md)
- [개발 범위와 개인정보 공개 경계](docs/matchproof-plan.md)
- [개발 네트워크·브라우저 검증 기록](docs/matchproof-verification.md)
- `npm run matchproof:compile`: 증명 키 생성.
- `npm run matchproof:smoke`: 로컬 개발 체인 통합 검사. 결과는 `artifacts/matchproof-smoke.json`.

브라우저 지갑은 개발 네트워크용 Connector 4.x와 기기의 증명 서버를 사용한다. 원본 서류 API·실제 회원 로그인은 아직 연동하지 않는다. 아래는 이전 QuietPass 후보의 실행·검증 기록이다. 동일 작업공간에 보존하고 있다.

## 이전 후보: QuietPass

학교가 발급한 식사 자격을 학생 신원 공개 없이 검증하고, 제휴 식당 전체에서 하루 한 번만 사용하게 하는 Midnight DApp.

**개발 네트워크 대상 해커톤 MVP.** 로컬(`undeployed`)에서 검증하고 Preprod에서 공유 시연·제출용 배포를 진행한다. 메인넷 출시와 운영 서비스 준비는 이번 범위에 포함하지 않는다.

현재 두 실행 경로가 있다. `/`는 가상 사용자 시뮬레이터, `/network`는 Midnight 개발 네트워크 클라이언트다. 기본 연결은 로컬 개발 네트워크(`undeployed`)다. 이 환경에서 배포·발급·사용 증명을 실행했으며 검증 범위와 남은 작업은 [검증 기록](docs/verification.md)에 구분해 기록한다. 운영용 서비스가 아니다.

## 실행

Node.js 22.12 이상. 현재 개발·검증은 Node 22.22.3, macOS arm64에서 수행했다.

```bash
npm ci
npm run dev
```

기본 주소는 `http://127.0.0.1:4173`. 다른 포트는 `PORT=4174 npm run dev`. 이번 작업의 확인 서버는 `http://127.0.0.1:4174/network`다. 앱 서버는 loopback에 바인딩된다.

증명 키가 없어도 시뮬레이터는 실행할 수 있다. 개발용 네트워크 화면에는 다음 준비가 필요하다.

```bash
npm run contract:compile
npm run assets:copy
npm run network:up
npm run dev
```

학교·학생은 Midnight 지원 지갑 확장(Connector 4.x), 테스트 잔액, 학생 기기의 로컬 proof-server가 필요하다. 식당의 공개 조회에는 지갑이 필요 없다. 상세 구성과 역할별 순서는 [네트워크 실행 안내](docs/network-next.md)에 있다.

## 네트워크 시연 흐름

1. 학교 역할에서 지갑·암호화 보관함 연결 후 프로그램 배포.
2. 학생은 동일 프로그램 주소에 연결하고 기기에서 비밀키 생성. 학교에는 commitment만 전달.
3. 학교는 모의 명부의 자격·중복 발급을 확인하고 발급 거래 제출.
4. 학생이 식당을 선택해 증명 생성·거래 제출. 실제 체인 확정까지 대기.
5. 식당은 동일 주소의 공개 원장을 직접 조회하여 사용 확인.
6. 다른 식당 재사용과 미발급 사용 거절 확인.

학교 명부는 모의 데이터 두 명이다. 학생 신원 검증과 비밀키 공유 방지는 구현하지 않는다. 지원 프로그램·식당·거래 시각 등의 공개 단서가 남으며 완전 익명을 주장하지 않는다. 실결제·정산·키 복구·개별 철회는 제외한다.

## 검증

```bash
npm run verify        # 타입, 17개 자동 검사, 웹 빌드
npm run network:smoke # 실제 로컬 체인 통합 검사; 컨테이너 실행 필요
```

실제 체인 검사는 공개 개발용 genesis 지갑만 사용하며 `undeployed`로 고정되어 있다. 성공 결과는 `artifacts/network-smoke.json`에 공개 거래 정보만 기록한다. 학생·학교 상태는 테스트 프로세스 안에서 분리하며, 수수료 지갑 하나를 사용한다. 지갑 확장의 사용자 승인·독립 기기·Preprod 검증은 별도다.

`/network`는 빌드한 정적 파일로 실행 가능하며 지갑·로컬 증명 서버·인덱서를 직접 사용한다. `/` 시뮬레이터에는 Express API가 필요하다. `/network` 경로의 SPA fallback을 설정해야 한다.

## Compact 컴파일

Compiler 0.31.1, language 0.23, runtime 0.16.0, Midnight.js 4.1.1, onchain-runtime-v3 3.0.0을 사용한다. onchain runtime은 단일 설치 경로를 유지해야 하며 회귀 검사로 확인한다.

[공식 컴파일러 릴리스](https://github.com/midnightntwrk/compact/releases/tag/compactc-v0.31.1)를 `.tools/compactc-0.31.1/`에 풀거나 `COMPACTC`에 실행 경로를 지정한다.

```bash
npm run contract:check
npm run contract:compile
npm run assets:copy
```

Apple Silicon 배포 파일: `compactc_v0.31.1_aarch64-darwin.zip`. 확인한 SHA-256: `57af9b0449aa96b2905ea3d7a175b6b42ab38d725612a9cb2d73eb4ef253cce2`.

컴파일된 JS·타입은 포함하고 키·회로 바이너리·다운로드 도구는 Git에서 제외한다. 컨트랙트 변경 후 반드시 다시 컴파일한다.

## 구조

- `contracts/`: Compact 소스·컴파일 결과·시뮬레이터.
- `src/network/`: 실제 지갑·암호화 개인 상태·증명·발급·사용·공개 조회.
- `server/`, `src/App.tsx`: 기존 로컬 시뮬레이터와 화면.
- `infra/`: 로컬 Midnight Docker 구성 및 출처·라이선스.
- `scripts/network-smoke.ts`: 실제 로컬 체인 검증.
- `tests/`: 컨트랙트·API·개인 상태·WASM 호환성 검사.
- `docs/`: 설계, 후보 비교·선택 계획, 실행 안내, 검증 기록.

## 참고

- https://docs.midnight.network/relnotes/support-matrix
- https://github.com/midnightntwrk/example-bboard
- https://github.com/midnightntwrk/midnight-local-dev

기준일: 2026-09-20. 프로젝트의 읽기 전용 `sources/`는 수정하지 않았다.
