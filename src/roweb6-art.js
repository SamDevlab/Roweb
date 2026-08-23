// Roweb v6 art direction: original classic-MMO cleric sprites and a more coherent sanctuary map.
// Inspired by the visual language of late-90s/early-2000s 2D MMORPGs, without using proprietary assets.
(() => {
  const P = (c,x,y,w,h,color) => { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };
  const POLY = (c,pts,color) => { c.fillStyle=color; c.beginPath(); c.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) c.lineTo(pts[i][0],pts[i][1]); c.closePath(); c.fill(); };

  function palette(job){
    if(job==='Sumo Sacerdote') return {hair:'#d8c7ad',hair2:'#f0dfc7',skin:'#e7b398',skin2:'#c9826d',robe:'#eeeae0',shade:'#c8d3df',outer:'#5d7396',trim:'#d4a15f',boot:'#55474b'};
    if(job==='Sacerdote') return {hair:'#c9c3bc',hair2:'#e9e4dc',skin:'#e7b398',skin2:'#c9826d',robe:'#eee3d7',shade:'#dbc9ba',outer:'#a63f4e',trim:'#6e3540',boot:'#574449'};
    return {hair:'#b77657',hair2:'#d99a73',skin:'#e7b398',skin2:'#c9826d',robe:'#e8cfaa',shade:'#c99872',outer:'#8a5a43',trim:'#6f4939',boot:'#60473e'};
  }

  function drawHead(c,ox,oy,row,p,bob){
    if(row===3){
      P(c,ox+15,oy+7+bob,18,17,p.hair); P(c,ox+13,oy+10+bob,4,12,p.hair); P(c,ox+31,oy+10+bob,4,12,p.hair); P(c,ox+18,oy+6+bob,10,3,p.hair2); return;
    }
    if(row===1||row===2){
      const right=row===2; P(c,ox+15,oy+8+bob,17,16,p.skin); P(c,ox+(right?17:13),oy+6+bob,18,8,p.hair); P(c,ox+(right?29:13),oy+10+bob,4,11,p.hair); P(c,ox+20,oy+6+bob,8,3,p.hair2); P(c,ox+(right?28:17),oy+15+bob,2,2,'#493d42'); P(c,ox+(right?31:14),oy+18+bob,2,2,p.skin2); return;
    }
    P(c,ox+15,oy+8+bob,18,16,p.skin); P(c,ox+13,oy+6+bob,22,8,p.hair); P(c,ox+13,oy+10+bob,4,11,p.hair); P(c,ox+31,oy+10+bob,4,11,p.hair); P(c,ox+18,oy+5+bob,11,4,p.hair2);
    P(c,ox+19,oy+15+bob,2,2,'#493d42'); P(c,ox+28,oy+15+bob,2,2,'#493d42'); P(c,ox+23,oy+20+bob,3,1,'#9a625d');
  }

  makePlayerSheet = function(job){
    const key=`v6:p:${job}`; if(spriteCache.has(key)) return spriteCache.get(key);
    const fw=48,fh=62,frames=4,rows=4,s=document.createElement('canvas'); s.width=fw*frames; s.height=fh*rows;
    const c=s.getContext('2d'); c.imageSmoothingEnabled=false; const p=palette(job);
    for(let row=0;row<rows;row++) for(let f=0;f<frames;f++){
      const ox=f*fw,oy=row*fh,bob=f===1?1:f===3?-1:0,step=f===1?-2:f===3?2:0,cast=f===2;
      P(c,ox+11,oy+55,27,3,'rgba(42,30,32,.18)');
      drawHead(c,ox,oy,row,p,bob);
      if(row===3){
        if(job==='Noviço'){
          POLY(c,[[ox+13,oy+25+bob],[ox+35,oy+25+bob],[ox+37,oy+47+bob],[ox+11,oy+47+bob]],p.robe);
          P(c,ox+17,oy+27+bob,14,17,p.shade); P(c,ox+12,oy+31+bob,5,14,p.outer); P(c,ox+31,oy+31+bob,5,14,p.outer);
        } else {
          POLY(c,[[ox+10,oy+24+bob],[ox+38,oy+24+bob],[ox+40,oy+49+bob],[ox+8,oy+49+bob]],p.outer);
          POLY(c,[[ox+16,oy+26+bob],[ox+32,oy+26+bob],[ox+34,oy+50+bob],[ox+14,oy+50+bob]],p.robe);
          P(c,ox+22,oy+27+bob,4,20,p.trim);
        }
      } else {
        const bodyTop=25+bob;
        if(job==='Noviço'){
          POLY(c,[[ox+13,bodyTop],[ox+35,bodyTop],[ox+38,oy+45+bob],[ox+10,oy+45+bob]],p.robe);
          P(c,ox+16,oy+27+bob,16,15,p.shade); P(c,ox+21,oy+27+bob,5,16,p.outer); P(c,ox+11,oy+36+bob,26,3,p.trim);
          P(c,ox+7,oy+28+bob,7,16,p.robe); P(c,ox+34,oy+28+bob,7,16,p.robe);
        } else if(job==='Sacerdote'){
          POLY(c,[[ox+11,bodyTop],[ox+37,bodyTop],[ox+40,oy+49+bob],[ox+8,oy+49+bob]],p.robe);
          P(c,ox+10,oy+27+bob,7,19,p.outer); P(c,ox+31,oy+27+bob,7,19,p.outer);
          P(c,ox+17,oy+27+bob,14,19,p.outer); P(c,ox+22,oy+27+bob,4,19,p.robe); P(c,ox+12,oy+35+bob,24,3,p.trim);
          P(c,ox+23,oy+28+bob,2,9,'#ead9b2'); P(c,ox+20,oy+31+bob,8,2,'#ead9b2');
        } else {
          POLY(c,[[ox+10,bodyTop],[ox+38,bodyTop],[ox+41,oy+50+bob],[ox+7,oy+50+bob]],p.robe);
          P(c,ox+9,oy+27+bob,8,20,p.outer); P(c,ox+31,oy+27+bob,8,20,p.outer); P(c,ox+16,oy+28+bob,16,20,p.shade);
          P(c,ox+22,oy+27+bob,4,21,p.trim); P(c,ox+12,oy+35+bob,24,3,p.trim); P(c,ox+23,oy+28+bob,2,9,'#f3d797'); P(c,ox+20,oy+31+bob,8,2,'#f3d797');
          c.strokeStyle='#ffe2a1'; c.lineWidth=1; c.beginPath(); c.ellipse(ox+24,oy+3+bob,9,2,0,0,TAU); c.stroke();
        }
        if(cast){
          if(row===0){ P(c,ox+5,oy+31+bob,9,6,p.skin); P(c,ox+34,oy+31+bob,9,6,p.skin); }
          else if(row===1){ P(c,ox+2,oy+31+bob,12,6,p.skin); }
          else { P(c,ox+34,oy+31+bob,12,6,p.skin); }
        } else { P(c,ox+8,oy+42+bob,6,4,p.skin2); P(c,ox+34,oy+42+bob,6,4,p.skin2); }
      }
      if(job==='Noviço'){
        P(c,ox+13+step,oy+46+bob,9,8,p.outer); P(c,ox+27-step,oy+46+bob,9,8,p.outer);
      } else {
        P(c,ox+13+step,oy+48+bob,9,7,p.shade); P(c,ox+27-step,oy+48+bob,9,7,p.shade);
      }
      P(c,ox+12+step,oy+53+bob,11,5,p.boot); P(c,ox+26-step,oy+53+bob,11,5,p.boot);
      P(c,ox+15,oy+27+bob,2,9,'rgba(255,255,255,.18)');
    }
    const out={sheet:s,fw,fh}; spriteCache.set(key,out); return out;
  };

  drawSprite = function(data,e,scale=2){
    const {sheet,fw,fh}=data,row=dirRow[e.dir]??0; let frame=0;
    if(e.attackingUntil>now||e.castingUntil>now) frame=2;
    else if(e.moving){ const seq=[0,1,0,3]; frame=seq[Math.floor(now/135)%seq.length]; }
    const dw=fw*scale,dh=fh*scale;
    ctx.drawImage(sheet,frame*fw,row*fh,fw,fh,Math.round(e.x-dw/2),Math.round(e.y-dh+e.radius+9),dw,dh);
  };

  drawPlayer = function(p){
    ctx.save(); ctx.globalAlpha=.24; ctx.fillStyle='#2d2529'; ctx.beginPath(); ctx.ellipse(p.x,p.y+12,20,7,0,0,TAU); ctx.fill(); ctx.restore();
    if(p===player) drawKyrieBarrier();
    ctx.save(); if(p.flashUntil>now){ctx.globalAlpha=.62;ctx.filter='brightness(1.8)';}
    drawSprite(makePlayerSheet(p.job||'Noviço'),p,1.42); ctx.restore();
    ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='700 11px sans-serif'; ctx.fillText(p.name||'Aventureiro',p.x,p.y+35);
    ctx.fillStyle='#d9d1d8'; ctx.font='10px sans-serif'; ctx.fillText(`${p.job||'Noviço'} • Nv. ${p.level||1}`,p.x,p.y+48);
  };

  function grassTile(x,y,size,n){
    ctx.fillStyle=n%4===0?'#719064':n%4===1?'#78966b':n%4===2?'#6b895f':'#769169'; ctx.fillRect(x,y,size,size);
    ctx.fillStyle='rgba(51,87,44,.24)';
    if(n%3===0){P(ctx,x+7,y+12,2,8,'rgba(54,91,47,.32)');P(ctx,x+11,y+8,2,6,'rgba(54,91,47,.26)');}
    if(n%5===0){P(ctx,x+size-11,y+size-13,3,3,'rgba(210,205,133,.26)');}
  }
  function stoneField(x,y,w,h,cellW=36,cellH=24){
    ctx.fillStyle='#9b927e'; ctx.fillRect(x,y,w,h); ctx.fillStyle='#786f62';
    for(let yy=y;yy<y+h;yy+=cellH){
      const row=Math.floor((yy-y)/cellH),offset=row%2?Math.floor(cellW/2):0;
      for(let xx=x-offset;xx<x+w;xx+=cellW){
        ctx.fillStyle=((xx+yy)/8)%3<1?'#aaa18b':'#a09782'; ctx.fillRect(xx+2,yy+2,cellW-4,cellH-4);
        ctx.fillStyle='rgba(255,255,230,.12)'; ctx.fillRect(xx+4,yy+4,cellW-8,2);
      }
    }
  }

  drawGround = function(){
    ctx.fillStyle='#708d63'; ctx.fillRect(0,0,WORLD.width,WORLD.height);
    const tile=40; for(let y=0;y<WORLD.height;y+=tile) for(let x=0;x<WORLD.width;x+=tile){ const n=((x/tile)*17+(y/tile)*29)%11; grassTile(x,y,tile,n); }
    // Main pilgrimage road.
    ctx.fillStyle='#716b5e'; ctx.fillRect(1198,0,204,WORLD.height);
    stoneField(1210,0,180,WORLD.height,45,31);
    ctx.fillStyle='rgba(64,57,49,.24)'; ctx.fillRect(1198,0,8,WORLD.height); ctx.fillRect(1394,0,8,WORLD.height);
    // Cathedral forecourt, aligned to the chapel facade and altar.
    ctx.fillStyle='#726b60'; ctx.fillRect(1095,398,410,455); stoneField(1106,410,388,430,38,27);
    ctx.fillStyle='#6c6459'; ctx.fillRect(1106,410,388,8); ctx.fillRect(1106,832,388,8); ctx.fillRect(1106,410,8,430); ctx.fillRect(1486,410,8,430);
    // Short entrance apron so the church door visually lands on the ground.
    stoneField(1214,360,172,82,43,22);
    // Raised altar dais integrated with the forecourt tiles.
    ctx.fillStyle='#776f62'; ctx.fillRect(1202,656,196,132); stoneField(1210,664,180,112,36,22);
    ctx.fillStyle='#c0b49b'; ctx.fillRect(1200,650,200,8); ctx.fillStyle='#675f55'; ctx.fillRect(1200,782,200,7);
    for(let i=0;i<110;i++){
      const x=(i*223+71)%WORLD.width,y=(i*149+39)%WORLD.height; if(x>1070&&x<1525&&y>330&&y<870) continue;
      ctx.fillStyle=i%3?'rgba(212,215,151,.17)':'rgba(45,78,40,.22)'; ctx.fillRect(x,y,2+(i%2),5+(i%5));
    }
  };

  drawChapel = function(s){
    const x=s.x-s.w/2,y=s.y-s.h/2,bottom=y+s.h;
    ctx.fillStyle='rgba(45,37,38,.22)'; ctx.fillRect(x+18,y+84,s.w-36,s.h-58);
    ctx.fillStyle='#8c8580'; ctx.fillRect(x+22,y+76,s.w-44,s.h-76);
    ctx.fillStyle='#aaa099'; ctx.fillRect(x+30,y+86,s.w-60,s.h-96);
    // Roof and trim.
    ctx.fillStyle='#514a50'; POLY(ctx,[[x-4,y+80],[s.x,y+2],[x+s.w+4,y+80]],'#514a50');
    ctx.fillStyle='#70666a'; POLY(ctx,[[x+28,y+75],[s.x,y+22],[x+s.w-28,y+75]],'#70666a');
    ctx.fillStyle='#b9aea4'; ctx.fillRect(x+26,y+76,s.w-52,10);
    // Central facade and grounded door.
    ctx.fillStyle='#9c938d'; ctx.fillRect(s.x-54,y+100,108,bottom-(y+100));
    ctx.fillStyle='#756c68'; ctx.fillRect(s.x-47,y+108,94,9);
    const doorW=50,doorH=76,doorX=s.x-doorW/2,doorY=bottom-doorH;
    ctx.fillStyle='#40363b'; ctx.fillRect(doorX,doorY,doorW,doorH);
    ctx.fillStyle='#5b4845'; ctx.fillRect(doorX+6,doorY+7,doorW-12,doorH-7);
    ctx.fillStyle='#31292e'; ctx.fillRect(s.x-3,doorY+7,6,doorH-7); ctx.fillStyle='#d0b375'; ctx.fillRect(doorX+9,doorY+39,4,4);
    // Windows.
    for(const wx of[x+76,x+s.w-108]){
      ctx.fillStyle='#50555b'; ctx.fillRect(wx-3,y+118,38,58); ctx.fillStyle='#a9c7c1'; ctx.fillRect(wx,y+121,32,52);
      ctx.fillStyle='#59666a'; ctx.fillRect(wx+14,y+121,4,52); ctx.fillRect(wx,y+144,32,4);
      ctx.fillStyle='rgba(235,241,204,.18)'; ctx.fillRect(wx+4,y+125,9,15);
    }
    // Steps touch the door and the apron.
    ctx.fillStyle='#82796d'; ctx.fillRect(s.x-42,bottom,84,8); ctx.fillStyle='#a79c88'; ctx.fillRect(s.x-54,bottom+8,108,8); ctx.fillStyle='#c2b59b'; ctx.fillRect(s.x-66,bottom+16,132,8);
    // Cross fixed to roof instead of floating.
    ctx.fillStyle='#554e53'; ctx.fillRect(s.x-6,y-19,12,30); ctx.fillRect(s.x-19,y-10,38,9);
  };

  drawScenery = function(s){
    if(s.type==='chapel') return drawChapel(s);
    if(s.type==='altar'){
      ctx.fillStyle='rgba(42,32,34,.20)'; ctx.beginPath(); ctx.ellipse(s.x,s.y+31,92,21,0,0,TAU); ctx.fill();
      ctx.fillStyle='#766d66'; ctx.fillRect(s.x-82,s.y+10,164,28); ctx.fillStyle='#a59a8e'; ctx.fillRect(s.x-74,s.y-20,148,38);
      ctx.fillStyle='#d4c7ae'; ctx.fillRect(s.x-62,s.y-30,124,13); ctx.fillStyle='#eee2c7'; ctx.fillRect(s.x-55,s.y-27,110,4);
      ctx.fillStyle='#f4dc87'; ctx.fillRect(s.x-3,s.y-70,6,42); ctx.fillRect(s.x-14,s.y-57,28,5); addStaticHalo(s.x,s.y-61); return;
    }
    if(s.type==='grave'){
      ctx.fillStyle='rgba(37,31,30,.20)'; ctx.beginPath(); ctx.ellipse(s.x,s.y+15,23,9,0,0,TAU); ctx.fill();
      ctx.fillStyle='#716e69'; ctx.fillRect(s.x-14,s.y-22,28,40); ctx.fillStyle='#96918a'; ctx.fillRect(s.x-11,s.y-19,22,34); ctx.fillStyle='#6d6965'; ctx.fillRect(s.x-20,s.y-11,40,8); ctx.fillStyle='rgba(255,255,255,.10)'; ctx.fillRect(s.x-7,s.y-15,3,20); return;
    }
    if(s.type==='tree'){
      ctx.fillStyle='rgba(41,57,34,.24)'; ctx.beginPath(); ctx.ellipse(s.x,s.y+33,45,17,0,0,TAU); ctx.fill();
      ctx.fillStyle='#5b4938'; ctx.fillRect(s.x-8,s.y-4,16,44); ctx.fillStyle='#735b43'; ctx.fillRect(s.x-4,s.y,5,36);
      const blobs=[[-23,-19,29,'#405f39'],[18,-19,31,'#46663e'],[-2,-43,32,'#4c6e42'],[-27,-42,21,'#527648'],[25,-44,22,'#4b7043']];
      for(const [dx,dy,r,col] of blobs){ctx.fillStyle=col;ctx.beginPath();ctx.arc(s.x+dx,s.y+dy,r,0,TAU);ctx.fill();}
      ctx.fillStyle='rgba(196,218,137,.23)'; ctx.beginPath(); ctx.arc(s.x-12,s.y-52,10,0,TAU); ctx.fill(); return;
    }
    if(s.type==='pillar'){
      ctx.fillStyle='rgba(39,34,31,.18)'; ctx.fillRect(s.x-23,s.y+14,46,8); ctx.fillStyle='#817a72'; ctx.fillRect(s.x-15,s.y-46,30,60); ctx.fillStyle='#a69c90'; ctx.fillRect(s.x-22,s.y-52,44,9); ctx.fillRect(s.x-22,s.y+10,44,9); ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(s.x-10,s.y-42,4,48); return;
    }
    if(s.type==='ruin'){
      ctx.fillStyle='rgba(36,31,29,.18)'; ctx.fillRect(s.x-39,s.y+11,78,8); ctx.fillStyle='#716b62'; ctx.fillRect(s.x-35,s.y-15,70,28); ctx.fillStyle='#948a7c'; ctx.fillRect(s.x-22,s.y-30,44,18); ctx.fillStyle='#b0a492'; ctx.fillRect(s.x-15,s.y-27,16,4); return;
    }
    if(s.type==='crystal'){
      ctx.fillStyle='rgba(104,195,209,.16)';ctx.beginPath();ctx.arc(s.x,s.y,32,0,TAU);ctx.fill();
      POLY(ctx,[[s.x,s.y-32],[s.x+17,s.y+7],[s.x,s.y+28],[s.x-14,s.y+5]],'#78c8d8'); POLY(ctx,[[s.x,s.y-25],[s.x+5,s.y+5],[s.x,s.y+20],[s.x-4,s.y+3]],'#c7f1f4'); return;
    }
  };

  try{spriteCache.clear();}catch{}
  canvas.style.imageRendering='pixelated'; ctx.imageSmoothingEnabled=false;
  log('Direção visual v6 ativa: personagem refinado, catedral aterrada e tiles mais coerentes.','good');
})();
