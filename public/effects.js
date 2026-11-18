const effectsLayer=document.querySelector('.effects-layer');
const spotlightQueue=[];let spotlightPlaying=false;
function showGift(gift){enqueueSpotlight({kind:'gift',...gift})}
function showTwerk(person){enqueueSpotlight({kind:'twerk',...person})}
function enqueueSpotlight(item){if(spotlightQueue.length>=20)spotlightQueue.shift();spotlightQueue.push(item);playSpotlight()}
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
  if(spotlightPlaying||!spotlightQueue.length)return;spotlightPlaying=true;
  const item=spotlightQueue.shift();const isGift=item.kind==='gift';
  const appearance=window.getViewerAppearance?.(item.id);window.setTwerkActive?.(item.id,true);
  const panel=document.createElement('div');panel.className=isGift?'twerk-panel gift-spotlight':'twerk-panel';
  const title=document.createElement('strong');title.textContent=isGift?`🎁 ขอบคุณ ${item.name||'ผู้ชม'}`:`♥ 50 ใจ · ${item.name||'ผู้ชม'}`;
  const figure=document.createElement('div');figure.className='twerk-figure';
  const sprite=document.createElement('span');sprite.className='dance-sprite';sprite.style.backgroundImage=isGift?(appearance?.sprite||'url("/dance-pink.png")'):'url("/dance-twerk.png")';figure.append(sprite);
  const avatar=appearance?.avatar||item.avatar;if(avatar){const face=document.createElement('img');face.className='twerk-face';face.alt='';face.referrerPolicy='no-referrer';face.onload=()=>face.classList.add('loaded');face.onerror=()=>face.remove();face.src=avatar;figure.append(face)}
  const footer=document.createElement('span');const value=Number.isSafeInteger(item.diamonds)&&item.diamonds>0?item.diamonds:null;
  footer.textContent=isGift?(value===null?`ส่ง ${item.gift||'ของขวัญ'} · ไม่ทราบมูลค่า`:`${item.gift||'ของขวัญ'} ×${item.count||1} · 💎 ${value.toLocaleString()} เพชร`):'ขอบคุณที่ส่งหัวใจ!';
  panel.append(title,figure,footer);effectsLayer.append(panel);if(isGift)burstMoney(value);
  setTimeout(()=>{panel.remove();window.setTwerkActive?.(item.id,false);spotlightPlaying=false;playSpotlight()},5000)
}
