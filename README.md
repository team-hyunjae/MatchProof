# MatchProof

[English](README.md) · [한국어](README.ko.md)

A Midnight DApp for marriage matchmaking agencies to verify applicant-approved eligibility conditions without collecting copies of income or marital-status documents.

**Team 현재** · [pegeaether](https://github.com/pegeaether) · [mjlee5929](https://github.com/mjlee5929)

[Demo video (2:57, Korean narration / English subtitles)](https://youtu.be/jbL1IBC1IhQ) · [Presentation (KO / EN)](https://docs.google.com/presentation/d/1jgNsZvViKf9DByWcdiN79-8xpIDZKnFhCrISwnZCvW4/edit?usp=sharing)

> A working prototype using synthetic data on Midnight Local Devnet (`undeployed`). The application interface is in Korean. The [English demo guide](docs/matchproof-judge-guide.en.md) maps its buttons to English.

## The problem

Checking admission requirements can lead agencies to collect and retain detailed documents when they only need to establish whether an applicant meets specific conditions. MatchProof separates the issuer's evidence check from the agency's eligibility check. The applicant holds an issued credential and consents to proving the requested conditions.

The demonstration policy requires **2025 annual income of at least KRW 50,000,000**, **not being married on the evidence check date**, and **evidence no older than seven days through the request deadline**. These are synthetic demo criteria, not a real agency's admission policy.

## Demo flow

| Step | Role | Action |
| --- | --- | --- |
| Setup | Agency, mock issuer, applicant | Deploy a contract with the agency's registration value, then connect the applicant to that deployment. |
| 1 | Mock issuer | Check synthetic evidence and issue a credential bound to the applicant's key. |
| 2 | Applicant | Import the credential into an encrypted browser vault. |
| 3 | Agency | Create a review request valid for ten minutes. |
| 4 | Applicant | Review the recipient, conditions, public disclosure and deadline, then consent and submit a ZK proof. |
| 5 | Agency or judge | Read the confirmed result from the public indexer without the applicant's credential file or a connected wallet. |

The agency sees **Pending / Conditions met / Expired**. The applicant sees specific local failure messages, such as insufficient income. The agency receives no detailed failure reason and cannot distinguish an unprocessed request from a failed attempt through this status alone.

Follow the [English demo guide](docs/matchproof-judge-guide.en.md) or [한국어 시연 가이드](docs/matchproof-judge-guide.md) for the exact click sequence.

## How MatchProof uses Midnight

- **Private eligibility checks:** Compact circuits verify credential membership, applicant key ownership and the income, marital-status and time conditions.
- **Request binding and replay prevention:** Each proof binds to a deployment, applicant and review request. A request can receive only one approval.
- **Separate public read:** A separate view reads confirmed approval records from the public indexer. A local UI flag does not establish success.

See the [architecture](docs/architecture.md) for data flows and [validation](docs/validation.md) for reproducible checks. The final [PowerPoint](docs/presentation/MatchProof-pitch.ko-en.pptx) and [English captions](docs/presentation/demo.en.srt) are also available.

## Run locally

Requires Node.js 22.12 or later, npm, unzip and Docker Compose on macOS, Linux or WSL. The pinned Compact compiler version is 0.31.1.

```sh
git clone https://github.com/team-hyunjae/MatchProof.git
cd MatchProof
npm ci
npm run setup:compiler
npm run matchproof:compile
npm run network:up
npm run doctor:network
npm run demo
```

Wait for `MatchProof DEMO READY`, then [open the app](http://127.0.0.1:4180/matchproof). If `doctor:network` runs before the development services are ready, check their status and retry. A `127.0.0.1` link refers to the computer opening it. It is not a publicly hosted demo URL.

### Development wallet

`npm run demo` starts the official test wallet adapter. **No wallet extension is required for this demo path.**

1. Look for **개발용 테스트 지갑 연결 준비됨** (Development test wallet ready).
2. Enter **이 기기의 보관 암호** (Vault password on this device) for each role. A new password needs at least 16 characters and three of these categories: uppercase letters, lowercase letters, numbers and symbols. Reuse the same password for an existing vault.
3. Click **개발용 지갑 연결** (Connect development wallet). Leave the deployment address empty when preparing the first deployment.

The vault password encrypts local app data. It is not a wallet recovery phrase. The development wallet automatically signs test transactions and does not show a real wallet extension's approval prompt.

Keep the terminal running. The demo stops 30 minutes after it becomes ready. Restart `npm run demo` and refresh the page to reconnect. Do not run `matchproof:smoke` at the same time as the demo because they use the same development wallet. See the [English demo guide](docs/matchproof-judge-guide.en.md) or the detailed [Korean runbook](docs/matchproof-runbook.md).

## Verification

- The current contract, client, storage and demo-tooling suite passes **25 tests**.
- A fresh, unauthenticated clone passed installation, contract compilation and build at the historical commit recorded in the evidence report.
- The development-chain integration run deployed a new contract, issued a credential, opened a request, confirmed a proof and verified the result through an independent public read.
- Replay and insufficient-income cases failed during circuit execution before submission. Import checks rejected another applicant's credential and request files.

[Public clone evidence](docs/evidence/2026-09-26-public-clone.json) · [Development-chain transaction evidence](docs/evidence/2026-09-26-matchproof-smoke.json)

These are historical verification records, not a guarantee that the recorded deployment is still available or its requests remain valid.

```sh
npm test
npm run build
```

## Privacy and prototype boundaries

The prototype uses a mock issuer and synthetic evidence. It does not integrate government documents, real member authentication, matchmaking, chat or payments. The issuer establishes the evidence's truth. The proof checks that evidence against the policy and does not establish marital status after the evidence check date.

The issuer and applicant know the evidence values, and the proof server processes private inputs. The browser relies on the configured indexer; it does not independently authenticate its response using chain headers and inclusion proofs. The agency does not receive the raw documents or exact income. Public commitments, policy, request identifiers, time bounds and approval records remain observable. If a request becomes linked to a person, it can reveal that they met the conditions. MatchProof does not claim complete anonymity or automatic legal compliance. Loopback endpoints may forward to a proof server on another machine through SSH.

**Ten-minute expiry limits the request's use. It does not delete chain history.** After expiry, the app displays Expired even when a historical approval exists. The current contract has no deletion or revocation function. Retention and erasure of off-chain files and any personal-data implications of public records require separate design for a production service.
