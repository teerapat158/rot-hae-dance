import http from 'node:http';
import { readFile, unlink } from 'node:fs/promises';
import { STAY_MS, EXTEND_LIKES, addLikes, expired, accumulateReturnLikes } from './timing.js';
import { processViewerEvent, viewerFromEvent } from './viewer-events.js';
import { parseGift } from './gift-events.js';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

let connection = null, generation = 0;
let state = { mode: 'live', status: 'offline', username: '', message: '', users: Object.create(null), joined: [], leaderboard: [], totalLikes: 0, viewerCount: null };
let announcement='', announcementExpiresAt=0, announcementTimer=null;
const clients = new Set();
let testSequence = 0;
const waiting = new Map();
const ranking = new Map();
const twerkTotals = new Map();
const pendingTwerks = new Map();
const seenGifts = new Map();
function broadcast() { const data = `data: ${JSON.stringify({...state,announcement,announcementExpiresAt})}\n\n`; for (const client of clients) client.write(data); }
function broadcastEvent(type, payload) { const data = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`; for (const client of clients) client.write(data); }
function publishGift(event) {
  const gift = parseGift(event); if (!gift) return;
  const now=Date.now(); for(const [key,time] of seenGifts) if(now-time>300000) seenGifts.delete(key);
  if(gift.key && seenGifts.has(gift.key)) return;
  if(gift.key) {seenGifts.set(gift.key,now); if(seenGifts.size>2000) seenGifts.delete(seenGifts.keys().next().value);}
  const giftViewer=viewerFromEvent(event);
  if (giftViewer) ensureViewer(giftViewer,true,now);
  if (gift.giftId === 16901 || /^(tiny\s+diny|tiny\s+dino|ไดโนเสาร์จิ๋ว)$/iu.test(gift.gift.trim())) {
    const person = viewerFromEvent(event);
    if (person) {
      if (removeExpired(now)) broadcast();
      if (!state.users[person.id]) ensureViewer(person, true, now);
      const viewer=state.users[person.id];
      if (viewer) { viewer.costume='dinosaur'; viewer.expiresAt=Math.max(viewer.expiresAt,now+STAY_MS); broadcast(); }
    }
  }
  const {key,...payload}=gift; broadcastEvent('gift',payload);
}
function removeExpired(now = Date.now()) {
  const active = [];
  for (const entry of state.joined) {
    if (expired(entry, now)) { delete state.users[entry.id]; waiting.set(entry.id, {id:entry.id, username:entry.username, name:entry.name, avatar:entry.avatar, pending:0}); }
    else active.push(entry);
  }
  const changed = active.length !== state.joined.length;
  if (changed) state.joined = active;
  return changed;
}
setInterval(() => { if (removeExpired()) broadcast(); }, 1000).unref();
function recordLikes(id, count, now = Date.now()) {
  if (removeExpired(now)) broadcast();
  const entry = state.users[id];
  const person = entry || waiting.get(id);
  if (!person || !Number.isSafeInteger(count) || count <= 0) return;
  const rank = ranking.get(id) || {id, name:person.name, likes:0, firstAt:now};
  if (!Number.isSafeInteger(rank.likes + count)) return;
  rank.name = person.name; rank.likes += count; ranking.set(id, rank);
  state.totalLikes = Math.min(Number.MAX_SAFE_INTEGER, state.totalLikes + count);
  state.leaderboard = [...ranking.values()].sort((a,b)=>b.likes-a.likes || a.firstAt-b.firstAt).slice(0,5).map(({id,name,likes})=>({id,name,likes}));
  const after = (twerkTotals.get(id) || 0) + count;
  if (!Number.isSafeInteger(after)) return;
  const milestones = Math.floor(after / 100);
  const progress = after % 100;
  twerkTotals.set(id, progress);
  let visible = entry;
  if (entry) {
    entry.twerkProgress = progress;
    if (addLikes(entry, count, now)) broadcast();
  } else {
    const result = accumulateReturnLikes(person.pending, count);
    if (!result) return;
    if (!result.returned) {
      person.pending = result.pending; broadcast();
    } else {
      waiting.delete(id);
      visible = {id:person.id, username:person.username, name:person.name, avatar:person.avatar, likes:EXTEND_LIKES, twerkProgress:progress, joinedAt:now, expiresAt:now+STAY_MS};
      if (result.extra) addLikes(visible, result.extra, now);
      state.users[id] = visible; state.joined.push(visible); broadcast();
    }
  }
  const due = Math.min((pendingTwerks.get(id) || 0) + milestones, 20);
  if (!visible) { if (due) pendingTwerks.set(id, due); return; }
  pendingTwerks.delete(id);
  for(let n=0;n<due;n++) broadcastEvent('twerk',{id, name:visible.name, avatar:visible.avatar});
}
function ensureViewer(person, allowRejoin, now = Date.now()) {
  if (removeExpired(now)) broadcast();
  const existing=state.users[person.id];
  if (existing) { existing.lastActivityAt=now; return; }
  if (!allowRejoin && waiting.has(person.id)) return;
  waiting.delete(person.id);
  const entry = {...person, likes:0, twerkProgress:twerkTotals.get(person.id)||0, joinedAt:now, lastActivityAt:now, expiresAt:now+STAY_MS};
  state.users[person.id] = entry; state.joined.push(entry); broadcast();
}
function disconnect() { generation++; if (connection) { try { connection.disconnect(); } catch {} connection = null; } }
async function connect(username, resumeState = null) {
  disconnect(); waiting.clear(); ranking.clear(); twerkTotals.clear(); pendingTwerks.clear(); seenGifts.clear(); const current = generation;
  if (resumeState) restoreState(resumeState);
  else state = {mode:'live', status:'connecting', username, message:'กำลังเชื่อมต่อ...', users:Object.create(null), joined:[], leaderboard:[], totalLikes:0, viewerCount:null};
  state.status='connecting'; state.message='กำลังเชื่อมต่อ...'; broadcast();
  try {
  const live = new TikTokLiveConnection(username, resumeState ? {processInitialData:false} : {}); connection = live;
  const handlers = {ensureViewer, recordLikes};
  for (const [eventName,type] of [[WebcastEvent.MEMBER,'member'],[WebcastEvent.CHAT,'chat'],[WebcastEvent.LIKE,'like']]) {
    live.on(eventName, event => { if (current !== generation) return; processViewerEvent(type, event, handlers); if (type === 'chat') { const viewer=viewerFromEvent(event); if(viewer) broadcastEvent('comment-dance',{...viewer,comment:String(event.comment ?? '').slice(0,300)}); } });
  }
  live.on(WebcastEvent.ROOM_USER, event => { if(current !== generation) return; const viewers=Number(event?.total); if(Number.isSafeInteger(viewers) && viewers>=0 && state.viewerCount!==viewers) {state.viewerCount=viewers; broadcast();} });
  live.on(WebcastEvent.GIFT, event => { if(current === generation) { const person=viewerFromEvent(event); if(person) ensureViewer(person,true); publishGift(event); } });
  live.on(ControlEvent.ERROR, error => { if(current === generation) { state.message = String(error?.message || error); broadcast(); } });
  live.on(ControlEvent.DISCONNECTED, () => { if(current === generation) { state.status='offline'; state.message='การเชื่อมต่อสิ้นสุดลง'; broadcast(); } });
  live.on(WebcastEvent.STREAM_END, () => { if(current === generation) { state.status='offline'; state.message='ไลฟ์จบแล้ว'; broadcast(); } });
  await live.connect(); if(current === generation) {state.status='live'; state.message='เชื่อมต่อแล้ว'; broadcast();}
  } catch(error) { if(current === generation) { connection=null; state.status='offline'; state.message=String(error?.message || error); broadcast(); } }
}
function restoreState(saved) {
  const now=Date.now();
  const joined=Array.isArray(saved.joined)?saved.joined.filter(u=>u && u.id):[];
  const users=Object.create(null); for(const entry of joined){if(!Number.isFinite(entry.lastActivityAt)) entry.lastActivityAt=now; users[entry.id]=entry; twerkTotals.set(entry.id,Number(entry.twerkProgress)||0);}
  const leaderboard=Array.isArray(saved.leaderboard)?saved.leaderboard:[];
  for(const entry of joined) ranking.set(entry.id,{id:entry.id,name:entry.name,likes:Number(entry.likes)||0,firstAt:entry.joinedAt||now});
  for(const entry of leaderboard) ranking.set(entry.id,{...entry,firstAt:now});
  testSequence=joined.reduce((n,entry)=>Math.max(n,Number(String(entry.id).match(/^test-(\d+)$/)?.[1]||0)),0);
  state={mode:saved.mode==='test'?'test':'live',status:saved.mode==='test'?'test':'offline',username:String(saved.username||''),message:'กู้คืนผู้ชมแล้ว',users,joined,leaderboard,totalLikes:Number(saved.totalLikes)||0,viewerCount:Number.isSafeInteger(saved.viewerCount)?saved.viewerCount:null};
}
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  if (req.method === 'GET' && url.pathname === '/events') { res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'}); clients.add(res); res.write(`data: ${JSON.stringify({...state,announcement,announcementExpiresAt})}\n\n`); req.on('close',()=>clients.delete(res)); return; }
  if (req.method === 'POST' && url.pathname === '/floor/clear-10') {
    const removed=state.joined.slice(0,10);
    for (const entry of removed) {
      delete state.users[entry.id];
      waiting.set(entry.id,{id:entry.id,username:entry.username,name:entry.name,avatar:entry.avatar,pending:0});
    }
    state.joined=state.joined.slice(removed.length);
    broadcast(); res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({removed:removed.length})); return;
  }
  if (req.method === 'POST' && url.pathname === '/announcement') {
    let chunks=[],size=0;
    for await(const chunk of req) { size+=chunk.length; if(size>4096){res.writeHead(413).end();return;} chunks.push(chunk); }
    let text; try {const body=JSON.parse(Buffer.concat(chunks).toString('utf8')); if(typeof body.text!=='string') throw new Error('invalid'); text=Array.from(body.text.trim()).slice(0,160).join('');} catch {res.writeHead(400).end();return;}
    clearTimeout(announcementTimer); announcement=text; announcementExpiresAt=text?Date.now()+5000:0;
    if(text) announcementTimer=setTimeout(()=>{announcement='';announcementExpiresAt=0;broadcast()},5000);
    broadcast();res.writeHead(200).end();
    return;
  }
  if (req.method === 'POST' && url.pathname === '/reset-floor') {
    waiting.clear(); ranking.clear(); twerkTotals.clear(); pendingTwerks.clear();
    state.users=Object.create(null); state.joined=[]; state.leaderboard=[];
    state.totalLikes=0; state.viewerCount=null;
    broadcast(); res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/reset-likes') {
    ranking.clear(); twerkTotals.clear(); pendingTwerks.clear();
    state.totalLikes=0; state.leaderboard=[];
    for (const entry of state.joined) { entry.likes=0; entry.twerkProgress=0; }
    for (const entry of waiting.values()) entry.pending=0;
    broadcast(); res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && (url.pathname === '/mode/test' || url.pathname === '/mode/live')) {
    disconnect(); waiting.clear(); ranking.clear(); twerkTotals.clear(); pendingTwerks.clear(); seenGifts.clear(); testSequence = 0; const mode = url.pathname.endsWith('/test') ? 'test' : 'live';
    state = {mode, status: mode === 'test' ? 'test' : 'offline', username:'', message:mode === 'test' ? 'โหมดทดสอบ: เพิ่มผู้ชมจำลองได้เลย' : 'โหมดไลฟ์จริง: กรอกชื่อบัญชี TikTok', users:Object.create(null), joined:[], leaderboard:[], totalLikes:0, viewerCount:null};
    broadcast(); res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/test/join') {
    if (state.mode !== 'test') { res.writeHead(409).end(); return; }
    if (removeExpired()) broadcast();
    const n = ++testSequence, id = 'test-' + n;
    const entry = {id, username:id, name:'ผู้ชมทดสอบ ' + n, avatar:'/dancer-real.png', likes:0, twerkProgress:0, joinedAt:Date.now(), lastActivityAt:Date.now(), expiresAt:Date.now()+STAY_MS};
    state.users[id]=entry; state.joined.push(entry); broadcast(); res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/test/comment') {
    if (state.mode !== 'test') { res.writeHead(409).end(); return; }
    const user=state.users['test-'+testSequence];
    if (!user) { res.writeHead(409).end('เพิ่มผู้ชมทดสอบก่อน'); return; }
    ensureViewer(user,true);
    broadcastEvent('comment-dance',{id:user.id, username:user.username, name:user.name, avatar:user.avatar, comment:'สวัสดี มาม่วนด้วยกัน!'});
    res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/test/dinosaur') {
    if (state.mode !== 'test') { res.writeHead(409).end(); return; }
    const user=state.users['test-'+testSequence];
    if (!user) { res.writeHead(409).end('เพิ่มผู้ชมทดสอบก่อน'); return; }
    publishGift({giftId:16901,gift:{name:'Tiny Diny',type:0,diamondCount:10},repeatCount:1,user:{id:user.id,displayId:user.username,nickname:user.name}});
    res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/test/rose') {
    if (state.mode !== 'test') { res.writeHead(409).end(); return; }
    const user=state.users['test-'+testSequence];
    publishGift({giftId:5655,gift:{name:'Rose',type:0,diamondCount:1},repeatCount:1,user:user?{id:user.id,displayId:user.username,nickname:user.name}:{nickname:'ผู้ชมทดสอบ'}});
    res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/test/gift') {
    if (state.mode !== 'test') { res.writeHead(409).end(); return; }
    const user=state.users['test-'+testSequence];
    publishGift({gift:{name:'ของขวัญทดสอบ',type:0,diamondCount:10},repeatCount:1,user:user?{id:user.id,displayId:user.username,nickname:user.name}: {nickname:'ผู้ชมทดสอบ'}});
    res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/test/expire') {
    if (state.mode !== 'test') { res.writeHead(409).end(); return; }
    const entry = state.users['test-' + testSequence];
    if (!entry) { res.writeHead(409).end('เพิ่มผู้ชมทดสอบก่อน'); return; }
    delete state.users[entry.id]; state.joined=state.joined.filter(user=>user.id!==entry.id); waiting.delete(entry.id); broadcast(); res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && (url.pathname === '/test/like' || url.pathname === '/test/like-100')) {
    if (state.mode !== 'test') { res.writeHead(409).end(); return; }
    const id = 'test-' + testSequence;
    if (!state.users[id] && !waiting.has(id)) { res.writeHead(409).end('เพิ่มผู้ชมทดสอบก่อน'); return; }
    if (!state.users[id] && waiting.has(id)) ensureViewer(waiting.get(id),true);
    recordLikes(id, url.pathname === '/test/like-100' ? 100 : 10); res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/connect') {
    let body=''; for await (const chunk of req) { body += chunk; if(body.length > 2048) {res.writeHead(413).end(); return;} }
    let username; try { username = String(JSON.parse(body).username || '').trim().replace(/^@/,''); } catch {res.writeHead(400).end(); return;}
    if(!/^[a-zA-Z0-9._]{2,24}$/.test(username)) {res.writeHead(400).end('ชื่อบัญชีไม่ถูกต้อง'); return;}
    connect(username); res.writeHead(202).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/disconnect') { disconnect(); state.status='offline'; state.message='ตัดการเชื่อมต่อแล้ว'; broadcast(); res.writeHead(200).end(); return; }
  const files = {'/':['index.html','text/html; charset=utf-8'],'/overlay':['overlay.html','text/html; charset=utf-8'],'/overlay.js':['overlay.js','text/javascript; charset=utf-8'],'/effects.js':['effects.js','text/javascript; charset=utf-8'],'/overlay.css':['overlay.css','text/css; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/truck.png':['truck.png','image/png'],'/fantasy-stage.png':['fantasy-stage.png','image/png'],'/fantasy-stage-wide.png':['fantasy-stage-wide.png','image/png'],'/fantasy-stage-portrait.png':['fantasy-stage-portrait.png','image/png'],'/dancer-real.png':['dancer-real.png','image/png'],'/dancer-man.png':['dancer-man.png','image/png'],'/dancer-yellow.png':['dancer-yellow.png','image/png'],'/dance-pink.png':['dance-pink.png','image/png'],'/dance-blue.png':['dance-blue.png','image/png'],'/dance-yellow.png':['dance-yellow.png','image/png'],'/dance-green.png':['dance-green.png','image/png'],'/dance-turquoise.png':['dance-turquoise.png','image/png'],'/dance-purple.png':['dance-purple.png','image/png'],'/dance-orange.png':['dance-orange.png','image/png'],'/dance-twerk.png':['dance-twerk.png','image/png'],'/dance-pink-8.png':['dance-pink-8.png','image/png'],'/dance-blue-8.png':['dance-blue-8.png','image/png'],'/dance-yellow-8.png':['dance-yellow-8.png','image/png'],'/dance-green-8.png':['dance-green-8.png','image/png'],'/dance-turquoise-8.png':['dance-turquoise-8.png','image/png'],'/dance-purple-8.png':['dance-purple-8.png','image/png'],'/dance-orange-8.png':['dance-orange-8.png','image/png'],'/dance-twerk-8.png':['dance-twerk-8.png','image/png'],'/dance-dinosaur-8.png':['dance-dinosaur-8.png','image/png'],'/dance-new-1.png':['dance-new-1.png','image/png'],'/dance-new-2.png':['dance-new-2.png','image/png'],'/dance-new-3.png':['dance-new-3.png','image/png'],'/dance-new-4.png':['dance-new-4.png','image/png'],'/dance-new-5.png':['dance-new-5.png','image/png']};
  if(req.method !== 'GET' || !files[url.pathname]) {res.writeHead(404).end(); return;}
  try { const [file,type] = files[url.pathname]; const data = await readFile(new URL(`./public/${file}`,import.meta.url)); res.writeHead(200,{'Content-Type':type}); res.end(data); } catch {res.writeHead(500).end();}
});
const port = Number(process.env.ROTHAE_PORT || 3000);
server.listen(port,'127.0.0.1',async()=>{
  console.log(`เปิดเว็บที่ http://localhost:${port}`);
  const resumeFile=process.env.ROTHAE_RESUME_FILE;
  if(!resumeFile) return;
  try {
    const saved=JSON.parse(await readFile(resumeFile,'utf8'));
    await unlink(resumeFile);
    if(saved.mode==='live' && saved.username && ['live','connecting'].includes(saved.status)) await connect(saved.username,saved);
    else {restoreState(saved);broadcast();}
  } catch(error) {console.error('ไม่สามารถกู้คืนข้อมูล:',error.message);}
});
