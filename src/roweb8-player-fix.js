// Roweb v9 concept-sprite renderer + v10 world systems.
// The player uses original sprites extracted from the approved Aster concept sheet.
// V10 centralizes mob density, spatial separation, weather, day/night and lighting.
(() => {
  const previousDrawPlayer=drawPlayer;
  const images=new Map();
  let loaded=false;

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
  }

  async function prepare(){
    try{
      await Promise.all([
        loadScript('/roweb9-novice-data.js'),
        loadScript('/roweb9-priest-data.js'),
        loadScript('/roweb9-high-data.js')
      ]);
      for(const [key,src] of Object.entries(window.ROWEB9_SPRITE_DATA||{})){
        const im=new Image();im.decoding='async';im.src=src;images.set(key,im);
      }
      await Promise.all([...images.values()].map(im=>im.decode?.().catch(()=>{})||Promise.resolve()));
      loaded=true;
      log('Sprite v10 ativo: Aster refinado a partir do concept sheet aprovado.','good');
    }catch(err){
      console.error('Falha ao carregar sprites do Aster',err);
      log('Sprites do Aster não carregaram; usando fallback anterior.');
    }
  }
  prepare();

  const classKey=job=>job==='Sumo Sacerdote'?'high':job==='Sacerdote'?'priest':'novice';
  function poseFor(p){
    const k=classKey(p.job),casting=p.castingUntil>now;
    if(casting)return{key:`${k}_cast`,flip:p.dir==='left'};
    if(p.dir==='up')return{key:`${k}_back`,flip:false};
    if(p.dir==='left')return{key:`${k}_side`,flip:false};
    if(p.dir==='right')return{key:`${k}_side`,flip:true};
    return{key:`${k}_front`,flip:false};
  }
  const spriteHeight=job=>job==='Sumo Sacerdote'?96:job==='Sacerdote'?91:87;

  function renderConcept(p){
    if(!loaded)return false;
    const pose=poseFor(p),im=images.get(pose.key);
    if(!im?.naturalWidth)return false;
    const step=p.moving?(Math.floor(now/145)%2?1:-1):0;
    const casting=p.castingUntil>now;
    const bob=p.moving?Math.abs(Math.sin(now/145))*1.8:Math.sin(now/480)*.45;
    const h=spriteHeight(p.job)+(casting?3:0),w=im.naturalWidth*(h/im.naturalHeight);
    const sway=p.moving?step*.012:0,xShift=p.moving?step*.7:0;
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(p.flashUntil>now){ctx.globalAlpha=.78;ctx.filter='brightness(1.7) saturate(.82)';}
    ctx.translate(Math.round(p.x+xShift),Math.round(p.y+p.radius+12-bob));ctx.rotate(sway);
    if(pose.flip)ctx.scale(-1,1);
    ctx.drawImage(im,Math.round(-w/2),Math.round(-h),Math.round(w),Math.round(h));
    ctx.restore();
    return true;
  }

  drawPlayer=function(p){
    ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#242126';ctx.beginPath();ctx.ellipse(p.x,p.y+11,p.job==='Sumo Sacerdote'?20:18,6,0,0,TAU);ctx.fill();ctx.restore();
    if(p===player)drawKyrieBarrier();
    if(!renderConcept(p)){previousDrawPlayer(p);return;}
    ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='700 10px sans-serif';ctx.fillText(p.name||'Aventureiro',p.x,p.y+35);
    ctx.fillStyle='#ddd5d5';ctx.font='9px sans-serif';ctx.fillText(`${p.job||'Noviço'} • Nv. ${p.level||1}`,p.x,p.y+47);
  };

  // Install after the remaining deferred layers (especially v6 gameplay) finish loading.
  setTimeout(() => {
    if(window.RowebSystems?.version>=10)return;

    const CONFIG={
      cycleMs:10*60*1000,
      extraMobs:20,
      rainStartMs:45*1000,
      separationCell:86,
      rainDrops:Math.min(260,Math.max(120,Math.round(innerWidth*innerHeight/7000)))
    };
    const state={
      version:10,raining:true,rainIntensity:0,weatherUntil:performance.now()+CONFIG.rainStartMs,
      nextLightning:performance.now()+15000+Math.random()*11000,lightningUntil:0,lastPhase:'',lastTick:performance.now()
    };
    window.RowebSystems={version:10,config:CONFIG,state};

    // More monsters, but keep the pilgrimage road and cathedral entrance readable.
    const extraSpawns=[
      ['imp',260,470],['bat',390,560],['eye',570,420],['imp',790,330],['bat',960,610],
      ['eye',1640,650],['imp',1830,320],['bat',2070,500],['eye',2360,570],['imp',2220,760],
      ['bat',260,1010],['eye',470,1190],['imp',760,1450],['bat',930,1370],['eye',1060,1110],
      ['imp',1570,1080],['bat',1740,1430],['eye',1940,1250],['imp',2180,1480],['bat',2390,1120]
    ];
    let nextId=mobs.reduce((n,m)=>Math.max(n,m.id||0),0)+1,added=0;
    for(const [type,x,y] of extraSpawns){
      if(added>=CONFIG.extraMobs)break;
      if(mobs.some(m=>Math.hypot(m.spawnX-x,m.spawnY-y)<70))continue;
      const mob=makeMob(nextId++,type,x,y),spot=findFreeSpot(x,y,mob.radius,mob);
      mob.x=mob.spawnX=spot.x;mob.y=mob.spawnY=spot.y;
      const variation=.94+Math.random()*.12;mob.maxHp=Math.round(mob.maxHp*variation);mob.hp=mob.maxHp;mob.speed*=.94+Math.random()*.12;
      mobs.push(mob);added++;
    }

    // Spatial grid replaces the quadratic all-vs-all separation pass.
    resolveMobSeparation=function(){
      const alive=mobs.filter(m=>m.alive),cell=CONFIG.separationCell,grid=new Map();
      const key=(x,y)=>`${Math.floor(x/cell)},${Math.floor(y/cell)}`;
      for(const m of alive){const k=key(m.x,m.y);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(m);}
      for(const a of alive){
        const gx=Math.floor(a.x/cell),gy=Math.floor(a.y/cell);
        for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)for(const b of grid.get(`${gx+ox},${gy+oy}`)||[]){
          if(b.id<=a.id)continue;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.001,min=a.radius+b.radius-1;if(d>=min)continue;
          const push=(min-d)*.5;dx/=d;dy/=d;
          const ax=a.x-dx*push,ay=a.y-dy*push,bx=b.x+dx*push,by=b.y+dy*push;
          if(!hitsScenery(ax,ay,a.radius)){a.x=ax;a.y=ay;}if(!hitsScenery(bx,by,b.radius)){b.x=bx;b.y=by;}
        }
      }
    };

    const phaseNow=()=>((Date.now()%CONFIG.cycleMs)/CONFIG.cycleMs+1)%1;
    const sunAt=phase=>Math.max(0,Math.sin((phase-.25)*TAU));
    const phaseName=phase=>phase<.20?'Noite':phase<.32?'Amanhecer':phase<.70?'Dia':phase<.82?'Entardecer':'Noite';
    const phaseDistance=(a,b)=>Math.min(Math.abs(a-b),1-Math.abs(a-b));
    const twilightAt=phase=>Math.max(0,1-phaseDistance(phase,.25)/.09,1-phaseDistance(phase,.75)/.09);
    const sunVector=phase=>{const a=phase*TAU-Math.PI*.65;return{x:Math.cos(a),y:Math.sin(a)*.55};};

    const status=document.createElement('div');
    status.id='environment-status';
    Object.assign(status.style,{position:'fixed',left:'50%',top:'16px',transform:'translateX(-50%)',zIndex:'15',padding:'7px 12px',borderRadius:'999px',background:'rgba(24,22,39,.78)',border:'1px solid rgba(205,190,242,.22)',color:'#eee8ff',font:'600 12px system-ui,sans-serif',pointerEvents:'none',backdropFilter:'blur(6px)',boxShadow:'0 6px 18px rgba(0,0,0,.18)'});
    document.body.appendChild(status);

    function announcePhase(){
      const name=phaseName(phaseNow());if(name===state.lastPhase)return;state.lastPhase=name;log(`Ciclo do vale: ${name}.`,'info');
    }

    // Dynamic projected contact shadows for every depth-sorted object.
    const basePlayer=drawPlayer,baseMob=drawMob,baseScenery=drawScenery;
    function shadowStyle(){const p=phaseNow(),sun=sunAt(p),v=sunVector(p);return{sun,v,alpha:.07+.13*sun,len:8+24*sun};}
    function ellipseShadow(x,y,rx,ry,mult=1){
      const s=shadowStyle();ctx.save();ctx.globalAlpha=s.alpha*mult;ctx.fillStyle='#1d2430';ctx.beginPath();ctx.ellipse(x+s.v.x*s.len,y+s.v.y*s.len,rx*(1+.35*s.sun),ry,0,0,TAU);ctx.fill();ctx.restore();
    }
    drawPlayer=function(p){ellipseShadow(p.x,p.y+10,18,6,1.05);basePlayer(p);};
    drawMob=function(m){ellipseShadow(m.x,m.y+m.radius*.55,Math.max(11,m.radius*.9),Math.max(4,m.radius*.28),.9);baseMob(m);};
    drawScenery=function(s){
      const sh=shadowStyle();ctx.save();ctx.globalAlpha=sh.alpha*.85;ctx.fillStyle='#263028';
      if(s.type==='tree'){ctx.beginPath();ctx.ellipse(s.x+sh.v.x*sh.len*1.8,s.y+31+sh.v.y*sh.len*1.5,42+18*sh.sun,13,0,0,TAU);ctx.fill();}
      else if(s.type==='grave'){ctx.fillRect(s.x-15+sh.v.x*sh.len,s.y+5+sh.v.y*sh.len,34,12);}
      else if(s.type==='pillar'){ctx.beginPath();ctx.ellipse(s.x+sh.v.x*sh.len,s.y+14+sh.v.y*sh.len,27,8,0,0,TAU);ctx.fill();}
      else if(s.type==='crystal'){ctx.beginPath();ctx.ellipse(s.x+sh.v.x*sh.len,s.y+10+sh.v.y*sh.len,22,7,0,0,TAU);ctx.fill();}
      else if(s.type==='ruin'){ctx.fillRect(s.x-35+sh.v.x*sh.len,s.y-4+sh.v.y*sh.len,74,22);}
      else if(s.type==='altar'){ctx.fillRect(s.x-s.w/2+sh.v.x*sh.len,s.y+14+sh.v.y*sh.len,s.w,26);}
      else if(s.type==='chapel'){ctx.fillRect(s.x-s.w/2+10+sh.v.x*sh.len*.5,s.y+55+sh.v.y*sh.len*.5,s.w-20,70);}
      ctx.restore();baseScenery(s);
    };

    const lightCanvas=document.createElement('canvas'),lctx=lightCanvas.getContext('2d');
    function ensureLightCanvas(){if(lightCanvas.width!==innerWidth||lightCanvas.height!==innerHeight){lightCanvas.width=innerWidth;lightCanvas.height=innerHeight;}}
    function cutLight(wx,wy,r,strength=.9){
      const x=wx-camera.x,y=wy-camera.y;if(x<-r||y<-r||x>innerWidth+r||y>innerHeight+r)return;
      const g=lctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(0,0,0,${strength})`);g.addColorStop(.45,`rgba(0,0,0,${strength*.72})`);g.addColorStop(1,'rgba(0,0,0,0)');lctx.fillStyle=g;lctx.beginPath();lctx.arc(x,y,r,0,TAU);lctx.fill();
    }
    function warmGlow(wx,wy,r,color,alpha){
      const x=wx-camera.x,y=wy-camera.y,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color.replace('ALPHA',alpha));g.addColorStop(1,color.replace('ALPHA','0'));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    function drawLighting(){
      ensureLightCanvas();const phase=phaseNow(),sun=sunAt(phase),night=1-sun,twilight=twilightAt(phase);
      lctx.clearRect(0,0,innerWidth,innerHeight);lctx.globalCompositeOperation='source-over';
      lctx.fillStyle=`rgba(10,18,40,${.04+night*.58})`;lctx.fillRect(0,0,innerWidth,innerHeight);
      lctx.globalCompositeOperation='destination-out';
      cutLight(player.x,player.y-10,115+night*65,.72+.18*night);
      const altar=scenery.find(s=>s.type==='altar');if(altar)cutLight(altar.x,altar.y-30,150,.9);
      for(const s of scenery)if(s.type==='crystal')cutLight(s.x,s.y,105,.76);
      lctx.globalCompositeOperation='source-over';ctx.drawImage(lightCanvas,0,0);
      if(twilight>.01){ctx.fillStyle=`rgba(214,125,105,${twilight*.10})`;ctx.fillRect(0,0,innerWidth,innerHeight);}
      if(night>.24){
        if(altar)warmGlow(altar.x,altar.y-42,125,'rgba(255,220,132,ALPHA)',.12*night);
        for(const s of scenery)if(s.type==='crystal')warmGlow(s.x,s.y,80,'rgba(112,222,255,ALPHA)',.11*night);
      }
    }

    // Screen-space rain keeps cost independent from world size and camera position.
    const drops=Array.from({length:CONFIG.rainDrops},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,speed:520+Math.random()*520,len:8+Math.random()*16,depth:.45+Math.random()*.75}));
    function changeWeather(t){
      if(t<state.weatherUntil)return;
      state.raining=!state.raining;
      state.weatherUntil=t+(state.raining?(42+Math.random()*45):(58+Math.random()*75))*1000;
      log(state.raining?'A chuva começou no Vale.':'A chuva cessou no Vale.','info');
      if(state.raining)state.nextLightning=t+14000+Math.random()*16000;
    }
    function updateWeather(dt,t){
      changeWeather(t);const target=state.raining?1:0;state.rainIntensity+= (target-state.rainIntensity)*Math.min(1,dt*1.15);
      if(state.rainIntensity>.55&&t>state.nextLightning){state.lightningUntil=t+110+Math.random()*90;state.nextLightning=t+16000+Math.random()*24000;}
      const wind=125;
      for(const d of drops){d.x-=wind*d.depth*dt;d.y+=d.speed*d.depth*dt;if(d.y>innerHeight+30||d.x<-40){d.x=Math.random()*innerWidth+40;d.y=-30-Math.random()*innerHeight*.18;}}
    }
    function drawRain(){
      const a=state.rainIntensity;if(a<.015)return;ctx.save();ctx.lineCap='square';
      for(let i=0;i<drops.length;i++){const d=drops[i];if(i/drops.length>a+.08)continue;ctx.globalAlpha=(.13+.23*d.depth)*a;ctx.strokeStyle='#c9def2';ctx.lineWidth=d.depth> .9?1.5:1;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-d.len*.38,d.y+d.len);ctx.stroke();}
      ctx.globalAlpha=.10*a;ctx.strokeStyle='#e2effa';for(let i=0;i<18;i++){const x=(i*137+Math.floor(now/41)*23)%innerWidth,y=(i*79+Math.floor(now/53)*17)%innerHeight;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.stroke();}
      if(performance.now()<state.lightningUntil){ctx.globalAlpha=.16+.12*Math.random();ctx.fillStyle='#eaf3ff';ctx.fillRect(0,0,innerWidth,innerHeight);}
      ctx.restore();
    }

    const baseWorld=drawWorld;
    drawWorld=function(){
      baseWorld();const t=performance.now(),dt=Math.min(.05,Math.max(0,(t-state.lastTick)/1000));state.lastTick=t;updateWeather(dt,t);drawLighting();drawRain();
      const p=phaseName(phaseNow()),weather=state.rainIntensity>.25?'☔ Chuva':'Céu limpo';status.textContent=`${p==='Noite'?'☾':p==='Dia'?'☀':'◐'} ${p} • ${weather}`;announcePhase();
    };

    // Keep minimap readable with the denser population.
    const baseMinimap=drawMinimap;
    drawMinimap=function(){baseMinimap();mctx.save();mctx.globalAlpha=.22;mctx.strokeStyle='#d4c5ee';mctx.strokeRect(.5,.5,minimap.width-1,minimap.height-1);mctx.restore();};

    addEventListener('resize',()=>{for(const d of drops){d.x=Math.random()*innerWidth;d.y=Math.random()*innerHeight;}});
    log(`Mundo v10 ativo: ${mobs.length} monstros, chuva, ciclo dia/noite e sombras dinâmicas.`,'good');
  },0);
})();
