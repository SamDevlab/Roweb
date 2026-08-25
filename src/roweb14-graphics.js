// Roweb v14 graphics overhaul.
// Replaces prototype ground, scenery and mob rendering with cohesive original pixel-art atlases.
// Gameplay, collisions, AI, loot and save remain owned by the existing engine layers.
(() => {
  const previousDrawGround = drawGround;
  const previousDrawScenery = drawScenery;
  const previousDrawMob = drawMob;
  const previousDrawEffects = drawEffects;

  const worldImage = new Image();
  worldImage.decoding = 'async';
  const mobImages = {};
  const mobReady = {};
  let worldReady = false;
  let worldSheet = null;
  const deathEchoes = [];

  const FRAME = 24;
  const MOB_FRAMES = {
    idle: [0, 1, 2, 1],
    move: [0, 1, 2, 3],
    attack: [4, 5, 6],
    hit: [6],
    death: [7, 8, 9]
  };

  const WORLD_SPRITES = {
    grass: [
      [0,0,22,22], [22,0,22,22], [45,0,22,22], [68,0,22,22],
      [90,0,22,22], [112,0,22,22], [135,0,22,22], [158,0,22,22]
    ],
    stone: [[0,23,22,22], [22,23,22,22], [45,23,22,22], [68,23,22,22]],
    cathedral: [0,49,82,70],
    churchSide: [84,49,91,49],
    wallRuin: [0,122,84,45],
    deadTree: [178,52,26,59],
    leafTree: [206,52,28,59],
    altar: [87,101,70,22],
    pillarStrip: [159,101,56,22],
    gravesStrip: [87,124,101,19],
    crystalsStrip: [87,145,101,17],
    brazier: [190,124,28,19],
    seal: [190,145,47,11]
  };

  function cleanDarkBackground(image, threshold = 34) {
    const c = document.createElement('canvas');
    c.width = image.naturalWidth || image.width;
    c.height = image.naturalHeight || image.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(image, 0, 0);
    try {
      const data = g.getImageData(0,0,c.width,c.height);
      const p = data.data;
      for (let i=0;i<p.length;i+=4) {
        const r=p[i], gg=p[i+1], b=p[i+2];
        const max=Math.max(r,gg,b), min=Math.min(r,gg,b);
        if (max < threshold && max-min < 15) p[i+3]=0;
        else if (max < threshold+14 && max-min < 11) p[i+3]=Math.min(p[i+3],120);
      }
      g.putImageData(data,0,0);
    } catch (error) {
      console.warn('Roweb v14 alpha cleanup skipped', error);
    }
    return c;
  }

  function hash(x,y) {
    let n=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0;
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967295;
  }

  function drawCrop(img, rect, x, y, w, h, anchor='bottom') {
    if (!img) return;
    const [sx,sy,sw,sh]=rect;
    const dx=Math.round(x-w/2);
    const dy=Math.round(anchor==='bottom' ? y-h : y-h/2);
    ctx.drawImage(img,sx,sy,sw,sh,dx,dy,Math.round(w),Math.round(h));
  }

  function drawShadow(x,y,w=40,h=10,alpha=.20) {
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.fillStyle='#171615';
    ctx.beginPath();
    ctx.ellipse(Math.round(x),Math.round(y),w/2,h/2,0,0,TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawRadialGlow(x,y,r,color,alpha=.16) {
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const grad=ctx.createRadialGradient(x,y,2,x,y,r);
    grad.addColorStop(0,color.replace('ALPHA',String(alpha)));
    grad.addColorStop(1,color.replace('ALPHA','0'));
    ctx.fillStyle=grad;
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
    ctx.restore();
  }

  worldImage.onload = () => {
    worldSheet=cleanDarkBackground(worldImage,30);
    worldReady=true;
    log('Arte v14 carregada: chão, catedral e objetos em pixel art.','good');
  };
  worldImage.onerror = error => console.error('Roweb v14 world atlas failed', error);
  worldImage.src=window.ROWEB14_WORLD_IMAGE||'';

  for (const type of ['poring','bat','eye','imp']) {
    const image=new Image(); image.decoding='async';
    image.onload=()=>{mobImages[type]=cleanDarkBackground(image,39);mobReady[type]=true;};
    image.onerror=error=>console.error(`Roweb v14 ${type} sprite failed`,error);
    image.src=window.ROWEB14_MOB_IMAGES?.[type]||'';
  }

  function visibleBounds(tile) {
    return {
      x0: Math.max(0,Math.floor(camera.x/tile)*tile-tile),
      y0: Math.max(0,Math.floor(camera.y/tile)*tile-tile),
      x1: Math.min(WORLD.width,camera.x+innerWidth+tile),
      y1: Math.min(WORLD.height,camera.y+innerHeight+tile)
    };
  }

  function tileArea(rects,x0,y0,x1,y1,tile=64,seed=0) {
    if(!worldSheet)return;
    const left=Math.max(x0,0),top=Math.max(y0,0),right=Math.min(x1,WORLD.width),bottom=Math.min(y1,WORLD.height);
    for(let y=Math.floor(top/tile)*tile;y<bottom;y+=tile){
      for(let x=Math.floor(left/tile)*tile;x<right;x+=tile){
        const ix=Math.floor(x/tile),iy=Math.floor(y/tile);
        const r=hash(ix+seed,iy-seed),rect=rects[Math.floor(r*rects.length)%rects.length];
        ctx.drawImage(worldSheet,...rect,Math.round(x),Math.round(y),tile+1,tile+1);
      }
    }
  }

  drawGround=function roweb14DrawGround(){
    if(!worldReady){previousDrawGround();return;}
    const tile=64,b=visibleBounds(tile);
    ctx.fillStyle='#657e53';ctx.fillRect(0,0,WORLD.width,WORLD.height);
    tileArea(WORLD_SPRITES.grass,b.x0,b.y0,b.x1,b.y1,tile,11);

    // Pilgrimage road: coherent stone tiles aligned to the cathedral.
    const roadX0=1208,roadX1=1392;
    tileArea(WORLD_SPRITES.stone,roadX0,b.y0,roadX1,b.y1,64,71);

    // Cathedral plaza and altar court.
    const plaza={x0:1088,y0:358,x1:1512,y1:850};
    tileArea(WORLD_SPRITES.stone,plaza.x0,Math.max(plaza.y0,b.y0),plaza.x1,Math.min(plaza.y1,b.y1),64,103);

    // Soft dirt/grass shoulders stop the road from looking pasted on top of the field.
    ctx.save();
    ctx.globalAlpha=.30;
    for(let y=b.y0;y<b.y1;y+=64){
      const v=Math.floor(y/64);
      const l=WORLD_SPRITES.grass[(v+3)%WORLD_SPRITES.grass.length];
      const r=WORLD_SPRITES.grass[(v+6)%WORLD_SPRITES.grass.length];
      ctx.drawImage(worldSheet,...l,1186,y,30,64);
      ctx.drawImage(worldSheet,...r,1384,y,30,64);
    }
    ctx.restore();

    // Sacred seal in front of the altar is scenery-only and does not alter collision.
    drawCrop(worldSheet,WORLD_SPRITES.seal,1300,812,150,36,'center');
    ctx.save();ctx.globalAlpha=.22;drawCrop(worldSheet,WORLD_SPRITES.seal,1300,812,195,46,'center');ctx.restore();
  };

  function graveFrame(s) {
    const [sx,sy,sw,sh]=WORLD_SPRITES.gravesStrip,parts=8,pw=sw/parts;
    const i=Math.floor(hash(Math.floor(s.x/40),Math.floor(s.y/40))*parts)%parts;
    return [sx+i*pw,sy,pw,sh];
  }
  function crystalFrame(s) {
    const [sx,sy,sw,sh]=WORLD_SPRITES.crystalsStrip,parts=7,pw=sw/parts;
    const i=Math.floor(hash(Math.floor(s.x/35)+3,Math.floor(s.y/35)+9)*parts)%parts;
    return [sx+i*pw,sy,pw,sh];
  }
  function pillarFrame(s) {
    const [sx,sy,sw,sh]=WORLD_SPRITES.pillarStrip,parts=6,pw=sw/parts;
    const i=Math.floor(hash(Math.floor(s.x/50),Math.floor(s.y/50))*parts)%parts;
    return [sx+i*pw,sy,pw,sh];
  }

  drawScenery=function roweb14DrawScenery(s){
    if(!worldReady){previousDrawScenery(s);return;}
    ctx.save();ctx.imageSmoothingEnabled=false;
    switch(s.type){
      case 'chapel': {
        const ground=s.y+s.h/2+6;
        drawShadow(s.x,ground+4,330,30,.23);
        drawCrop(worldSheet,WORLD_SPRITES.cathedral,s.x,ground,430,368);
        // side ruined masonry extends the silhouette without creating new collisions.
        ctx.globalAlpha=.94;
        drawCrop(worldSheet,WORLD_SPRITES.churchSide,s.x-255,ground-4,205,112);
        drawCrop(worldSheet,WORLD_SPRITES.churchSide,s.x+255,ground-4,205,112);
        break;
      }
      case 'altar': {
        const ground=s.y+42;
        drawShadow(s.x,ground+3,150,16,.18);
        drawCrop(worldSheet,WORLD_SPRITES.altar,s.x,ground,205,64);
        drawCrop(worldSheet,WORLD_SPRITES.brazier,s.x-112,ground-2,48,34);
        drawCrop(worldSheet,WORLD_SPRITES.brazier,s.x+112,ground-2,48,34);
        const pulse=.13+.05*Math.sin(now/260);
        drawRadialGlow(s.x,ground-38,92,'rgba(255,202,92,ALPHA)',pulse);
        break;
      }
      case 'grave': {
        drawShadow(s.x,s.y+17,36,9,.18);
        drawCrop(worldSheet,graveFrame(s),s.x,s.y+22,43,58);
        break;
      }
      case 'tree': {
        const dead=hash(Math.floor(s.x/100),Math.floor(s.y/100))<.25;
        const rect=dead?WORLD_SPRITES.deadTree:WORLD_SPRITES.leafTree;
        drawShadow(s.x,s.y+42,70,17,.20);
        drawCrop(worldSheet,rect,s.x,s.y+46,dead?82:94,dead?150:158);
        break;
      }
      case 'crystal': {
        const pulse=.14+.06*Math.sin(now/320+s.x);
        drawRadialGlow(s.x,s.y,66,'rgba(106,192,255,ALPHA)',pulse);
        drawShadow(s.x,s.y+19,38,8,.15);
        drawCrop(worldSheet,crystalFrame(s),s.x,s.y+22,50,64);
        break;
      }
      case 'pillar': {
        drawShadow(s.x,s.y+22,38,10,.18);
        drawCrop(worldSheet,pillarFrame(s),s.x,s.y+25,56,102);
        break;
      }
      case 'ruin': {
        drawShadow(s.x,s.y+20,75,12,.18);
        const left=hash(Math.floor(s.x/100),7)>.5;
        const [sx,sy,sw,sh]=WORLD_SPRITES.wallRuin;
        drawCrop(worldSheet,[sx+(left?sw/2:0),sy,sw/2,sh],s.x,s.y+26,102,68);
        break;
      }
      default: previousDrawScenery(s);
    }
    ctx.restore();
  };

  function mobFrame(m) {
    if(m.flashUntil>now)return MOB_FRAMES.hit[0];
    if(m.attackingUntil>now)return MOB_FRAMES.attack[Math.floor(now/85)%MOB_FRAMES.attack.length];
    if(m.moving)return MOB_FRAMES.move[Math.floor(now/120)%MOB_FRAMES.move.length];
    return MOB_FRAMES.idle[Math.floor(now/240)%MOB_FRAMES.idle.length];
  }
  function mobScale(m) {
    if(m.type==='poring')return 3.65;
    if(m.type==='eye')return 2.65;
    if(m.type==='bat')return 2.65;
    return 2.75;
  }
  function drawMobSprite(type,x,y,frame,scale,flash=false,alpha=1) {
    const img=mobImages[type];if(!img)return false;
    const w=FRAME*scale,h=FRAME*scale;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;
    if(flash)ctx.filter='brightness(1.7) saturate(.7)';
    ctx.drawImage(img,frame*FRAME,0,FRAME,FRAME,Math.round(x-w/2),Math.round(y-h+14),Math.round(w),Math.round(h));
    ctx.restore();return true;
  }

  drawMob=function roweb14DrawMob(m){
    if(!mobReady[m.type]){previousDrawMob(m);return;}
    const selected=selectedId===m.id;
    const scale=mobScale(m),ground=m.y+m.radius+9;
    drawShadow(m.x,ground,FRAME*scale*.55,9,m.type==='poring'?.27:.20);
    drawMobSprite(m.type,m.x,ground,mobFrame(m),scale,m.flashUntil>now);

    const barW=m.boss?92:52,barY=m.y-m.radius-(m.boss?58:39);
    ctx.textAlign='center';ctx.font=m.boss?'700 11px sans-serif':'9px sans-serif';ctx.fillStyle=selected?'#fff1b8':'#f4e9e7';ctx.fillText(m.name,m.x,barY-5);
    ctx.fillStyle='rgba(19,15,22,.72)';ctx.fillRect(m.x-barW/2,barY,barW,5);
    ctx.fillStyle=m.boss?'#cf315f':'#bd3b59';ctx.fillRect(m.x-barW/2,barY,barW*clamp(m.hp/m.maxHp,0,1),5);
    if(selected){ctx.strokeStyle='rgba(255,232,151,.75)';ctx.lineWidth=1;ctx.strokeRect(m.x-barW/2-.5,barY-.5,barW+1,6);}
  };

  if(window.Roweb?.events){
    Roweb.events.on('mob:killed',m=>deathEchoes.push({type:m.type,x:m.x,y:m.y,born:performance.now(),boss:m.boss}));
  }
  function drawDeathEchoes(){
    const t=performance.now();
    for(let i=deathEchoes.length-1;i>=0;i--){
      const d=deathEchoes[i],age=t-d.born;
      if(age>620){deathEchoes.splice(i,1);continue;}
      if(!mobReady[d.type])continue;
      const phase=Math.min(2,Math.floor(age/190)),frame=MOB_FRAMES.death[phase];
      const scale=(d.boss?3.65:2.7)*(1-age/2100),alpha=1-age/680;
      drawMobSprite(d.type,d.x,d.y+24,frame,scale,false,Math.max(0,alpha));
    }
  }
  drawEffects=function roweb14DrawEffects(){previousDrawEffects();drawDeathEchoes();};

  window.Roweb=window.Roweb||{};
  Roweb.graphics={version:'14.0.0',worldReady:()=>worldReady,mobReady:type=>Boolean(mobReady[type])};
  log('Gráficos v14 iniciados: novo tilemap, cenário e animações de monstros.','good');
})();
