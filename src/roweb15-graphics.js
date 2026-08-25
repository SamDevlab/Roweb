// Roweb v15 visual reconstruction: preserves Aster v12.3 and rebuilds only world + mobs.
// Transparency is derived only from the connected matte at atlas edges, so dark sprite details remain intact.
(() => {
  const previousDrawGround = drawGround;
  const previousDrawScenery = drawScenery;
  const previousDrawMob = drawMob;
  const previousDrawEffects = drawEffects;

  const assets = { world:null, mobs:{}, ready:false };
  const mobReady = {};
  const deathEchoes = [];
  const FRAME = 24;

  const WORLD = {
    grass:[
      [0,0,22,22],[22,0,22,22],[45,0,22,22],[68,0,22,22],
      [90,0,22,22],[112,0,22,22],[135,0,22,22],[158,0,22,22]
    ],
    stone:[[0,23,22,22],[22,23,22,22],[45,23,22,22],[68,23,22,22]],
    cathedral:[0,49,82,70], churchSide:[84,49,91,49], wallRuin:[0,122,84,45],
    deadTree:[178,52,26,59], leafTree:[206,52,28,59], altar:[87,101,70,22],
    pillarStrip:[159,101,56,22], gravesStrip:[87,124,101,19], crystalsStrip:[87,145,101,17],
    brazier:[190,124,28,19], seal:[190,145,47,11]
  };

  const sequences = {
    poring:{idle:[0,1,2,3], move:[0,1,2,3], attack:[4,5,6], hit:[6], death:[7,8,9]},
    bat:{idle:[0,1,2,3], move:[0,1,2,3], attack:[4,5,6], hit:[6], death:[7,8,9]},
    eye:{idle:[0,1,2,3], move:[0,1,2,3], attack:[4,5,6], hit:[6], death:[7,8,9]},
    imp:{idle:[0,1,2,3], move:[0,1,2,3], attack:[4,5,6], hit:[6], death:[7,8,9]}
  };

  function hash(x,y){let n=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
  function clamp01(v){return Math.max(0,Math.min(1,v));}

  // Flood-fill only matte pixels connected to the image border. Unlike v14, this never deletes
  // dark pixels inside a mob/tree/cathedral just because they are dark.
  function transparentFromEdges(image, threshold=42){
    const c=document.createElement('canvas'); c.width=image.naturalWidth||image.width; c.height=image.naturalHeight||image.height;
    const g=c.getContext('2d',{willReadFrequently:true}); g.imageSmoothingEnabled=false; g.drawImage(image,0,0);
    try{
      const data=g.getImageData(0,0,c.width,c.height),p=data.data,w=c.width,h=c.height;
      const seen=new Uint8Array(w*h), qx=new Int32Array(w*h), qy=new Int32Array(w*h); let head=0,tail=0;
      const isMatte=(x,y)=>{const i=(y*w+x)*4;if(p[i+3]===0)return true;const r=p[i],gg=p[i+1],b=p[i+2],mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);return mx<=threshold && mx-mn<=20;};
      const push=(x,y)=>{const k=y*w+x;if(seen[k]||!isMatte(x,y))return;seen[k]=1;qx[tail]=x;qy[tail]=y;tail++;};
      for(let x=0;x<w;x++){push(x,0);push(x,h-1);} for(let y=0;y<h;y++){push(0,y);push(w-1,y);}
      while(head<tail){const x=qx[head],y=qy[head++],i=(y*w+x)*4;p[i+3]=0;if(x)push(x-1,y);if(x<w-1)push(x+1,y);if(y)push(x,y-1);if(y<h-1)push(x,y+1);}
      g.putImageData(data,0,0);
    }catch(err){console.warn('v15 alpha edge cleanup skipped',err);}
    return c;
  }

  function loadImage(src,threshold,onReady){
    const im=new Image(); im.decoding='async';
    im.onload=()=>onReady(transparentFromEdges(im,threshold));
    im.onerror=e=>console.error('Roweb v15 asset load failed',e);
    im.src=src||'';
  }

  loadImage(window.ROWEB14_WORLD_IMAGE,34,img=>{assets.world=img;assets.ready=true;log('Arte v15 ativa: cenário reconstruído sem fundo/halos escuros.','good');});
  for(const type of ['poring','bat','eye','imp']) loadImage(window.ROWEB14_MOB_IMAGES?.[type],46,img=>{assets.mobs[type]=img;mobReady[type]=true;});

  function visibleBounds(tile){return{x0:Math.max(0,Math.floor(camera.x/tile)*tile-tile*2),y0:Math.max(0,Math.floor(camera.y/tile)*tile-tile*2),x1:Math.min(WORLD.width,camera.x+innerWidth+tile*2),y1:Math.min(WORLD.height,camera.y+innerHeight+tile*2)};}

  function drawTile(rect,x,y,size,alpha=1){if(!assets.world)return;ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(assets.world,...rect,Math.round(x),Math.round(y),Math.ceil(size+1),Math.ceil(size+1));ctx.restore();}
  function crop(rect,x,y,w,h,anchor='bottom',alpha=1){if(!assets.world)return;const[sx,sy,sw,sh]=rect;ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;const dx=x-w/2,dy=anchor==='bottom'?y-h:y-h/2;ctx.drawImage(assets.world,sx,sy,sw,sh,Math.round(dx),Math.round(dy),Math.round(w),Math.round(h));ctx.restore();}
  function shadow(x,y,w,h=9,a=.2){ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#151512';ctx.beginPath();ctx.ellipse(x,y,w/2,h/2,0,0,TAU);ctx.fill();ctx.restore();}
  function glow(x,y,r,rgba,a=.18){ctx.save();ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(x,y,2,x,y,r);gr.addColorStop(0,rgba.replace('A',String(a)));gr.addColorStop(1,rgba.replace('A','0'));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();}

  drawGround=function roweb15Ground(){
    if(!assets.ready){previousDrawGround();return;}
    const tile=42,b=visibleBounds(tile);
    ctx.fillStyle='#596f49';ctx.fillRect(0,0,WORLD.width,WORLD.height);
    // Smaller tiles + two-pass overlap kill the giant checkerboard effect from v14.
    for(let y=b.y0;y<b.y1;y+=tile){for(let x=b.x0;x<b.x1;x+=tile){const ix=Math.floor(x/tile),iy=Math.floor(y/tile);const r=hash(ix,iy);drawTile(WORLD.grass[Math.floor(r*WORLD.grass.length)%WORLD.grass.length],x-1,y-1,tile+3);}}
    // soft organic micro-patches prevent visible repeated square bands
    ctx.save();
    for(let y=b.y0;y<b.y1;y+=84){for(let x=b.x0;x<b.x1;x+=84){const r=hash(Math.floor(x/84)+91,Math.floor(y/84)-13);if(r>.63){ctx.globalAlpha=.07+(r-.63)*.12;ctx.fillStyle=r>.83?'#d5c77b':'#2d482b';ctx.beginPath();ctx.ellipse(x+20+r*26,y+17+(1-r)*34,18+r*18,5+r*8,r*2,0,TAU);ctx.fill();}}}
    ctx.restore();

    const roadX0=1222,roadX1=1378;
    ctx.save();ctx.beginPath();ctx.rect(roadX0,b.y0,roadX1-roadX0,b.y1-b.y0);ctx.clip();
    for(let y=b.y0;y<b.y1;y+=46)for(let x=roadX0;x<roadX1;x+=46){const i=(Math.floor(y/46)+Math.floor(x/46)*3)%WORLD.stone.length;drawTile(WORLD.stone[i],x-2,y-2,50);}
    ctx.restore();

    // plaza is continuous with the road instead of a floating rectangular slab
    const px0=1105,px1=1495,py0=370,py1=846;
    ctx.save();ctx.beginPath();ctx.rect(px0,py0,px1-px0,py1-py0);ctx.clip();
    for(let y=Math.max(py0,b.y0);y<Math.min(py1,b.y1);y+=46)for(let x=px0;x<px1;x+=46){const i=(Math.floor(x/46)+Math.floor(y/46))%WORLD.stone.length;drawTile(WORLD.stone[i],x-2,y-2,50);}
    ctx.restore();
    // irregular grass shoulders blend the path into the field
    ctx.save();ctx.globalAlpha=.55;
    for(let y=b.y0;y<b.y1;y+=42){const wig=Math.round((hash(17,Math.floor(y/42))-.5)*12);drawTile(WORLD.grass[(Math.floor(y/42)+3)%8],roadX0-14+wig,y,28);drawTile(WORLD.grass[(Math.floor(y/42)+6)%8],roadX1-14-wig,y,28);}
    ctx.restore();
    crop(WORLD.seal,1300,815,142,34,'center',.8);
  };

  function stripFrame(strip,parts,s,seed=0){const[sx,sy,sw,sh]=strip,pw=sw/parts;const idx=Math.floor(hash(Math.floor(s.x/33)+seed,Math.floor(s.y/33)-seed)*parts)%parts;return[sx+idx*pw,sy,pw,sh];}

  drawScenery=function roweb15Scenery(s){
    if(!assets.ready){previousDrawScenery(s);return;}
    ctx.save();ctx.imageSmoothingEnabled=false;
    switch(s.type){
      case 'chapel':{const g=s.y+s.h/2+7;shadow(s.x,g+5,335,27,.26);crop(WORLD.cathedral,s.x,g,405,348);crop(WORLD.churchSide,s.x-236,g-2,180,98,'bottom',.92);crop(WORLD.churchSide,s.x+236,g-2,180,98,'bottom',.92);break;}
      case 'altar':{const g=s.y+44;shadow(s.x,g+3,142,14,.21);crop(WORLD.altar,s.x,g,194,61);crop(WORLD.brazier,s.x-102,g-1,43,32);crop(WORLD.brazier,s.x+102,g-1,43,32);glow(s.x,g-37,86,'rgba(255,203,99,A)',.13+.05*Math.sin(now/250));break;}
      case 'grave':{shadow(s.x,s.y+18,32,7,.18);crop(stripFrame(WORLD.gravesStrip,8,s,4),s.x,s.y+22,39,53);break;}
      case 'tree':{const dead=hash(Math.floor(s.x/90),Math.floor(s.y/90))<.28;shadow(s.x,s.y+42,dead?56:70,13,.2);crop(dead?WORLD.deadTree:WORLD.leafTree,s.x,s.y+46,dead?70:82,dead?130:139);break;}
      case 'crystal':{const pulse=.11+.05*Math.sin(now/310+s.x*.05);glow(s.x,s.y,58,'rgba(104,191,255,A)',pulse);shadow(s.x,s.y+19,31,7,.14);crop(stripFrame(WORLD.crystalsStrip,7,s,11),s.x,s.y+22,44,57);break;}
      case 'pillar':{shadow(s.x,s.y+21,32,7,.17);crop(stripFrame(WORLD.pillarStrip,6,s,7),s.x,s.y+24,48,88);break;}
      case 'ruin':{shadow(s.x,s.y+20,62,9,.16);const[sx,sy,sw,sh]=WORLD.wallRuin,left=hash(Math.floor(s.x/60),3)>.5;crop([sx+(left?sw/2:0),sy,sw/2,sh],s.x,s.y+25,88,58);break;}
      default:previousDrawScenery(s);
    }
    ctx.restore();
  };

  function mobState(m){if(m.flashUntil>now)return'hit';if(m.attackingUntil>now)return'attack';if(m.moving)return'move';return'idle';}
  function frameFor(m,state){const seq=sequences[m.type]?.[state]||[0];const speed=state==='attack'?95:state==='move'?125:230;return seq[Math.floor(now/speed)%seq.length];}
  function baseScale(m){if(m.type==='poring')return m.boss?3.55:2.85;if(m.type==='eye')return 2.52;if(m.type==='bat')return 2.55;return 2.58;}
  function pose(m,state){
    const phase=now/1000+(m.id?.length||0); let sx=1,sy=1,rot=0,dx=0,dy=0;
    if(m.type==='poring'){const b=Math.sin(phase*6);sy=1+b*.035;sx=1-b*.025;dy=-Math.max(0,b)*2;if(state==='move'){rot=Math.sin(phase*9)*.035;dx=Math.sin(phase*7)*1.5;}if(state==='attack'){sx=1.08;sy=.92;dx=(m.dir==='left'?-1:m.dir==='right'?1:0)*6;}}
    else if(m.type==='bat'){dy=-4+Math.sin(phase*7)*3;rot=Math.sin(phase*6)*.025;if(state==='attack'){dy+=4;sx=1.08;}}
    else if(m.type==='eye'){dy=-5+Math.sin(phase*4)*2;rot=Math.sin(phase*2.5)*.018;if(state==='attack')sx=1.06;}
    else {const b=Math.sin(phase*8);dy=state==='move'?Math.abs(b)*-2:0;rot=state==='move'?b*.025:0;if(state==='attack'){sx=1.08;dx=(m.dir==='left'?-1:m.dir==='right'?1:0)*7;}}
    return{sx,sy,rot,dx,dy};
  }

  function drawMobImage(m,frame,state,alpha=1){const img=assets.mobs[m.type];if(!img)return false;const sc=baseScale(m),p=pose(m,state),w=FRAME*sc,h=FRAME*sc,ground=m.y+m.radius+10;ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(m.x+p.dx),Math.round(ground+p.dy));ctx.rotate(p.rot);ctx.scale(p.sx,p.sy);if(m.flashUntil>now)ctx.filter='brightness(1.55) saturate(.72)';ctx.drawImage(img,frame*FRAME,0,FRAME,FRAME,-w/2,-h+13,w,h);ctx.restore();return true;}

  drawMob=function roweb15Mob(m){
    if(!mobReady[m.type]){previousDrawMob(m);return;}
    const state=mobState(m),ground=m.y+m.radius+10,sel=selectedId===m.id;
    const shW=m.type==='poring'?(m.boss?54:38):m.type==='bat'?34:m.type==='eye'?38:36;
    shadow(m.x,ground,shW,m.type==='bat'?6:8,m.type==='bat'?.13:.2);
    drawMobImage(m,frameFor(m,state),state);
    const barW=m.boss?88:50,barY=m.y-m.radius-(m.boss?53:37);
    ctx.textAlign='center';ctx.font=m.boss?'700 10px sans-serif':'9px sans-serif';ctx.fillStyle=sel?'#fff0ae':'#f0e6e2';ctx.fillText(m.name,m.x,barY-5);
    ctx.fillStyle='rgba(16,13,19,.72)';ctx.fillRect(m.x-barW/2,barY,barW,5);ctx.fillStyle=m.boss?'#cf315f':'#b9435b';ctx.fillRect(m.x-barW/2,barY,barW*clamp01(m.hp/m.maxHp),5);
    if(sel){ctx.strokeStyle='rgba(255,232,151,.75)';ctx.strokeRect(m.x-barW/2-.5,barY-.5,barW+1,6);}
  };

  if(window.Roweb?.events)Roweb.events.on('mob:killed',m=>deathEchoes.push({type:m.type,x:m.x,y:m.y,radius:m.radius,boss:m.boss,born:performance.now()}));
  function drawDeaths(){const t=performance.now();for(let i=deathEchoes.length-1;i>=0;i--){const d=deathEchoes[i],age=t-d.born;if(age>650){deathEchoes.splice(i,1);continue;}const fake={...d,id:'dead',dir:'down',moving:false,attackingUntil:0,flashUntil:0};const seq=sequences[d.type]?.death||[7,8,9];const frame=seq[Math.min(seq.length-1,Math.floor(age/(650/seq.length)))];drawMobImage(fake,frame,'idle',1-age/700);}}
  drawEffects=function roweb15Effects(){previousDrawEffects();drawDeaths();};

  window.RowebGraphicsV15={version:'15.0.0',preservesPlayer:true,edgeMatteTransparency:true};
  log('Gráficos v15 iniciados: Aster preservado; mapa e mobs reconstruídos.','good');
})();
