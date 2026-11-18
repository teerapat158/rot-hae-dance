export const STAY_MS = 180_000;
export const EXTEND_LIKES = 50;
export function addLikes(entry, count, now = Date.now()) {
  if (!entry || !Number.isSafeInteger(count) || count <= 0 || !Number.isSafeInteger(entry.likes + count)) return false;
  entry.likes += count;
  entry.lastActivityAt = now;
  return true;
}
export function expired(entry, now = Date.now()) {
  const lastActivity=entry?.lastActivityAt ?? entry?.joinedAt;
  return Number.isFinite(lastActivity) && now - lastActivity >= STAY_MS;
}
export function accumulateReturnLikes(previous, count) {
  if (!Number.isSafeInteger(previous) || previous < 0 || !Number.isSafeInteger(count) || count <= 0) return null;
  const total = previous + count;
  if (!Number.isSafeInteger(total)) return null;
  return total < EXTEND_LIKES ? { returned:false, pending:total, extra:0 } : { returned:true, pending:0, extra:total-EXTEND_LIKES };
}
