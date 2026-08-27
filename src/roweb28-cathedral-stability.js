// Roweb v28 — authoritative Cathedral stability layer.
(() => {
  const cathedral = window.RowebCathedral;
  if (!cathedral) return console.error('Roweb v28 requires RowebCathedral.');

  const prevWorld = drawWorld;
  const prevMob = drawMob;
  const prevGround = drawGround;
  const prevUpdateMobs = updateMobs;

  const OUT_SAFE = { x: 1300, y: 910 };
  const IN_SAFE = { x: 1300, y: 1360 };
  const EXIT = { x: 1300, y: 1475, rx: 180, ry: 125 };

  cathedral.interior.spawn.x = IN_SAFE.x;
  cathedral.interior.spawn.y = IN_SAFE.y;
  cathedral.interior.exit.x = EXIT.x;
  cathedral.interior.exit.y = EXIT.y;
  cathedral.interior.exit.radius = 170;

  const atlas = new Image();
  atlas.decoding = 'async';
  atlas.src = '/assets/v18/mobs.webp';
  let ready = false, fw = 128, fh = 128;
  atlas.onload = () => {
    const w = atlas.naturalWidth || atlas.width, h = atlas.naturalHeight || atlas.height;
    if (w && h && w % 17 === 0 && h % 4 === 0) {
      fw = w / 17; fh = h / 4; ready = true;
      log(`v28: atlas interno validado em ${fw}×${fh}.`, 'good');
    }
  };

  const ROW = { poring:0, bat:1, eye:2, imp:3 };
  const VISUAL = {
    poring:{h:88,hud:62,hover:0,sx:27,sy:7},
    bat:{h:92,hud:64,hover:-8,sx:25,sy:6},
    eye:{h:92,hud:64,hover:-7,sx:27,sy:7},
    imp:{h:90,hud:62,hover:0,sx:26,sy:7}
  };
  const ANCHOR = window.RowebMobAnimationsV26?.anchors || {};
  const STABLE = {
    eye:{idle:[0],move:[0],attack:[8],hit:[11]},
    imp:{idle:[0,2],move:[4,6],attack:[8,9],hit:[11]},
    bat:{idle:[0,2],move:[4,6],attack:[8,9],hit:[11]},
    poring:{idle:[0,2],move:[4,6],attack:[8,9],hit:[11]}
  };

  const indoor = () => cathedral.state?.scene === 'interior';
  const finite = v => Number.isFinite(Number(v));

  function setPlayer(x,y){
    player.x=x; player.y=y; player.moveTarget=null; selectedId=null;
    if('targetX' in player) player.targetX=x;
    if('targetY' in player) player.targetY=y;
  }
  function blocked(entity,x,y){
    try{return !!blockedAt(entity,x,y,{collideMobs:false,collidePlayer:false});}catch{return false;}
  }
  function safeNear(entity,x,y,max=190){
    if(!blocked(entity,x,y)) return {x,y};
    for(const r of [26,48,72,98,128,158,max]) for(let i=0;i<16;i++){
      const a=i/16*Math.PI*2,nx=x+Math.cos(a)*r,ny=y+Math.sin(a)*r;
      if(!blocked(entity,nx,ny)) return {x:nx,y:ny};
    }
    return null;
  }
  function repairPlayer(){
    if(!indoor()) return;
    if(finite(player.x)&&finite(player.y)&&!blocked(player,player.x,player.y)) return;
    const p=safeNear(player,IN_SAFE.x,IN_SAFE.y,230)||IN_SAFE; setPlayer(p.x,p.y);
    log('v28: posição interna de Aster reparada.','info');
  }
  function repairMobs(){
    if(!indoor()) return;
    for(const m of mobs){
      if(!m?.dungeon||!m.alive||m.dungeonBoss) continue;
      if(finite(m.x)&&finite(m.y)&&!blocked(m,m.x,m.y)) continue;
      const bx=finite(m.spawnX)?Number(m.spawnX):Number(m.x),by=finite(m.spawnY)?Number(m.spawnY):Number(m.y);
      const p=safeNear(m,bx,by,180);
      if(p){m.x=p.x;m.y=p.y;} else {m.alive=false;m._dungeonAlive=false;}
    }
  }

  function inExit(){
    if(!indoor()) return false;
    const dx=(player.x-EXIT.x)/EXIT.rx,dy=(player.y-EXIT.y)/EXIT.ry;
    return dx*dx+dy*dy<=1;
  }
  function leave(source='portal'){
    if(!indoor()) return;
    try{cathedral.exit();}catch{
      cathedral.state.scene='exterior';
      try{localStorage.setItem('roweb20-scene','exterior');}catch{}
    }
    setPlayer(OUT_SAFE.x,OUT_SAFE.y);
    toast('Vale da Catedral Caída');
    log(`Saída da Catedral v28 utilizada (${source}).`,'good');
  }
  function drawExit(){
    if(!indoor()) return;
    const pulse=.72+Math.sin(now/240)*.16;
    ctx.save();ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(EXIT.x,EXIT.y,8,EXIT.x,EXIT.y,120);
    g.addColorStop(0,`rgba(255,222,145,${.24*pulse})`);g.addColorStop(1,'rgba(255,222,145,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(EXIT.x,EXIT.y,120,54,0,0,Math.PI*2);ctx.fill();
    ctx.globalCompositeOperation='source-over';ctx.strokeStyle=`rgba(245,219,157,${.45+pulse*.28})`;ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(EXIT.x,EXIT.y,73,26,0,0,Math.PI*2);ctx.stroke();
    ctx.font='700 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f6e5b8';
    ctx.fillText(inExit()?'E  SAIR DA CATEDRAL':'SAÍDA',EXIT.x,EXIT.y-37);ctx.restore();
  }
  drawGround=function(){prevGround();if(indoor())drawExit();};

  // v10 weather is screen-space/global; force zero intensity only while rendering the interior.
  drawWorld=function(){
    const systems=window.RowebSystems,inside=indoor();let snap=null;
    if(inside&&systems?.state){const s=systems.state;snap={raining:s.raining,rainIntensity:s.rainIntensity,lightningUntil:s.lightningUntil,weatherUntil:s.weatherUntil};s.raining=false;s.rainIntensity=0;s.lightningUntil=0;s.weatherUntil=performance.now()+3600000;}
    try{prevWorld();}finally{
      if(snap&&systems?.state)Object.assign(systems.state,snap);
      if(inside){const el=document.getElementById('environment-status');if(el)el.textContent='⛪ Interior • Abrigado';}
    }
  };

  function animState(m){if(m.flashUntil>now)return'hit';if(m.attackingUntil>now)return'attack';return m.moving?'move':'idle';}
  function frameFor(m){
    const set=STABLE[m.type]||STABLE.eye,state=animState(m),seq=set[state]||set.idle;
    const speed=state==='move'?220:state==='idle'?420:160;
    return seq[Math.floor(now/speed)%seq.length];
  }
  function hud(m,d){
    const top=m.y-d.hud;ctx.save();ctx.textAlign='center';ctx.font='700 10px sans-serif';ctx.fillStyle='#f4ebf4';ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=2;ctx.fillText(m.name||'Demônio',Math.round(m.x),Math.round(top));ctx.shadowBlur=0;
    const w=60,x=Math.round(m.x-w/2),y=Math.round(top+7);ctx.fillStyle='rgba(20,15,24,.88)';ctx.fillRect(x,y,w,5);ctx.fillStyle='#bd486e';ctx.fillRect(x,y,w*Math.max(0,Math.min(1,m.hp/m.maxHp)),5);ctx.restore();
  }
  function stableDungeonMob(m){
    const d=VISUAL[m.type];if(!ready||!d||ROW[m.type]==null){prevMob(m);return;}
    const frame=frameFor(m),A=ANCHOR[m.type]||{},ax=(A.x?.[frame]??fw/2)*(fw/128),ay=(A.y?.[frame]??fh*.94)*(fh/128),scale=d.h/fh;
    const hover=d.hover+(m.type==='eye'?Math.sin(now/520+(m.id||0))*1.2:0),base=m.y+16+hover,sx=frame*fw,sy=ROW[m.type]*fh;
    ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#080a0c';ctx.beginPath();ctx.ellipse(Math.round(m.x),Math.round(m.y+19),d.sx,d.sy,0,0,Math.PI*2);ctx.fill();ctx.restore();
    if(selectedId===m.id){ctx.save();ctx.strokeStyle='rgba(255,228,143,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(m.x,m.y+19,d.sx+7,11,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter=m.flashUntil>now?'brightness(1.65) saturate(.8)':'none';ctx.translate(Math.round(m.x),Math.round(base));if(m.dir==='right')ctx.scale(-1,1);
    ctx.drawImage(atlas,sx,sy,fw,fh,Math.round(-ax*scale),Math.round(-ay*scale),Math.round(fw*scale),Math.round(fh*scale));ctx.restore();hud(m,d);
  }

  // Final scene authority: no exterior mobs inside, and dungeon mobs always use a stable renderer.
  drawMob=function(m){
    if(!m?.alive)return;
    if(indoor()){
      if(!m.dungeon)return;
      if(m.dungeonBoss){prevMob(m);return;}
      stableDungeonMob(m);return;
    }
    if(m.dungeon)return;
    prevMob(m);
  };

  let lastScene=cathedral.state.scene,lastCheck=0;
  updateMobs=function(dt){
    prevUpdateMobs(dt);
    const scene=cathedral.state.scene;
    if(scene!==lastScene){lastScene=scene;if(scene==='interior'){repairPlayer();repairMobs();}}
    if(!indoor())return;
    if(now-lastCheck>450){lastCheck=now;repairPlayer();repairMobs();if(player.y>=1535&&Math.abs(player.x-EXIT.x)<=150)leave('passagem');}
  };

  addEventListener('keydown',e=>{if(!indoor()||e.key.toLowerCase()!=='e'||!inExit())return;e.preventDefault();e.stopImmediatePropagation();leave('tecla E');},true);
  setTimeout(()=>{if(indoor()){repairPlayer();repairMobs();}},80);

  window.RowebCathedralStabilityV28={version:'28.0.0',exitZone:EXIT,diagnostics:{indoorRain:false,stableDungeonMobRenderer:true,dungeonSpawnRepair:true,exitFailsafe:true,eyeLocomotionPose:0},exit:leave,repair:()=>{repairPlayer();repairMobs();}};
  log('v28 ativa: Catedral sem chuva, saída protegida e mobs internos estabilizados.','good');
})();