
const welcomeBox=document.querySelector('.welcome');
const welcomeQueue=[];let welcomeIds=null,welcomePlaying=false;
function playWelcome(){if(welcomePlaying||!welcomeQueue.length)return;welcomePlaying=true;welcomeBox.querySelector('strong').textContent='สวัสดี '+welcomeQueue.shift();welcomeBox.classList.add('show');setTimeout(()=>{welcomeBox.classList.remove('show');setTimeout(()=>{welcomePlaying=false;playWelcome()},450)},3000)}
function welcomeViewers(users){const current=new Set(users.map(u=>u.id));if(welcomeIds!==null){for(const user of users){if(!welcomeIds.has(user.id)){welcomeQueue.push(user.name||user.username||'ผู้ชม');if(welcomeQueue.length>20)welcomeQueue.shift()}}}welcomeIds=current;playWelcome()}
const form=document.querySelector('#connect-form'), username=document.querySelector('#username'), statusEl=document.querySelector('#status'), message=document.querySelector('#message'), dancers=document.querySelector('#dancers'), count=document.querySelector('#count'), disconnect=document.querySelector('#disconnect'), button=document.querySelector('#connect-btn');
form.addEventListener('submit',async e=>{e.preventDefault();button.disabled=true;try{const r=await fetch('/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:username.value})});if(!r.ok)message.textContent=await r.text()||'เชื่อมต่อไม่สำเร็จ';}catch{message.textContent='ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'}finally{button.disabled=false}});
disconnect.addEventListener('click',()=>fetch('/disconnect',{method:'POST'}));
const displayed=new Map();
function addDancer(user,i){const dancer=document.createElement('div');dancer.className='dancer';dancer.style.setProperty('--delay',`${(i%7)*-.19}s`);dancer.style.setProperty('--walk-delay',`${-((i*3.7)%20)}s`);dancer.style.setProperty('--shirt',['#ffcc46','#fd6b99','#8ce544','#67d9e8','#b79dff'][i%5]);const figure=document.createElement('div');figure.className='figure';const sprite=document.createElement('span');sprite.className='dance-sprite';sprite.style.backgroundImage=`url("${['/dance-pink.png','/dance-blue.png','/dance-yellow.png','/dance-green.png','/dance-turquoise.png','/dance-purple.png','/dance-orange.png'][i%7]}")`;sprite.style.animationDelay=`${(i%5)*-.13}s`;figure.append(sprite);if(user.avatar){const face=document.createElement('img');face.className='viewer-face';face.alt='';face.referrerPolicy='no-referrer';face.onload=()=>face.classList.add('loaded');face.onerror=()=>face.remove();face.src=user.avatar;figure.append(face)}const tag=document.createElement('div');tag.className='dancer-name';tag.textContent=user.name||user.username;const heart=document.createElement('small');heart.textContent=`♥ ${user.likes || 0}`;const timer=document.createElement('small');timer.className='remaining';dancer.append(figure,tag,heart,timer);dancers.append(dancer);displayed.set(user.id,{dancer,heart,timer,expiresAt:user.expiresAt});}
const events=new EventSource('/events');events.onmessage=({data})=>{const state=JSON.parse(data);welcomeViewers(state.joined);const labels={test:'โหมดทดสอบ',offline:'ยังไม่เชื่อมต่อ',connecting:'กำลังเชื่อมต่อ',live:'เชื่อมต่อ LIVE แล้ว'};const isTest=state.mode==='test'; document.querySelector('#mode-test').classList.toggle('active',isTest); document.querySelector('#mode-live').classList.toggle('active',!isTest); document.querySelector('#test-controls').hidden=!isTest; form.hidden=isTest; statusEl.className='status '+state.status;statusEl.querySelector('span').textContent=labels[state.status]||labels.offline;message.textContent=state.message||'เปิด LIVE ก่อน แล้วกรอกชื่อผู้ใช้โดยไม่ต้องใส่ @';disconnect.hidden=isTest || state.status==='offline';count.textContent=state.joined.length;const ids=new Set(state.joined.map(user=>user.id));for(const [id,entry] of displayed){if(!ids.has(id)){entry.dancer.remove();displayed.delete(id)}}if(!state.joined.length){if(!dancers.querySelector('.floor-empty')) dancers.innerHTML='<div class="floor-empty"><span>♫</span><strong>ฟลอร์พร้อมแล้ว!</strong></div>';return}dancers.querySelector('.floor-empty')?.remove();state.joined.forEach((user,i)=>{if(!displayed.has(user.id))addDancer(user,i);else {const item=displayed.get(user.id);item.heart.textContent=`♥ ${user.likes || 0}`;item.expiresAt=user.expiresAt}})};events.onerror=()=>{statusEl.className='status';statusEl.querySelector('span').textContent='เซิร์ฟเวอร์ขาดการเชื่อมต่อ';};
const overlayURL=document.querySelector('#overlay-url');overlayURL.textContent=location.origin+'/overlay';document.querySelector('#copy-overlay').addEventListener('click',async e=>{try{await navigator.clipboard.writeText(overlayURL.textContent);e.currentTarget.textContent='คัดลอกแล้ว';setTimeout(()=>e.currentTarget.textContent='คัดลอกลิงก์',2000)}catch{e.currentTarget.textContent='คัดลอกลิงก์จากข้อความด้านซ้าย'}});

async function postAction(path){try{const r=await fetch(path,{method:'POST'});if(!r.ok)throw new Error();}catch{message.textContent='ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'}}
document.querySelector('#mode-test').addEventListener('click',()=>postAction('/mode/test'));
document.querySelector('#mode-live').addEventListener('click',()=>postAction('/mode/live'));
document.querySelector('#test-join').addEventListener('click',()=>postAction('/test/join'));
document.querySelector('#test-like').addEventListener('click',()=>postAction('/test/like'));
document.querySelector('#test-expire').addEventListener('click',()=>postAction('/test/expire'));
document.querySelector('#test-reset').addEventListener('click',()=>postAction('/mode/test'));
function updateDanceBounds(){requestAnimationFrame(()=>{
  const floor=dancers;const people=[...floor.querySelectorAll('.dancer')];
  const stage=floor.closest('.stage');const stageRect=stage.getBoundingClientRect();const floorRect=floor.getBoundingClientRect();const boundary=stageRect.top+stageRect.height*.627-floorRect.top;
  people.forEach((el,i)=>{
    const inset=24;const available=Math.max(0,floor.clientWidth-el.offsetWidth-inset*2);
    const horizontal=people.length===1?.5:(.12+i*.61803398875)%1;
    el.style.left=`${inset+available*horizontal}px`;el.style.bottom='16px';
    const figure=el.querySelector('.figure');const baseTop=el.offsetTop;const feet=baseTop+figure.offsetTop+figure.offsetHeight;
    const vertical=Math.max(0,Math.min(feet-boundary-12,baseTop-12));
    const depth=people.length===1?.35:(.18+i*.41421356237)%1;const shift=vertical*depth;el.style.bottom=`${16+shift}px`;
    const left=el.offsetLeft;const right=floor.clientWidth-left-el.offsetWidth;
    el.style.setProperty('--left-room',`${-Math.max(0,left-inset)}px`);el.style.setProperty('--right-room',`${Math.max(0,right-inset)}px`);
    el.style.setProperty('--up-room',`${Math.max(0,vertical-shift)}px`);el.style.setProperty('--down-room',`${Math.max(0,shift)}px`);
  })
})}
new ResizeObserver(updateDanceBounds).observe(dancers);new MutationObserver(updateDanceBounds).observe(dancers,{childList:true});updateDanceBounds();

function updateRemaining(){for(const entry of displayed.values()){if(!entry.timer)continue;if(!entry.expiresAt){entry.timer.textContent='';continue}const secs=Math.max(0,Math.ceil((entry.expiresAt-Date.now())/1000));entry.timer.textContent=` ⏱ ${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;}}
setInterval(updateRemaining,1000);updateRemaining();
