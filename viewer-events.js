export function viewerFromEvent(event) {
  const user = event?.user || {};
  const validId = value => value !== undefined && value !== null && String(value).trim() !== '' && String(value) !== '0';
  const rawId = [user.id, user.userId, event?.userId, user.displayId, user.uniqueId, event?.uniqueId].find(validId);
  if (rawId === undefined) return null;
  const id = String(rawId);
  const username = String(user.displayId || user.uniqueId || event?.uniqueId || id);
  const name = String(user.nickname || event?.nickname || username);
  const candidate = user.avatarThumb?.urlList?.[0] || user.avatarMedium?.urlList?.[0] || user.avatarLarge?.urlList?.[0] || user.profilePictureUrl || event?.profilePictureUrl || '';
  const avatar = typeof candidate === 'string' && candidate.startsWith('https://') ? candidate : '';
  return {id,username,name,avatar};
}
export function processViewerEvent(type,event,{ensureViewer,recordLikes}) {
  const user=viewerFromEvent(event);
  if(!user) return;
  if(type==='like') {
    const count=Number(event.count);
    if(!Number.isSafeInteger(count)||count<=0)return;
    ensureViewer(user,true);
    recordLikes(user.id,count);
  } else if(type==='member' || type==='chat') {
    ensureViewer(user,true);
  }
}
