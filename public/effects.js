const effectsLayer=document.querySelector('.effects-layer');
const spotlightQueue=[];let spotlightPlaying=false;
let queuedFireworkGifts=0;
function showGift(gift){if(window.announcementActive)queuedFireworkGifts+=Math.max(1,Number(gift.count)||1);else showFireworks(gift.count);enqueueSpotlight({kind:'gift',...gift})}
function flushFireworks(){if(window.announcementActive||!queuedFireworkGifts)return;const count=queuedFireworkGifts;queuedFireworkGifts=0;showFireworks(count)}
function showFireworks(count){
 const bursts=Math.min(30,14+Math.max(0,(Number(count)||1)-1)*3);
 for(let b=0;b<bursts;b++){
  const burst=document.createElement('div');burst.className='firework';
  burst.style.left=(12+Math.random()*76)+'%';burst.style.top=(10+Math.random()*38)+'%';burst.style.animationDelay=(b*.13)+'s';
  for(let i=0;i<34;i++){const spark=document.createElement('i'),angle=2*Math.PI*i/34,distance=Math.max(70,Math.min(220,effectsLayer.clientWidth*.18))*(.7+Math.random()*.65);spark.style.setProperty('--x',Math.cos(angle)*distance+'px');spark.style.setProperty('--y',Math.sin(angle)*distance+'px');spark.style.setProperty('--hue',String((i*26+b*70)%360));spark.style.animationDelay=(b*.13)+'s';burst.append(spark)}
  effectsLayer.append(burst);setTimeout(()=>burst.remove(),2600+b*130)
 }
}
function showTwerk(person){enqueueSpotlight({kind:'twerk',...person})}
function showCommentDance(person){enqueueSpotlight({kind:'comment',...person})}
function enqueueSpotlight(item){spotlightQueue.push(item);playSpotlight()}
function burstMoney(diamonds){
  const value=Number.isSafeInteger(diamonds)&&diamonds>0?diamonds:0;
  const remaining=Math.max(0,160-effectsLayer.querySelectorAll('.money-note').length);
  const notes=Math.min(value,80,remaining);
  const width=effectsLayer.clientWidth,height=effectsLayer.clientHeight;
  for(let i=0;i<notes;i++){
    const bill=document.createElement('span');bill.className='money-note money-burst';bill.textContent='$';
    const angle=Math.PI*2*(i/Math.max(1,notes)+Math.random()*.04);const distance=.25+Math.random()*.7;
    bill.style.setProperty('--burst-x',`${Math.cos(angle)*width*.48*distance}px`);bill.style.setProperty('--burst-y',`${Math.sin(angle)*height*.44*distance}px`);
    bill.style.setProperty('--spin',`${Math.round(Math.random()*900-450)}deg`);bill.style.setProperty('--delay',`${Math.random()*.4}s`);bill.style.setProperty('--duration',`${2.4+Math.random()*.9}s`);
    effectsLayer.append(bill);setTimeout(()=>bill.remove(),4200);
  }
}
function playSpotlight(){
  if(window.announcementActive||spotlightPlaying||!spotlightQueue.length)return;spotlightPlaying=true;
  const item=spotlightQueue.shift();const isGift=item.kind==='gift',isComment=item.kind==='comment';
  const appearance=window.getViewerAppearance?.(item.id);window.setTwerkActive?.(item.id,true);
  const panel=document.createElement('div');panel.className=isGift?'twerk-panel gift-spotlight':'twerk-panel';
  const title=document.createElement('strong');title.textContent=isGift?`🎁 ขอบคุณ ${item.name||'ผู้ชม'}`:isComment?`💬 ${item.name||'ผู้ชม'}`:`100 ครั้ง · ${item.name||'ผู้ชม'}`;
  const figure=document.createElement('div');figure.className='twerk-figure';
  const sprite=document.createElement('span');sprite.className='dance-sprite';sprite.style.backgroundImage=(isGift||isComment)?(appearance?.sprite||'url("/dance-pink-8.png")'):'url("/dance-twerk-8.png")';figure.append(sprite);
  const avatar=appearance?.avatar||item.avatar;if(avatar){const face=document.createElement('img');face.className='twerk-face';face.alt='';face.referrerPolicy='no-referrer';face.onload=()=>face.classList.add('loaded');face.onerror=()=>face.remove();face.src=avatar;figure.append(face)}
  const footer=document.createElement('span');const value=Number.isSafeInteger(item.diamonds)&&item.diamonds>0?item.diamonds:null;
  footer.textContent=isGift?(value===null?`ส่ง ${item.gift||'ของขวัญ'} · ไม่ทราบมูลค่า`:`${item.gift||'ของขวัญ'} ×${item.count||1} · 💎 ${value.toLocaleString()} เพชร`):isComment?(item.comment||'สนุกไปด้วยกัน!'):'สนุกไปด้วยกัน!';if(isComment)footer.classList.add('comment-text');
  panel.append(title,figure,footer);effectsLayer.append(panel);if(isGift)burstMoney(value);
  setTimeout(()=>{panel.remove();window.setTwerkActive?.(item.id,false);spotlightPlaying=false;playSpotlight()},5000)
}
