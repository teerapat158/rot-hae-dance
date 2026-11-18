
const welcomeBox=document.querySelector('.welcome');
const welcomeQueue=[];let welcomeIds=null,welcomePlaying=false;
function playWelcome(){if(welcomePlaying||!welcomeQueue.length)return;welcomePlaying=true;welcomeBox.querySelector('strong').textContent='สวัสดี '+welcomeQueue.shift();welcomeBox.classList.add('show');setTimeout(()=>{welcomeBox.classList.remove('show');setTimeout(()=>{welcomePlaying=false;playWelcome()},450)},3000)}
function welcomeViewers(users){const current=new Set(users.map(u=>u.id));if(welcomeIds!==null){for(const user of users){if(!welcomeIds.has(user.id)){welcomeQueue.push(user.name||user.username||'ผู้ชม');if(welcomeQueue.length>20)welcomeQueue.shift()}}}welcomeIds=current;playWelcome()}
const dancers=document.querySelector('#overlay-dancers');const displayed=new Map();
const twerkSpotlightIds=new Set();
window.getViewerAppearance=id=>{const entry=displayed.get(id);return entry?{sprite:entry.dancer.querySelector('.dance-sprite')?.style.backgroundImage||'',avatar:entry.dancer.querySelector('.viewer-face')?.src||''}:null};
window.setTwerkActive=(id,active)=>{if(!id)return;if(active)twerkSpotlightIds.add(id);else twerkSpotlightIds.delete(id);displayed.get(id)?.dancer.classList.toggle('spotlight-hidden',active)};
function addDancer(user,i){const dancer=document.createElement('div');dancer.className='dancer';if(twerkSpotlightIds.has(user.id))dancer.classList.add('spotlight-hidden');dancer.style.setProperty('--delay',`${(i%7)*-.19}s`);dancer.style.setProperty('--walk-delay',`${-((i*3.7)%20)}s`);dancer.style.setProperty('--shirt',['#ffcc46','#fd6b99','#8ce544','#67d9e8','#b79dff'][i%5]);const figure=document.createElement('div');figure.className='figure';const sprite=document.createElement('span');sprite.className='dance-sprite';sprite.style.backgroundImage=`url("${['/dance-pink.png','/dance-blue.png','/dance-yellow.png','/dance-green.png','/dance-turquoise.png','/dance-purple.png','/dance-orange.png'][i%7]}")`;sprite.style.animationDelay=`${(i%5)*-.13}s`;figure.append(sprite);if(user.avatar){const face=document.createElement('img');face.className='viewer-face';face.alt='';face.referrerPolicy='no-referrer';face.onload=()=>face.classList.add('loaded');face.onerror=()=>face.remove();face.src=user.avatar;figure.append(face)}const tag=document.createElement('div');tag.className='dancer-name';tag.textContent=user.name||user.username;const heart=document.createElement('small');heart.textContent=`♥ ${user.likes||0}`;const timer=document.createElement('small');timer.className='remaining';const progress=document.createElement('small');progress.className='twerk-progress';progress.textContent=Number.isInteger(user.twerkProgress)?`ทเวิร์ก ${user.twerkProgress}/50`:'';dancer.append(figure,tag,heart,timer,progress);dancers.append(dancer);displayed.set(user.id,{dancer,heart,timer,progress,expiresAt:user.expiresAt});}
const events=new EventSource('/events');events.onmessage=({data})=>{const state=JSON.parse(data);welcomeViewers(state.joined); let testBadge=document.querySelector('#test-badge'); if(state.mode==='test' && !testBadge){testBadge=document.createElement('div');testBadge.id='test-badge';testBadge.className='demo-badge';testBadge.textContent='โหมดทดสอบ • ผู้ชมจำลอง';document.querySelector('.overlay-frame').append(testBadge)} else if(state.mode!=='test' && testBadge) testBadge.remove(); const ids=new Set(state.joined.map(user=>user.id));for(const [id,entry] of displayed){if(!ids.has(id) && !(document.body.classList.contains('demo') && id.startsWith('demo'))){entry.dancer.remove();displayed.delete(id)}}state.joined.forEach((user,i)=>{if(!displayed.has(user.id))addDancer(user,i);else {const item=displayed.get(user.id);item.heart.textContent=`♥ ${user.likes||0}`;item.expiresAt=user.expiresAt;item.progress.textContent=Number.isInteger(user.twerkProgress)?`ทเวิร์ก ${user.twerkProgress}/50`:''}})};

if (new URLSearchParams(location.search).get('demo') === '1') {
  document.body.classList.add('demo');
  [{id:'demo1',name:'ตัวอย่าง 1',username:'demo1',likes:12},{id:'demo2',name:'ตัวอย่าง 2',username:'demo2',likes:25},{id:'demo3',name:'ตัวอย่าง 3',username:'demo3',likes:50},{id:'demo4',name:'ตัวอย่าง 4',username:'demo4',likes:10},{id:'demo5',name:'ตัวอย่าง 5',username:'demo5',likes:20},{id:'demo6',name:'ตัวอย่าง 6',username:'demo6',likes:15},{id:'demo7',name:'ตัวอย่าง 7',username:'demo7',likes:30}].forEach((user,i)=>addDancer(user,i));
  const badge=document.createElement('div'); badge.className='demo-badge'; badge.textContent='โหมดตัวอย่าง • ไม่ใช่ผู้ชมจริง'; document.querySelector('.overlay-frame').append(badge);
}
function updateDanceBounds(){requestAnimationFrame(()=>{
  const floor=dancers;const people=[...floor.querySelectorAll('.dancer')];
  const stage=floor.closest('.overlay-frame');const boundary=stage.clientHeight*.627-floor.offsetTop;
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

window.addEventListener('resize',updateDanceBounds);updateDanceBounds();

events.addEventListener('gift',event=>showGift(JSON.parse(event.data)));
events.addEventListener('twerk',event=>showTwerk(JSON.parse(event.data)));
