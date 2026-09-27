export const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export function fromHex(value: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/i.test(value))
    throw new Error("32바이트(64자리 hex) 값을 입력해 주세요.");
  return Uint8Array.from(value.match(/../g)!, (x) => Number.parseInt(x, 16));
}
