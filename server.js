import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { STAY_MS, addLikes, expired, accumulateReturnLikes } from './timing.js';
import { processViewerEvent } from './viewer-events.js';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

let connection = null, generation = 0;
let state = { mode: 'live', status: 'offline', username: '', message: '', users: Object.create(null), joined: [] };
const clients = new Set();
let testSequence = 0;
const waiting = new Map();
function broadcast() { const data = `data: ${JSON.stringify(state)}\n\n`; for (const client of clients) client.write(data); }
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
  if (entry) { if (addLikes(entry, count, now)) broadcast(); return; }
  const person = waiting.get(id);
  if (!person) return;
  const result = accumulateReturnLikes(person.pending, count);
  if (!result) return;
  if (!result.returned) { person.pending = result.pending; return; }
  waiting.delete(id);
  const returned = {id:person.id, username:person.username, name:person.name, avatar:person.avatar, likes:10, joinedAt:now, expiresAt:now+STAY_MS};
  if (result.extra) addLikes(returned, result.extra, now);
  state.users[id] = returned; state.joined.push(returned); broadcast();
}
function ensureViewer(person, allowRejoin, now = Date.now()) {
  if (removeExpired(now)) broadcast();
  if (state.users[person.id] || (!allowRejoin && waiting.has(person.id))) return;
  waiting.delete(person.id);
  const entry = {...person, likes:0, joinedAt:now, expiresAt:now+STAY_MS};
  state.users[person.id] = entry; state.joined.push(entry); broadcast();
}
function disconnect() { generation++; if (connection) { try { connection.disconnect(); } catch {} connection = null; } }
async function connect(username) {
  disconnect(); waiting.clear(); const current = generation;
  state = {mode:'live', status:'connecting', username, message:'กำลังเชื่อมต่อ...', users:Object.create(null), joined:[]}; broadcast();
  try {
  const live = new TikTokLiveConnection(username, {}); connection = live;
  const handlers = {ensureViewer, recordLikes};
  for (const [eventName,type] of [[WebcastEvent.MEMBER,'member'],[WebcastEvent.CHAT,'chat'],[WebcastEvent.LIKE,'like']]) {
    live.on(eventName, event => { if (current === generation) processViewerEvent(type, event, handlers); });
  }
  live.on(ControlEvent.ERROR, error => { if(current === generation) { state.message = String(error?.message || error); broadcast(); } });
  live.on(ControlEvent.DISCONNECTED, () => { if(current === generation) { state.status='offline'; state.message='การเชื่อมต่อสิ้นสุดลง'; broadcast(); } });
  live.on(WebcastEvent.STREAM_END, () => { if(current === generation) { state.status='offline'; state.message='ไลฟ์จบแล้ว'; broadcast(); } });
  await live.connect(); if(current === generation) {state.status='live'; state.message='เชื่อมต่อแล้ว'; broadcast();}
  } catch(error) { if(current === generation) { connection=null; state.status='offline'; state.message=String(error?.message || error); broadcast(); } }
}
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  if (req.method === 'GET' && url.pathname === '/events') { res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'}); clients.add(res); res.write(`data: ${JSON.stringify(state)}\n\n`); req.on('close',()=>clients.delete(res)); return; }
  if (req.method === 'POST' && (url.pathname === '/mode/test' || url.pathname === '/mode/live')) {
    disconnect(); waiting.clear(); testSequence = 0; const mode = url.pathname.endsWith('/test') ? 'test' : 'live';
    state = {mode, status: mode === 'test' ? 'test' : 'offline', username:'', message:mode === 'test' ? 'โหมดทดสอบ: เพิ่มผู้ชมจำลองได้เลย' : 'โหมดไลฟ์จริง: กรอกชื่อบัญชี TikTok', users:Object.create(null), joined:[]};
    broadcast(); res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/test/join') {
    if (state.mode !== 'test') { res.writeHead(409).end(); return; }
    if (removeExpired()) broadcast();
    const n = ++testSequence, id = 'test-' + n;
    const entry = {id, username:id, name:'ผู้ชมทดสอบ ' + n, avatar:'/dancer-real.png', likes:0, joinedAt:Date.now(), expiresAt:Date.now()+STAY_MS};
    state.users[id]=entry; state.joined.push(entry); broadcast(); res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/test/expire') {
    if (state.mode !== 'test') { res.writeHead(409).end(); return; }
    const entry = state.users['test-' + testSequence];
    if (!entry) { res.writeHead(409).end('เพิ่มผู้ชมทดสอบก่อน'); return; }
    entry.expiresAt = Date.now(); if (removeExpired()) broadcast(); res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/test/like') {
    if (state.mode !== 'test') { res.writeHead(409).end(); return; }
    const id = 'test-' + testSequence;
    if (!state.users[id] && !waiting.has(id)) { res.writeHead(409).end('เพิ่มผู้ชมทดสอบก่อน'); return; }
    recordLikes(id, 10); res.writeHead(200).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/connect') {
    let body=''; for await (const chunk of req) { body += chunk; if(body.length > 2048) {res.writeHead(413).end(); return;} }
    let username; try { username = String(JSON.parse(body).username || '').trim().replace(/^@/,''); } catch {res.writeHead(400).end(); return;}
    if(!/^[a-zA-Z0-9._]{2,24}$/.test(username)) {res.writeHead(400).end('ชื่อบัญชีไม่ถูกต้อง'); return;}
    connect(username); res.writeHead(202).end(); return;
  }
  if (req.method === 'POST' && url.pathname === '/disconnect') { disconnect(); state.status='offline'; state.message='ตัดการเชื่อมต่อแล้ว'; broadcast(); res.writeHead(200).end(); return; }
  const files = {'/':['index.html','text/html; charset=utf-8'],'/overlay':['overlay.html','text/html; charset=utf-8'],'/overlay.js':['overlay.js','text/javascript; charset=utf-8'],'/overlay.css':['overlay.css','text/css; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/truck.png':['truck.png','image/png'],'/fantasy-stage.png':['fantasy-stage.png','image/png'],'/fantasy-stage-wide.png':['fantasy-stage-wide.png','image/png'],'/fantasy-stage-portrait.png':['fantasy-stage-portrait.png','image/png'],'/dancer-real.png':['dancer-real.png','image/png'],'/dancer-man.png':['dancer-man.png','image/png'],'/dancer-yellow.png':['dancer-yellow.png','image/png'],'/dance-pink.png':['dance-pink.png','image/png'],'/dance-blue.png':['dance-blue.png','image/png'],'/dance-yellow.png':['dance-yellow.png','image/png'],'/dance-green.png':['dance-green.png','image/png'],'/dance-turquoise.png':['dance-turquoise.png','image/png'],'/dance-purple.png':['dance-purple.png','image/png'],'/dance-orange.png':['dance-orange.png','image/png']};
  if(req.method !== 'GET' || !files[url.pathname]) {res.writeHead(404).end(); return;}
  try { const [file,type] = files[url.pathname]; const data = await readFile(new URL(`./public/${file}`,import.meta.url)); res.writeHead(200,{'Content-Type':type}); res.end(data); } catch {res.writeHead(500).end();}
});
const port = Number(process.env.ROTHAE_PORT || 3000);
server.listen(port,'127.0.0.1',()=>console.log(`เปิดเว็บที่ http://localhost:${port}`));
