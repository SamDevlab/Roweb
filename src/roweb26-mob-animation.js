// Roweb v26 — curated mob animation controller.
// Fixes generated-sheet bad frames, per-frame anchor jitter and state animations starting mid-sequence.
(() => {
  const previousDrawMob = drawMob;
  const atlas = new Image();
  atlas.decoding = 'async';
  atlas.src = '/assets/v18/mobs.webp';

  const ROW = { poring: 0, bat: 1, eye: 2, imp: 3 };
  const VISUAL = {
    poring:{w:90,h:90,bossW:120,bossH:120,hover:0,baseline:17,hud:62,shadowX:.36,shadowY:7},
    bat:{w:96,h:96,hover:-10,baseline:15,hud:63,shadowX:.31,shadowY:5},
    eye:{w:96,h:96,hover:-8,baseline:15,hud:63,shadowX:.34,shadowY:6},
    imp:{w:92,h:92,hover:0,baseline:17,hud:60,shadowX:.35,shadowY:7}
  };

  const ANCHOR = {
    imp:{x:[63,59,63,54,60,59,63,64,55,69,69,66,61,57,75,64,64],y:[123,118,122,123,118,121,122,119,120,123,123,122,123,123,122,122,122]},
    bat:{x:[64,69,64,68,65,59,60,58,67,77,67,63,54,60,61,59,63],y:[118,120,119,113,123,119,122,123,123,119,123,123,119,122,123,123,122]},
    eye:{x:[62,59,61,63,69,68,65,76,70,66,58,63,61,65,62,66,62],y:[118,118,118,118,118,118,118,118,119,117,123,118,118,123,123,123,123]},
    poring:{x:[61,63,63,62,62,61,68,63,62,66,62,64,66,63,64,65,65],y:[122,122,122,122,123,123,123,123,122,122,122,123,123,123,123,122,122]}
  };

  const step = (frame, duration) => ({ frame, duration });
  const MANIFEST = {
    imp:{
      idle:[step(0,320),step(1,280),step(2,300),step(0,320)],
      move:[step(4,135),step(6,135),step(7,150),step(6,135)],
      attack:[step(8,90),step(9,110),step(10,140)],
      hit:[step(11,110),step(12,180)],
      death:[step(13,130),step(14,140),step(15,180),step(16,520)]
    },
    bat:{
      idle:[step(0,190),step(1,170),step(2,190),step(3,170)],
      move:[step(4,120),step(5,115),step(6,120),step(7,125)],
      attack:[step(8,90),step(9,105),step(10,135)],
      hit:[step(11,110),step(12,170)],
      death:[step(13,125),step(14,140),step(15,170),step(16,500)]
    },
    eye:{
      idle:[step(0,310),step(1,280),step(2,310),step(3,290)],
      move:[step(4,145),step(5,145),step(6,145),step(7,155)],
      attack:[step(8,120),step(9,200)],
      hit:[step(11,120),step(12,180)],
      death:[step(13,140),step(14,150),step(15,190),step(16,520)]
    },
    poring:{
      idle:[step(0,340),step(1,300),step(2,320),step(3,300)],
      move:[step(4,155),step(5,150),step(6,155),step(7,160)],
      attack:[step(8,105),step(9,115),step(10,140)],
      hit:[step(11,120),step(12,180)],
      death:[step(13,135),step(14,145),step(15,180),step(16,520)]
    }
  };

  const NORMAL_W = 160, NORMAL_H = 160, NORMAL_ANCHOR_X = 80, NORMAL_ANCHOR_Y = 144;
  const cache = { poring:[], bat:[], eye:[], imp:[] };
  const animState = new Map();
  let frameW = 128, frameH = 128, ready = false;

  function makeCanvas(w,h){
    if(typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w,h);
    const c=document.createElement('canvas'); c.width=w; c.height=h; return c;
  }
  function cleanAlpha(imageData){
    const d=imageData.data;
    for(let i=0;i<d.length;i+=4){
      if(d[i+3] < 18){ d[i]=0; d[i+1]=0; d[i+2]=0; d[i+3]=0; }
      else if(d[i+3] > 242) d[i+3]=255;
    }
    return imageData;
  }
  function buildFrame(type,index){
    const tmp=makeCanvas(frameW,frameH), t=tmp.getContext('2d',{willReadFrequently:true});
    t.imageSmoothingEnabled=false;
    t.drawImage(atlas,index*frameW,ROW[type]*frameH,frameW,frameH,0,0,frameW,frameH);
    try { const px=t.getImageData(0,0,frameW,frameH); t.putImageData(cleanAlpha(px),0,0); } catch {}
    const out=makeCanvas(NORMAL_W,NORMAL_H), o=out.getContext('2d');
    o.imageSmoothingEnabled=false;
    const ax=(ANCHOR[type]?.x?.[index] ?? 64) * (frameW/128);
    const ay=(ANCHOR[type]?.y?.[index] ?? 122) * (frameH/128);
    o.drawImage(tmp,Math.round(NORMAL_ANCHOR_X-ax),Math.round(NORMAL_ANCHOR_Y-ay));
    return out;
  }
  function buildCache(){
    const w=atlas.naturalWidth||atlas.width, h=atlas.naturalHeight||atlas.height;
    if(!w||!h||w%17!==0||h%4!==0){ console.error(`Roweb v26: atlas incompatível (${w}x${h}).`); return; }
    frameW=w/17; frameH=h/4;
    for(const type of Object.keys(ROW)) for(let i=0;i<17;i++) cache[type][i]=buildFrame(type,i);
    ready=true;
    log(`Animações v26: atlas ${frameW}×${frameH}, anchors por frame e sequências curadas.`,'good');
  }
  atlas.onload=buildCache;
  atlas.onerror=e=>console.error('Roweb v26: falha ao carregar atlas de mobs.',e);

  function requestedState(m){
    if(!m.alive) return 'death';
    if(m.flashUntil>now) return 'hit';
    if(m.attackingUntil>now) return 'attack';
    return m.moving ? 'move' : 'idle';
  }
  function stateToken(m,state){
    if(state==='attack') return Number(m.attackingUntil)||0;
    if(state==='hit') return Number(m.flashUntil)||0;
    return 0;
  }
  function animationSlot(m,state){
    const id=m.id ?? m, token=stateToken(m,state);
    let s=animState.get(id);
    const transient=state==='attack'||state==='hit'||state==='death';
    if(!s || s.state!==state || (transient && s.token!==token)){
      s={state,startedAt:now,token}; animState.set(id,s);
    }
    return s;
  }
  function chooseStep(m,state){
    const seq=MANIFEST[m.type]?.[state] || MANIFEST[m.type]?.idle;
    if(!seq?.length) return {frame:0,duration:250};
    const slot=animationSlot(m,state), total=seq.reduce((sum,x)=>sum+x.duration,0);
    const loop=state==='idle'||state==='move';
    let elapsed=Math.max(0,now-slot.startedAt);
    if(loop) elapsed%=total; else elapsed=Math.min(elapsed,Math.max(0,total-1));
    let cursor=0;
    for(const s of seq){ cursor+=s.duration; if(elapsed<cursor) return s; }
    return seq[seq.length-1];
  }
  function dims(m,def){ return m.boss&&m.type==='poring'?{w:def.bossW,h:def.bossH}:{w:def.w,h:def.h}; }
  function drawShadow(m,d,def){ ctx.save();ctx.globalAlpha=.19;ctx.fillStyle='#142018';ctx.beginPath();ctx.ellipse(Math.round(m.x),Math.round(m.y+18),Math.round(d.w*def.shadowX),def.shadowY,0,0,TAU);ctx.fill();ctx.restore(); }
  function drawSelection(m,d){ if(selectedId!==m.id)return;ctx.save();ctx.strokeStyle='rgba(255,231,142,.88)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(m.x,m.y+18,d.w*.43,11,0,0,TAU);ctx.stroke();ctx.restore(); }
  function drawHud(m,d,def){
    const top=m.y-def.hud-(d.h-92)*.25;ctx.save();ctx.textAlign='center';ctx.font=m.boss?'700 11px sans-serif':'10px sans-serif';ctx.fillStyle='#f5eded';ctx.shadowColor='rgba(0,0,0,.78)';ctx.shadowBlur=2;ctx.fillText(m.name,m.x,top);ctx.shadowBlur=0;
    const w=m.boss?82:58,h=5,x=m.x-w/2,y=top+7;ctx.fillStyle='rgba(22,18,27,.82)';ctx.fillRect(x,y,w,h);ctx.fillStyle=m.boss?'#dc3f83':'#c54d69';ctx.fillRect(x,y,w*Math.max(0,m.hp/m.maxHp),h);ctx.restore();
  }

  drawMob=function roweb26Mob(m){
    if(!m) return;
    const def=VISUAL[m.type];
    if(!ready||!def){ previousDrawMob(m); return; }
    if(!m.alive) return;
    const state=requestedState(m), chosen=chooseStep(m,state), sprite=cache[m.type][chosen.frame];
    if(!sprite){ previousDrawMob(m); return; }
    const d=dims(m,def), scale=d.h/128, baseline=Math.round(m.y+def.baseline+def.hover);
    drawShadow(m,d,def); drawSelection(m,d);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(m.x),baseline);if(m.dir==='right')ctx.scale(-1,1);
    ctx.drawImage(sprite,-NORMAL_ANCHOR_X*scale,-NORMAL_ANCHOR_Y*scale,NORMAL_W*scale,NORMAL_H*scale);ctx.restore();
    drawHud(m,d,def);
  };

  window.RowebMobAnimationsV26={version:'26.0.0',manifest:MANIFEST,anchors:ANCHOR,diagnostics:{excludedFrames:{imp:[5],eye:[10]},stateClock:'per-mob-state-start',artificialBob:false,alignment:'per-frame-body-anchor'}};
  log('v26 ativa: animações dos mobs curadas, sincronizadas por estado e sem jitter artificial.','good');
})();
