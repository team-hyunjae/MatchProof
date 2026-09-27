# 한국어 내레이션과 영어 자막 대본

목표 길이 4분 30초. 공식 영상 길이 제한이 아니라 자체 촬영 계획이다. 앱 화면은 한국어로 유지하고 한국어로 설명하며 영어 자막을 추가한다.

**이 문서는 촬영 전 구성 초안이다.** 2026-09-27에는 [장면별 한국어 녹음](voiceover-ko.md)과 [최종 영어 SRT](demo-subtitles.en.srt)를 결합한 4분 52초 영상을 완성했다. [파일 안내](video-delivery.md). 아래 시간표와 [기존 SRT](demo-subtitles.en.draft.srt)는 참고용이다. 업로드와 최종 제출은 아직 수행하지 않았다.

촬영 방법과 화면 순서는 [촬영 가이드](recording-guide.md), 단계별 설명 그림은 [영상용 PNG](diagrams/README.md)를 참고한다.

## 촬영 준비

- [역할별 가이드](../docs/matchproof-judge-guide.md)에 따라 같은 배포의 발급과 자격 가져오기까지 준비한다. 심사 요청은 촬영 직전에 만든다.
- 화면에 `Local Devnet / Synthetic data / Test wallet (automatic signing)`을 보이거나 첫 장면에서 설명한다.
- 보관 암호 입력은 녹화 전에 끝낸다. 키·credential/request JSON 내용을 화면에 펼치지 않는다. 가상 자료만 사용한다.
- 증명 확정 시간에 따라 분량을 조정한다. 대기 장면을 편집하면 실제 기다린 시간을 표기한다. 아래 30초 구간이 처리 시간 보장을 뜻하지 않는다.
- 독립 조회는 지갑을 연결하지 않은 별도 브라우저/프로필에서 수행한다. 같은 기기라면 독립 물리 기기 검증이라고 말하지 않는다.
- 만료 장면은 미리 만료된 요청임을 밝힌다. 조건 미달 장면은 새 요청으로 실제 거절과 업체 미승인을 확인한 뒤 사용한다.
- ‘확정됐습니다’라는 내레이션은 실제 확정 메시지가 나오는 화면에만 맞춘다. ‘원본 0건’은 설계 설명이며 트래픽 감사 수치가 아니다.

## 장면별 대본

### 00:00–00:20 소개 / Introduction

화면: 발표 1장 또는 앱 첫 화면.

한국어 내레이션:

현재 팀의 MatchProof입니다. 결혼정보업체의 가입 조건을 확인하는 Midnight 앱입니다.

가상 자료와 Midnight Local Devnet을 사용해 시연하겠습니다.

영어 자막:

> MatchProof verifies eligibility
> for marriage matchmaking agencies.

> This demonstration uses synthetic data
> on Midnight Local Devnet.


### 00:20–00:40 문제 / Problem

화면: 발표 2장 전체 흐름 또는 업체 화면.

한국어 내레이션:

조건을 확인하기 위해 상세 소득과 혼인 서류 사본까지 반복해서 모으면 정보 노출이 커집니다.

MatchProof에서는 신청자가 발급받은 자격을 보관하고, 업체가 필요한 조건의 충족 여부를 확인합니다.

영어 자막:

> Collecting detailed documents
> increases personal-data exposure.

> The applicant holds the credential.
> The agency checks the agreed conditions.


### 00:40–01:10 기관과 자격 / Issuer and credential

화면: 미리 완료한 발급 거래와 신청자의 자격 가져오기.

한국어 내레이션:

모의 검증기관이 확인한 가상 자료입니다. 예시 신청자의 2025년 소득은 6,500만 원입니다.

기관은 신청자 키에 묶인 자격을 발급합니다. 지금은 미리 확정한 발급 기록을 보여드립니다.

신청자는 이 자격을 암호화 보관함에 가져옵니다. 업체에 자격 파일을 전달하지 않습니다.

영어 자막:

> The mock issuer checks synthetic evidence.
> Example income: KRW 65 million for 2025.

> The issuer binds the credential to the applicant.
> This issuance was confirmed before recording.

> The applicant imports the credential
> into an encrypted browser vault.


### 01:10–01:35 업체 요청 / Agency request

화면: 업체 새 심사 요청 및 확정 기록.

한국어 내레이션:

업체가 확인할 조건은 2025년 소득 5,000만 원 이상과 확인 기준일에 혼인 중이 아님입니다.

자료는 심사 요청 종료까지 확인 후 7일 이내여야 합니다. 지금 새 심사 요청을 만듭니다.

요청은 10분 동안 유효합니다. 확정된 요청 파일을 신청자가 가져옵니다.

영어 자막:

> The policy checks 2025 income of KRW 50 million+.
> Applicants must not be married on the check date.

> Evidence must stay within seven days of its check
> through the request deadline.

> The request lasts ten minutes.
> The applicant imports the confirmed request.


### 01:35–02:00 동의 / Consent

화면: 신청자 공개 범위와 체크박스.

한국어 내레이션:

신청자는 수신 업체, 확인 조건, 공개할 결과와 기한을 확인합니다.

자격과 요청을 모두 가져온 상태에서도 동의 전에는 증명 버튼이 비활성화됩니다.

동의한 뒤 조건 증명을 실행합니다. 이 시연에서는 개발용 테스트 지갑이 자동 서명합니다.

영어 자막:

> The applicant reviews the recipient, conditions,
> public result and deadline.

> With both files imported, the proof button
> remains disabled until consent.

> After consent, the applicant starts the proof.
> The development test wallet signs automatically.


### 02:00–02:30 증명 / Proof

화면: 증명 생성 중 화면, 실제 확정 메시지와 거래.

한국어 내레이션:

Compact 회로가 발급된 자격과 신청자 키 소유, 요청 조건을 함께 검증합니다.

증명 서버는 비공개 입력을 처리합니다. 체인 확정을 기다리는 동안에는 성공으로 표시하지 않습니다.

확정 메시지와 거래가 표시됐습니다. 이제 업체 화면에서 같은 요청을 확인하겠습니다.

영어 자막:

> Compact verifies the issued credential,
> applicant key ownership and requested conditions.

> The proof server processes private inputs.
> Success appears only after chain confirmation.

> The proof is now confirmed.
> We will check the same request in the agency view.


### 02:30–02:55 업체 확인 / Agency result

화면: 업체 최신 상태 확인.

한국어 내레이션:

업체에서 최신 상태를 읽으면 같은 요청이 조건 충족으로 표시됩니다.

업체 화면에는 정확한 소득 6,500만 원이나 신청자의 자격 파일이 없습니다.

영어 자막:

> The agency refreshes the public record.
> The same request shows Conditions met.

> The agency view does not receive the exact income
> or the applicant credential file.


### 02:55–03:15 독립 조회 / Independent read

화면: 지갑을 연결하지 않은 별도 조회 화면.

한국어 내레이션:

지갑과 신청자 파일을 연결하지 않은 별도 화면에서도 체인 기록 조회를 누릅니다.

배포 주소와 공개 요청 식별값이 같고, 동일한 승인 기록을 읽는지 확인합니다.

영어 자막:

> A separate view reads the chain record
> without a connected wallet or applicant files.

> The deployment and public request identifier match.
> Both views read the same approval.


### 03:15–03:40 실패 / Failure

화면: 새 요청과 소득 3,000만 원 가상 자격.

한국어 내레이션:

이번에는 소득 3,000만 원의 가상 자격과 새 요청으로 증명을 시도합니다.

신청자 화면에 소득 조건 미달이 표시되고, 제출 전 회로 실행에서 거절됩니다.

업체에는 성공 기록이 생기지 않습니다. 구체적인 실패 이유도 전달하지 않습니다.

영어 자막:

> Next, we use income of KRW 30 million
> and a fresh request.

> The applicant sees the income failure.
> Circuit execution rejects it before submission.

> No approval appears for the agency.
> It receives no detailed failure reason.


### 03:40–04:00 만료 / Expiry

화면: 기존 만료 요청 또는 발표 10장.

한국어 내레이션:

10분이 지난 요청은 기한 만료로 표시합니다. 여기 보이는 것은 기존에 만료된 요청입니다.

과거 승인 기록은 체인에 남습니다. 현재 계약에는 삭제 기능이 없습니다.

영어 자막:

> This earlier request has expired.
> Its ten-minute window has ended.

> Historical approvals remain on the chain.
> The current contract has no deletion function.


### 04:00–04:30 범위와 마무리 / Scope and close

화면: 발표 11장과 저장소 주소.

한국어 내레이션:

실제 서류의 진위는 발급기관의 확인에 의존합니다. 공공기관 연동과 실제 회원 로그인은 후속 과제입니다.

공개 기록이 사람과 연결되면 조건 충족 사실을 알 수 있습니다.

완전 익명이나 법 준수 완료를 주장하지 않습니다.

MatchProof는 업체가 보관할 상세 개인정보를 줄이면서 필요한 조건을 확인하는 흐름을 구현했습니다.

영어 자막:

> The issuer establishes the evidence.
> Government integration and real login are future work.

> Public records can reveal eligibility
> when linked to a person.

> We do not claim complete anonymity
> or automatic legal compliance.

> MatchProof reduces the detailed data an agency holds
> while verifying the agreed eligibility conditions.

## 촬영 후 마무리

1. 실제 화면과 내레이션에 맞춰 SRT 시간을 조정하고 마지막 검수를 한다.
2. 영어 자막을 영상에 넣거나 업로드한 영상의 자막 트랙으로 추가한다.
3. 로그인 없이 볼 수 있는 공개 또는 일부 공개 링크를 확인한다. `localhost` 주소를 영상 주소로 사용하지 않는다.
4. 제출 설명의 영상 항목에 확인한 링크를 넣는다. 촬영·업로드 전에는 완료로 표시하지 않는다.

발표용 핵심 문장과 발표자 노트는 [한영 발표 자료](presentation.md)에 있다. 발표자별 역할은 리허설에서 정하며 개인별 개발 기여 설명을 추가하지 않는다.
