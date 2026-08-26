// Roweb v25 — safe spawn repair + mob texture normalization.
// Loaded after v24 so it can validate the final collision map and the final monster renderer.
(() => {
  const cathedral = window.RowebCathedral;
  const previousDrawMob = drawMob;
  const previousUpdateCamera = updateCamera;

  const SAFE_EXTERIOR = { x: 1300, y: 910 };
  const CATHEDRAL_SPAWN_FOOTPRINT = { x0: 1090, x1: 1510, y0: 35, y1: 565 };
  let startupChecked = false;
  let lastScene = cathedral?.state?.scene || 'exterior';
  let lastSafetyCheck = 0;

  function scene(){ return cathedral?.state?.scene || 'exterior'; }
  function inCathedralFootprint(x,y){
    return x >= CATHEDRAL_SPAWN_FOOTPRINT.x0 && x <= CATHEDRAL_SPAWN_FOOTPRINT.x1 && y >= CATHEDRAL_SPAWN_FOOTPRINT.y0 && y <= CATHEDRAL_SPAWN_FOOTPRINT.y1;
  }
  function collisionAtPlayer(){
    try { return blockedAt(player, player.x, player.y, { collideMobs:false }); }
    catch { return false; }
  }
  function safeExteriorSpot(){
    try {
      const p = findFreeSpot(SAFE_EXTERIOR.x, SAFE_EXTERIOR.y, player.radius, null);
      if (Number.isFinite(p?.x) && Number.isFinite(p?.y)) return p;
    } catch {}
    return { ...SAFE_EXTERIOR };
  }
  function persistSafePosition(){
    try { if (typeof persist === 'function') persist(); } catch {}
    try { localStorage.setItem('roweb20-return', JSON.stringify({ x:player.x, y:player.y })); } catch {}
  }
  function repairExteriorSpawn(reason='runtime', strict=false){
    if (scene() !== 'exterior') return false;
    const invalid = collisionAtPlayer() || (strict && inCathedralFootprint(player.x,player.y));
    if (!invalid) return false;
    const p = safeExteriorSpot();
    player.x = p.x; player.y = p.y;
    player.moveTarget = null;
    selectedId = null;
    persistSafePosition();
    log(`Spawn seguro v25 aplicado (${reason}).`, 'good');
    toast('Posição corrigida: Praça da Catedral');
    return true;
  }

  // The original boot validation runs before v24 changes blockedAt(). Validate once again
  // after every renderer/collision layer has loaded. This also repairs old saves.
  setTimeout(() => {
    if (!startupChecked) {
      startupChecked = true;
      repairExteriorSpawn('carregamento', true);
    }
  }, 0);

  updateCamera = function roweb25Camera(){
    previousUpdateCamera();
    const current = scene();
    if (!startupChecked) {
      startupChecked = true;
      repairExteriorSpawn('primeiro frame', true);
    }
    if (lastScene === 'interior' && current === 'exterior') {
      // Return positions created by older versions can also be inside the new facade collider.
      repairExteriorSpawn('saída da Catedral', false);
    }
    lastScene = current;
    // Cheap failsafe for impossible positions created by old saves/geometry updates.
    if (current === 'exterior' && now - lastSafetyCheck > 900) {
      lastSafetyCheck = now;
      if (collisionAtPlayer()) repairExteriorSpawn('failsafe', false);
    }
  };

  // --- Mob texture normalization -------------------------------------------------
  // v18/v24 draw directly from one compressed atlas. On small pixel-art sprites,
  // resampling a cell straight from a lossy atlas can make edges look smeared or
  // leak neighbouring colors. v25 caches each frame independently at game scale.
  const atlas = new Image();
  atlas.decoding = 'async';
  atlas.src = '/assets/v18/mobs.webp';

  const TYPES = ['poring','bat','eye','imp'];
  const ROW = { poring:0, bat:1, eye:2, imp:3 };
  const SEQ = {
    idle:[0,1,2,3], move:[4,5,6,7], attack:[8,9,10], hit:[11,12], death:[13,14,15,16]
  };
  const VISUAL = {
    poring:{w:90,h:90,bossW:120,bossH:120,hover:0,baseline:17,hud:62,shadowX:.36,shadowY:7},
    bat:{w:96,h:96,hover:-12,baseline:15,hud:63,shadowX:.31,shadowY:5},
    eye:{w:96,h:96,hover:-9,baseline:15,hud:63,shadowX:.34,shadowY:6},
    imp:{w:92,h:92,hover:0,baseline:17,hud:60,shadowX:.35,shadowY:7}
  };

  const CACHE_SIZE = 96;
  const frameCache = { poring:[], bat:[], eye:[], imp:[] };
  let sourceFrameW = 128;
  let sourceFrameH = 128;
  let cacheReady = false;

  function makeCanvas(w,h){
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w,h);
    const c=document.createElement('canvas');c.width=w;c.height=h;return c;
  }
  function normalizePixels(imageData){
    const d=imageData.data;
    for(let i=0;i<d.length;i+=4){
      const a=d[i+3];
      if(a<26){ d[i]=d[i+1]=d[i+2]=d[i+3]=0; continue; }
      // Pixel-art alpha should be deliberate. Remove WebP fringe without changing silhouette.
      if(a>206)d[i+3]=255;
      // Very light palette snapping reduces compression speckle while retaining generated shading.
      d[i]=Math.min(255,Math.round(d[i]/8)*8);
      d[i+1]=Math.min(255,Math.round(d[i+1]/8)*8);
      d[i+2]=Math.min(255,Math.round(d[i+2]/8)*8);
    }
    return imageData;
  }
  function buildFrame(type,index){
    const scratch=makeCanvas(sourceFrameW,sourceFrameH),sctx=scratch.getContext('2d',{willReadFrequently:true});
    sctx.imageSmoothingEnabled=false;
    sctx.clearRect(0,0,sourceFrameW,sourceFrameH);
    sctx.drawImage(atlas,index*sourceFrameW,ROW[type]*sourceFrameH,sourceFrameW,sourceFrameH,0,0,sourceFrameW,sourceFrameH);
    try {
      const data=sctx.getImageData(0,0,sourceFrameW,sourceFrameH);
      sctx.putImageData(normalizePixels(data),0,0);
    } catch {}
    const out=makeCanvas(CACHE_SIZE,CACHE_SIZE),octx=out.getContext('2d');
    octx.imageSmoothingEnabled=false;
    octx.clearRect(0,0,CACHE_SIZE,CACHE_SIZE);
    octx.drawImage(scratch,0,0,sourceFrameW,sourceFrameH,0,0,CACHE_SIZE,CACHE_SIZE);
    return out;
  }
  function buildCache(){
    const w=atlas.naturalWidth||atlas.width,h=atlas.naturalHeight||atlas.height;
    if(!w||!h||w%17!==0||h%4!==0){
      console.error(`Roweb v25: atlas de mobs incompatível (${w}x${h}).`);
      return;
    }
    sourceFrameW=w/17;sourceFrameH=h/4;
    for(const type of TYPES)for(let i=0;i<17;i++)frameCache[type][i]=buildFrame(type,i);
    cacheReady=true;
    log(`Texturas v25: 68 frames de mobs normalizados (${sourceFrameW}×${sourceFrameH} → ${CACHE_SIZE}×${CACHE_SIZE}).`,'good');
  }
  atlas.onload=buildCache;
  atlas.onerror=e=>console.error('Roweb v25: falha ao carregar atlas para normalização.',e);

  function stateOf(m){if(m.flashUntil>now)return'hit';if(m.attackingUntil>now)return'attack';return m.moving?'move':'idle';}
  function frameOf(state,id){const seq=SEQ[state]||SEQ.idle,ms=state==='attack'?115:state==='hit'?100:state==='move'?145:260;return seq[Math.floor((now+(id||0)*43)/ms)%seq.length];}
  function dims(m,def){if(m.boss&&m.type==='poring')return{w:def.bossW,h:def.bossH};return{w:def.w,h:def.h};}
  function drawShadow(m,d,def){ctx.save();ctx.globalAlpha=.19;ctx.fillStyle='#142018';ctx.beginPath();ctx.ellipse(Math.round(m.x),Math.round(m.y+18),Math.round(d.w*def.shadowX),def.shadowY,0,0,TAU);ctx.fill();ctx.restore();}
  function drawSelection(m,d){if(selectedId!==m.id)return;ctx.save();ctx.strokeStyle='rgba(255,231,142,.88)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(m.x,m.y+18,d.w*.43,11,0,0,TAU);ctx.stroke();ctx.restore();}
  function drawHud(m,d,def){
    const top=m.y-def.hud-(d.h-92)*.25;ctx.save();ctx.textAlign='center';ctx.font=m.boss?'700 11px sans-serif':'10px sans-serif';ctx.fillStyle='#f5eded';ctx.shadowColor='rgba(0,0,0,.78)';ctx.shadowBlur=2;ctx.fillText(m.name,m.x,top);ctx.shadowBlur=0;
    const w=m.boss?82:58,h=5,x=m.x-w/2,y=top+7;ctx.fillStyle='rgba(22,18,27,.82)';ctx.fillRect(x,y,w,h);ctx.fillStyle=m.boss?'#dc3f83':'#c54d69';ctx.fillRect(x,y,w*Math.max(0,m.hp/m.maxHp),h);ctx.restore();
  }

  drawMob=function roweb25Mob(m){
    if(!m?.alive)return;
    const def=VISUAL[m.type];
    if(!cacheReady||!def){previousDrawMob(m);return;}
    const state=stateOf(m),frame=frameOf(state,m.id),sprite=frameCache[m.type][frame];
    if(!sprite){previousDrawMob(m);return;}
    const d=dims(m,def);
    const hover=def.hover+(m.type==='bat'?Math.sin(now/130+(m.id||0))*4:m.type==='eye'?Math.sin(now/180+(m.id||0))*3:state==='move'?Math.sin(now/100+(m.id||0))*1.2:0);
    const baseline=Math.round(m.y+def.baseline+hover);
    drawShadow(m,d,def);drawSelection(m,d);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(m.x),baseline);if(m.dir==='right')ctx.scale(-1,1);
    ctx.drawImage(sprite,Math.round(-d.w/2),-d.h,Math.round(d.w),Math.round(d.h));ctx.restore();
    drawHud(m,d,def);
  };

  window.RowebGraphicsV25={
    version:'25.0.0',
    safeSpawn:SAFE_EXTERIOR,
    repairSpawn:()=>repairExteriorSpawn('manual',true),
    mobTexture:{source:'/assets/v18/mobs.webp',cacheSize:CACHE_SIZE,mode:'isolated-frame-alpha-clean-palette-snap'}
  };
  log('v25 ativa: spawn externo protegido e texturas de mobs normalizadas por frame.','good');
})();
