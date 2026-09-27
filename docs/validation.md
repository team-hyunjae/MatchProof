# MatchProof validation

## Reproduce the checks

Follow the [README setup](../README.md#run-locally), including installation and both contract compilations, then run:

```sh
npm run doctor
npm test
npm run build
```

The automated suite covers the MatchProof contract and client, encrypted state and import validation, development-wallet serving, and shared runtime compatibility. It also retains regression tests for the legacy QuietPass modules. The reported 38 tests are the total suite, not 38 MatchProof-only tests.

For real development-chain verification, start the services and run:

```sh
npm run network:up
npm run doctor:network
npm run matchproof:smoke
```

Stop `npm run demo` before the smoke run: both use the same public development wallet. The smoke test deploys a fresh contract and uses synthetic evidence. It exercises issuance, request creation, proof confirmation, a separate public read, replay rejection, insufficient-income rejection and another applicant's file rejection.

Runtime reports are written to ignored `artifacts/`; runtime deployment locators are also ignored. Neither is required in the repository to run a new test.

## Recorded evidence

| Evidence | What it establishes |
| --- | --- |
| [Public-clone checks, 2026-09-26](evidence/2026-09-26-public-clone.json) | An unauthenticated fresh clone passed installation, compiler setup, compilation, 38 tests, build and local doctor checks at the recorded commit. |
| [Development-chain checks, 2026-09-26](evidence/2026-09-26-matchproof-smoke.json) | A real Local Devnet deployment confirmed issuance, request and proof transactions, and a separate provider read the result. |

These JSON files contain public verification results and transaction identifiers, not credentials or private state. They are historical evidence, not a guarantee that the recorded local chain is available or that its requests remain valid. A new run produces new addresses and transaction IDs.

## Interpretation

- Replay and insufficient-income cases were rejected before submission during circuit execution. The reports do not claim failed transactions were included in blocks.
- A separate public read does not mean the browser independently validates the indexer's response. It uses the configured indexer.
- A second browser context is not an independent physical device. Independent-device reproduction and a real extension's approval prompt are not claimed as verified.
- The automated demo wallet signs development transactions. The application must wait for chain confirmation before showing success.
- Expiry retains historical public data. There is no deletion or revocation circuit.

The [demo guide](matchproof-judge-guide.en.md) explains what to inspect in each role's UI.
