import { viewerFromEvent } from './viewer-events.js';
export function parseGift(event) {
  if (!event) return null;
  const gift = event.gift || event.giftDetails || event.extendedGiftInfo || {};
  const giftId=Number(event.giftId || gift.id || gift.giftId || 0);
  if (!giftId && !gift.name && !gift.giftName) return null;
  const streak = Number(gift.type ?? gift.giftType ?? event.giftType) === 1;
  if (streak && event.repeatEnd !== true && Number(event.repeatEnd) !== 1) return null;
  const count = Number(event.repeatCount || 1);
  if (!Number.isSafeInteger(count) || count < 1) return null;
  const diamonds = Number(gift.diamondCount ?? event.diamondCount ?? event.extendedGiftInfo?.diamondCount);
  const total = Number.isSafeInteger(diamonds) && diamonds > 0 && Number.isSafeInteger(diamonds * count) ? diamonds * count : null;
  const person = viewerFromEvent(event);
  const id = person?.id || ''; 
  const group = String(event.groupId || '');
  const msg = String(event.common?.msgId || '');
  const key = streak && group && group !== '0' ? `streak:${id}:${event.giftId}:${group}` : msg && msg !== '0' ? `msg:${msg}` : null;
  return {giftId, id, name:person?.name || 'ผู้ชม', avatar:person?.avatar || '', gift:String(gift.name || gift.giftName || event.extendedGiftInfo?.name || 'ของขวัญ'), count, diamonds:total, key};
}
