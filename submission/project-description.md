# MatchProof submission description / 제출 설명

Team / 팀: 현재

Members / 팀원: [pegeaether](https://github.com/pegeaether), [mjlee5929](https://github.com/mjlee5929)

Repository / 저장소: [team-hyunjae/MatchProof](https://github.com/team-hyunjae/MatchProof)

Network / 네트워크: Midnight Local Devnet (`undeployed`)

Project Deck / 발표 자료: [Google Slides 11장](https://docs.google.com/presentation/d/1jgNsZvViKf9DByWcdiN79-8xpIDZKnFhCrISwnZCvW4/edit?usp=sharing). 사용자 제공 최종 링크. 11장 및 로그인 없이 링크로 접근 가능한 공유 설정 확인.

[제출 폼용 한국어 답변](form-answers.ko.md): Project Overview · Midnight Implementation · Project Deck.

Demo video / 시연 영상: [YouTube 데모 · 2:57](https://youtu.be/jbL1IBC1IhQ) — 일부 공개 / Unlisted. 한국어 음성·영어 자막 / Korean narration with English subtitles. [파일 안내](video-delivery.md).

아래 한국어·영어 설명은 같은 구현 범위를 설명한다. 폼의 실제 글자 수 제한과 필수 항목에 맞춰 해당 언어의 내용을 사용한다. 이 문서는 제출 완료 기록이 아니다.

## 한국어

### 한 줄 설명

결혼정보업체가 원본 소득·혼인 서류를 보관하지 않고, 신청자가 동의한 가입 조건을 Midnight 영지식 증명으로 확인하는 DApp.

### 문제와 해결

결혼정보업체가 가입 조건을 확인하려고 상세 소득·혼인 서류 사본을 반복 수집하면 신청자의 정보 노출과 업체의 보관 부담이 커집니다. MatchProof는 모의 검증기관, 신청자, 업체의 역할을 분리합니다. 기관이 발급한 자격을 신청자가 보관하고, 업체는 동의한 조건의 충족 여부를 확인합니다.

### Midnight 구현

모의 기관이 가상 자료를 확인하고 신청자 키에 묶인 자격 commitment를 개발 체인에 등록합니다. 업체는 배포·신청자·기한에 결합된 심사 요청을 만듭니다. Compact 회로는 등록된 자격의 멤버십, 신청자 키 소유와 소득·혼인·기간 조건을 검증합니다. 승인된 요청은 다시 사용하지 못하며, 성공은 체인 확정 후에만 표시합니다. 업체와 심사위원은 신청자 자격 파일이나 지갑 연결 없이 공개 인덱서에서 동일 기록을 조회합니다.

데모 조건은 2025년 소득 5,000만 원 이상, 자료 확인 기준일에 혼인 중이 아님, 요청 종료까지 자료 확인 후 7일 이내입니다. 요청 유효기간은 10분입니다. 만료 후에는 현재 유효한 인증으로 표시하지 않지만 체인 기록은 유지합니다.

### 실행과 데모

[한국어 README](../README.ko.md)의 설치·컴파일·개발 네트워크 준비 절차 후 `npm run demo`를 실행합니다. 기관 발급, 신청자 자격 가져오기, 업체 요청, 신청자 동의·증명, 별도 공개 조회 순서로 시연합니다. 소득 미달 사례에서는 성공 기록이 생기지 않고 업체에 구체적인 실패 사유를 전달하지 않습니다. 테스트 지갑이 개발 거래를 자동 서명하며 지갑 확장 설치는 이 시연 경로에 필요하지 않습니다.

### 검증과 한계

9월 26일 CLI 통합 검사에서 새 계약의 발급·요청·증명 확정·독립 조회와 소득 미달·재사용·타인 파일 거절을 확인했습니다. 공개 저장소의 새 clone에서 설치·컴파일·38개 테스트·빌드도 통과했습니다. 검증 당시 커밋과 공개 거래는 아래 근거에 기록했습니다. 이후 사용자가 브라우저 동작을 확인했고, 같은 요청의 신청자 확정 메시지와 업체의 조건 충족 표시를 확인했습니다. 다른 물리 기기의 재현과 실제 지갑 확장 승인창 검증은 완료한 것으로 주장하지 않습니다.

실제 공공기관 서류·회원 로그인·매칭 기능은 연동하지 않습니다. 기관의 확인을 신뢰하며, 증명 서버는 비공개 입력을 처리합니다. 업체에 정확한 소득이나 원본은 전달하지 않지만 공개 정책·요청·시각·성공 기록은 사람과 연결될 수 있습니다. 완전 익명이나 개인정보보호법 준수 완료를 주장하지 않습니다. 현재 계약에는 삭제·즉시 철회 기능이 없으며, 10분 만료는 개인정보 파기가 아닙니다.

## English

### One-line description

A Midnight DApp that lets marriage matchmaking agencies verify applicant-approved eligibility conditions without collecting copies of income or marital-status documents.

### Problem and solution

Collecting detailed documents to check admission criteria increases applicants' exposure and agencies' data-retention burden. MatchProof separates the mock issuer, applicant and agency. The applicant holds an issued credential, and the agency checks the conditions the applicant has agreed to disclose.

### Midnight implementation

A mock issuer checks synthetic evidence and registers a credential commitment bound to the applicant's key on the development chain. The agency creates a review request bound to a deployment, applicant and deadline. Compact circuits verify membership in the issued credential set, applicant key ownership and the income, marital-status and time conditions. An approved request cannot be reused, and the app shows success only after chain confirmation. The agency and judge independently read the same public indexer record without the applicant's credential file or a connected wallet.

The demonstration policy requires 2025 income of at least KRW 50 million, not being married on the evidence check date, and evidence no older than seven days through the request deadline. A request lasts ten minutes. After expiry, the app no longer presents the result as currently valid, but the chain retains its history.

### Run and demonstrate

Follow the installation, compilation and development-network steps in the [English README](../README.md), then run `npm run demo`. Demonstrate credential issuance, applicant import, agency request, consent and proof, followed by an independent public read. For the insufficient-income case, no approval appears and the agency receives no detailed failure reason. The test wallet signs development transactions automatically. This demo path requires no wallet extension. The [English guide](../docs/matchproof-judge-guide.en.md) includes translations of the Korean UI controls.

### Verification and limitations

The September 26 CLI integration run verified issuance, request creation, proof confirmation and an independent public read, alongside rejection of insufficient income, replay and another applicant's files. A fresh public clone passed installation, compilation, 38 tests and the build. The evidence records the tested commit and public transactions. A subsequent user-confirmed browser demonstration also showed the applicant confirmation message and the agency's Conditions met status for the same request. We do not claim independent physical-device reproduction or verification of a real wallet extension's approval prompt.

The prototype does not integrate government documents, real member authentication or matchmaking. It trusts the issuer's evidence check, and the proof server processes private inputs. The agency does not receive exact income or raw documents, but public policy, requests, timestamps and approvals can become linked to a person. We do not claim complete anonymity or automatic compliance with privacy law. The current contract has no deletion or immediate-revocation function. Ten-minute expiry does not erase personal data.

## Evidence / 검증 근거

- [Public clone verification / 공개 clone 검증](evidence/2026-09-26-public-clone.json)
- [Development-chain transaction evidence / 개발 체인 거래](evidence/2026-09-26-matchproof-smoke.json)
- [Run details / 실행 상세](workspace-verification.md)
- [한국어 시연 가이드](../docs/matchproof-judge-guide.md) · [English demo guide](../docs/matchproof-judge-guide.en.md)
