
const festivalStats={floor:document.querySelector('[data-festival="floor"]'),likes:document.querySelector('[data-festival="likes"]'),viewers:document.querySelector('[data-festival="viewers"]')};
function updateFestivalStats(state){if(!festivalStats.floor||!festivalStats.likes||!festivalStats.viewers)return;const demo=new URLSearchParams(location.search).get('demo')==='1'&&state.mode!=='test'&&!(state.joined?.length)&&!(state.totalLikes);festivalStats.floor.textContent=(demo?7:(state.joined?.length||0)).toLocaleString();festivalStats.likes.textContent=(demo?550:(state.totalLikes||0)).toLocaleString();festivalStats.viewers.textContent=Number.isSafeInteger(state.viewerCount)?state.viewerCount.toLocaleString():'—'}

const leaderboardList=document.querySelector('.leaderboard-list');let previousLeaderboard='',leaderId=null;
function renderLeaderboard(rows){const sample=new URLSearchParams(location.search).get('demo')==='1'&&rows.length===0;const list=sample?[{id:'demo1',name:'ตัวอย่าง 1',likes:250},{id:'demo2',name:'ตัวอย่าง 2',likes:180},{id:'demo3',name:'ตัวอย่าง 3',likes:120}]:rows;const nextLeader=list[0]?.id||null;if(leaderId!==nextLeader){leaderId=nextLeader;updateDanceBounds()}const key=JSON.stringify(list);if(key===previousLeaderboard)return;previousLeaderboard=key;leaderboardList.replaceChildren();if(!list.length){const empty=document.createElement('div');empty.className='leaderboard-empty';empty.textContent='รอการเคาะจอครั้งแรก';leaderboardList.append(empty);return}list.slice(0,3).forEach((user,i)=>{const row=document.createElement('div');row.className='leaderboard-row';const place=document.createElement('span');place.className='leaderboard-place';place.textContent=String(i+1);const name=document.createElement('span');name.className='leaderboard-name';name.textContent=user.name||'ผู้ชม';const score=document.createElement('span');score.className='leaderboard-score';score.textContent=''+Number(user.likes||0).toLocaleString();row.append(place,name,score);leaderboardList.append(row)})}

const welcomeBox=document.querySelector('.welcome');
const welcomeQueue=[];let welcomeIds=null,welcomePlaying=false;
function playWelcome(){if(window.announcementActive||welcomePlaying||!welcomeQueue.length)return;welcomePlaying=true;welcomeBox.querySelector('strong').textContent='สวัสดี '+welcomeQueue.shift();welcomeBox.classList.add('show');setTimeout(()=>{welcomeBox.classList.remove('show');setTimeout(()=>{welcomePlaying=false;playWelcome()},450)},3000)}
function welcomeViewers(users){const current=new Set(users.map(u=>u.id));if(welcomeIds!==null){for(const user of users){if(!welcomeIds.has(user.id)){welcomeQueue.push(user.name||user.username||'ผู้ชม');if(welcomeQueue.length>20)welcomeQueue.shift()}}}welcomeIds=current;playWelcome()}
const form=document.querySelector('#connect-form'), username=document.querySelector('#username'), statusEl=document.querySelector('#status'), message=document.querySelector('#message'), dancers=document.querySelector('#dancers'), count=document.querySelector('#count'), disconnect=document.querySelector('#disconnect'), button=document.querySelector('#connect-btn');
form.addEventListener('submit',async e=>{e.preventDefault();button.disabled=true;try{const r=await fetch('/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:username.value})});if(!r.ok)message.textContent=await r.text()||'เชื่อมต่อไม่สำเร็จ';}catch{message.textContent='ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'}finally{button.disabled=false}});
disconnect.addEventListener('click',()=>fetch('/disconnect',{method:'POST'}));
const displayed=new Map();
const twerkSpotlightIds=new Set();
let nextDanceSlot=0;
window.getViewerAppearance=id=>{const entry=displayed.get(id);return entry?{sprite:entry.dancer.querySelector('.dance-sprite')?.style.backgroundImage||'',avatar:entry.dancer.querySelector('.viewer-face')?.src||''}:null};
window.setTwerkActive=(id,active)=>{if(!id)return;if(active)twerkSpotlightIds.add(id);else twerkSpotlightIds.delete(id);displayed.get(id)?.dancer.classList.toggle('spotlight-hidden',active)};
const unavailableCharacterImages=new Set();
for(let n=1;n<=5;n++){const url=`/dance-new-${n}.png`;const img=new Image();img.onerror=()=>{unavailableCharacterImages.add(url);for(const entry of displayed.values())updateCharacter(entry)};img.src=url}
function updateCharacter(entry){const minutes=Math.max(0,Math.floor((Date.now()-entry.joinedAt)/60000));const index=(entry.baseLook+minutes)%entry.looks.length;let [url,filter]=entry.costume==='dinosaur'?['/dance-dinosaur-8.png','']:entry.looks[index];if(unavailableCharacterImages.has(url))[url,filter]=entry.looks[index%2];if(entry.sprite.style.backgroundImage!==`url("${url}")`)entry.sprite.style.backgroundImage=`url("${url}")`;if(entry.sprite.style.filter!==filter)entry.sprite.style.filter=filter}
setInterval(()=>{for(const entry of displayed.values())updateCharacter(entry)},1000);
function addDancer(user,i){const dancer=document.createElement('div');dancer.className='dancer';dancer.dataset.userId=user.id;dancer.dataset.floorSlot=String(nextDanceSlot++);if(twerkSpotlightIds.has(user.id))dancer.classList.add('spotlight-hidden');dancer.style.setProperty('--delay',`${(i%7)*-.19}s`);dancer.style.setProperty('--walk-delay',`${-((i*3.7)%20)}s`);dancer.style.setProperty('--shirt',['#ffcc46','#fd6b99','#8ce544','#67d9e8','#b79dff'][i%5]);const figure=document.createElement('div');figure.className='figure';const sprite=document.createElement('span');sprite.className='dance-sprite';const looks=[['/dance-pink-8.png',''],['/dance-blue-8.png',''],['/dance-new-1.png',''],['/dance-new-2.png',''],['/dance-new-3.png',''],['/dance-new-4.png',''],['/dance-new-5.png','']];const [spriteUrl,spriteFilter]=looks[i%looks.length];sprite.style.backgroundImage=`url("${spriteUrl}")`;sprite.style.filter=spriteFilter;sprite.style.setProperty('--pose-delay',`${(i%5)*-.13}s`);figure.append(sprite);if(user.avatar){const face=document.createElement('img');face.className='viewer-face';face.alt='';face.referrerPolicy='no-referrer';face.onload=()=>face.classList.add('loaded');face.onerror=()=>face.remove();face.src=user.avatar;figure.append(face)}const tag=document.createElement('div');tag.className='dancer-name';tag.textContent=user.name||user.username;const heart=document.createElement('small');heart.textContent=`${user.likes || 0}`;const timer=document.createElement('small');timer.className='remaining';const progress=document.createElement('small');progress.className='twerk-progress';progress.textContent=Number.isInteger(user.twerkProgress)?`ท่าเต้นพิเศษ ${user.twerkProgress}/100`:'';dancer.append(figure,tag,heart,timer,progress);dancers.append(dancer);const baseLook=Array.from(String(user.id)).reduce((hash,char)=>(Math.imul(hash,31)+char.codePointAt(0))>>>0,0)%looks.length;const entry={dancer,heart,timer,progress,expiresAt:user.expiresAt,costume:user.costume,sprite,looks,baseLook,joinedAt:Number.isFinite(user.joinedAt)?user.joinedAt:Date.now()};displayed.set(user.id,entry);updateCharacter(entry);}
let announcementHideTimer,announcementFadeTimer;
function updateAnnouncement(state){if(typeof state.announcement!=='string')return;const active=Boolean(state.announcement)&&Number(state.announcementExpiresAt)>Date.now();const banner=document.querySelector('.schedule-banner');clearTimeout(announcementHideTimer);clearTimeout(announcementFadeTimer);if(active){window.announcementActive=true;document.body.classList.add('announcement-active');if(banner){banner.textContent=state.announcement;banner.hidden=false;requestAnimationFrame(()=>banner.classList.add('is-visible'))}announcementHideTimer=setTimeout(()=>updateAnnouncement({announcement:'',announcementExpiresAt:0}),Math.max(0,state.announcementExpiresAt-Date.now()));return}const finish=()=>{window.announcementActive=false;document.body.classList.remove('announcement-active');if(banner){banner.hidden=true;banner.textContent=''}playWelcome();if(typeof flushFireworks==='function')flushFireworks();if(typeof playSpotlight==='function')playSpotlight()};if(window.announcementActive&&banner&&!banner.hidden){banner.classList.remove('is-visible');announcementFadeTimer=setTimeout(finish,450)}else finish()}
const events=new EventSource('/events');events.onmessage=({data})=>{const state=JSON.parse(data);updateAnnouncement(state);updateFestivalStats(state);renderLeaderboard(state.leaderboard||[]);welcomeViewers(state.joined);const labels={test:'โหมดทดสอบ',offline:'ยังไม่เชื่อมต่อ',connecting:'กำลังเชื่อมต่อ',live:'เชื่อมต่อ LIVE แล้ว'};const isTest=state.mode==='test'; document.querySelector('#mode-test').classList.toggle('active',isTest); document.querySelector('#mode-live').classList.toggle('active',!isTest); document.querySelector('#test-controls').hidden=!isTest; form.hidden=isTest; statusEl.className='status '+state.status;statusEl.querySelector('span').textContent=labels[state.status]||labels.offline;message.textContent=state.message||'เปิด LIVE ก่อน แล้วกรอกชื่อผู้ใช้โดยไม่ต้องใส่ @';disconnect.hidden=isTest || state.status==='offline';count.textContent=state.joined.length;const ids=new Set(state.joined.map(user=>user.id));for(const [id,entry] of displayed){if(!ids.has(id)){entry.dancer.remove();displayed.delete(id)}}if(!state.joined.length){if(!dancers.querySelector('.floor-empty')) dancers.innerHTML='<div class="floor-empty"><span>♫</span><strong>ฟลอร์พร้อมแล้ว!</strong></div>';return}dancers.querySelector('.floor-empty')?.remove();state.joined.forEach((user,i)=>{if(!displayed.has(user.id))addDancer(user,i);else {const item=displayed.get(user.id);item.heart.textContent=`${user.likes || 0}`;item.expiresAt=user.expiresAt;if(item.costume!==user.costume){item.costume=user.costume;updateCharacter(item)}item.progress.textContent=Number.isInteger(user.twerkProgress)?`ท่าเต้นพิเศษ ${user.twerkProgress}/100`:''}})};events.onerror=()=>{statusEl.className='status';statusEl.querySelector('span').textContent='เซิร์ฟเวอร์ขาดการเชื่อมต่อ';};
const overlayURL=document.querySelector('#overlay-url');overlayURL.textContent=location.origin+'/overlay';document.querySelector('#copy-overlay').addEventListener('click',async e=>{try{await navigator.clipboard.writeText(overlayURL.textContent);e.currentTarget.textContent='คัดลอกแล้ว';setTimeout(()=>e.currentTarget.textContent='คัดลอกลิงก์',2000)}catch{e.currentTarget.textContent='คัดลอกลิงก์จากข้อความด้านซ้าย'}});

async function postAction(path){try{const r=await fetch(path,{method:'POST'});if(!r.ok)throw new Error();}catch{message.textContent='ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'}}
document.querySelector('#mode-test').addEventListener('click',()=>postAction('/mode/test'));
document.querySelector('#mode-live').addEventListener('click',()=>postAction('/mode/live'));
document.querySelector('#test-join').addEventListener('click',()=>postAction('/test/join'));
document.querySelector('#test-like').addEventListener('click',()=>postAction('/test/like'));
document.querySelector('#test-like-100').addEventListener('click',()=>postAction('/test/like-100'));
document.querySelector('#test-expire').addEventListener('click',()=>postAction('/test/expire'));
document.querySelector('#test-reset').addEventListener('click',()=>postAction('/mode/test'));
document.querySelector('#reset-likes').addEventListener('click',()=>postAction('/reset-likes'));
const announcementForm=document.querySelector('#announcement-form'),announcementInput=document.querySelector('#announcement-input'),announcementStatus=document.querySelector('#announcement-status');
async function saveAnnouncement(text){try{const response=await fetch('/announcement',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});if(!response.ok)throw new Error();announcementInput.value=text.trim();announcementStatus.textContent='อัปเดตประกาศแล้ว';}catch{announcementStatus.textContent='อัปเดตไม่สำเร็จ กรุณาตรวจสอบเซิร์ฟเวอร์'}}
announcementForm.addEventListener('submit',event=>{event.preventDefault();saveAnnouncement(announcementInput.value)});
document.querySelector('#announcement-clear').addEventListener('click',()=>saveAnnouncement(''));
document.querySelectorAll('[data-announcement]').forEach(button=>button.addEventListener('click',()=>saveAnnouncement(button.dataset.announcement)));
document.querySelector('#reset-floor').addEventListener('click',()=>postAction('/reset-floor'));
document.querySelector('#clear-floor-ten').addEventListener('click',()=>postAction('/floor/clear-10'));
function updateDanceBounds(){requestAnimationFrame(()=>{
  const floor=dancers;const people=[...displayed.values()].map(item=>item.dancer);const leaderLayer=document.querySelector('.leader-layer');
  const stage=floor.closest('.stage');const stageRect=stage.getBoundingClientRect();const floorRect=floor.getBoundingClientRect();const boundary=stageRect.top+stageRect.height*.627-floorRect.top;
  people.forEach((el,i)=>{
    const leader=!!leaderId&&el.dataset.userId===String(leaderId);
    el.classList.toggle('rank-leader',leader);
    if(leader){
      if(el.parentElement!==leaderLayer)leaderLayer.appendChild(el);
      const stage=leaderLayer.parentElement;
      const portrait=window.matchMedia('(orientation: portrait)').matches;
      const imageWidth=portrait?941:1672, imageHeight=portrait?1672:941;
      const scale=Math.max(stage.clientWidth/imageWidth,stage.clientHeight/imageHeight);
      const yOffset=(stage.clientHeight-imageHeight*scale)*(portrait?.5:.47);
      const roofY=yOffset+(portrait?.388:.364)*imageHeight*scale;
      const figure=el.querySelector('.figure');
      const top=Math.max(24,Math.min(stage.clientHeight-el.offsetHeight-16,roofY-figure.offsetTop-figure.offsetHeight));
      el.style.left=`${Math.max(0,(stage.clientWidth-el.offsetWidth)/2)}px`;
      el.style.top=`${top}px`;el.style.bottom='auto';
      return;
    }
    if(el.parentElement!==floor)floor.appendChild(el);
    el.style.top='auto';
    const inset=24;const available=Math.max(0,floor.clientWidth-el.offsetWidth-inset*2);
    const slot=Number(el.dataset.floorSlot)||0;const horizontal=(.12+slot*.61803398875)%1;
    el.style.left=`${inset+available*horizontal}px`;el.style.bottom='16px';
    const figure=el.querySelector('.figure');const baseTop=el.offsetTop;const feet=baseTop+figure.offsetTop+figure.offsetHeight;
    const vertical=Math.max(0,Math.min(feet-boundary-12,baseTop-12));
    const depth=(.18+slot*.41421356237)%1;const shift=vertical*depth;el.style.bottom=`${16+shift}px`;
    const left=el.offsetLeft;const right=floor.clientWidth-left-el.offsetWidth;
    el.style.setProperty('--left-room',`${-Math.max(0,left-inset)}px`);el.style.setProperty('--right-room',`${Math.max(0,right-inset)}px`);
    el.style.setProperty('--up-room',`${Math.max(0,vertical-shift)}px`);el.style.setProperty('--down-room',`${Math.max(0,shift)}px`);
  })
})}
new ResizeObserver(updateDanceBounds).observe(dancers);new MutationObserver(updateDanceBounds).observe(dancers,{childList:true});updateDanceBounds();

function updateRemaining(){for(const entry of displayed.values()){if(!entry.timer)continue;if(!entry.expiresAt){entry.timer.textContent='';continue}const secs=Math.max(0,Math.ceil((entry.expiresAt-Date.now())/1000));entry.timer.textContent=` ⏱ ${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;}}
setInterval(updateRemaining,1000);updateRemaining();

events.addEventListener('gift',event=>showGift(JSON.parse(event.data)));
events.addEventListener('twerk',event=>showTwerk(JSON.parse(event.data)));
events.addEventListener('comment-dance',event=>showCommentDance(JSON.parse(event.data)));
document.querySelector('#test-gift').addEventListener('click',()=>postAction('/test/gift'));
document.querySelector('#test-rose').addEventListener('click',()=>postAction('/test/rose'));
document.querySelector('#test-dinosaur').addEventListener('click',()=>postAction('/test/dinosaur'));
document.querySelector('#test-comment').addEventListener('click',()=>postAction('/test/comment'));
