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
  pureCircuits,
} from "../../contracts/managed/contract/index.js";
import {
  compiledContract,
  createActor,
  fromHex,
  hex,
  koreanDay,
  merchants,
  PRIVATE_ID,
  type ActorRole,
  type ActorState,
  type Providers,
  type QuietContract,
} from "./model.ts";

export type Network = "undeployed" | "preprod";
export const endpoints = {
  undeployed: {
    http: "http://127.0.0.1:8088/api/v4/graphql",
    ws: "ws://127.0.0.1:8088/api/v4/graphql/ws",
  },
  preprod: {
    http: "https://indexer.preprod.midnight.network/api/v4/graphql",
    ws: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
  },
};
export function assertLocalProver(uri: string) {
  const url = new URL(uri);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password
  )
    throw new Error(
      "비밀 증명 입력을 보호하기 위해 학생 기기의 로컬 proof-server만 허용해요.",
    );
}
export async function readLedger(network: Network, address: string) {
  fromHex(address);
  const config = endpoints[network];
  const provider = indexerPublicDataProvider(config.http, config.ws);
  const state = await provider.queryContractState(address);
  if (!state) throw new Error("이 네트워크에서 배포 주소를 찾지 못했어요.");
  return ledger(state.data);
}
export type PublicSnapshot = Awaited<ReturnType<typeof publicSnapshot>>;
export async function publicSnapshot(network: Network, address: string) {
  const state = await readLedger(network, address);
  return {
    program: hex(state.programId),
    issued: Number(state.issuedCount),
    redeemed: Number(state.redeemedCount),
    receipts: [...state.receipts].map(([nullifier, merchant]) => ({
      nullifier: hex(nullifier),
      merchant:
        merchants.find((m) => hex(m.key) === hex(merchant))?.name ??
        hex(merchant),
    })),
  };
}
export class NetworkClient {
  contract?: FoundContract<QuietContract>;
  address = "";
  private busy = false;
  private constructor(
    readonly network: Network,
    readonly role: ActorRole,
    readonly providers: Providers,
  ) {}

  static async connect(network: Network, role: ActorRole, password: string) {
    const wallet = Object.values(window.midnight ?? {}).find(
      (w): w is InitialAPI =>
        !!w &&
        typeof w === "object" &&
        "apiVersion" in w &&
        /^4\./.test(w.apiVersion),
    );
    if (!wallet)
      throw new Error(
        "Midnight를 지원하는 Lace 또는 1AM 지갑 확장(Connector 4.x)이 필요해요.",
      );
    const connected = await wallet.connect(network);
    const config = await connected.getConfiguration();
    if (config.networkId !== network)
      throw new Error("지갑의 네트워크와 선택한 네트워크가 달라요.");
    const prover = config.proverServerUri ?? "http://127.0.0.1:6300";
    assertLocalProver(prover);
    setNetworkId(network);
    const keys = await connected.getShieldedAddresses();
    const zk = new FetchZkConfigProvider<"issue" | "redeem">(
      `${location.origin}/network-assets`,
      fetch.bind(window),
    );
    const privateStateProvider = levelPrivateStateProvider<
      typeof PRIVATE_ID,
      ActorState
    >({
      midnightDbName: "quietpass-v1",
      privateStateStoreName: "actors",
      signingKeyStoreName: "signing",
      accountId: `${network}:${role}:${keys.shieldedCoinPublicKey}`,
      privateStoragePasswordProvider: () => password,
    });
    const bytes = (value: string) =>
      Uint8Array.from(value.match(/../g) ?? [], (c) => parseInt(c, 16));
    const providers: Providers = {
      privateStateProvider,
      zkConfigProvider: zk,
      proofProvider: httpClientProofProvider(prover, zk),
      publicDataProvider: indexerPublicDataProvider(
        config.indexerUri,
        config.indexerWsUri,
      ),
      walletProvider: {
        getCoinPublicKey: () => keys.shieldedCoinPublicKey,
        getEncryptionPublicKey: () => keys.shieldedEncryptionPublicKey,
        balanceTx: async (tx) => {
          const result = await connected.balanceUnsealedTransaction(
            hex(tx.serialize()),
          );
          return Transaction.deserialize(
            "signature",
            "proof",
            "binding",
            bytes(result.tx),
          );
        },
      },
      midnightProvider: {
        submitTx: async (tx) => {
          await connected.submitTransaction(hex(tx.serialize()));
          return tx.identifiers()[0];
        },
      },
    };
    // Check encryption password and storage availability before any transaction.
    privateStateProvider.setContractAddress("0".repeat(64));
    await privateStateProvider.get(PRIVATE_ID);
    return new NetworkClient(network, role, providers);
  }

  private async exclusive<T>(run: () => Promise<T>) {
    if (this.busy) throw new Error("앞선 거래가 끝난 뒤 다시 시도해 주세요.");
    this.busy = true;
    try {
      return await run();
    } finally {
      this.busy = false;
    }
  }
  async deploy() {
    return this.exclusive(async () => {
      if (this.role !== "issuer") throw new Error("학교 역할로 배포해 주세요.");
      const store = this.providers.privateStateProvider;
      store.setContractAddress("0".repeat(64));
      const state = (await store.get(PRIVATE_ID)) ?? createActor("issuer");
      await store.set(PRIVATE_ID, state);
      const program = crypto.getRandomValues(new Uint8Array(32));
      this.contract = await deployContract(this.providers, {
        compiledContract,
        privateStateId: PRIVATE_ID,
        initialPrivateState: state,
        args: [
          program,
          pureCircuits.issuerCommitment(state.secret),
          merchants[0].key,
          merchants[1].key,
        ],
      });
      this.address = this.contract.deployTxData.public.contractAddress;
      store.setContractAddress(this.address);
      return this.contract.deployTxData.public.txHash;
    });
  }
  async join(address: string) {
    return this.exclusive(async () => {
      fromHex(address);
      const store = this.providers.privateStateProvider;
      store.setContractAddress(address);
      let state = await store.get(PRIVATE_ID);
      if (!state && this.role === "issuer")
        throw new Error(
          "이 지갑·브라우저에 해당 학교 발급키가 없어요. 배포했던 환경을 사용해 주세요.",
        );
      state ??= createActor("student");
      if (state.role !== this.role) throw new Error("저장된 역할이 달라요.");
      const publicState = await readLedger(this.network, address);
      if (
        this.role === "issuer" &&
        hex(publicState.issuerKeyHash) !==
          hex(pureCircuits.issuerCommitment(state.secret))
      )
        throw new Error("해당 프로그램의 발급키가 아니에요.");
      await store.set(PRIVATE_ID, state);
      this.contract = await findDeployedContract<QuietContract>(
        this.providers,
        {
          contractAddress: address,
          compiledContract,
          privateStateId: PRIVATE_ID,
          initialPrivateState: state,
        },
      );
      this.address = address;
    });
  }
  async studentStatus() {
    if (this.role !== "student" || !this.address)
      throw new Error("학생으로 프로그램에 연결해 주세요.");
    const state = (await this.providers.privateStateProvider.get(PRIVATE_ID))!;
    const current = await readLedger(this.network, this.address);
    const commitment = pureCircuits.credentialCommitment(
      current.programId,
      state.secret,
    );
    return {
      commitment: hex(commitment),
      issued: current.registered.member(commitment),
      used: current.spent.member(
        pureCircuits.dailyNullifier(
          current.programId,
          state.secret,
          koreanDay(),
        ),
      ),
    };
  }
  async issue(studentId: string, commitmentHex: string) {
    return this.exclusive(async () => {
      if (this.role !== "issuer" || !this.contract)
        throw new Error("학교로 프로그램에 연결해 주세요.");
      if (!["DEMO-001", "DEMO-002"].includes(studentId))
        throw new Error("모의 명부의 지원 대상이 아니에요.");
      const commitment = fromHex(commitmentHex);
      const store = this.providers.privateStateProvider;
      const state = (await store.get(PRIVATE_ID))!;
      const prior = state.enrollments[studentId];
      if (prior && prior.commitment !== hex(commitment))
        throw new Error("동일 학생에게 다른 자격을 중복 발급할 수 없어요.");
      const current = await readLedger(this.network, this.address);
      if (current.registered.member(commitment))
        throw new Error("이미 발급된 자격이에요.");
      // Reserve before submitting: uncertain failures must not permit another credential.
      state.enrollments[studentId] = {
        commitment: hex(commitment),
        status: "pending",
      };
      await store.set(PRIVATE_ID, state);
      const result = await this.contract.callTx.issue(commitment);
      state.enrollments[studentId].status = "confirmed";
      await store.set(PRIVATE_ID, state);
      return result.public.txHash;
    });
  }
  async redeem(merchantId: string) {
    return this.exclusive(async () => {
      if (this.role !== "student" || !this.contract)
        throw new Error("학생으로 프로그램에 연결해 주세요.");
      const merchant = merchants.find((m) => m.id === merchantId);
      if (!merchant) throw new Error("등록된 식당을 선택해 주세요.");
      const result = await this.contract.callTx.redeem(
        koreanDay(),
        merchant.key,
      );
      return result.public.txHash;
    });
  }
}
