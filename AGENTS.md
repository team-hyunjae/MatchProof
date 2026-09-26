# MatchProof project context

- MatchProof is the selected hackathon submission as of 2026-09-26. Team 현재 has two members: GitHub users pegeaether and mjlee5929.
- Team descriptions should list the team name and members only. Do not add individual development roles, contribution claims, or candidate-development history. Preserve factual commit authorship; listing a member does not authorize repository access grants.
- This folder is the canonical working copy. Do not edit the older ChatGPT mirror or its read-only `sources/` files as part of work here.
- Read README.md and submission/checklist.md first. The approved MVP is matchmaking agency eligibility verification, not a complete dating application.
- Use synthetic income/marital data and Midnight `undeployed` only. Do not silently switch to Mainnet, Preprod, or a fake success path.
- Preserve the issuer trust boundary, applicant key binding, explicit consent, time limits, and independent public reads. Explain the difference between chain confirmation and UI state.
- `npm run demo` explicitly starts a public development wallet that automatically signs synthetic local-devnet transactions. Normal builds must not bundle its session connector/token.
- Loopback URLs may be SSH forwards. Do not claim proof inputs stay on the user's physical device without checking the actual deployment topology.
- Keep the pinned SDK/runtime/compiler versions. In particular, onchain-runtime-v3 must resolve to one 3.0.0 instance.
- Relevant checks: npm run doctor, npm test, npm run build, npm run matchproof:check; network checks require development services. Record what was actually exercised.
- Preserve old QuietPass files for reference/regression checks. The default page and submission narrative must be MatchProof.
- The original verification used the official test wallet adapter. Do not claim an actual extension approval popup or independent-device verification unless newly tested.
- Do not commit runtime wallet connectors, private-state stores, downloaded credentials, or real personal data. Public historical transaction reports are evidence, not a current live demo guarantee.
