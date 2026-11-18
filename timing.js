export const STAY_MS = 60_000;
export function addLikes(entry, count, now = Date.now()) {
  if (!entry || now >= entry.expiresAt || !Number.isSafeInteger(count) || count <= 0) return false;
  const previous = entry.likes;
  entry.likes += count;
  entry.expiresAt += (Math.floor(entry.likes / 10) - Math.floor(previous / 10)) * STAY_MS;
  return true;
}
export function expired(entry, now = Date.now()) { return now >= entry.expiresAt; }
export function accumulateReturnLikes(previous, count) {
  if (!Number.isSafeInteger(previous) || previous < 0 || !Number.isSafeInteger(count) || count <= 0) return null;
  const total = previous + count;
  if (!Number.isSafeInteger(total)) return null;
  return total < 10 ? { returned:false, pending:total, extra:0 } : { returned:true, pending:0, extra:total-10 };
}
