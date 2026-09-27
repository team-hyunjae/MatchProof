export const endpoints = {
  undeployed: {
    http: "http://127.0.0.1:8088/api/v4/graphql",
    ws: "ws://127.0.0.1:8088/api/v4/graphql/ws",
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
      "비공개 증명 입력은 loopback 주소의 개발용 proof-server로만 전달할 수 있어요. SSH 터널을 사용하면 실제 서버 위치도 확인해 주세요.",
    );
}
