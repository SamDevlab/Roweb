// Roweb v21 — multi-room Cathedral dungeon, progression, guardians and boss.
// Extends v20 only while the player is inside the Cathedral; exterior gameplay remains untouched.
(() => {
  const cathedral = window.RowebCathedral;
  if (!cathedral) {
    console.error('Roweb v21 requires RowebCathedral v20.');
    return;
  }

  const previousDrawGround = drawGround;
  const previousDrawScenery = drawScenery;
  const previousDrawMob = drawMob;
  const previousDrawMinimap = drawMinimap;
  const previousDrawEffects = drawEffects;
  const previousUpdateMobs = updateMobs;
  const previousBlockedAt = blockedAt;
  const previousKillMob = killMob;
  const previousUpdateUI = updateUI;

  const ROOMS = {
    nave: { name: 'Nave Principal', x: 900, y: 430, w: 800, h: 1130 },
    west: { name: 'Transepto do Poente', x: 330, y: 690, w: 570, h: 370 },
    east: { name: 'Transepto Profanado', x: 1700, y: 690, w: 570, h: 370 },
    crypt: { name: 'Cripta dos Peregrinos', x: 1010, y: 205, w: 580, h: 250 },
    sanctum: { name: 'Santuário Profanado', x: 1040, y: 42, w: 520, h: 180 },
    westCorridor: { x: 835, y: 805, w: 130, h: 140 },
    eastCorridor: { x: 1635, y: 805, w: 130, h: 140 },
    cryptCorridor: { x: 1190, y: 390, w: 220, h: 120 },
    sanctumCorridor: { x: 1205, y: 165, w: 190, h: 100 }
  };

  const state = loadDungeonState();
  const discovered = new Set(state.discovered || []);
  const outsideAliveSnapshot = new Map();
  const pulses = [];
  let lastScene = cathedral.state.scene;
  let dungeonAIActive = false;
  let lastZone = null;
  let bossCastAt = 0;

  function loadDungeonState() {
    try {
      const raw = JSON.parse(localStorage.getItem('roweb21-dungeon') || '{}');
      return {
        dead: raw.dead && typeof raw.dead === 'object' ? raw.dead : {},
        bossDefeated: !!raw.bossDefeated,
        discovered: Array.isArray(raw.discovered) ? raw.discovered : []
      };
    } catch {
      return { dead: {}, bossDefeated: false, discovered: [] };
    }
  }

  function saveDungeonState() {
    state.discovered = [...discovered];
    localStorage.setItem('roweb21-dungeon', JSON.stringify(state));
  }

  const dungeonProps = [
    ...[[1035,560],[1565,560],[1035,790],[1565,790],[1035,1020],[1565,1020],[1035,1250],[1565,1250]]
      .map(([x,y]) => ({ type:'v21-column', x, y, dungeon:true, solid:true })),
    ...[[1110,760],[1370,760],[1110,890],[1370,890],[1110,1020],[1370,1020],[1110,1150],[1370,1150]]
      .map(([x,y]) => ({ type:'v21-pew', x, y, dungeon:true, solid:true, w:120, h:34 })),
    {type:'v21-tomb',x:470,y:765,dungeon:true,solid:true},{type:'v21-tomb',x:590,y:885,dungeon:true,solid:true},
    {type:'v21-tomb',x:720,y:760,dungeon:true,solid:true},{type:'v21-statue',x:425,y:975,dungeon:true,solid:true},
    {type:'v21-brazier',x:785,y:980,dungeon:true,solid:false},{type:'v21-seal',x:610,y:860,dungeon:true,solid:false,room:'west'},
    {type:'v21-rubble',x:1815,y:765,dungeon:true,solid:true},{type:'v21-rubble',x:2110,y:930,dungeon:true,solid:true},
    {type:'v21-statue',x:2160,y:770,dungeon:true,solid:true},{type:'v21-brazier',x:1795,y:980,dungeon:true,solid:false},
    {type:'v21-brazier',x:2190,y:1000,dungeon:true,solid:false},{type:'v21-seal',x:1990,y:860,dungeon:true,solid:false,room:'east'},
    {type:'v21-tomb',x:1120,y:315,dungeon:true,solid:true},{type:'v21-tomb',x:1480,y:315,dungeon:true,solid:true},
    {type:'v21-rubble',x:1190,y:390,dungeon:true,solid:true},{type:'v21-rubble',x:1410,y:390,dungeon:true,solid:true},
    {type:'v21-seal',x:1300,y:300,dungeon:true,solid:false,room:'crypt'},
    {type:'v21-altar',x:1300,y:105,dungeon:true,solid:true},{type:'v21-brazier',x:1165,y:130,dungeon:true,solid:false},
    {type:'v21-brazier',x:1435,y:130,dungeon:true,solid:false}
  ];

  for (const prop of dungeonProps) scenery.push(prop);

  const dungeonMobs = [];

  function createDungeonMob(id, type, x, y, room, overrides={}) {
    const mob = makeMob(id, type, x, y);
    Object.assign(mob, overrides);
    mob.dungeon = true;
    mob.dungeonRoom = room;
    mob._dungeonAlive = !state.dead[id];
    mob.alive = false;
    mob.respawnAt = Infinity;
    mob.spawnX = x;
    mob.spawnY = y;
    dungeonMobs.push(mob);
    mobs.push(mob);
    return mob;
  }

  createDungeonMob(1001,'eye',500,790,'west',{name:'Olho do Claustro',maxHp:118,hp:118,xp:42,damage:12});
  createDungeonMob(1002,'eye',690,925,'west',{name:'Olho Penitente',maxHp:124,hp:124,xp:44,damage:13});
  createDungeonMob(1003,'bat',760,750,'west',{name:'Morcego do Campanário',maxHp:86,hp:86,xp:34,damage:10});
  createDungeonMob(1011,'imp',1835,780,'east',{name:'Diabrete Litúrgico',maxHp:108,hp:108,xp:40,damage:13});
  createDungeonMob(1012,'imp',2075,915,'east',{name:'Acólito Rubro',maxHp:116,hp:116,xp:42,damage:14});
  createDungeonMob(1013,'bat',2160,760,'east',{name:'Morcego Profanado',maxHp:92,hp:92,xp:36,damage:11});
  createDungeonMob(1021,'eye',1125,285,'crypt',{name:'Vigia da Cripta',maxHp:145,hp:145,xp:52,damage:15});
  createDungeonMob(1022,'imp',1240,355,'crypt',{name:'Guardião Ossuário',maxHp:152,hp:152,xp:55,damage:16});
  createDungeonMob(1023,'eye',1470,285,'crypt',{name:'Olho Funerário',maxHp:148,hp:148,xp:53,damage:15});
  createDungeonMob(1024,'bat',1385,375,'crypt',{name:'Asa Sepulcral',maxHp:112,hp:112,xp:46,damage:13});

  const boss = createDungeonMob(1099,'poring',1300,112,'sanctum',{
    name:'Arcebispo Profanado',maxHp:1350,hp:1350,xp:420,damage:24,speed:46,radius:32,aggro:470,boss:true,dungeonBoss:true
  });
  if (!cryptCleared() || state.bossDefeated) boss._dungeonAlive = false;

  function roomKills(room) { return dungeonMobs.filter(m => m.dungeonRoom === room && m.id !== boss.id && state.dead[m.id]).length; }
  function wingsCleared() { return roomKills('west') >= 3 && roomKills('east') >= 3; }
  function cryptCleared() { return roomKills('crypt') >= 4; }

  function refreshBossUnlock() {
    if (!cryptCleared() || state.bossDefeated || state.dead[boss.id]) return;
    if (!boss._dungeonAlive) {
      boss._dungeonAlive = true;boss.hp = boss.maxHp;boss.x = boss.spawnX;boss.y = boss.spawnY;
      if (cathedral.state.scene === 'interior') boss.alive = true;
      pulses.push({x:boss.x,y:boss.y,born:now,life:1600,color:'#b06cff',maxR:180});
      log('O selo final se rompeu. O Arcebispo Profanado despertou no Santuário.','good');toast('Santuário Profanado aberto');holyChime(false);
    }
  }

  function activateDungeonScene() {
    outsideAliveSnapshot.clear();
    for (const m of mobs) { if (m.dungeon) continue;outsideAliveSnapshot.set(m.id,m.alive);m.alive=false; }
    for (const m of dungeonMobs) { const lockedBoss=m===boss&&(!cryptCleared()||state.bossDefeated);m.alive=!!m._dungeonAlive&&!lockedBoss;if(!m.alive)m.respawnAt=Infinity; }
    refreshBossUnlock();selectedId=null;log('Dungeon v21 ativo: transeptos, Cripta e Santuário Profanado.','good');
  }

  function deactivateDungeonScene() {
    for (const m of dungeonMobs) { m._dungeonAlive=m.alive&&!state.dead[m.id];m.alive=false;m.respawnAt=Infinity; }
    for (const m of mobs) { if(m.dungeon)continue;if(outsideAliveSnapshot.has(m.id))m.alive=outsideAliveSnapshot.get(m.id); }
    outsideAliveSnapshot.clear();selectedId=null;const label=document.querySelector('#minimap-panel span');if(label)label.textContent='Vale da Catedral Caída';
  }

  function insideRect(x,y,r,rect){return x-r>=rect.x&&x+r<=rect.x+rect.w&&y-r>=rect.y&&y+r<=rect.y+rect.h;}
  function inAnyWalkable(x,y,r){const base=[ROOMS.nave,ROOMS.west,ROOMS.east,ROOMS.westCorridor,ROOMS.eastCorridor];if(wingsCleared())base.push(ROOMS.crypt,ROOMS.cryptCorridor);if(cryptCleared())base.push(ROOMS.sanctum,ROOMS.sanctumCorridor);return base.some(rect=>insideRect(x,y,r,rect));}

  function propBlocks(x,y,r){
    for(const p of dungeonProps){if(!p.solid)continue;if(p.type==='v21-column'||p.type==='v21-statue'||p.type==='v21-tomb'){const rr=p.type==='v21-column'?25:30;if((x-p.x)**2+(y-p.y)**2<(r+rr)**2)return true;}else{const w=p.w||(p.type==='v21-altar'?190:72),h=p.h||(p.type==='v21-altar'?54:48);if(circleHitsRect(x,y,r,{x:p.x-w/2,y:p.y-h/2,w,h}))return true;}}
    return false;
  }

  function dungeonMobCollision(entity,x,y,r,o={}){if(o.collideMobs===false)return false;for(const m of dungeonMobs){if(!m.alive||m===entity||m===o.ignoreMob)continue;const dx=x-m.x,dy=y-m.y;if(dx*dx+dy*dy<(r+m.radius-2)**2)return true;}return false;}

  blockedAt=function roweb21Blocked(entity,x,y,o={}){
    const dungeonMode=cathedral.state.scene==='interior'||dungeonAIActive;if(!dungeonMode)return previousBlockedAt(entity,x,y,o);
    const r=entity.radius||14;if(!inAnyWalkable(x,y,r))return true;if(propBlocks(x,y,r))return true;if(dungeonMobCollision(entity,x,y,r,o))return true;
    if(o.collidePlayer&&entity!==player){const dx=x-player.x,dy=y-player.y;if(dx*dx+dy*dy<(r+player.radius)**2)return true;}return false;
  };

  function drawRoom(rect,base,edge,tileA,tileB){ctx.fillStyle=edge;ctx.fillRect(rect.x-10,rect.y-10,rect.w+20,rect.h+20);ctx.fillStyle=base;ctx.fillRect(rect.x,rect.y,rect.w,rect.h);const size=42;for(let y=rect.y;y<rect.y+rect.h;y+=size){const row=Math.floor((y-rect.y)/size),off=row%2?21:0;for(let x=rect.x-off;x<rect.x+rect.w;x+=size){ctx.fillStyle=((x+y)/size)%3<1?tileA:tileB;ctx.fillRect(x+2,y+2,size-4,size-4);ctx.fillStyle='rgba(255,239,213,.045)';ctx.fillRect(x+5,y+5,size-10,2);}}}
  function drawCorridor(rect,color='#554e4a'){ctx.fillStyle='#252229';ctx.fillRect(rect.x-8,rect.y-8,rect.w+16,rect.h+16);ctx.fillStyle=color;ctx.fillRect(rect.x,rect.y,rect.w,rect.h);}
  function drawGate(y,open,accent){if(open)return;ctx.save();ctx.fillStyle='rgba(20,17,24,.88)';ctx.fillRect(1180,y-12,240,24);for(let x=1190;x<=1410;x+=22){ctx.fillStyle='#8b8179';ctx.fillRect(x,y-20,7,40);}ctx.fillStyle=accent;ctx.globalAlpha=.6+.2*Math.sin(now/260);ctx.fillRect(1284,y-7,32,14);ctx.restore();}

  function drawDungeonGround(){
    ctx.fillStyle='#0d0d13';ctx.fillRect(0,0,WORLD.width,WORLD.height);drawRoom(ROOMS.nave,'#474246','#29262d','#565055','#50494f');drawRoom(ROOMS.west,'#403d43','#231f28','#4e4950','#474249');drawRoom(ROOMS.east,'#453b42','#271f28','#55454e','#4d4048');drawCorridor(ROOMS.westCorridor,'#4c474c');drawCorridor(ROOMS.eastCorridor,'#4c454b');
    if(wingsCleared()){drawRoom(ROOMS.crypt,'#35333a','#1c1b22','#413e45','#39373e');drawCorridor(ROOMS.cryptCorridor,'#403d42');}else{ctx.fillStyle='rgba(43,36,48,.55)';ctx.fillRect(ROOMS.crypt.x,ROOMS.crypt.y,ROOMS.crypt.w,ROOMS.crypt.h);}
    if(cryptCleared()){drawRoom(ROOMS.sanctum,'#352b3e','#17131d','#493650','#402f48');drawCorridor(ROOMS.sanctumCorridor,'#43334a');}
    ctx.fillStyle='#5c3941';ctx.fillRect(1255,520,90,960);ctx.fillStyle='rgba(222,177,106,.18)';ctx.fillRect(1260,520,5,960);ctx.fillRect(1335,520,5,960);ctx.fillStyle='rgba(110,82,126,.18)';ctx.beginPath();ctx.arc(610,860,100,0,TAU);ctx.fill();ctx.fillStyle='rgba(147,56,82,.17)';ctx.beginPath();ctx.arc(1990,860,105,0,TAU);ctx.fill();
    if(wingsCleared()){ctx.save();ctx.strokeStyle='rgba(19,18,24,.55)';ctx.lineWidth=3;for(let i=0;i<14;i++){const x=1040+(i*83)%520,y=230+(i*47)%190;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+18,y+11);ctx.lineTo(x+7,y+28);ctx.stroke();}ctx.restore();}
    if(cryptCleared()){const g=ctx.createRadialGradient(1300,118,8,1300,118,170);g.addColorStop(0,'rgba(164,91,211,.28)');g.addColorStop(1,'rgba(164,91,211,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(1300,118,170,0,TAU);ctx.fill();}
    drawGate(455,wingsCleared(),'#d3b466');drawGate(218,cryptCleared(),'#b36be0');
  }

  function pixelRect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function drawInteriorProp(p){
    switch(p.type){
      case 'v21-column':ctx.save();ctx.globalAlpha=.25;ctx.fillStyle='#0b0a0e';ctx.beginPath();ctx.ellipse(p.x,p.y+26,34,10,0,0,TAU);ctx.fill();ctx.restore();pixelRect(p.x-22,p.y-42,44,10,'#8a827c');pixelRect(p.x-16,p.y-32,32,58,'#625c5c');pixelRect(p.x-11,p.y-29,8,52,'#807875');pixelRect(p.x-24,p.y+22,48,9,'#49444a');break;
      case 'v21-pew':pixelRect(p.x,p.y,p.w,p.h,'#352827');pixelRect(p.x+4,p.y+4,p.w-8,10,'#684943');pixelRect(p.x+8,p.y+p.h-4,10,13,'#211a1b');pixelRect(p.x+p.w-18,p.y+p.h-4,10,13,'#211a1b');break;
      case 'v21-tomb':ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#0b0a0d';ctx.beginPath();ctx.ellipse(p.x,p.y+18,33,8,0,0,TAU);ctx.fill();ctx.restore();pixelRect(p.x-25,p.y-17,50,35,'#5d5a5e');pixelRect(p.x-20,p.y-23,40,9,'#868085');pixelRect(p.x-4,p.y-12,8,18,'#39363c');pixelRect(p.x-12,p.y-5,24,6,'#39363c');break;
      case 'v21-statue':pixelRect(p.x-18,p.y+9,36,14,'#4a464b');pixelRect(p.x-11,p.y-27,22,38,'#737075');pixelRect(p.x-8,p.y-42,16,16,'#8c888d');pixelRect(p.x-22,p.y-20,12,8,'#666268');pixelRect(p.x+10,p.y-20,12,8,'#666268');break;
      case 'v21-rubble':pixelRect(p.x-30,p.y-4,22,17,'#504b50');pixelRect(p.x-6,p.y-13,28,26,'#6a6367');pixelRect(p.x+20,p.y+1,18,14,'#454149');pixelRect(p.x-14,p.y-20,17,11,'#80777b');break;
      case 'v21-brazier':{pixelRect(p.x-11,p.y,22,18,'#4b3a37');pixelRect(p.x-16,p.y+14,32,6,'#282127');const flame=Math.sin(now/90+p.x)*4;pixelRect(p.x-7,p.y-16-flame/3,14,18+flame/2,'#d86435');pixelRect(p.x-3,p.y-20-flame/2,7,16,'#ffd06a');ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(p.x,p.y-10,3,p.x,p.y-10,70);g.addColorStop(0,'rgba(255,166,72,.18)');g.addColorStop(1,'rgba(255,166,72,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y-10,70,0,TAU);ctx.fill();ctx.restore();break;}
      case 'v21-seal':{const cleared=roomKills(p.room)>=(p.room==='crypt'?4:3);ctx.save();ctx.strokeStyle=cleared?'rgba(226,198,115,.35)':'rgba(172,85,201,.75)';ctx.lineWidth=3;ctx.globalAlpha=.75+.2*Math.sin(now/300+p.x);ctx.beginPath();ctx.arc(p.x,p.y,34,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x-24,p.y);ctx.lineTo(p.x+24,p.y);ctx.moveTo(p.x,p.y-24);ctx.lineTo(p.x,p.y+24);ctx.stroke();ctx.restore();break;}
      case 'v21-altar':pixelRect(p.x-95,p.y-28,190,54,'#625b61');pixelRect(p.x-105,p.y-33,210,10,'#9a8e82');pixelRect(p.x-72,p.y-48,144,20,'#4b424a');pixelRect(p.x-7,p.y-105,14,58,'#b8a36e');pixelRect(p.x-30,p.y-84,60,14,'#b8a36e');ctx.save();ctx.globalCompositeOperation='lighter';{const g=ctx.createRadialGradient(p.x,p.y-75,4,p.x,p.y-75,100);g.addColorStop(0,'rgba(190,112,255,.20)');g.addColorStop(1,'rgba(190,112,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y-75,100,0,TAU);ctx.fill();}ctx.restore();break;
    }
  }

  function drawFallenBishop(m){
    const bob=Math.sin(now/180)*3,x=Math.round(m.x),base=Math.round(m.y+18+bob);ctx.save();ctx.globalAlpha=.26;ctx.fillStyle='#09070b';ctx.beginPath();ctx.ellipse(x,base+4,37,10,0,0,TAU);ctx.fill();ctx.restore();ctx.save();ctx.imageSmoothingEnabled=false;pixelRect(x-28,base-68,56,58,'#3b203d');pixelRect(x-23,base-63,46,52,'#6d315f');pixelRect(x-7,base-62,14,50,'#d1a66f');pixelRect(x-35,base-58,12,38,'#2a192f');pixelRect(x+23,base-58,12,38,'#2a192f');pixelRect(x-15,base-92,30,26,'#b9897a');pixelRect(x-20,base-106,40,16,'#594163');pixelRect(x-12,base-120,24,18,'#6d4b76');pixelRect(x-4,base-116,8,26,'#d2aa71');pixelRect(x-9,base-84,5,4,'#f04d88');pixelRect(x+5,base-84,5,4,'#f04d88');pixelRect(x+33,base-92,5,78,'#8d714d');pixelRect(x+27,base-98,17,5,'#b69359');pixelRect(x+33,base-107,5,18,'#b69359');ctx.strokeStyle='#c17edc';ctx.lineWidth=3;ctx.globalAlpha=.75+.2*Math.sin(now/220);ctx.beginPath();ctx.arc(x,base-112,29,Math.PI*.12,Math.PI*.9);ctx.stroke();ctx.beginPath();ctx.arc(x,base-112,29,Math.PI*1.08,Math.PI*1.68);ctx.stroke();ctx.restore();ctx.save();ctx.textAlign='center';ctx.font='700 11px sans-serif';ctx.fillStyle='#f5e9f8';ctx.fillText(m.name,x,base-128);const w=96,h=6,barX=x-w/2,barY=base-120;ctx.fillStyle='rgba(24,15,25,.85)';ctx.fillRect(barX,barY,w,h);ctx.fillStyle='#a93e7b';ctx.fillRect(barX,barY,w*Math.max(0,m.hp/m.maxHp),h);ctx.restore();
  }

  function currentZone(){const candidates=[['sanctum',ROOMS.sanctum],['crypt',ROOMS.crypt],['west',ROOMS.west],['east',ROOMS.east],['nave',ROOMS.nave]];for(const [key,r] of candidates)if(player.x>=r.x&&player.x<=r.x+r.w&&player.y>=r.y&&player.y<=r.y+r.h)return key;return 'passage';}
  function announceZone(){if(cathedral.state.scene!=='interior')return;const key=currentZone();if(key===lastZone)return;lastZone=key;const name=ROOMS[key]?.name||'Passagens da Catedral';if(!discovered.has(key)){discovered.add(key);saveDungeonState();log(`Área descoberta: ${name}.`,'good');toast(name);}}

  function hurtPlayer(amount,label='Dano profano'){if(player.invulnerableUntil>now)return;let dmg=Math.max(1,Math.round(amount));if(player.barrierUntil>now&&player.barrier>0){const absorbed=Math.min(player.barrier,dmg);player.barrier-=absorbed;dmg-=absorbed;}if(dmg>0){player.hp=Math.max(0,player.hp-dmg);player.flashUntil=now+180;floatingText(player.x,player.y-50,`-${dmg}`,'#ff8bb2');}if(player.hp<=0){player.hp=Math.max(1,Math.round(player.maxHp*.55));player.sp=Math.max(0,Math.round(player.maxSp*.4));player.x=cathedral.interior.spawn.x;player.y=cathedral.interior.spawn.y;player.moveTarget=null;selectedId=null;toast('Aster foi repelido para a entrada');log(`${label} derrubou Aster; a luz da entrada o protegeu.`,'info');}}

  function holyChime(victory=false){try{const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;const ac=window.__rowebDungeonAudio||(window.__rowebDungeonAudio=new AudioCtx());const t=ac.currentTime,notes=victory?[392,523,659,784]:[196,247,294];notes.forEach((hz,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(.0001,t+i*.11);g.gain.exponentialRampToValueAtTime(.07,t+i*.11+.025);g.gain.exponentialRampToValueAtTime(.0001,t+i*.11+.35);o.connect(g);g.connect(ac.destination);o.start(t+i*.11);o.stop(t+i*.11+.38);});}catch{}}

  function updateBossSpecial(){if(cathedral.state.scene!=='interior'||!boss.alive||state.bossDefeated)return;const distance=Math.hypot(player.x-boss.x,player.y-boss.y);if(distance>500||now<bossCastAt)return;bossCastAt=now+4300;pulses.push({x:boss.x,y:boss.y,born:now,life:1050,color:'#c45cff',maxR:245,damaged:false});boss.attackingUntil=now+620;log('Arcebispo Profanado conjura Liturgia do Vazio.','info');}
  function updatePulseDamage(){for(const p of pulses){if(p.damaged||p.color!=='#c45cff')continue;const age=now-p.born;if(age<520)continue;p.damaged=true;const radius=p.maxR*.72;if(Math.hypot(player.x-p.x,player.y-p.y)<=radius)hurtPlayer(18+player.level*.65,'Liturgia do Vazio');}}

  drawGround=function roweb21Ground(){if(cathedral.state.scene==='interior')drawDungeonGround();else previousDrawGround();};
  drawScenery=function roweb21Scenery(s){if(cathedral.state.scene==='interior'){if(s.dungeon)drawInteriorProp(s);return;}if(s.dungeon)return;previousDrawScenery(s);};
  drawMob=function roweb21Mob(m){if(cathedral.state.scene==='interior'){if(!m.dungeon||!m.alive)return;if(m.dungeonBoss){drawFallenBishop(m);return;}const oldScene=cathedral.state.scene;cathedral.state.scene='exterior';try{previousDrawMob(m);}finally{cathedral.state.scene=oldScene;}return;}if(m.dungeon)return;previousDrawMob(m);};

  updateMobs=function roweb21UpdateMobs(dt){const scene=cathedral.state.scene;if(scene!==lastScene){if(scene==='interior')activateDungeonScene();else deactivateDungeonScene();lastScene=scene;}if(scene!=='interior'){previousUpdateMobs(dt);return;}announceZone();refreshBossUnlock();updateBossSpecial();updatePulseDamage();dungeonAIActive=true;const oldScene=cathedral.state.scene;cathedral.state.scene='exterior';try{previousUpdateMobs(dt);}finally{cathedral.state.scene=oldScene;dungeonAIActive=false;}};

  killMob=function roweb21KillMob(m,source){if(!m?.dungeon){previousKillMob(m,source);return;}const outerKills=kills,outerObjective=objectiveComplete;kills=-100000;try{previousKillMob(m,source);}finally{kills=outerKills;objectiveComplete=outerObjective;}m._dungeonAlive=false;m.alive=false;m.respawnAt=Infinity;state.dead[m.id]=true;if(m===boss){state.bossDefeated=true;boss._dungeonAlive=false;toast('Arcebispo Profanado purificado!');log('A luz retorna ao Santuário Profanado. A Catedral foi purificada.','good');pulses.push({x:m.x,y:m.y,born:now,life:2200,color:'#ffe19a',maxR:290});holyChime(true);}else if(wingsCleared()&&!cryptCleared())log('Os selos dos transeptos enfraquecem a porta da Cripta.','good');saveDungeonState();refreshBossUnlock();};

  drawMinimap=function roweb21Minimap(){if(cathedral.state.scene!=='interior'){previousDrawMinimap();return;}mctx.clearRect(0,0,minimap.width,minimap.height);mctx.fillStyle='#121116';mctx.fillRect(0,0,minimap.width,minimap.height);const scaleX=minimap.width/WORLD.width,scaleY=minimap.height/WORLD.height;const drawR=(r,color)=>{mctx.fillStyle=color;mctx.fillRect(r.x*scaleX,r.y*scaleY,r.w*scaleX,r.h*scaleY);};drawR(ROOMS.nave,'#5a5559');drawR(ROOMS.west,'#4e4951');drawR(ROOMS.east,'#56464f');drawR(ROOMS.westCorridor,'#514c51');drawR(ROOMS.eastCorridor,'#51484f');if(wingsCleared()){drawR(ROOMS.crypt,'#444149');drawR(ROOMS.cryptCorridor,'#49464c');}if(cryptCleared()){drawR(ROOMS.sanctum,'#503954');drawR(ROOMS.sanctumCorridor,'#4d3d50');}for(const m of dungeonMobs){if(!m.alive)continue;mctx.fillStyle=m===boss?'#ff61ad':'#df5b78';mctx.beginPath();mctx.arc(m.x*scaleX,m.y*scaleY,m===boss?3.4:2.2,0,TAU);mctx.fill();}mctx.fillStyle='#fff2a3';mctx.beginPath();mctx.arc(player.x*scaleX,player.y*scaleY,3,0,TAU);mctx.fill();const label=document.querySelector('#minimap-panel span');if(label)label.textContent='Dungeon — Catedral Caída';};

  drawEffects=function roweb21Effects(){previousDrawEffects();if(cathedral.state.scene!=='interior')return;ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(1300,780,20,1300,780,620);g.addColorStop(0,'rgba(124,133,176,.035)');g.addColorStop(1,'rgba(31,22,40,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(1300,780,620,0,TAU);ctx.fill();ctx.restore();for(let i=pulses.length-1;i>=0;i--){const p=pulses[i],age=now-p.born;if(age>=p.life){pulses.splice(i,1);continue;}const t=age/p.life,r=18+(p.maxR-18)*t;ctx.save();ctx.globalAlpha=(1-t)*.65;ctx.strokeStyle=p.color;ctx.lineWidth=5*(1-t)+1;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.stroke();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-t)*.12;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,r*.75,0,TAU);ctx.fill();ctx.restore();}};

  updateUI=function roweb21UI(){previousUpdateUI();if(cathedral.state.scene!=='interior')return;const panel=document.querySelector('#quest-panel');if(!panel)return;const title=panel.querySelector('strong'),desc=panel.querySelector('p'),progress=document.querySelector('#quest-progress');if(title)title.textContent=state.bossDefeated?'Catedral Purificada':'Catedral Profanada';if(state.bossDefeated){if(desc)desc.textContent='O Arcebispo Profanado foi derrotado.';if(progress)progress.textContent='Concluída — a luz voltou ao Santuário.';}else if(!wingsCleared()){if(desc)desc.textContent='Purifique os dois transeptos para romper o selo da Cripta.';if(progress)progress.textContent=`Poente: ${roomKills('west')} / 3  •  Profanado: ${roomKills('east')} / 3`;}else if(!cryptCleared()){if(desc)desc.textContent='A Cripta está aberta. Purifique seus guardiões.';if(progress)progress.textContent=`Guardiões da Cripta: ${roomKills('crypt')} / 4`;}else{if(desc)desc.textContent='O Santuário Profanado está aberto. Derrote o Arcebispo.';if(progress)progress.textContent=`Arcebispo Profanado: ${boss.alive?Math.max(0,Math.ceil(boss.hp)):'aguardando'} HP`;}};

  if(cathedral.state.scene==='interior')activateDungeonScene();
  window.RowebCathedralDungeon={version:'21.0',state,rooms:ROOMS,mobs:dungeonMobs,boss,progress:()=>({west:roomKills('west'),east:roomKills('east'),crypt:roomKills('crypt'),wingsCleared:wingsCleared(),cryptCleared:cryptCleared(),bossDefeated:state.bossDefeated})};
  log('Dungeon v21 carregado: transeptos, Cripta, Santuário Profanado e boss interno.','good');
})();
