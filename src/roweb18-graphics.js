// Roweb v18 — cohesive terrain/scenery/mob pass.
// Aster/player rendering is intentionally untouched.
(() => {
  const previousDrawGround = drawGround;
  const previousDrawScenery = drawScenery;
  const previousDrawMob = drawMob;
  const previousDrawEffects = drawEffects;
  const previousKillMob = typeof killMob === 'function' ? killMob : null;

  const world = new Image();
  const monsters = new Image();
  world.decoding = 'async';
  monsters.decoding = 'async';
  let worldReady = false;
  let mobsReady = false;

  world.onload = () => { worldReady = true; log('Arte v18 ativa: catedral e props transparentes carregados.','good'); };
  monsters.onload = () => { mobsReady = true; log('Mobs v18 ativos: atlas 128×128 com animações limpas.','good'); };
  world.onerror = e => console.error('Roweb v18 world asset failed', e);
  monsters.onerror = e => console.error('Roweb v18 mob asset failed', e);
  world.src = '/assets/v18/world.webp';
  monsters.src = '/assets/v18/mobs.webp';

  const ATLAS = {
    cathedral:[0,0,512,512],
    altar:[512,0,384,256],
    leafTree:[512,256,256,288],
    deadTree:[768,256,224,272],
    grave:[0,512,112,128],
    crystal:[112,512,128,160],
    pillar:[240,512,96,160],
    ruin:[336,512,192,176],
    seal:[528,544,192,192]
  };

  const MOB_ROWS = { poring:0, bat:1, eye:2, imp:3 };
  const MOB_SEQ = {
    idle:[0,1,2,3],
    move:[4,5,6,7],
    attack:[8,9,10],
    hit:[11,12],
    death:[13,14,15,16]
  };
  const deathEchoes = [];

  const secondaryPaths = [
    [470,760,1190,810],
    [2120,700,1410,790],
    [780,930,1190,1010],
    [1810,920,1410,1005],
    [1210,1360,1275,1110],
    [1400,1400,1330,1120]
  ];

  function hash(x,y,seed=0){
    let n=(Math.imul((x|0)+seed,374761393)+Math.imul((y|0)-seed,668265263))|0;
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967295;
  }

  function roadCenter(y){
    return window.RowebTerrain?.roadCenterX?.(y) ?? (1300 + Math.sin((y-760)/350)*24 + Math.sin((y+120)/115)*7);
  }
  function roadHalf(y){
    return window.RowebTerrain?.roadHalfWidth?.(y) ?? (58 + 9*Math.sin(y/290) + 4*Math.sin(y/91));
  }

  function visibleBounds(pad=120){
    return {
      x0:Math.max(0,camera.x-pad), y0:Math.max(0,camera.y-pad),
      x1:Math.min(WORLD.width,camera.x+innerWidth+pad),
      y1:Math.min(WORLD.height,camera.y+innerHeight+pad)
    };
  }

  function roundedRectPath(x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y); ctx.lineTo(x+w-rr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
    ctx.lineTo(x+w,y+h-rr); ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
    ctx.lineTo(x+rr,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
    ctx.lineTo(x,y+rr); ctx.quadraticCurveTo(x,y,x+rr,y); ctx.closePath();
  }

  function drawGrassBase(b){
    ctx.fillStyle='#5f7950';
    ctx.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);

    // Large, soft deterministic patches remove the checkerboard look.
    const step=96;
    for(let y=Math.floor(b.y0/step)*step;y<b.y1;y+=step){
      for(let x=Math.floor(b.x0/step)*step;x<b.x1;x+=step){
        const r=hash(x/step,y/step,18), r2=hash(x/step,y/step,29);
        ctx.save();
        ctx.globalAlpha=.10+r*.06;
        ctx.fillStyle=r>.58?'#425f3f':'#7f8d5c';
        ctx.beginPath();
        ctx.ellipse(x+18+r2*65,y+16+r*62,30+r*26,20+r2*24,r*.7,0,TAU);
        ctx.fill();
        ctx.restore();

        if(r>.32){
          ctx.save(); ctx.globalAlpha=.26; ctx.fillStyle=r>.7?'#a4ad6c':'#395b37';
          const count=r>.76?4:2;
          for(let i=0;i<count;i++){
            const px=x+10+((r2*71+i*23)%72), py=y+9+((r*67+i*29)%70);
            ctx.fillRect(Math.round(px),Math.round(py),2,5+(i&1)*2);
            if(i===0&&r>.68) ctx.fillRect(Math.round(px+3),Math.round(py+2),2,4);
          }
          ctx.restore();
        }
      }
    }
  }

  function strokePath(points,outerWidth,innerWidth,outer,inner){
    if(points.length<2) return;
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.strokeStyle=outer; ctx.lineWidth=outerWidth; ctx.globalAlpha=.94;
    ctx.beginPath(); ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
    ctx.stroke();
    ctx.strokeStyle=inner; ctx.lineWidth=innerWidth; ctx.globalAlpha=1;
    ctx.beginPath(); ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
    ctx.stroke(); ctx.restore();
  }

  function drawRoads(b){
    const main=[];
    const start=Math.max(700,Math.floor((b.y0-120)/24)*24), end=Math.min(WORLD.height,b.y1+120);
    for(let y=start;y<=end;y+=24) main.push([roadCenter(y),y]);
    const avgHalf=roadHalf((start+end)/2);
    strokePath(main,Math.max(132,avgHalf*2+38),Math.max(100,avgHalf*2),'#6d704d','#756d59');

    // Stone center strip gives the pilgrimage road hierarchy without covering the whole biome.
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#807c6e'; ctx.lineWidth=68; ctx.globalAlpha=.78;
    ctx.beginPath(); if(main.length){ctx.moveTo(main[0][0],main[0][1]); for(let i=1;i<main.length;i++)ctx.lineTo(main[i][0],main[i][1]); ctx.stroke();}
    ctx.restore();

    for(const [ax,ay,bx,by] of secondaryPaths){
      if(Math.max(ay,by)<b.y0-100||Math.min(ay,by)>b.y1+100) continue;
      strokePath([[ax,ay],[bx,by]],58,38,'#61724b','#75644d');
    }
  }

  function drawPlaza(){
    const x=1090,y=350,w=420,h=455;
    ctx.save();
    roundedRectPath(x,y,w,h,44); ctx.fillStyle='#767368'; ctx.fill();
    ctx.globalAlpha=.28; ctx.strokeStyle='#4e4f49'; ctx.lineWidth=2;
    for(let yy=y+18;yy<y+h-15;yy+=48){
      ctx.beginPath(); ctx.moveTo(x+12,yy); ctx.lineTo(x+w-12,yy); ctx.stroke();
    }
    for(let xx=x+22;xx<x+w-15;xx+=64){
      ctx.beginPath(); ctx.moveTo(xx,y+10); ctx.lineTo(xx,y+h-10); ctx.stroke();
    }
    ctx.globalAlpha=.20; ctx.fillStyle='#6c794f';
    for(let i=0;i<22;i++){
      const r=hash(i,37,9), r2=hash(i,52,4);
      ctx.fillRect(x+12+r*(w-35),y+12+r2*(h-28),8+r*11,3+r2*6);
    }
    ctx.restore();
  }

  function drawZoneWear(b){
    const zones=[
      [455,760,230,190,'#4c6140'],[2110,700,235,190,'#4c6140'],
      [780,925,205,160,'#626548'],[1810,910,215,165,'#626548']
    ];
    ctx.save();
    for(const [x,y,rx,ry,color] of zones){
      if(x+rx<b.x0||x-rx>b.x1||y+ry<b.y0||y-ry>b.y1)continue;
      ctx.globalAlpha=.22; ctx.fillStyle=color; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawGround=function roweb18Ground(){
    try{
      const b=visibleBounds();
      drawGrassBase(b);
      drawZoneWear(b);
      drawRoads(b);
      drawPlaza();
    }catch(error){ console.error('Roweb v18 terrain fallback',error); previousDrawGround(); }
  };

  function shadow(x,y,w,h=10,a=.22){
    ctx.save(); ctx.globalAlpha=a; ctx.fillStyle='#151915'; ctx.beginPath(); ctx.ellipse(x,y,w/2,h/2,0,0,TAU); ctx.fill(); ctx.restore();
  }
  function crop(rect,x,baseline,w,h,alpha=1){
    if(!worldReady) return false;
    ctx.save(); ctx.globalAlpha=alpha; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(world,...rect,Math.round(x-w/2),Math.round(baseline-h),Math.round(w),Math.round(h));
    ctx.restore(); return true;
  }
  function glow(x,y,r,color,alpha=.15){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(x,y,2,x,y,r); g.addColorStop(0,color); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=alpha; ctx.fillStyle=g; ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();
  }

  drawScenery=function roweb18Scenery(s){
    if(!worldReady){ previousDrawScenery(s); return; }
    switch(s.type){
      case 'chapel':{
        const base=s.y+s.h/2+58;
        shadow(s.x,base+4,315,28,.28);
        crop(ATLAS.cathedral,s.x,base,365,365);
        break;
      }
      case 'altar':{
        const base=s.y+55;
        glow(s.x,base-56,92,'rgba(255,220,128,1)',.14+.04*Math.sin(now/260));
        shadow(s.x,base+2,130,13,.19); crop(ATLAS.altar,s.x,base,160,107);
        crop(ATLAS.seal,s.x,base+19,112,112,.42);
        break;
      }
      case 'grave': shadow(s.x,s.y+19,31,7,.18); crop(ATLAS.grave,s.x,s.y+25,42,48); break;
      case 'tree':{
        const dead=hash(Math.floor(s.x/80),Math.floor(s.y/80),61)<.28;
        shadow(s.x,s.y+43,dead?48:62,12,.20);
        crop(dead?ATLAS.deadTree:ATLAS.leafTree,s.x,s.y+48,dead?78:88,dead?95:99);
        break;
      }
      case 'crystal':{
        glow(s.x,s.y,55,'rgba(103,196,255,1)',.12+.05*Math.sin(now/330+s.x));
        shadow(s.x,s.y+21,29,7,.14); crop(ATLAS.crystal,s.x,s.y+25,40,50); break;
      }
      case 'pillar': shadow(s.x,s.y+22,30,7,.17); crop(ATLAS.pillar,s.x,s.y+26,42,70); break;
      case 'ruin': shadow(s.x,s.y+22,62,9,.17); crop(ATLAS.ruin,s.x,s.y+29,82,75); break;
      default: previousDrawScenery(s);
    }
  };

  function mobState(m){
    if(m.flashUntil>now) return 'hit';
    if(m.attackingUntil>now) return 'attack';
    return m.moving?'move':'idle';
  }
  function mobFrame(state,id=0){
    const seq=MOB_SEQ[state]||MOB_SEQ.idle;
    const speed=state==='attack'?105:state==='hit'?90:state==='move'?135:240;
    return seq[(Math.floor((now+(id||0)*37)/speed))%seq.length];
  }
  function mobSize(type,boss=false){
    if(type==='poring') return boss?118:92;
    if(type==='bat') return 94;
    if(type==='eye') return 92;
    return 88;
  }
  function drawMobSprite(type,x,y,state,id,boss,dir,alpha=1){
    if(!mobsReady||MOB_ROWS[type]===undefined)return false;
    const size=mobSize(type,boss), frame=mobFrame(state,id), row=MOB_ROWS[type];
    let bob=0;
    if(type==='bat') bob=-11+Math.sin(now/125+(id||0))*5;
    else if(type==='eye') bob=-8+Math.sin(now/180+(id||0))*4;
    else if(state==='move') bob=Math.sin(now/90+(id||0))*2;
    const baseline=y+18+bob;
    ctx.save(); ctx.globalAlpha=alpha; ctx.imageSmoothingEnabled=false;
    ctx.translate(Math.round(x),0);
    if(dir==='right')ctx.scale(-1,1);
    ctx.drawImage(monsters,frame*128,row*128,128,128,-size/2,Math.round(baseline-size),size,size);
    ctx.restore();
    return true;
  }
  function drawMobHud(m){
    const top=m.y-(m.type==='poring'?64:48);
    ctx.save();ctx.textAlign='center';ctx.font='10px sans-serif';ctx.fillStyle='#f3ecec';ctx.fillText(m.name,m.x,top);
    const w=m.boss?72:54,h=5,x=m.x-w/2,y=top+7;
    ctx.fillStyle='rgba(30,25,31,.78)';ctx.fillRect(x,y,w,h);
    ctx.fillStyle=m.boss?'#d03d79':'#be4566';ctx.fillRect(x,y,w*Math.max(0,m.hp/m.maxHp),h);
    ctx.restore();
  }

  drawMob=function roweb18Mob(m){
    if(!m.alive) return;
    if(!mobsReady){ previousDrawMob(m); return; }
    const state=mobState(m), size=mobSize(m.type,m.boss);
    shadow(m.x,m.y+17,size*(m.type==='bat'?.48:.55),m.type==='bat'?7:9,.20);
    drawMobSprite(m.type,m.x,m.y,state,m.id,m.boss,m.dir,1);
    drawMobHud(m);
  };

  if(previousKillMob){
    killMob=function roweb18KillMob(m,...args){
      if(m&&m.alive&&MOB_ROWS[m.type]!==undefined){
        deathEchoes.push({type:m.type,x:m.x,y:m.y,id:m.id||0,boss:!!m.boss,dir:m.dir,start:performance.now(),duration:620});
      }
      return previousKillMob(m,...args);
    };
  }

  drawEffects=function roweb18Effects(){
    previousDrawEffects();
    const t=performance.now();
    for(let i=deathEchoes.length-1;i>=0;i--){
      const e=deathEchoes[i], p=(t-e.start)/e.duration;
      if(p>=1){deathEchoes.splice(i,1);continue;}
      const seq=MOB_SEQ.death, frame=seq[Math.min(seq.length-1,Math.floor(p*seq.length))];
      if(!mobsReady)continue;
      const size=mobSize(e.type,e.boss),row=MOB_ROWS[e.type];
      ctx.save();ctx.globalAlpha=1-p*.55;ctx.imageSmoothingEnabled=false;ctx.translate(e.x,0);if(e.dir==='right')ctx.scale(-1,1);
      ctx.drawImage(monsters,frame*128,row*128,128,128,-size/2,e.y+18-size-p*8,size,size);ctx.restore();
    }
  };

  window.RowebGraphicsV18={version:'18.0.0',assets:{world:'/assets/v18/world.webp',mobs:'/assets/v18/mobs.webp'}};
  log('Gráficos v18 iniciados: terreno contínuo, assets transparentes e Aster preservado.','good');
})();
