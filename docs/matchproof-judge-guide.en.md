# MatchProof demo guide

[English](matchproof-judge-guide.en.md) · [한국어](matchproof-judge-guide.md)

MatchProof demonstrates eligibility verification for a marriage matchmaking agency using synthetic data on Midnight Local Devnet (`undeployed`). The UI is in Korean. This guide includes the Korean labels to help you follow the demonstration.

## Roles and visible data

| Role | Responsibility | Visible data |
| --- | --- | --- |
| Mock issuer | Check synthetic evidence and issue a credential | Exact synthetic income and marital status on the evidence check date |
| Applicant | Store the credential, review the request and consent to proving the conditions | Their evidence, recipient agency, policy and deadline |
| Agency | Open a request and read the confirmed result | Public policy, request, deadline and approval record |
| Judge | Independently read the same public result | The agency's public view, without a wallet or applicant files |

The demo checks 2025 annual income of at least KRW 50,000,000, not being married on the evidence check date, and evidence no older than seven days through the request deadline. It does not prove that someone has never been married.

## Prepare the demonstration

Follow the setup commands in the [README](../README.md). Start `npm run demo` and wait for `MatchProof DEMO READY`. This explicitly enables a development wallet with automatic signing. An ordinary preview does not inject that wallet. Keep the terminal open. The session ends 30 minutes after it becomes ready.

Use separate role tabs. For each role, enter **이 기기의 보관 암호** (Vault password on this device) and click **개발용 지갑 연결** (Connect development wallet). A new password needs at least 16 characters and three character categories. An existing vault requires its original password. The vault password is not a recovery phrase.

Use synthetic data only. The issuer and proof server handle private inputs. Loopback ports can be SSH forwards to another machine. The local URL does not give a remote judge access to your computer.

## Full click sequence

You can prepare steps 1–5 before presenting. Create the ten-minute request just before the applicant is ready to prove it.

| Step | Role | Korean control and English meaning | Expected result |
| --- | --- | --- | --- |
| 1 | Agency | Connect the development wallet. Copy **검증기관에 전달할 업체 등록값** (Agency registration value for issuer). | The issuer has the agency's public registration value. No deployment address is needed yet. |
| 2 | Mock issuer | Connect the wallet. Enter **업체가 전달한 등록값** (Agency registration value). Click **개발 네트워크에 배포** (Deploy to development network). | A confirmed transaction and deployment address appear. |
| 3 | Agency and applicant | Enter that address, connect the wallet and click **이 배포에 연결** (Connect to this deployment). The applicant shares **신청자 등록값** (Applicant registration value) with the issuer and agency. | All roles use the same contract. The registration value is not the applicant's secret key. |
| 4 | Mock issuer | Select **2025년 6,500만 원 · 확인일에 혼인 중 아님** (2025 income KRW 65 million, not married on check date). Click **가상 자격 발급** (Issue synthetic credential), then **파일 받기** (Download file) after confirmation. | Deliver `matchproof-credential.json` only to the applicant. |
| 5 | Applicant | Use **자격증명 가져오기** (Import credential). | **나만 보는 가상 자료** (My private synthetic evidence) shows the evidence. Import checks match the applicant key and registered credential. |
| 6 | Agency | Enter a synthetic reference such as `DEMO-001` and the applicant registration value. Click **심사 요청 만들기** (Create review request), then download the request after confirmation. | The new request is Pending. Give `matchproof-request.json` to the applicant. |
| 7 | Applicant | Use **심사 요청 가져오기** (Import review request). | The screen displays the recipient, income threshold, marital-status condition, freshness rule and deadline. |
| 8 | Applicant | Check the consent box, then click **동의하고 조건 증명하기** (Consent and prove eligibility). | The development wallet signs automatically. Wait for **심사 증명이 확정됐어요** (Eligibility proof confirmed) and the confirmed transaction. |
| 9 | Agency | Click **최신 상태 확인** (Refresh status). | The same request shows Conditions met before expiry. The exact KRW 65 million income does not appear here. |
| 10 | Judge | Open **별도 업체 화면 열기 ↗** (Open separate agency view), then click **체인 기록 조회** (Read chain records). | Read the same deployment, public request identifier and approval without connecting a wallet or importing applicant files. |

Use a separate browser profile or browser for step 10 if demonstrating storage separation. A new tab in the same profile shares storage. Do not describe it as an independent physical device.

**최근 시연 불러오기** (Load recent demo) uses the deployment locator from the last CLI smoke run. A new contract deployed through the browser does not automatically replace that locator. For a browser deployment, paste its address or use its separate-agency-view link.

Credential JSON contains exact synthetic evidence and an issuance salt. Request JSON contains a private nonce. Do not publish these files or send the credential to the agency. Manual file transfer substitutes for a secure credential delivery channel in this prototype.

## Status and failure cases

| UI label | Meaning |
| --- | --- |
| 확인 미완료 | Pending. No successful approval is visible. This does not disclose whether the applicant has tried and failed. |
| 조건 충족 | Conditions met. A confirmed approval exists and the request has not expired. |
| 기한 만료 | Expired. A historical approval may still exist, but the UI no longer presents it as currently valid. |

For the insufficient-income demonstration, issue the **2025년 3,000만 원 · 소득 조건 미충족** fixture (2025 income KRW 30 million). Import that credential, create a new unused request and attempt a proof within its deadline. The applicant sees the failure reason. The agency's new request stays Pending, and its approval count does not increase.

Without consent, the proof button stays disabled. An already-approved request cannot receive another approval. An expired request requires a new request. These are different checks: a disabled UI button alone does not establish contract enforcement. The [integration evidence](../submission/evidence/2026-09-26-matchproof-smoke.json) records replay and insufficient-income rejection before submission. It does not claim failed transactions were included in blocks.

**Expiry does not erase history.** Public requests and approvals remain on the chain. The current contract has no deletion or revocation function.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Page unavailable | Run `npm run demo`, wait for `DEMO READY` and keep the terminal running. |
| Wallet extension warning | Use the explicit demo launcher and refresh. Confirm the development test wallet ready message. |
| Consent checked but proof disabled | Confirm that My private synthetic evidence appears. Import the issuer's credential as well as the agency's request. Also check expiry, prior approval and a transaction in progress. |
| No result in a new view | Click Read chain records. Confirm the indexer is running and the deployment address matches. |
| Old expired request appears | Use the current deployment address. Load recent demo may refer to an older CLI run. |
| Wrong issuer or agency key | Reconnect the original role's wallet and vault. Public-read access is not authority to issue credentials or requests. |
| Transaction error | If submission started, check the public ledger before retrying. Create a new request if its time window has expired. |

## What this demonstrates

Midnight verifies the relationship between issued evidence, applicant ownership and the requested policy. It does not establish the truth of real documents. The issuer supplies that trust. Public records can still reveal eligibility when linked to a person. The prototype does not implement real member authentication, immediate revocation or recovery after vault loss.

The UI's “0 original documents sent to the agency” label describes the intended data flow. It is not a traffic-audit measurement. Inspect the role views, file paths and public ledger fields alongside the label.
