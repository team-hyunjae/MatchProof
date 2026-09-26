# 작업공간 설치·검증 — 2026-09-26

대상: `~/devel/ai/MatchProof`. 이전 ChatGPT mirror를 참조하지 않는 독립 npm 설치와 로컬 Git 저장소를 준비했다.

## 설치된 파일

소스·계약·테스트·문서·인프라 예시·고정 package-lock, Compact 0.31.1 실행 파일, MatchProof/기존 회귀 경로의 증명 자산, 기존 공개 검증 증거를 복사했다. node_modules는 `npm ci`로 새로 설치했다. 이전 개인 상태·실행 중 토큰·임시 브라우저 파일은 복사하지 않았다. 현재 실행으로 만들어지는 테스트 지갑 연결 파일은 artifacts에만 저장되며 Git에서 제외된다.

## 확인 결과

- Node 22.22.3, 의존성 529개 설치.
- `npm run doctor:network`: 컴파일러·증명 키·노드·인덱서·proof-server 8.1.0 응답 확인.
- `npm run matchproof:compile`: 세 회로의 전체 컴파일 및 증명 키 생성 성공.
- `npm run matchproof:check`: 성공. 검사는 임시 출력 디렉터리를 사용하도록 수정하여 기존 증명 키를 보존한다.
- `npm test`: 38/38 통과. 데모 HTTP 서버의 허용 호스트·비공개 경로와 검사 컴파일의 키 보존 회귀 검사를 포함한다.
- `npm run build`: 타입 검사·production 빌드 통과. 기존 SDK WebSocket export 및 번들 크기 경고는 남는다.

## 현재 환경의 경계

9944/8088/6300 포트는 SSH 터널 프로세스가 리슨한다. 따라서 localhost라는 이유로 증명 서버의 실제 실행 위치를 동일 기기로 설명하지 않는다. 현재 데이터는 가상 자료 전용이다. 이 설정은 복사한 파일만으로 다른 기기에 자동 이전되지 않는다. 새 환경은 Compose로 별도 개발 체인을 시작한다.

브라우저 보관함은 같은 origin의 IndexedDB에 있고 파일 복사의 대상이 아니다. 기존 승인 기록은 만료될 수 있으며 새 ‘조건 충족’ 시연에는 새 요청이 필요하다.

## 개발 지갑 연결 복구

- `node scripts/matchproof-demo.mjs`: 지갑 동기화·개발 수수료 준비 후 웹 서버 4180과 지갑 브리지 4181 실행.
- 기존 4190 포트는 Fetch에서 `bad port`로 거절되는 것을 확인해 4181로 수정했다.
- Connector 4.0.1의 `getConfiguration` 및 `getShieldedAddresses` 실제 응답 확인, 네트워크 `undeployed` 확인.
- 앱의 `MatchClient.connect`를 실제 지갑 브리지와 임시 암호화 보관함으로 실행하고 업체 등록값 생성 성공. 임시 보관함은 검사 후 삭제.
- 다른 네트워크 연결 거절, 외부 Origin 거절, 일반 dist HTML에 세션 토큰이 없는 것 확인.
- Codex 내장 브라우저의 실제 화면에서 테스트 지갑 준비·자동 서명 안내 표시와 최근 시연 조회 성공 확인. 기존 승인 1건/기한 만료 표시, 빈 화면·오류 오버레이 없음, error/warn 로그 0건. 새 보관 암호 입력과 신규 거래의 전체 UI 리허설은 별도다.

## 공개 후보 파일의 새 환경 재현

2026-09-26 Git 공개 대상 파일 74개만 별도 빈 디렉터리로 복사했다. 기존 node_modules, 컴파일러, 증명 키, dist, 실행 상태와 배포 주소 파일은 복사하지 않았다.

- `npm ci`: 529개 패키지 새 설치 성공.
- `npm run setup:compiler`: 공식 릴리스 다운로드, 고정 SHA-256 검증, Compact 0.31.1 실행 확인.
- `npm run contract:compile` 및 `npm run matchproof:compile`: 회귀 경로 2개 회로와 MatchProof 3개 회로의 증명 자산을 새로 생성.
- `npm test`: 38/38 통과.
- `npm run build`: 타입 검사와 production 빌드 성공. 기존 SDK export와 번들 크기 경고는 동일하다.

이는 공개 후보 파일의 재현 검사다. 원격 GitHub clone이나 다른 물리 기기의 Compose 기동까지 검증한 것은 아니다. 지갑 연결 파일, 로컬 배포 주소, 실행 상태, 컴파일러·증명 키는 Git에서 제외되고 공개 개발용 인프라 예시는 포함되는 것을 확인했다. 알려진 토큰·개인키 패턴 검색에서 일치 항목은 없었다.

## 새 배포의 개발 체인 통합 검사

2026-09-26 11:37–11:40 KST에 `npm run doctor:network && npm run matchproof:smoke`를 실행해 성공했다. 브라우저와 같은 MatchClient를 CLI에서 사용했으며 기관·업체·신청자별 메모리 상태와 공개 개발용 수수료 지갑을 사용했다.

- 새 계약 배포 → 가상 자격 발급 → 심사 요청 → ZK 증명 거래 확정 성공.
- 증명 호출부터 거래 확정까지 **22.713초**. 한 번의 측정값이며 순수 증명 생성 시간이나 성능 보장은 아니다.
- 별도 공개 provider에서 신청자 비공개 상태 없이 승인 기록 조회 성공.
- 재사용과 소득 미달은 제출 전 회로 실행에서 거절됐다. 다른 신청자는 자격·요청 파일 가져오기에서 거절됐다.
- 최종 승인 기록이 1건인 것을 확인했다.

| 공개 증거 | 값 |
| --- | --- |
| 배포 주소 | `c31768e446c929f327a04f4fae60564716624baec58b91cc5d9f7bb26483bf48` |
| 배포 거래 | `5fedb141d338c4fdad1b0ffc74d3be8b8f6ab79628bf38796fadfc51199fd811` |
| 자격 발급 | `f91b19cd5b61acbd361961dd6d03b715d1f89e1e3d686f3c8399141886df25d2` |
| 심사 요청 | `b06d8d6835b200a31943bcc2307d88eec76a18271edefb2b7bc96f3197257561` |
| 조건 증명 | `1fd7a7f7db5f8148c7eaa7bced4fc7b8ee9a8b24cfa5677fdd966c9fde1adfed` |

[공개 검사 결과 JSON](evidence/2026-09-26-matchproof-smoke.json)을 보존했다. `artifacts/` 전체를 공개한 것이 아니며 가상 자격의 원문·신청자 비밀·지갑 연결 토큰은 포함하지 않았다. 10분 뒤 승인 기록은 만료되며 체인 초기화 시 조회할 수 없을 수 있다.

신규 거래는 CLI 통합 검사다. 이번 실행으로 새 브라우저의 전체 클릭 흐름이나 확장 지갑 승인창까지 검증했다고 주장하지 않는다.

## 공개 GitHub 저장소 clone 재현

2026-09-26 [team-hyunjae/MatchProof](https://github.com/team-hyunjae/MatchProof)의 공개 상태와 기본 브랜치 `main`을 확인했다. 인증 설정을 사용하지 않고 새 디렉터리로 clone했다. 검증 대상은 [2d03b21](https://github.com/team-hyunjae/MatchProof/commit/2d03b21a9f282ed7ff88cd40bccad37deb316e51)이다.

- 기존 의존성·컴파일러·증명 키·빌드·실행 상태 없이 시작.
- `npm ci`: 529개 패키지 설치 성공.
- `npm run setup:compiler`: 공식 다운로드와 SHA-256 확인 후 Compact 0.31.1 설치.
- `npm run contract:compile`, `npm run matchproof:compile`: 전체 5개 회로 컴파일·증명 자산 생성 성공.
- `npm test`: 38/38 통과.
- `npm run build`, `npm run doctor`: 성공. 기존 SDK export·번들 크기 경고와 의존성 deprecation 안내는 남는다.
- README·제출 문서의 로컬 파일 링크 9개 확인.
- 검사 후 추적 파일 변경 없음.

[공개 clone 검사 기록](evidence/2026-09-26-public-clone.json)을 보존했다. 같은 기기의 새 clone을 사용한 검사이며 다른 물리 기기의 Compose 기동이나 새 전체 브라우저 거래 시연까지 수행한 것은 아니다.

## 남은 검증

새 배포의 전체 수동 시연, 지갑 확장 승인·독립 물리 기기 검증은 별도로 기록한다. 기존 9/21 성공 증거를 9/26 신규 실행처럼 표현하지 않는다.
