// Midnight.js wraps witness exceptions in ContractRuntimeError and transaction errors.
// Inspect only bounded Error messages, never serialize transaction/witness objects.
export function hasErrorCode(error: unknown, code: string): boolean {
  let current = error;
  const seen = new Set<unknown>();
  for (
    let depth = 0;
    depth < 8 && current instanceof Error && !seen.has(current);
    depth++
  ) {
    seen.add(current);
    if (current.message.includes(code)) return true;
    current = current.cause;
  }
  return false;
}
