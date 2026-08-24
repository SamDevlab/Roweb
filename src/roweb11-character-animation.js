// Roweb v11 character animation layer.
// Owns the final Aster renderer so movement/casting never falls back to the old procedural skin.
(() => {
  const DATA_SCRIPTS=['/roweb9-novice-data.js','/roweb9-priest-data.js','/roweb9-high-data.js'];
  const REQUIRED=['novice_front','novice_side','novice_back','novice_cast','priest_front','priest_side','priest_back','priest_cast','high_front','high_side','high_back','high_cast'];
  const images=new Map();
  const walkFrames=new Map();
  let ready=false,failed=false;

  const classKey=job=>job==='Sumo Sacerdote'?'high':job==='Sacerdote'?'priest':'novice';
  const spriteHeight=job=>job==='Sumo Sacerdote'?99:job==='Sacerdote'?94:89;
  const skillColor=name=>({heal:'#a9ffe0',magnificat:'#ffe59c',blessing:'#e3c8ff',kyrie:'#bcecff',sanctuary:'#e9f7cf',normal:'#fff1ca'}[name]||'#f5ebc9');

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src&&new URL(s.src,location.href).pathname===src);
      if(existing?.dataset.rowebLoaded==='1')return resolve();
      const s=existing||document.createElement('script');
      if(!existing){s.src=src;s.async=true;document.head.appendChild(s);}
      const done=()=>{s.dataset.rowebLoaded='1';resolve();};
      s.addEventListener('load',done,{once:true});s.addEventListener('error',reject,{once:true});
      if(existing && window.ROWEB9_SPRITE_DATA) setTimeout(done,0);
    });
  }

  async function ensureData(){
    if(REQUIRED.every(k=>window.ROWEB9_SPRITE_DATA?.[k]))return;
    await Promise.all(DATA_SCRIPTS.map(loadScript));
    const deadline=performance.now()+2500;
    while(performance.now()<deadline && !REQUIRED.every(k=>window.ROWEB9_SPRITE_DATA?.[k])) await new Promise(r=>setTimeout(r,25));
    if(!REQUIRED.every(k=>window.ROWEB9_SPRITE_DATA?.[k]))throw new Error('sprite data incomplete');
  }

  async function prepare(){
    try{
      await ensureData();
      for(const key of REQUIRED){
        const im=new Image();im.decoding='async';im.src=window.ROWEB9_SPRITE_DATA[key];images.set(key,im);
      }
      await Promise.all([...images.values()].map(im=>im.decode?.().catch(()=>new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;}))));
      buildWalkFrames();ready=true;
      log('Animação v11 ativa: caminhada e conjuração usam somente o Aster novo.','good');
    }catch(err){failed=true;console.error('Falha ao preparar animação v11',err);log('Falha no pacote animado do Aster; skin antiga foi bloqueada.');}
  }

  function makeWalkFrame(im,dir,phase){
    const pad=5,w=im.naturalWidth,h=im.naturalHeight,c=document.createElement('canvas');
    c.width=w+pad*2;c.height=h+pad*2;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
    const step=[0,1,0,-1][phase],lift=[0,-1,0,-1][phase],split=Math.floor(h*.70),lower=h-split;
    g.drawImage(im,0,0,w,split,pad-step,pad+lift,w,split);
    if(dir==='side'){
      g.drawImage(im,0,split,w,lower,pad+step*2,pad+split-lift,w,lower);
    }else{
      const half=Math.floor(w/2);
      g.drawImage(im,0,split,half,lower,pad-step,pad+split+(step>0?1:0),half,lower);
      g.drawImage(im,half,split,w-half,lower,pad+half+step,pad+split+(step<0?1:0),w-half,lower);
    }
    return c;
  }

  function buildWalkFrames(){
    for(const key of REQUIRED.filter(k=>!k.endsWith('_cast'))){
      const im=images.get(key);if(!im?.naturalWidth)continue;const dir=key.endsWith('_side')?'side':'frontback';
      walkFrames.set(key,[0,1,2,3].map(p=>makeWalkFrame(im,dir,p)));
    }
  }

  function basePose(p){
    const k=classKey(p.job);
    if(p.dir==='up')return{key:`${k}_back`,flip:false};
    if(p.dir==='left')return{key:`${k}_side`,flip:false};
    if(p.dir==='right')return{key:`${k}_side`,flip:true};
    return{key:`${k}_front`,flip:false};
  }

  function drawImageCentered(im,p,opts={}){
    const h=(opts.height||spriteHeight(p.job))*(opts.scale||1),w=im.naturalWidth*(h/im.naturalHeight);
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(p.flashUntil>now){ctx.globalAlpha=.78;ctx.filter='brightness(1.7) saturate(.82)';}
    ctx.translate(Math.round(p.x+(opts.x||0)),Math.round(p.y+p.radius+12+(opts.y||0)));
    if(opts.rotate)ctx.rotate(opts.rotate);if(opts.flip)ctx.scale(-1,1);
    ctx.drawImage(im,Math.round(-w/2),Math.round(-h),Math.round(w),Math.round(h));ctx.restore();
  }

  function drawWalk(p){
    const pose=basePose(p),frames=walkFrames.get(pose.key),phase=Math.floor(now/115)%4;
    const im=frames?.[phase]||images.get(pose.key);if(!im)return false;
    const step=[0,1,0,-1][phase],bob=[0,-2,0,-1][phase];
    drawImageCentered(im,p,{flip:pose.flip,x:step*.45,y:bob,rotate:step*.006,height:spriteHeight(p.job)});return true;
  }

  function drawIdle(p){
    const pose=basePose(p),im=images.get(pose.key);if(!im)return false;
    drawImageCentered(im,p,{flip:pose.flip,y:Math.sin(now/520)*.35});return true;
  }

  function drawAttack(p){
    const pose=basePose(p),im=images.get(pose.key);if(!im)return false;
    const t=Math.max(0,Math.min(1,(p.attackingUntil-now)/240)),kick=Math.sin((1-t)*Math.PI)*3;
    const dx=p.dir==='right'?kick:p.dir==='left'?-kick:0,dy=p.dir==='up'?-kick*.45:p.dir==='down'?kick*.35:0;
    drawImageCentered(im,p,{flip:pose.flip,x:dx,y:dy,rotate:(p.dir==='right'?1:p.dir==='left'?-1:0)*.018*Math.sin((1-t)*Math.PI)});return true;
  }

  function drawCastAura(p,phase,color){
    const pulse=.5+.5*Math.sin(now/85),rise=phase*1.2;ctx.save();ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=.26+.18*pulse;ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(p.x,p.y+7,20+phase*2,8+phase,0,0,TAU);ctx.stroke();
    for(let i=0;i<4;i++){const a=i/4*TAU+now/360,rr=23+3*pulse;ctx.globalAlpha=.30;ctx.fillStyle=color;ctx.fillRect(Math.round(p.x+Math.cos(a)*rr-2),Math.round(p.y-18+Math.sin(a)*rr*.48-rise-2),4,4);}
    ctx.restore();
  }

  function drawCast(p){
    const k=classKey(p.job),cast=images.get(`${k}_cast`),fallback=images.get(basePose(p).key);
    const im=cast?.naturalWidth?cast:fallback;if(!im)return false;
    const phase=Math.floor(now/105)%4,pulse=[.985,1.015,1.03,1.005][phase],lift=[0,-2,-4,-2][phase];
    const flip=p.dir==='left';drawImageCentered(im,p,{flip,scale:pulse,y:lift,height:spriteHeight(p.job)+4});
    drawCastAura(p,phase,skillColor(p.castSkill));return true;
  }

  function drawCharacter(p){
    ctx.save();ctx.globalAlpha=.16;ctx.fillStyle='#232027';ctx.beginPath();ctx.ellipse(p.x,p.y+11,p.job==='Sumo Sacerdote'?20:18,6,0,0,TAU);ctx.fill();ctx.restore();
    if(p===player)drawKyrieBarrier();
    let ok=false;if(ready){if(p.castingUntil>now)ok=drawCast(p);else if(p.attackingUntil>now)ok=drawAttack(p);else if(p.moving)ok=drawWalk(p);else ok=drawIdle(p);}
    if(!ok){ctx.save();ctx.globalAlpha=failed?.65:.28;ctx.fillStyle='#e8d9c6';ctx.beginPath();ctx.arc(p.x,p.y-15,8,0,TAU);ctx.fill();ctx.restore();}
    ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='700 10px sans-serif';ctx.fillText(p.name||'Aventureiro',p.x,p.y+35);
    ctx.fillStyle='#ddd5d5';ctx.font='9px sans-serif';ctx.fillText(`${p.job||'Noviço'} • Nv. ${p.level||1}`,p.x,p.y+47);
  }

  drawPlayer=drawCharacter;

  const installCastTracker=()=>{
    if(cast.__roweb11Tracked)return;const baseCast=cast;
    const tracked=function(name){const before=player.castingUntil;baseCast(name);if(player.castingUntil>now&&player.castingUntil!==before){player.castSkill=name;player.castAnimStart=now;}};
    tracked.__roweb11Tracked=true;cast=tracked;
  };
  installCastTracker();setTimeout(installCastTracker,0);

  prepare();
})();
