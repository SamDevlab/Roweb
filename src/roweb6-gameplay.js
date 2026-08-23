// Roweb v6 gameplay layer: attributes, procedural skill audio and a cleaner RO-like Sanctuary.
(() => {
  const saved = JSON.parse(localStorage.getItem('roweb-save') || '{}');
  const attributes = { str:1, agi:1, vit:3, int:5, dex:4, luk:1, points:0, ...(saved.attributes || {}) };
  const sanctuaries=[];
  let audioCtx=null;

  // Register before the first animation frame so the base HUD never sees an unknown skill.
  skills.sanctuary={name:'Santuário',cost:34,cooldown:10000,range:0,last:-99999};

  const holyPower=()=>attributes.int*1.8+attributes.dex*.6+player.level*1.2;
  const physicalPower=()=>attributes.str*1.6+attributes.agi*.5+player.level;

  recalcStats=function(heal=false){
    const oldHp=player.maxHp,oldSp=player.maxSp,rank=player.job==='Sumo Sacerdote'?2:player.job==='Sacerdote'?1:0;
    player.maxHp=Math.round(90+player.level*8+attributes.vit*14+rank*35);
    player.maxSp=Math.round(60+player.level*6+attributes.int*12+rank*24);
    player.speed=218+attributes.agi*1.7;
    if(heal){player.hp=player.maxHp;player.sp=player.maxSp;}
    else {player.hp=clamp(player.hp+(player.maxHp-oldHp),1,player.maxHp);player.sp=clamp(player.sp+(player.maxSp-oldSp),0,player.maxSp);}
  };
  recalcStats(false);

  const nativeStorageSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(key==='roweb-save'){
      try{const next=JSON.parse(value);next.attributes={...attributes};value=JSON.stringify(next);}catch{}
    }
    return nativeStorageSetItem.call(this,key,value);
  };

  persist=function(){
    localStorage.setItem('roweb-save',JSON.stringify({name:player.name,x:Math.round(player.x),y:Math.round(player.y),level:player.level,xp:player.xp,hp:Math.round(player.hp),sp:Math.round(player.sp),attributes}));
  };

  const baseGainXp=gainXp;
  gainXp=function(amount){
    const before=player.level;baseGainXp(amount);const levels=player.level-before;
    if(levels>0){attributes.points+=levels*3;recalcStats(true);persist();updateAttributeUI();toast(`Nível ${player.level}! +${levels*3} pontos de atributo`);}
  };

  const baseDamageMob=damageMob;
  damageMob=function(mob,amount,color='#fff1a8',source='Dano sagrado'){
    let mult=1;if(source==='Ataque Normal')mult=.72+physicalPower()/34;else if(source!=='Santuário')mult=.72+holyPower()/38;
    const crit=Math.random()<Math.min(.22,attributes.luk*.004)?1.5:1;
    baseDamageMob(mob,amount*mult*crit,color,source);
    if(crit>1&&mob?.alive)floatingText(mob.x,mob.y-mob.radius-38,'CRIT!','#fff0a8');
  };

  function audio(){
    if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;
  }
  function tone(freq,duration=.12,type='sine',gain=.025,delay=0){
    try{const a=audio(),osc=a.createOscillator(),amp=a.createGain(),t=a.currentTime+delay;osc.type=type;osc.frequency.setValueAtTime(freq,t);amp.gain.setValueAtTime(.0001,t);amp.gain.exponentialRampToValueAtTime(gain,t+.012);amp.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(amp);amp.connect(a.destination);osc.start(t);osc.stop(t+duration+.03);}catch{}
  }
  function noise(duration=.055,gain=.012){
    try{const a=audio(),len=Math.floor(a.sampleRate*duration),buf=a.createBuffer(1,len,a.sampleRate),data=buf.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);const src=a.createBufferSource(),amp=a.createGain();src.buffer=buf;amp.gain.value=gain;src.connect(amp);amp.connect(a.destination);src.start();}catch{}
  }
  function playSkillSound(name){
    if(name==='normal'){noise();tone(180,.05,'square',.01);}
    if(name==='heal'){tone(720,.12,'sine',.026);tone(940,.16,'triangle',.022,.05);tone(1180,.18,'sine',.012,.11);}
    if(name==='magnificat'){tone(420,.22,'triangle',.025);tone(620,.26,'sine',.020,.07);tone(820,.31,'sine',.016,.15);}
    if(name==='blessing'){tone(860,.10,'triangle',.022);tone(1080,.16,'sine',.018,.05);}
    if(name==='kyrie'){tone(280,.12,'square',.012);tone(540,.22,'triangle',.023,.04);tone(760,.28,'sine',.013,.11);}
    if(name==='sanctuary'){tone(493,.28,'triangle',.018);tone(659,.34,'sine',.018,.07);tone(784,.42,'sine',.014,.15);tone(987,.48,'sine',.009,.24);}
    if(name==='sanctuaryTick'){tone(740,.075,'sine',.010);tone(880,.08,'triangle',.006,.025);}
    if(name==='point')tone(980,.06,'triangle',.014);
  }

  const baseCast=cast;
  cast=function(name){
    if(name==='sanctuary'){
      const sk=skills.sanctuary;if(!spend(sk))return;
      player.castingUntil=now+650;
      sanctuaries.push({x:Math.round(player.x),y:Math.round(player.y),born:now,life:7600,radius:80,nextTick:now+320,tickEvery:680,seed:Math.random()*10});
      addFx('sanctuaryCastV6',{x:player.x,y:player.y,life:850});playSkillSound('sanctuary');return;
    }
    const before=skills[name]?.last;baseCast(name);
    if(skills[name]?.last!==before&&['normal','heal','magnificat','blessing','kyrie'].includes(name))playSkillSound(name);
  };

  function updateSanctuaries(){
    for(let i=sanctuaries.length-1;i>=0;i--){
      const s=sanctuaries[i];if(now-s.born>=s.life){sanctuaries.splice(i,1);continue;}if(now<s.nextTick)continue;s.nextTick+=s.tickEvery;
      let affected=false;
      if(Math.hypot(player.x-s.x,player.y-s.y)<=s.radius){const heal=Math.round(8+attributes.int*.9+player.level*.7);player.hp=clamp(player.hp+heal,0,player.maxHp);floatingText(player.x,player.y-46,`+${heal}`,'#91ef9d');affected=true;}
      for(const m of mobs){if(!m.alive||Math.hypot(m.x-s.x,m.y-s.y)>s.radius)continue;damageMob(m,(10+holyPower()*.95)*classScale(),'#e9ffc7','Santuário');affected=true;}
      addFx('sanctuaryPulseV6',{x:s.x,y:s.y,radius:s.radius,life:380});if(affected)playSkillSound('sanctuaryTick');
    }
  }

  function drawSanctuaryFloor(){
    if(!sanctuaries.length)return;
    const cell=26,total=cell*5;
    for(const s of sanctuaries){
      const fade=Math.min(1,(now-s.born)/420)*Math.min(1,(s.life-(now-s.born))/650);
      ctx.save();ctx.globalAlpha=.24*fade;
      const glow=ctx.createRadialGradient(s.x,s.y,8,s.x,s.y,92);glow.addColorStop(0,'rgba(235,255,218,.48)');glow.addColorStop(.65,'rgba(181,246,185,.18)');glow.addColorStop(1,'rgba(181,246,185,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(s.x,s.y,92,0,TAU);ctx.fill();
      for(let gy=-2;gy<=2;gy++)for(let gx=-2;gx<=2;gx++){
        const phase=(gx*7+gy*11+s.seed)+now/520,alpha=.11+.06*Math.sin(phase);
        ctx.globalAlpha=alpha*fade;ctx.fillStyle='#e8f8d9';ctx.fillRect(Math.round(s.x+gx*cell-cell/2+1),Math.round(s.y+gy*cell-cell/2+1),cell-2,cell-2);
        ctx.globalAlpha=.25*fade;ctx.strokeStyle='#c8edc0';ctx.lineWidth=1;ctx.strokeRect(Math.round(s.x+gx*cell-cell/2+.5),Math.round(s.y+gy*cell-cell/2+.5),cell-1,cell-1);
      }
      ctx.globalAlpha=.34*fade;ctx.strokeStyle='#f5f4d2';ctx.lineWidth=1;ctx.strokeRect(s.x-total/2,s.y-total/2,total,total);
      ctx.restore();
    }
  }

  function drawSanctuaryLight(){
    for(const s of sanctuaries){
      const fade=Math.min(1,(now-s.born)/420)*Math.min(1,(s.life-(now-s.born))/650),pulse=.5+.5*Math.sin(now/180+s.seed);
      ctx.save();
      for(let i=0;i<5;i++){
        const gx=((i*2+Math.floor(now/900))%5)-2,x=s.x+gx*26,top=s.y-100-(i%2)*10;
        const grad=ctx.createLinearGradient(x,top,x,s.y+38);grad.addColorStop(0,'rgba(247,255,226,0)');grad.addColorStop(.35,`rgba(235,255,221,${.05*fade})`);grad.addColorStop(1,'rgba(211,250,206,0)');ctx.fillStyle=grad;ctx.fillRect(x-5,top,10,s.y+38-top);
      }
      ctx.globalAlpha=(.35+.18*pulse)*fade;ctx.strokeStyle='#edf8d5';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(s.x,s.y-25);ctx.lineTo(s.x,s.y+22);ctx.moveTo(s.x-14,s.y-8);ctx.lineTo(s.x+14,s.y-8);ctx.stroke();
      for(let i=0;i<4;i++){const a=i/4*TAU+now/1000,rr=45;ctx.globalAlpha=.22*fade;ctx.strokeRect(Math.round(s.x+Math.cos(a)*rr-3),Math.round(s.y+Math.sin(a)*rr*.55-3),6,6);}
      ctx.restore();
    }
  }

  const baseUpdateEffects=updateEffects;
  updateEffects=function(dt){updateSanctuaries();baseUpdateEffects(dt);};

  drawWorld=function(){
    ctx.clearRect(0,0,innerWidth,innerHeight);ctx.save();ctx.translate(-camera.x,-camera.y);drawGround();drawSanctuaryFloor();
    const depth=scenery.map(s=>({y:s.y+(s.type==='tree'?35:0),kind:'scene',v:s}))
      .concat(mobs.filter(m=>m.alive).map(m=>({y:m.y,kind:'mob',v:m}))).concat([{y:player.y,kind:'player',v:player}]);
    depth.sort((a,b)=>a.y-b.y);for(const o of depth){if(o.kind==='scene')drawScenery(o.v);else if(o.kind==='mob')drawMob(o.v);else drawPlayer(o.v);}drawEffects();drawSanctuaryLight();ctx.restore();
  };

  const baseDrawFxItem=drawFxItem;
  drawFxItem=function(e){
    if(e.type==='sanctuaryCastV6'||e.type==='sanctuaryPulseV6'){
      const t=clamp((now-e.born)/e.life,0,1),a=1-t;ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#e9f7cf';ctx.lineWidth=2;
      if(e.type==='sanctuaryCastV6'){
        for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(e.x,e.y+4,lerp(14,66+i*8,t),lerp(7,30+i*4,t),0,0,TAU);ctx.stroke();}
      } else {ctx.globalAlpha=.46*a;ctx.beginPath();ctx.arc(e.x,e.y,lerp(22,e.radius,t),0,TAU);ctx.stroke();}
      ctx.restore();return;
    }
    baseDrawFxItem(e);
  };

  function updateAttributeUI(){
    const points=document.querySelector('#attr-points');if(points)points.textContent=`Pontos: ${attributes.points}`;
    for(const stat of['str','agi','vit','int','dex','luk']){const value=document.querySelector(`[data-attr-value="${stat}"]`);if(value)value.textContent=attributes[stat];const plus=document.querySelector(`[data-attr-plus="${stat}"]`);if(plus)plus.disabled=attributes.points<=0;}
  }
  function raiseAttribute(stat){if(attributes.points<=0||!Object.hasOwn(attributes,stat)||stat==='points')return;attributes[stat]++;attributes.points--;recalcStats(false);persist();updateAttributeUI();playSkillSound('point');}
  document.querySelectorAll('[data-attr-plus]').forEach(btn=>btn.addEventListener('click',()=>raiseAttribute(btn.dataset.attrPlus)));
  setInterval(updateAttributeUI,250);updateAttributeUI();

  addEventListener('keydown',e=>{if(e.key==='6'){try{audio();}catch{}cast('sanctuary');}});
  document.addEventListener('pointerdown',()=>{try{audio();}catch{}},{once:true});

  log('Gameplay v6 ativo: Santuário integrado ao chão, sons e atributos preservados.','good');
})();
