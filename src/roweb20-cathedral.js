// Roweb v20 — animated cathedral landmark + first cathedral interior map.
// Keeps Aster, combat, loot and v19 world composition untouched outside the cathedral.
(() => {
  const previousDrawGround = drawGround;
  const previousDrawScenery = drawScenery;
  const previousDrawMob = drawMob;
  const previousDrawMinimap = drawMinimap;
  const previousDrawEffects = drawEffects;
  const previousUpdateMobs = updateMobs;
  const previousBlockedAt = blockedAt;

  const EXTERIOR_ENTRANCE = { x: 1300, y: 468, radius: 88 };
  const INTERIOR = {
    left: 900, right: 1700, top: 170, bottom: 1560,
    spawn: { x: 1300, y: 1442 },
    exit: { x: 1300, y: 1510, radius: 66 },
    altar: { x: 1300, y: 310, w: 220, h: 92 }
  };
  const columns = [
    [1040,420],[1560,420],[1040,650],[1560,650],[1040,880],[1560,880],[1040,1110],[1560,1110]
  ];
  const pews = [
    [1120,700,120,34],[1360,700,120,34],[1120,820,120,34],[1360,820,120,34],
    [1120,940,120,34],[1360,940,120,34],[1120,1060,120,34],[1360,1060,120,34]
  ];

  const state = {
    scene: localStorage.getItem('roweb20-scene') === 'interior' ? 'interior' : 'exterior',
    doorPhase: 'idle',
    doorStartedAt: 0,
    transitionUntil: 0,
    promptShown: false
  };

  const frameUrls = {
    0: '/assets/v20/cathedral-0.webp',
    4: '/assets/v20/cathedral-4.webp',
    5: '/assets/v20/cathedral-5.webp',
    6: '/assets/v20/cathedral-6.webp'
  };
  const frames = {};
  const ready = {};
  for (const [key, url] of Object.entries(frameUrls)) {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => { ready[key] = true; };
    image.onerror = error => console.error(`Roweb v20 cathedral frame ${key} failed`, error);
    image.src = url;
    frames[key] = image;
  }

  function d(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
  function inExteriorDoorRange(){ return state.scene === 'exterior' && d(player,EXTERIOR_ENTRANCE) <= EXTERIOR_ENTRANCE.radius; }
  function inInteriorExitRange(){ return state.scene === 'interior' && d(player,INTERIOR.exit) <= INTERIOR.exit.radius; }

  function storeReturnPosition(){
    localStorage.setItem('roweb20-return', JSON.stringify({ x: player.x, y: player.y }));
  }
  function enterInterior(){
    storeReturnPosition();
    state.scene = 'interior';
    state.doorPhase = 'idle';
    state.transitionUntil = now + 420;
    localStorage.setItem('roweb20-scene','interior');
    player.x = INTERIOR.spawn.x; player.y = INTERIOR.spawn.y; player.moveTarget = null;
    selectedId = null;
    log('Área descoberta: Interior da Catedral Caída.','good');
    toast('Interior da Catedral Caída');
  }
  function exitInterior(){
    let p = { x:1300, y:535 };
    try { p = { ...p, ...JSON.parse(localStorage.getItem('roweb20-return') || '{}') }; } catch {}
    state.scene = 'exterior';
    state.transitionUntil = now + 360;
    localStorage.setItem('roweb20-scene','exterior');
    player.x = Number.isFinite(p.x) ? p.x : 1300;
    player.y = Math.max(515, Number.isFinite(p.y) ? p.y : 535);
    player.moveTarget = null;
    selectedId = null;
    toast('Vale da Catedral Caída');
  }
  function startDoorOpen(){
    if (!inExteriorDoorRange() || state.doorPhase === 'opening') return;
    state.doorPhase = 'opening';
    state.doorStartedAt = now;
    player.moveTarget = null;
    log('A porta da Catedral começa a se abrir...','good');
  }
  function currentCathedralFrame(){
    if (state.doorPhase !== 'opening') return 0;
    const elapsed = now - state.doorStartedAt;
    if (elapsed >= 840) { enterInterior(); return 6; }
    return [4,5,6][Math.min(2,Math.floor(elapsed/280))];
  }

  function drawCathedral(image, x, baseline, frame){
    const h = 555, w = 370;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.28; ctx.fillStyle = '#161514';
    ctx.beginPath(); ctx.ellipse(x,baseline+2,150,22,0,0,TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.drawImage(image, Math.round(x-w/2), Math.round(baseline-h), w, h);
    if (frame === 6) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x,baseline-76,6,x,baseline-76,110);
      g.addColorStop(0,'rgba(255,221,124,.34)'); g.addColorStop(1,'rgba(255,221,124,0)');
      ctx.fillStyle = g; ctx.beginPath();ctx.arc(x,baseline-76,110,0,TAU);ctx.fill();
    }
    ctx.restore();
  }

  function drawExteriorPrompt(){
    if (!inExteriorDoorRange()) return;
    ctx.save();
    ctx.font='700 13px sans-serif';ctx.textAlign='center';
    const text = state.doorPhase === 'opening' ? 'Abrindo...' : 'E  Entrar na Catedral';
    const w = ctx.measureText(text).width + 24;
    ctx.fillStyle='rgba(25,20,31,.86)';ctx.fillRect(1300-w/2,488,w,30);
    ctx.strokeStyle='rgba(239,207,137,.5)';ctx.strokeRect(1300-w/2+.5,488.5,w-1,29);
    ctx.fillStyle='#f5e4b3';ctx.fillText(text,1300,508);
    ctx.restore();
  }

  function drawInteriorFloor(){
    ctx.fillStyle='#11131a'; ctx.fillRect(0,0,WORLD.width,WORLD.height);
    const L=INTERIOR.left,R=INTERIOR.right,T=INTERIOR.top,B=INTERIOR.bottom;
    ctx.fillStyle='#29262b';ctx.fillRect(L-34,T-34,R-L+68,B-T+68);
    ctx.fillStyle='#514c49';ctx.fillRect(L,T,R-L,B-T);
    for(let y=T;y<B;y+=38){
      const row=Math.floor((y-T)/38), off=row%2?28:0;
      for(let x=L-off;x<R;x+=56){
        ctx.fillStyle=((x+y)/10)%3<1?'#625d58':'#59534f';
        ctx.fillRect(x+2,y+2,52,34);
        ctx.fillStyle='rgba(255,239,205,.07)';ctx.fillRect(x+5,y+5,45,2);
      }
    }
    ctx.fillStyle='rgba(207,194,161,.12)';ctx.fillRect(1190,T+80,220,B-T-150);
    ctx.fillStyle='#594044';ctx.fillRect(1257,390,86,1040);
    ctx.fillStyle='rgba(213,166,94,.22)';ctx.fillRect(1262,390,4,1040);ctx.fillRect(1334,390,4,1040);
    ctx.fillStyle='#2d252a';ctx.fillRect(1135,210,330,205);
    ctx.fillStyle='#786f61';ctx.fillRect(1190,285,220,94);
    ctx.fillStyle='#c9b98d';ctx.fillRect(1200,295,200,12);
    ctx.fillStyle='#7c633d';ctx.fillRect(1289,220,22,84);ctx.fillRect(1260,247,80,22);
    const glow=ctx.createRadialGradient(1300,270,4,1300,270,150);glow.addColorStop(0,'rgba(255,222,139,.22)');glow.addColorStop(1,'rgba(255,222,139,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(1300,270,150,0,TAU);ctx.fill();
    for(const x of [985,1615]){ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#8d6fc4';ctx.beginPath();ctx.ellipse(x,590,80,180,0,0,TAU);ctx.fill();ctx.restore();}
    for(const [x,y] of columns){ctx.fillStyle='#383438';ctx.fillRect(x-24,y-42,48,84);ctx.fillStyle='#80776d';ctx.fillRect(x-17,y-37,34,68);ctx.fillStyle='#a3998d';ctx.fillRect(x-21,y-42,42,9);}
    for(const [x,y,w,h] of pews){ctx.fillStyle='#372b2a';ctx.fillRect(x,y,w,h);ctx.fillStyle='#604640';ctx.fillRect(x+4,y+4,w-8,10);ctx.fillStyle='#241e1e';ctx.fillRect(x+8,y+h-5,9,14);ctx.fillRect(x+w-17,y+h-5,9,14);}
    const eg=ctx.createRadialGradient(1300,1510,4,1300,1510,120);eg.addColorStop(0,'rgba(255,211,117,.2)');eg.addColorStop(1,'rgba(255,211,117,0)');ctx.fillStyle=eg;ctx.beginPath();ctx.arc(1300,1510,120,0,TAU);ctx.fill();
    ctx.fillStyle='#211d22';ctx.fillRect(1225,1530,150,28);
    if(inInteriorExitRange()){
      ctx.save();ctx.font='700 13px sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(20,17,25,.86)';ctx.fillRect(1224,1460,152,30);ctx.fillStyle='#f4e2b1';ctx.fillText('E  Sair da Catedral',1300,1480);ctx.restore();
    }
  }

  function interiorBlocked(entity,x,y){
    const r=entity.radius||14;
    if(x-r<INTERIOR.left+24||x+r>INTERIOR.right-24||y-r<INTERIOR.top+24||y+r>INTERIOR.bottom-10)return true;
    const hitRect=(rx,ry,rw,rh)=>circleHitsRect(x,y,r,{x:rx,y:ry,w:rw,h:rh});
    if(hitRect(INTERIOR.altar.x-INTERIOR.altar.w/2,INTERIOR.altar.y-INTERIOR.altar.h/2,INTERIOR.altar.w,INTERIOR.altar.h))return true;
    for(const [cx,cy] of columns)if((x-cx)**2+(y-cy)**2<(r+25)**2)return true;
    for(const [px,py,w,h] of pews)if(hitRect(px,py,w,h))return true;
    return false;
  }

  blockedAt=function roweb20Blocked(entity,x,y,o={}){
    if(state.scene==='interior')return interiorBlocked(entity,x,y);
    return previousBlockedAt(entity,x,y,o);
  };
  drawGround=function roweb20Ground(){ if(state.scene==='interior')drawInteriorFloor(); else previousDrawGround(); };
  drawScenery=function roweb20Scenery(s){
    if(state.scene==='interior')return;
    if(s.type!=='chapel'){previousDrawScenery(s);return;}
    const frame=currentCathedralFrame();
    const image=frames[frame];
    if(image&&ready[frame])drawCathedral(image,s.x,500,frame);else previousDrawScenery(s);
    drawExteriorPrompt();
  };
  drawMob=function roweb20Mob(m){ if(state.scene==='interior')return; previousDrawMob(m); };
  updateMobs=function roweb20Mobs(dt){ if(state.scene==='interior')return; previousUpdateMobs(dt); };
  drawMinimap=function roweb20Minimap(){
    if(state.scene!=='interior'){previousDrawMinimap();return;}
    mctx.clearRect(0,0,minimap.width,minimap.height);mctx.fillStyle='#17151a';mctx.fillRect(0,0,minimap.width,minimap.height);
    mctx.fillStyle='#55504d';mctx.fillRect(45,6,90,108);mctx.fillStyle='#6b474b';mctx.fillRect(86,28,8,74);
    mctx.fillStyle='#d3b76c';mctx.fillRect(80,12,20,7);mctx.fillStyle='#fff2a3';mctx.beginPath();mctx.arc(45+(player.x-INTERIOR.left)/(INTERIOR.right-INTERIOR.left)*90,6+(player.y-INTERIOR.top)/(INTERIOR.bottom-INTERIOR.top)*108,3,0,TAU);mctx.fill();
    const label=document.querySelector('#minimap-panel span');if(label)label.textContent='Interior da Catedral Caída';
  };
  drawEffects=function roweb20Effects(){
    previousDrawEffects();
    if(state.scene==='interior'){
      ctx.save();const g=ctx.createRadialGradient(player.x,player.y,130,player.x,player.y,650);g.addColorStop(0,'rgba(10,8,13,0)');g.addColorStop(1,'rgba(10,8,13,.42)');ctx.fillStyle=g;ctx.fillRect(camera.x,camera.y,innerWidth,innerHeight);ctx.restore();
    }
    if(state.transitionUntil>now){ctx.save();ctx.globalAlpha=Math.max(0,(state.transitionUntil-now)/420)*.72;ctx.fillStyle='#fff0bd';ctx.fillRect(camera.x,camera.y,innerWidth,innerHeight);ctx.restore();}
  };

  addEventListener('keydown',e=>{
    if(e.key.toLowerCase()!=='e')return;
    if(inExteriorDoorRange()){e.preventDefault();e.stopImmediatePropagation();startDoorOpen();}
    else if(inInteriorExitRange()){e.preventDefault();e.stopImmediatePropagation();exitInterior();}
  },true);
  canvas.addEventListener('pointerdown',e=>{
    if(state.scene!=='exterior'||!inExteriorDoorRange())return;
    const wx=e.clientX+camera.x,wy=e.clientY+camera.y;
    if(Math.hypot(wx-1300,wy-438)<105){e.preventDefault();e.stopImmediatePropagation();startDoorOpen();}
  },true);

  if(state.scene==='interior'){
    if(player.x<INTERIOR.left||player.x>INTERIOR.right||player.y<INTERIOR.top||player.y>INTERIOR.bottom){player.x=INTERIOR.spawn.x;player.y=INTERIOR.spawn.y;}
  }

  window.RowebCathedral={version:'20.0',state,entrance:EXTERIOR_ENTRANCE,interior:INTERIOR,open:startDoorOpen,enter:enterInterior,exit:exitInterior};
  log('Catedral v20 ativa: landmark animado, porta interativa e primeiro mapa interno.','good');
})();
