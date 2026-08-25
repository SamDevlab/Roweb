// Roweb v16: stable visual pipeline. Aster/player rendering is intentionally untouched.
(() => {
  const previousDrawGround = drawGround;
  const previousDrawScenery = drawScenery;
  const previousDrawMob = drawMob;
  const previousDrawEffects = drawEffects;

  const worldAsset = { image: null, ready: false };
  const mobs = {};
  const deathEchoes = [];

  // IMPORTANT: never call this WORLD. The engine already owns WORLD.width/height.
  const WORLD_SPRITES = {
    grass: [
      [0,0,22,22],[22,0,22,22],[45,0,22,22],[68,0,22,22],
      [90,0,22,22],[112,0,22,22],[135,0,22,22],[158,0,22,22]
    ],
    stone: [[0,23,22,22],[22,23,22,22],[45,23,22,22],[68,23,22,22]],
    cathedral:[0,49,82,70], churchSide:[84,49,91,49], wallRuin:[0,122,84,45],
    deadTree:[178,52,26,59], leafTree:[206,52,28,59], altar:[87,101,70,22],
    pillarStrip:[159,101,56,22], gravesStrip:[87,124,101,19], crystalsStrip:[87,145,101,17],
    brazier:[190,124,28,19], seal:[190,145,47,11]
  };

  const MOB_SEQUENCES = {
    idle:[0,1,2,3],
    move:[0,1,2,3],
    attack:[4,5,6],
    hit:[6],
    death:[7,8,9]
  };

  function hash(x,y){
    let n=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0;
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967295;
  }

  function transparentFromEdges(image, threshold=42){
    const c=document.createElement('canvas');
    c.width=image.naturalWidth||image.width;
    c.height=image.naturalHeight||image.height;
    const g=c.getContext('2d',{willReadFrequently:true});
    g.imageSmoothingEnabled=false;
    g.drawImage(image,0,0);
    try{
      const data=g.getImageData(0,0,c.width,c.height), p=data.data, w=c.width, h=c.height;
      const seen=new Uint8Array(w*h), queue=new Int32Array(w*h), qy=new Int32Array(w*h);
      let head=0, tail=0;
      const isMatte=(x,y)=>{
        const i=(y*w+x)*4;
        if(p[i+3]===0) return true;
        const r=p[i], gg=p[i+1], b=p[i+2], mx=Math.max(r,gg,b), mn=Math.min(r,gg,b);
        return mx<=threshold && mx-mn<=20;
      };
      const push=(x,y)=>{
        const k=y*w+x;
        if(seen[k]||!isMatte(x,y)) return;
        seen[k]=1; queue[tail]=x; qy[tail]=y; tail++;
      };
      for(let x=0;x<w;x++){push(x,0);push(x,h-1);}
      for(let y=0;y<h;y++){push(0,y);push(w-1,y);}
      while(head<tail){
        const x=queue[head], y=qy[head++], i=(y*w+x)*4;
        p[i+3]=0;
        if(x)push(x-1,y); if(x<w-1)push(x+1,y); if(y)push(x,y-1); if(y<h-1)push(x,y+1);
      }
      g.putImageData(data,0,0);
    }catch(error){ console.warn('Roweb v16 alpha cleanup skipped',error); }
    return c;
  }

  function loadWorld(){
    const image=new Image(); image.decoding='async';
    image.onload=()=>{
      worldAsset.image=transparentFromEdges(image,34);
      worldAsset.ready=true;
      log('Arte v16 ativa: chão e cenário restaurados com pipeline estável.','good');
    };
    image.onerror=e=>console.error('Roweb v16 world asset failed',e);
    image.src=window.ROWEB14_WORLD_IMAGE||'';
  }

  function loadMob(type){
    const image=new Image(); image.decoding='async';
    image.onload=()=>{
      const cleaned=transparentFromEdges(image,46);
      // v14 strips have 10 animation frames. Derive dimensions from the actual image instead of hardcoding 24x24.
      const columns=10;
      const frameW=Math.max(1,Math.floor(cleaned.width/columns));
      const frameH=cleaned.height;
      mobs[type]={ image: cleaned, columns, frameW, frameH, ready:true };
    };
    image.onerror=e=>console.error(`Roweb v16 ${type} asset failed`,e);
    image.src=window.ROWEB14_MOB_IMAGES?.[type]||'';
  }

  loadWorld();
  for(const type of ['poring','bat','eye','imp']) loadMob(type);

  function worldWidth(){ return Number.isFinite(globalThis.WORLD?.width) ? globalThis.WORLD.width : 2600; }
  function worldHeight(){ return Number.isFinite(globalThis.WORLD?.height) ? globalThis.WORLD.height : 1800; }

  function visibleBounds(tile){
    const ww=worldWidth(), wh=worldHeight();
    return {
      x0:Math.max(0,Math.floor(camera.x/tile)*tile-tile*2),
      y0:Math.max(0,Math.floor(camera.y/tile)*tile-tile*2),
      x1:Math.min(ww,camera.x+innerWidth+tile*2),
      y1:Math.min(wh,camera.y+innerHeight+tile*2)
    };
  }

  function drawTile(rect,x,y,size,alpha=1){
    if(!worldAsset.image) return;
    ctx.save(); ctx.globalAlpha=alpha; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(worldAsset.image,...rect,Math.round(x),Math.round(y),Math.ceil(size+1),Math.ceil(size+1));
    ctx.restore();
  }

  function crop(rect,x,y,w,h,anchor='bottom',alpha=1){
    if(!worldAsset.image) return;
    const [sx,sy,sw,sh]=rect;
    const dx=x-w/2, dy=anchor==='bottom'?y-h:y-h/2;
    ctx.save(); ctx.globalAlpha=alpha; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(worldAsset.image,sx,sy,sw,sh,Math.round(dx),Math.round(dy),Math.round(w),Math.round(h));
    ctx.restore();
  }

  function shadow(x,y,w,h=9,a=.2){
    ctx.save(); ctx.globalAlpha=a; ctx.fillStyle='#151512';
    ctx.beginPath(); ctx.ellipse(x,y,w/2,h/2,0,0,TAU); ctx.fill(); ctx.restore();
  }

  function glow(x,y,r,rgba,a=.18){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const gr=ctx.createRadialGradient(x,y,2,x,y,r);
    gr.addColorStop(0,rgba.replace('A',String(a))); gr.addColorStop(1,rgba.replace('A','0'));
    ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill(); ctx.restore();
  }

  drawGround=function roweb16Ground(){
    if(!worldAsset.ready){ previousDrawGround(); return; }
    const tile=48, b=visibleBounds(tile), ww=worldWidth(), wh=worldHeight();
    ctx.fillStyle='#596f49'; ctx.fillRect(0,0,ww,wh);

    for(let y=b.y0;y<b.y1;y+=tile){
      for(let x=b.x0;x<b.x1;x+=tile){
        const r=hash(Math.floor(x/tile),Math.floor(y/tile));
        drawTile(WORLD_SPRITES.grass[Math.floor(r*WORLD_SPRITES.grass.length)%WORLD_SPRITES.grass.length],x-1,y-1,tile+3);
      }
    }

    // Stable road + cathedral plaza. Clip prevents stone tiles from leaking into grass.
    const roadX0=1214, roadX1=1386;
    ctx.save(); ctx.beginPath(); ctx.rect(roadX0,b.y0,roadX1-roadX0,b.y1-b.y0); ctx.clip();
    for(let y=b.y0;y<b.y1;y+=48){
      for(let x=roadX0;x<roadX1;x+=48){
        const i=(Math.floor(y/48)+Math.floor(x/48)*3)%WORLD_SPRITES.stone.length;
        drawTile(WORLD_SPRITES.stone[i],x-1,y-1,50);
      }
    }
    ctx.restore();

    const plaza={x0:1088,y0:350,x1:1512,y1:852};
    ctx.save(); ctx.beginPath(); ctx.rect(plaza.x0,plaza.y0,plaza.x1-plaza.x0,plaza.y1-plaza.y0); ctx.clip();
    for(let y=Math.max(plaza.y0,b.y0);y<Math.min(plaza.y1,b.y1);y+=48){
      for(let x=plaza.x0;x<plaza.x1;x+=48){
        const i=(Math.floor(x/48)+Math.floor(y/48))%WORLD_SPRITES.stone.length;
        drawTile(WORLD_SPRITES.stone[i],x-1,y-1,50);
      }
    }
    ctx.restore();

    // Blend road shoulders with irregular grass strips.
    ctx.save(); ctx.globalAlpha=.6;
    for(let y=b.y0;y<b.y1;y+=48){
      const wig=Math.round((hash(17,Math.floor(y/48))-.5)*10);
      drawTile(WORLD_SPRITES.grass[(Math.floor(y/48)+3)%8],roadX0-16+wig,y,31);
      drawTile(WORLD_SPRITES.grass[(Math.floor(y/48)+6)%8],roadX1-15-wig,y,31);
    }
    ctx.restore();
    crop(WORLD_SPRITES.seal,1300,817,144,34,'center',.8);
  };

  function stripFrame(strip,parts,s,seed=0){
    const [sx,sy,sw,sh]=strip, pw=sw/parts;
    const idx=Math.floor(hash(Math.floor(s.x/33)+seed,Math.floor(s.y/33)-seed)*parts)%parts;
    return [sx+idx*pw,sy,pw,sh];
  }

  drawScenery=function roweb16Scenery(s){
    if(!worldAsset.ready){ previousDrawScenery(s); return; }
    ctx.save(); ctx.imageSmoothingEnabled=false;
    switch(s.type){
      case 'chapel':{
        const g=s.y+s.h/2+7;
        shadow(s.x,g+5,340,28,.27);
        crop(WORLD_SPRITES.cathedral,s.x,g,420,360);
        crop(WORLD_SPRITES.churchSide,s.x-242,g-2,185,101,'bottom',.92);
        crop(WORLD_SPRITES.churchSide,s.x+242,g-2,185,101,'bottom',.92);
        break;
      }
      case 'altar':{
        const g=s.y+44;
        shadow(s.x,g+3,145,14,.21);
        crop(WORLD_SPRITES.altar,s.x,g,198,62);
        crop(WORLD_SPRITES.brazier,s.x-104,g-1,44,33);
        crop(WORLD_SPRITES.brazier,s.x+104,g-1,44,33);
        glow(s.x,g-37,88,'rgba(255,203,99,A)',.13+.05*Math.sin(now/250));
        break;
      }
      case 'grave': shadow(s.x,s.y+18,32,7,.18); crop(stripFrame(WORLD_SPRITES.gravesStrip,8,s,4),s.x,s.y+22,39,53); break;
      case 'tree':{
        const dead=hash(Math.floor(s.x/90),Math.floor(s.y/90))<.28;
        shadow(s.x,s.y+42,dead?56:70,13,.2);
        crop(dead?WORLD_SPRITES.deadTree:WORLD_SPRITES.leafTree,s.x,s.y+46,dead?70:82,dead?130:139);
        break;
      }
      case 'crystal':{
        const pulse=.11+.05*Math.sin(now/310+s.x*.05);
        glow(s.x,s.y,58,'rgba(104,191,255,A)',pulse);
        shadow(s.x,s.y+19,31,7,.14);
        crop(stripFrame(WORLD_SPRITES.crystalsStrip,7,s,11),s.x,s.y+22,44,57);
        break;
      }
      case 'pillar': shadow(s.x,s.y+21,32,7,.17); crop(stripFrame(WORLD_SPRITES.pillarStrip,6,s,7),s.x,s.y+24,48,88); break;
      case 'ruin':{
        shadow(s.x,s.y+20,62,9,.16);
        const [sx,sy,sw,sh]=WORLD_SPRITES.wallRuin, left=hash(Math.floor(s.x/60),3)>.5;
        crop([sx+(left?sw/2:0),sy,sw/2,sh],s.x,s.y+25,88,58);
        break;
      }
      default: previousDrawScenery(s);
    }
    ctx.restore();
  };

  function mobState(m){
    if(m.flashUntil>now) return 'hit';
    if(m.attackingUntil>now) return 'attack';
    if(m.moving) return 'move';
    return 'idle';
  }

  function sequenceFrame(state){
    const seq=MOB_SEQUENCES[state]||MOB_SEQUENCES.idle;
    const speed=state==='attack'?100:state==='move'?135:240;
    return seq[Math.floor(now/speed)%seq.length];
  }

  function mobDrawSize(m,meta){
    const aspect=meta.frameW/meta.frameH;
    let h=m.type==='poring'?(m.boss?98:72):m.type==='bat'?76:m.type==='eye'?78:74;
    return { h, w:h*aspect };
  }

  function mobPose(m,state){
    const phase=now/1000+(m.id?.length||0);
    let dx=0,dy=0,rot=0,sx=1,sy=1;
    if(m.type==='poring'){
      const b=Math.sin(phase*6); sx=1-b*.025; sy=1+b*.035; dy=-Math.max(0,b)*2;
      if(state==='move') rot=Math.sin(phase*8)*.025;
      if(state==='attack'){ sx=1.06; sy=.94; }
    }else if(m.type==='bat'){
      dy=-5+Math.sin(phase*7)*2.5; rot=Math.sin(phase*6)*.02;
      if(state==='attack') dy+=4;
    }else if(m.type==='eye'){
      dy=-5+Math.sin(phase*4)*2; rot=Math.sin(phase*2.5)*.014;
    }else{
      const b=Math.sin(phase*8); if(state==='move'){dy=-Math.abs(b)*2;rot=b*.02;} if(state==='attack') sx=1.05;
    }
    return {dx,dy,rot,sx,sy};
  }

  function drawMobFrame(m,frame,state,alpha=1){
    const meta=mobs[m.type]; if(!meta?.ready) return false;
    const {w,h}=mobDrawSize(m,meta), p=mobPose(m,state), ground=m.y+m.radius+10;
    const safeFrame=Math.max(0,Math.min(meta.columns-1,frame));
    ctx.save(); ctx.globalAlpha=alpha; ctx.imageSmoothingEnabled=false;
    ctx.translate(Math.round(m.x+p.dx),Math.round(ground+p.dy)); ctx.rotate(p.rot); ctx.scale(p.sx,p.sy);
    if(m.flashUntil>now) ctx.filter='brightness(1.55) saturate(.72)';
    ctx.drawImage(meta.image,safeFrame*meta.frameW,0,meta.frameW,meta.frameH,-w/2,-h+12,w,h);
    ctx.restore(); return true;
  }

  drawMob=function roweb16Mob(m){
    const meta=mobs[m.type]; if(!meta?.ready){ previousDrawMob(m); return; }
    const state=mobState(m), ground=m.y+m.radius+10, selected=selectedId===m.id;
    const size=mobDrawSize(m,meta);
    shadow(m.x,ground,Math.max(28,size.w*.52),m.type==='bat'?6:8,m.type==='bat'?.13:.2);
    drawMobFrame(m,sequenceFrame(state),state);

    const barW=m.boss?90:52, barY=m.y-m.radius-(m.boss?54:38);
    ctx.textAlign='center'; ctx.font=m.boss?'700 11px sans-serif':'9px sans-serif';
    ctx.fillStyle=selected?'#fff1b8':'#f4e9e7'; ctx.fillText(m.name,m.x,barY-5);
    ctx.fillStyle='rgba(19,15,22,.76)'; ctx.fillRect(m.x-barW/2,barY,barW,5);
    ctx.fillStyle=m.boss?'#cf315f':'#bd3b59'; ctx.fillRect(m.x-barW/2,barY,barW*clamp(m.hp/m.maxHp,0,1),5);
    if(selected){ctx.strokeStyle='rgba(255,232,151,.78)';ctx.lineWidth=1;ctx.strokeRect(m.x-barW/2-.5,barY-.5,barW+1,6);}
  };

  if(window.Roweb?.events){
    Roweb.events.on('mob:killed',m=>deathEchoes.push({type:m.type,x:m.x,y:m.y,radius:m.radius,boss:m.boss,born:performance.now()}));
  }

  function drawDeathEchoes(){
    const t=performance.now();
    for(let i=deathEchoes.length-1;i>=0;i--){
      const d=deathEchoes[i],age=t-d.born;
      if(age>680){deathEchoes.splice(i,1);continue;}
      const fake={...d,id:'dead',flashUntil:0,attackingUntil:0,moving:false};
      const seq=MOB_SEQUENCES.death, frame=seq[Math.min(seq.length-1,Math.floor(age/(680/seq.length)))];
      ctx.save(); ctx.globalAlpha=Math.max(0,1-age/680); drawMobFrame(fake,frame,'death',1); ctx.restore();
    }
  }

  drawEffects=function roweb16Effects(){
    previousDrawEffects();
    drawDeathEchoes();
  };

  log('Gráficos v16 iniciados: WORLD corrigido, frames de mobs dimensionados pelo asset e Aster preservado.','good');
})();
