import { viewerFromEvent } from './viewer-events.js';
export function parseGift(event) {
  const gift = event?.gift;
  if (!gift) return null;
  const streak = Number(gift.type) === 1;
  if (streak && Number(event.repeatEnd) !== 1) return null;
  const count = Number(event.repeatCount || 1);
  if (!Number.isSafeInteger(count) || count < 1) return null;
  const diamonds = Number(gift.diamondCount);
  const total = Number.isSafeInteger(diamonds) && diamonds > 0 && Number.isSafeInteger(diamonds * count) ? diamonds * count : null;
  const person = viewerFromEvent(event);
  const id = person?.id || ''; 
  const group = String(event.groupId || '');
  const msg = String(event.common?.msgId || '');
  const key = streak && group && group !== '0' ? `streak:${id}:${event.giftId}:${group}` : msg && msg !== '0' ? `msg:${msg}` : null;
  return {id, name:person?.name || 'ผู้ชม', avatar:person?.avatar || '', gift:String(gift.name || 'ของขวัญ'), count, diamonds:total, key};
}
