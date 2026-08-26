// Roweb v22 — Cathedral boss phases, dungeon checkpoints, exclusive reward and interior atmosphere.
(() => {
  const dungeon = window.RowebCathedralDungeon;
  const cathedral = window.RowebCathedral;
  const R = window.Roweb;
  if (!dungeon || !cathedral || !R) {
    console.error('Roweb v22 requires Cathedral v20, Dungeon v21 and Roweb runtime.');
    return;
  }

  const previousUpdateMobs = updateMobs;
  const previousDrawEffects = drawEffects;
  const previousKillMob = killMob;
  const previousUpdateUI = updateUI;
  const boss = dungeon.boss;
  const hazards = [];
  const checkpointDefs = {
    entrance: { x:1300, y:1442, name:'Entrada da Catedral' },
    crypt: { x:1300, y:500, name:'Porta da Cripta' },
    sanctum: { x:1300, y:265, name:'Santuário Profanado' }
  };
  const state = loadState();
  let phase = 1;
  let nextSealCast = 0;
  let nextCrossCast = 0;
  let lastBossAlive = false;

  function loadState(){
    try{
      const raw=JSON.parse(localStorage.getItem('roweb22-cathedral')||'{}');
      return { checkpoint:checkpointDefs[raw.checkpoint]?raw.checkpoint:'entrance', rewardClaimed:!!raw.rewardClaimed };
    }catch{return {checkpoint:'entrance',rewardClaimed:false};}
  }
  function saveState(){localStorage.setItem('roweb22-cathedral',JSON.stringify(state));}
  function inside(){return cathedral.state.scene==='interior';}

  function applyCheckpoint(){const cp=checkpointDefs[state.checkpoint]||checkpointDefs.entrance;cathedral.interior.spawn.x=cp.x;cathedral.interior.spawn.y=cp.y;}
  applyCheckpoint();

  function setCheckpoint(key){
    if(!checkpointDefs[key]||state.checkpoint===key)return;
    state.checkpoint=key;applyCheckpoint();saveState();log(`Ponto de retorno consagrado: ${checkpointDefs[key].name}.`,'good');toast(`Checkpoint: ${checkpointDefs[key].name}`);ambientChime([330,440,554]);
  }

  function currentZone(){const r=dungeon.rooms;if(player.x>=r.sanctum.x&&player.x<=r.sanctum.x+r.sanctum.w&&player.y>=r.sanctum.y&&player.y<=r.sanctum.y+r.sanctum.h)return 'sanctum';if(player.x>=r.crypt.x&&player.x<=r.crypt.x+r.crypt.w&&player.y>=r.crypt.y&&player.y<=r.crypt.y+r.crypt.h)return 'crypt';return 'other';}

  function updateCheckpoint(){if(!inside())return;const zone=currentZone(),progress=dungeon.progress();if(zone==='crypt'&&progress.wingsCleared&&state.checkpoint==='entrance')setCheckpoint('crypt');if(zone==='sanctum'&&progress.cryptCleared&&state.checkpoint!=='sanctum')setCheckpoint('sanctum');}

  function phaseFromHp(){if(!boss.maxHp)return 1;const ratio=boss.hp/boss.maxHp;if(ratio<=.35)return 3;if(ratio<=.70)return 2;return 1;}
  function announcePhase(next){if(next===phase)return;phase=next;if(phase===2){log('Arcebispo Profanado — Fase II: Selos da Penitência.','good');toast('Fase II — Selos da Penitência');ambientChime([196,233,294]);}else if(phase===3){log('Arcebispo Profanado — Fase III: Cruz do Vazio.','good');toast('Fase III — Cruz do Vazio');ambientChime([165,196,247,294]);}}

  function makeSealWave(){const angle=(now/700)%TAU;const points=[[player.x,player.y],[player.x+Math.cos(angle)*105,player.y+Math.sin(angle)*105],[player.x+Math.cos(angle+Math.PI)*105,player.y+Math.sin(angle+Math.PI)*105]];for(const [x,y] of points)hazards.push({kind:'seal',x,y,born:now,arm:720,life:1180,damage:16+player.level*.45,hit:false});boss.attackingUntil=now+620;log('Selos da Penitência surgem sob Aster.','info');}
  function makeCrossWave(){hazards.push({kind:'cross',x:player.x,y:player.y,born:now,arm:820,life:1350,damage:22+player.level*.55,hit:false});boss.attackingUntil=now+720;log('A Cruz do Vazio marca o piso do Santuário.','info');}

  function hurt(amount,label){
    if(player.invulnerableUntil>now)return;let dmg=Math.max(1,Math.round(amount));if(player.barrierUntil>now&&player.barrier>0){const absorbed=Math.min(player.barrier,dmg);player.barrier-=absorbed;dmg-=absorbed;}if(dmg<=0)return;player.hp=Math.max(0,player.hp-dmg);player.flashUntil=now+190;floatingText(player.x,player.y-52,`-${dmg}`,'#ff76a8');if(player.hp<=0){const cp=checkpointDefs[state.checkpoint]||checkpointDefs.entrance;player.hp=Math.max(1,Math.round(player.maxHp*.58));player.sp=Math.max(0,Math.round(player.maxSp*.42));player.x=cp.x;player.y=cp.y;player.moveTarget=null;selectedId=null;toast(`Retorno: ${cp.name}`);log(`${label} derrubou Aster. O último ponto consagrado o trouxe de volta.`,'info');}}

  function updateHazards(){for(const h of hazards){if(h.hit||now-h.born<h.arm)continue;h.hit=true;if(h.kind==='seal'){if(Math.hypot(player.x-h.x,player.y-h.y)<=78)hurt(h.damage,'Selo da Penitência');}else if(h.kind==='cross'){if(Math.abs(player.x-h.x)<=32||Math.abs(player.y-h.y)<=32)hurt(h.damage,'Cruz do Vazio');}}for(let i=hazards.length-1;i>=0;i--)if(now-hazards[i].born>=hazards[i].life)hazards.splice(i,1);}

  function updateBossPhases(){if(!inside()||!boss.alive||dungeon.state.bossDefeated)return;announcePhase(phaseFromHp());const distance=Math.hypot(player.x-boss.x,player.y-boss.y);if(distance>560)return;boss.speed=phase===3?66:phase===2?56:46;boss.damage=phase===3?30:phase===2?27:24;if(phase>=2&&now>=nextSealCast){nextSealCast=now+(phase===3?4300:5600);makeSealWave();}if(phase===3&&now>=nextCrossCast){nextCrossCast=now+6100;makeCrossWave();}}

  function ambientChime(notes){try{const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;const ac=window.__rowebDungeonAudio||(window.__rowebDungeonAudio=new AudioCtx());const t=ac.currentTime;notes.forEach((hz,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.type='triangle';o.frequency.value=hz;g.gain.setValueAtTime(.0001,t+i*.09);g.gain.exponentialRampToValueAtTime(.045,t+i*.09+.02);g.gain.exponentialRampToValueAtTime(.0001,t+i*.09+.42);o.connect(g);g.connect(ac.destination);o.start(t+i*.09);o.stop(t+i*.09+.45);});}catch{}}

  function drawDust(){ctx.save();ctx.fillStyle='rgba(232,221,199,.20)';for(let i=0;i<26;i++){const x=900+((i*137+(now*.012)*(1+(i%3)*.2))%800),y=430+((i*83+(now*.007)*(1+(i%4)*.15))%1040);const r=i%5===0?2:1;ctx.fillRect(Math.round(x),Math.round(y),r,r);}ctx.restore();}
  function drawStainedGlassLight(){const pulse=.045+.018*Math.sin(now/600);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=pulse;const beams=[[[965,500],[1110,500],[1270,1320],[1115,1320],'#8b6bc3'],[[1490,500],[1635,500],[1480,1320],[1325,1320],'#c26f86']];for(const [a,b,c,d,color] of beams){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.lineTo(...d);ctx.closePath();ctx.fill();}ctx.restore();}
  function drawHazards(){for(const h of hazards){const age=now-h.born,armed=age>=h.arm;if(h.kind==='seal'){ctx.save();ctx.globalAlpha=armed?.75:.35+.25*Math.sin(now/90);ctx.strokeStyle=armed?'#ff6aa6':'#b56bdb';ctx.lineWidth=armed?5:3;ctx.beginPath();ctx.arc(h.x,h.y,54,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(h.x-38,h.y);ctx.lineTo(h.x+38,h.y);ctx.moveTo(h.x,h.y-38);ctx.lineTo(h.x,h.y+38);ctx.stroke();ctx.restore();}else{ctx.save();ctx.globalAlpha=armed?.72:.28+.22*Math.sin(now/80);ctx.fillStyle=armed?'rgba(255,71,142,.34)':'rgba(164,86,205,.18)';ctx.fillRect(h.x-28,dungeon.rooms.sanctum.y,56,dungeon.rooms.sanctum.h);ctx.fillRect(dungeon.rooms.sanctum.x,h.y-28,dungeon.rooms.sanctum.w,56);ctx.strokeStyle=armed?'#ff6f9d':'#a96fd5';ctx.lineWidth=3;ctx.strokeRect(h.x-28,dungeon.rooms.sanctum.y,56,dungeon.rooms.sanctum.h);ctx.strokeRect(dungeon.rooms.sanctum.x,h.y-28,dungeon.rooms.sanctum.w,56);ctx.restore();}}}
  function drawBossAura(){if(!boss.alive||!inside())return;const ratio=boss.hp/boss.maxHp,r=phase===3?95:phase===2?75:58;ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(boss.x,boss.y-32,8,boss.x,boss.y-32,r);g.addColorStop(0,phase===3?'rgba(255,72,145,.18)':'rgba(177,93,218,.14)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(boss.x,boss.y-32,r,0,TAU);ctx.fill();ctx.restore();if(ratio<.35){ctx.save();ctx.strokeStyle='rgba(255,107,157,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(boss.x,boss.y-20,50+Math.sin(now/120)*7,0,TAU);ctx.stroke();ctx.restore();}}

  function installReward(){if(!R.rpg)return;if(!R.rpg.catalog.fallen_mitre)R.rpg.catalog.fallen_mitre={name:'Mitra do Arcebispo Caído',icon:'♛',rarity:'boss',slot:'accessory',description:'Purificada após a queda do Arcebispo Profanado. Vibra com poder sagrado.',stats:{holy:15,sp:36,hp:34}};}
  function grantReward(){if(state.rewardClaimed||!R.rpg)return;installReward();R.rpg.addItem('fallen_mitre',1);R.rpg.state.zeny=(Number(R.rpg.state.zeny)||0)+500;R.save.flush();state.rewardClaimed=true;saveState();log('Recompensa do dungeon: Mitra do Arcebispo Caído + 500 Zeny.','good');toast('Mitra do Arcebispo Caído obtida!');ambientChime([392,523,659,784]);}
  installReward();

  updateMobs=function roweb22UpdateMobs(dt){previousUpdateMobs(dt);if(!inside())return;updateCheckpoint();updateBossPhases();updateHazards();if(boss.alive&&!lastBossAlive){phase=phaseFromHp();nextSealCast=now+2600;nextCrossCast=now+4200;}lastBossAlive=boss.alive;};
  drawEffects=function roweb22Effects(){previousDrawEffects();if(!inside())return;drawStainedGlassLight();drawDust();drawBossAura();drawHazards();};
  killMob=function roweb22KillMob(m,source){const wasBoss=m===boss&&m.alive;previousKillMob(m,source);if(wasBoss&&!m.alive)grantReward();};
  updateUI=function roweb22UI(){previousUpdateUI();if(!inside())return;const progress=document.querySelector('#quest-progress');if(progress&&boss.alive&&dungeon.progress().cryptCleared)progress.textContent=`Arcebispo Profanado — Fase ${phase} • ${Math.max(0,Math.ceil(boss.hp))} HP`;if(progress&&dungeon.state.bossDefeated&&state.rewardClaimed)progress.textContent='Concluída — Mitra do Arcebispo Caído obtida.';};

  if(dungeon.state.bossDefeated&&!state.rewardClaimed)grantReward();
  window.RowebCathedralBoss={version:'22.0',state,get phase(){return phase;},hazards,checkpoint:()=>state.checkpoint,reward:()=>state.rewardClaimed};
  log('Catedral v22 carregada: boss em 3 fases, checkpoints, recompensa e atmosfera interna.','good');
})();
