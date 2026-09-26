import type { InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import {
  deployContract,
  findDeployedContract,
  type FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import {
  ledger,
  type Ledger,
} from "../../contracts/matchproof-managed/contract/index.js";
import { assertLocalProver, endpoints } from "../network/client.ts";
import {
  compiledContract,
  createActor,
  fromHex,
  hex,
  pureCircuits,
  randomSecret,
  PRIVATE_ID,
  MatchError,
  evidenceForIssue,
  exportCredential,
  importCredential,
  importRequest,
  type ActorState,
  type Role,
  type Providers,
  type MatchContract,
  type Operation,
  type Fixture,
  type RequestPackage,
} from "./model.ts";

const ZERO = "0".repeat(64);
export const NETWORK = "undeployed" as const;
function view(state: Ledger) {
  return {
    program: hex(state.programId),
    agency: hex(state.agencyKeyHash),
    minimumIncomeKrw: state.minimumIncomeKrw.toString(),
    incomeYear: Number(state.requiredIncomeYear),
    maxAgeDays: Number(state.maxEvidenceAgeSeconds) / 86400,
    issued: Number(state.registered.size()),
    requests: [...state.requests].map(([key, request]) => ({
      key: hex(key),
      requestedAt: Number(request.requestedAt),
      expiresAt: Number(request.expiresAt),
      confirmed: state.approvals.member(key),
    })),
  };
}
export type Snapshot = ReturnType<typeof view>;
export async function publicSnapshot(address: string): Promise<Snapshot> {
  fromHex(address);
  const config = endpoints.undeployed;
  const provider = indexerPublicDataProvider(config.http, config.ws);
  const state = await provider.queryContractState(address);
  if (!state)
    throw new MatchError("로컬 개발 네트워크에서 배포를 찾지 못했어요.");
  return view(ledger(state.data));
}
export function reviewStatus(
  request: Snapshot["requests"][number],
  now = Date.now() / 1000,
) {
  if (now >= request.expiresAt) return "expired";
  return request.confirmed ? "approved" : "pending";
}
export class MatchClient {
  contract?: FoundContract<MatchContract>;
  address = "";
  private busy = false;
  private constructor(
    readonly role: Role,
    readonly providers: Providers,
  ) {}

  static async withProviders(role: Role, providers: Providers) {
    setNetworkId(NETWORK);
    const store = providers.privateStateProvider;
    store.setContractAddress(ZERO);
    const existing = await store.get(PRIVATE_ID);
    if (existing && existing.role !== role)
      throw new MatchError("개인 보관함의 역할이 달라요.");
    if (!existing) await store.set(PRIVATE_ID, createActor(role));
    return new MatchClient(role, providers);
  }

  static async connect(role: Role, password: string) {
    const wallet = Object.values(window.midnight ?? {}).find(
      (w): w is InitialAPI =>
        !!w &&
        typeof w === "object" &&
        "apiVersion" in w &&
        /^4\./.test(w.apiVersion),
    );
    if (!wallet)
      throw new MatchError(
        "이 브라우저에서 Connector 4.x 지갑을 찾지 못했어요. 로컬 시연은 npm run demo로 시작한 화면을 열어 주세요. 확장 지갑 사용 시 Undeployed 설정이 필요해요.",
      );
    const connected = await wallet.connect(NETWORK);
    const config = await connected.getConfiguration();
    if (config.networkId !== NETWORK)
      throw new MatchError(
        "로컬 개발 네트워크(Undeployed) 지갑만 연결할 수 있어요.",
      );
    const prover = config.proverServerUri ?? "http://127.0.0.1:6300";
    assertLocalProver(prover);
    // Pin the local chain for both wallet transactions and independent public reads.
    const configHttp = new URL(config.indexerUri);
    const configWs = new URL(config.indexerWsUri);
    if (
      ![configHttp, configWs].every(
        (u) =>
          ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname) &&
          u.port === "8088",
      )
    )
      throw new MatchError(
        "이 데모는 로컬 인덱서 8088번 포트를 사용해요. 지갑 설정을 확인해 주세요.",
      );
    const keys = await connected.getShieldedAddresses();
    const zk = new FetchZkConfigProvider<Operation>(
      `${location.origin}/matchproof-assets`,
      fetch.bind(window),
    );
    const store = levelPrivateStateProvider<typeof PRIVATE_ID, ActorState>({
      midnightDbName: "matchproof-v1",
      privateStateStoreName: "actors",
      signingKeyStoreName: "signing",
      accountId: `${NETWORK}:${role}:${keys.shieldedCoinPublicKey}`,
      privateStoragePasswordProvider: () => password,
    });
    return this.withProviders(role, {
      privateStateProvider: store,
      zkConfigProvider: zk,
      proofProvider: httpClientProofProvider(prover, zk),
      publicDataProvider: indexerPublicDataProvider(
        endpoints.undeployed.http,
        endpoints.undeployed.ws,
      ),
      walletProvider: {
        getCoinPublicKey: () => keys.shieldedCoinPublicKey,
        getEncryptionPublicKey: () => keys.shieldedEncryptionPublicKey,
        balanceTx: async (tx) => {
          const balanced = await connected.balanceUnsealedTransaction(
            hex(tx.serialize()),
          );
          return Transaction.deserialize(
            "signature",
            "proof",
            "binding",
            Uint8Array.from(balanced.tx.match(/../g) ?? [], (s) =>
              parseInt(s, 16),
            ),
          );
        },
      },
      midnightProvider: {
        submitTx: async (tx) => {
          await connected.submitTransaction(hex(tx.serialize()));
          return tx.identifiers()[0];
        },
      },
    });
  }

  private async exclusive<T>(run: () => Promise<T>): Promise<T> {
    if (this.busy)
      throw new MatchError("앞선 작업이 끝난 뒤 다시 시도해 주세요.");
    this.busy = true;
    try {
      return await run();
    } finally {
      this.busy = false;
    }
  }
  private async state() {
    const state = await this.providers.privateStateProvider.get(PRIVATE_ID);
    if (!state || state.role !== this.role)
      throw new MatchError("개인 보관함을 다시 연결해 주세요.");
    return state;
  }
  private require(role: Role) {
    if (this.role !== role || !this.contract)
      throw new MatchError("해당 역할로 배포에 연결해 주세요.");
    return this.contract;
  }
  private async chain() {
    const result = await this.providers.publicDataProvider.queryContractState(
      this.address,
    );
    if (!result) throw new MatchError("배포 주소를 찾을 수 없어요.");
    return ledger(result.data);
  }
  async identity() {
    const s = await this.state();
    return hex(
      this.role === "agency"
        ? pureCircuits.agencyCommitment(s.secret)
        : this.role === "issuer"
          ? pureCircuits.issuerCommitment(s.secret)
          : pureCircuits.holderCommitment(s.secret),
    );
  }
  async details() {
    const s = await this.state();
    return {
      identity: await this.identity(),
      evidence: this.role === "applicant" ? s.evidence : undefined,
      request: this.role === "applicant" ? s.activeRequest : undefined,
      reviews: this.role === "agency" ? s.reviews : {},
    };
  }
  async deploy(agencyKey: string) {
    return this.exclusive(async () => {
      if (this.role !== "issuer" || this.contract)
        throw new MatchError("미연결 검증기관 역할에서 배포해 주세요.");
      const state = await this.state();
      const deployed = await deployContract(this.providers, {
        compiledContract,
        privateStateId: PRIVATE_ID,
        initialPrivateState: state,
        args: [
          randomSecret(),
          pureCircuits.issuerCommitment(state.secret),
          fromHex(agencyKey),
          50_000_000n,
          2025n,
          7n * 86400n,
        ],
      });
      this.contract = deployed;
      this.address = deployed.deployTxData.public.contractAddress;
      this.providers.privateStateProvider.setContractAddress(this.address);
      await this.providers.privateStateProvider.set(PRIVATE_ID, state);
      return deployed.deployTxData.public.txHash;
    });
  }
  async join(address: string) {
    return this.exclusive(async () => {
      if (this.contract)
        throw new MatchError(
          "다른 배포에 연결하려면 역할 화면을 다시 열어 주세요.",
        );
      fromHex(address);
      const store = this.providers.privateStateProvider;
      const base = await this.state();
      const previous = this.address || ZERO;
      store.setContractAddress(address);
      try {
        const state =
          (await store.get(PRIVATE_ID)) ??
          (this.role === "applicant" ? createActor("applicant") : base);
        if (state.role !== this.role)
          throw new MatchError("저장된 역할이 달라요.");
        const result =
          await this.providers.publicDataProvider.queryContractState(address);
        if (!result)
          throw new MatchError("이 개발 네트워크에서 배포를 찾지 못했어요.");
        const current = ledger(result.data);
        if (
          this.role === "issuer" &&
          hex(current.issuerKeyHash) !==
            hex(pureCircuits.issuerCommitment(state.secret))
        )
          throw new MatchError("이 배포의 검증기관 키가 아니에요.");
        if (
          this.role === "agency" &&
          hex(current.agencyKeyHash) !==
            hex(pureCircuits.agencyCommitment(state.secret))
        )
          throw new MatchError("이 배포의 업체 키가 아니에요.");
        await store.set(PRIVATE_ID, state);
        this.contract = await findDeployedContract<MatchContract>(
          this.providers,
          {
            compiledContract,
            contractAddress: address,
            privateStateId: PRIVATE_ID,
            initialPrivateState: state,
          },
        );
        this.address = address;
      } catch (error) {
        store.setContractAddress(previous);
        throw error;
      }
    });
  }
  async issue(holder: string, fixture: Fixture) {
    return this.exclusive(async () => {
      const contract = this.require("issuer");
      const state = await this.state();
      const id = `${hex(fromHex(holder))}:${fixture}`;
      state.evidence = evidenceForIssue(state.issued[id], holder, fixture);
      state.issued[id] = state.evidence;
      // Persist before submission so an uncertain result retries the same commitment.
      await this.providers.privateStateProvider.set(PRIVATE_ID, state);
      const chain = await this.chain();
      const leaf = pureCircuits.credentialCommitment(
        chain.programId,
        state.evidence,
      );
      const hash = chain.registered.member(leaf)
        ? undefined
        : (await contract.callTx.issue()).public.txHash;
      return { hash, file: exportCredential(this.address, state.evidence) };
    });
  }
  async acceptCredential(text: string) {
    return this.exclusive(async () => {
      this.require("applicant");
      const evidence = importCredential(text, this.address);
      const state = await this.state();
      if (
        hex(evidence.holder) !==
        hex(pureCircuits.holderCommitment(state.secret))
      )
        throw new MatchError("이 기기의 신청자에게 발급된 자료가 아니에요.");
      const chain = await this.chain();
      if (
        !chain.registered.member(
          pureCircuits.credentialCommitment(chain.programId, evidence),
        )
      )
        throw new MatchError("체인에서 발급이 확인되지 않은 자료예요.");
      state.evidence = evidence;
      await this.providers.privateStateProvider.set(PRIVATE_ID, state);
    });
  }
  async openReview(holder: string, label: string) {
    return this.exclusive(async () => {
      const contract = this.require("agency");
      if (!/^DEMO-[A-Z0-9-]{1,24}$/.test(label))
        throw new MatchError(
          "가상 접수번호는 DEMO-로 시작하는 영문·숫자로 입력해 주세요.",
        );
      const state = await this.state();
      const chain = await this.chain();
      const nonce = randomSecret();
      const key = hex(
        pureCircuits.requestCommitment(chain.programId, fromHex(holder), nonce),
      );
      const request: RequestPackage = {
        kind: "matchproof-request",
        version: 1,
        network: NETWORK,
        address: this.address,
        key,
        nonce: hex(nonce),
        holder: hex(fromHex(holder)),
      };
      state.reviews[key] = { label, request };
      await this.providers.privateStateProvider.set(PRIVATE_ID, state);
      const now = BigInt(Math.floor(Date.now() / 1000));
      const result = await contract.callTx.openRequest(
        fromHex(key),
        now,
        now + 600n,
      );
      return {
        hash: result.public.txHash,
        file: JSON.stringify(request, null, 2),
      };
    });
  }
  async acceptRequest(text: string) {
    return this.exclusive(async () => {
      this.require("applicant");
      const request = importRequest(text, this.address);
      const state = await this.state();
      const chain = await this.chain();
      const holder = pureCircuits.holderCommitment(state.secret);
      if (
        hex(holder) !== request.holder ||
        hex(
          pureCircuits.requestCommitment(
            chain.programId,
            holder,
            fromHex(request.nonce),
          ),
        ) !== request.key
      )
        throw new MatchError("이 신청자와 일치하는 심사 요청이 아니에요.");
      if (!chain.requests.member(fromHex(request.key)))
        throw new MatchError("업체가 등록하지 않은 심사 요청이에요.");
      state.activeRequest = request;
      await this.providers.privateStateProvider.set(PRIVATE_ID, state);
    });
  }
  async prove() {
    return this.exclusive(async () => {
      const contract = this.require("applicant");
      const state = await this.state();
      if (!state.evidence || !state.activeRequest)
        throw new MatchError("자격증명과 심사 요청 파일을 모두 가져와 주세요.");
      return (
        await contract.callTx.proveEligibility(fromHex(state.activeRequest.key))
      ).public.txHash;
    });
  }
}
