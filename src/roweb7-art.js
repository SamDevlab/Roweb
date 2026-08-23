// Roweb v7 art polish: smaller, more organic cleric sprites and less grid-like terrain.
// Original assets rendered in canvas; no proprietary game sprites are included.
(() => {
  const px=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const poly=(c,pts,col)=>{c.fillStyle=col;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();c.fill();};
  const hash=(x,y)=>{let n=(x*374761393+y*668265263)>>>0;n=(n^(n>>13))*1274126177>>>0;return((n^(n>>16))>>>0)/4294967295;};

  function pal(job){
    if(job==='Sumo Sacerdote')return{outline:'#3b3441',hair:'#d9c6af',hairHi:'#f0dfc6',skin:'#e7b094',skinSh:'#bd7668',main:'#e9e8e2',shade:'#b9c4d3',accent:'#617899',trim:'#d4aa63',boot:'#55464d'};
    if(job==='Sacerdote')return{outline:'#3b3038',hair:'#c5beb8',hairHi:'#e8e2da',skin:'#e7b094',skinSh:'#bd7668',main:'#eee4d8',shade:'#d5c2b2',accent:'#9f3f50',trim:'#6c3440',boot:'#57434a'};
    return{outline:'#45343a',hair:'#b66f50',hairHi:'#d89a72',skin:'#e7b094',skinSh:'#bd7668',main:'#e6cba7',shade:'#c69670',accent:'#81543f',trim:'#684235',boot:'#5f473e'};
  }

  function head(c,ox,oy,row,p,bob){
    // compact chibi head with irregular hair silhouette
    if(row===3){
      px(c,ox+14,oy+6+bob,16,3,p.outline);px(c,ox+11,oy+9+bob,22,11,p.outline);px(c,ox+13,oy+8+bob,18,12,p.hair);
      px(c,ox+11,oy+12+bob,4,8,p.hair);px(c,ox+29,oy+12+bob,4,8,p.hair);px(c,ox+18,oy+7+bob,9,3,p.hairHi);px(c,ox+14,oy+18+bob,16,3,p.outline);return;
    }
    const side=row===1||row===2, right=row===2;
    px(c,ox+13,oy+8+bob,18,14,p.outline);px(c,ox+14,oy+9+bob,16,13,p.skin);
    if(side){
      px(c,ox+(right?16:12),oy+6+bob,18,7,p.outline);px(c,ox+(right?17:13),oy+7+bob,16,7,p.hair);px(c,ox+(right?29:11),oy+10+bob,4,11,p.hair);
      px(c,ox+(right?27:16),oy+15+bob,2,2,'#40343a');px(c,ox+(right?30:13),oy+18+bob,2,2,p.skinSh);px(c,ox+20,oy+7+bob,7,2,p.hairHi);
    }else{
      px(c,ox+11,oy+6+bob,22,7,p.outline);px(c,ox+12,oy+7+bob,20,7,p.hair);px(c,ox+11,oy+10+bob,4,10,p.hair);px(c,ox+29,oy+10+bob,4,10,p.hair);
      px(c,ox+17,oy+6+bob,10,3,p.hairHi);px(c,ox+17,oy+14+bob,2,2,'#40343a');px(c,ox+26,oy+14+bob,2,2,'#40343a');px(c,ox+21,oy+19+bob,3,1,'#925f5c');
    }
  }

  function bodyFront(c,ox,oy,job,p,bob,step,cast){
    const top=24+bob;
    if(job==='Noviço'){
      poly(c,[[ox+11,top],[ox+33,top],[ox+36,oy+42+bob],[ox+31,oy+47+bob],[ox+13,oy+47+bob],[ox+8,oy+42+bob]],p.outline);
      poly(c,[[ox+13,top+1],[ox+31,top+1],[ox+33,oy+41+bob],[ox+29,oy+45+bob],[ox+15,oy+45+bob],[ox+11,oy+41+bob]],p.main);
      px(c,ox+16,oy+27+bob,12,14,p.shade);px(c,ox+20,oy+27+bob,4,15,p.accent);px(c,ox+13,oy+35+bob,18,2,p.trim);
    }else{
      poly(c,[[ox+10,top],[ox+34,top],[ox+37,oy+46+bob],[ox+31,oy+50+bob],[ox+13,oy+50+bob],[ox+7,oy+46+bob]],p.outline);
      poly(c,[[ox+12,top+1],[ox+32,top+1],[ox+34,oy+45+bob],[ox+29,oy+48+bob],[ox+15,oy+48+bob],[ox+10,oy+45+bob]],p.main);
      // colored stole/side panels instead of a white rectangle
      poly(c,[[ox+12,oy+26+bob],[ox+17,oy+27+bob],[ox+18,oy+44+bob],[ox+13,oy+47+bob]],p.accent);
      poly(c,[[ox+32,oy+26+bob],[ox+27,oy+27+bob],[ox+26,oy+44+bob],[ox+31,oy+47+bob]],p.accent);
      px(c,ox+20,oy+26+bob,4,21,p.trim);px(c,ox+18,oy+31+bob,8,2,p.trim);px(c,ox+21,oy+28+bob,2,9,'#f2dfb9');
      if(job==='Sumo Sacerdote'){px(c,ox+15,oy+39+bob,14,3,p.shade);px(c,ox+18,oy+43+bob,8,3,p.accent);}
    }
    // sleeves/hands, brought closer to body
    if(cast){px(c,ox+4,oy+29+bob,9,5,p.outline);px(c,ox+5,oy+30+bob,8,4,p.skin);px(c,ox+31,oy+29+bob,9,5,p.outline);px(c,ox+31,oy+30+bob,8,4,p.skin);}else{
      px(c,ox+7,oy+29+bob,6,14,p.outline);px(c,ox+8,oy+30+bob,5,12,p.main);px(c,ox+31,oy+29+bob,6,14,p.outline);px(c,ox+31,oy+30+bob,5,12,p.main);px(c,ox+8,oy+41+bob,5,3,p.skinSh);px(c,ox+31,oy+41+bob,5,3,p.skinSh);
    }
    // separated legs and wider feet for classic MMO silhouette
    px(c,ox+14+step,oy+47+bob,8,6,p.outline);px(c,ox+22-step,oy+47+bob,8,6,p.outline);px(c,ox+15+step,oy+47+bob,6,5,p.shade);px(c,ox+23-step,oy+47+bob,6,5,p.shade);
    px(c,ox+11+step,oy+52+bob,11,4,p.outline);px(c,ox+22-step,oy+52+bob,11,4,p.outline);px(c,ox+12+step,oy+52+bob,9,3,p.boot);px(c,ox+23-step,oy+52+bob,9,3,p.boot);
  }

  function bodyBack(c,ox,oy,job,p,bob,step){
    const top=23+bob;
    if(job==='Noviço'){
      poly(c,[[ox+11,top],[ox+33,top],[ox+36,oy+44+bob],[ox+31,oy+48+bob],[ox+13,oy+48+bob],[ox+8,oy+44+bob]],p.outline);
      poly(c,[[ox+13,top+1],[ox+31,top+1],[ox+33,oy+43+bob],[ox+29,oy+46+bob],[ox+15,oy+46+bob],[ox+11,oy+43+bob]],p.main);px(c,ox+17,oy+27+bob,10,16,p.shade);
    }else{
      poly(c,[[ox+9,top],[ox+35,top],[ox+38,oy+46+bob],[ox+31,oy+50+bob],[ox+13,oy+50+bob],[ox+6,oy+46+bob]],p.outline);
      poly(c,[[ox+11,top+1],[ox+33,top+1],[ox+35,oy+45+bob],[ox+29,oy+48+bob],[ox+15,oy+48+bob],[ox+9,oy+45+bob]],p.accent);
      poly(c,[[ox+15,oy+25+bob],[ox+29,oy+25+bob],[ox+30,oy+46+bob],[ox+14,oy+46+bob]],p.main);px(c,ox+20,oy+27+bob,4,18,p.trim);
    }
    px(c,ox+14+step,oy+48+bob,8,5,p.outline);px(c,ox+22-step,oy+48+bob,8,5,p.outline);px(c,ox+11+step,oy+52+bob,11,4,p.outline);px(c,ox+22-step,oy+52+bob,11,4,p.outline);px(c,ox+12+step,oy+52+bob,9,3,p.boot);px(c,ox+23-step,oy+52+bob,9,3,p.boot);
  }

  makePlayerSheet=function(job){
    const key=`v7:p:${job}`;if(spriteCache.has(key))return spriteCache.get(key);
    const fw=44,fh=58,frames=4,rows=4,s=document.createElement('canvas');s.width=fw*frames;s.height=fh*rows;const c=s.getContext('2d');c.imageSmoothingEnabled=false;const p=pal(job);
    for(let row=0;row<rows;row++)for(let f=0;f<frames;f++){
      const ox=f*fw,oy=row*fh,bob=f===1?1:f===3?-1:0,step=f===1?-1:f===3?1:0,cast=f===2;
      px(c,ox+10,oy+54,24,2,'rgba(40,31,34,.16)');head(c,ox,oy,row,p,bob);if(row===3)bodyBack(c,ox,oy,job,p,bob,step);else bodyFront(c,ox,oy,job,p,bob,step,cast);
      if(job==='Sumo Sacerdote'){c.strokeStyle='#e3bb72';c.lineWidth=1;c.beginPath();c.ellipse(ox+22,oy+3+bob,7,2,0,0,TAU);c.stroke();}
    }
    const out={sheet:s,fw,fh};spriteCache.set(key,out);return out;
  };

  drawSprite=function(data,e,scale=1.18){
    const {sheet,fw,fh}=data,row=dirRow[e.dir]??0;let frame=0;if(e.attackingUntil>now||e.castingUntil>now)frame=2;else if(e.moving){const seq=[0,1,0,3];frame=seq[Math.floor(now/145)%seq.length];}
    const dw=fw*scale,dh=fh*scale;ctx.drawImage(sheet,frame*fw,row*fh,fw,fh,Math.round(e.x-dw/2),Math.round(e.y-dh+e.radius+7),dw,dh);
  };

  drawPlayer=function(p){
    ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#2e2c28';ctx.beginPath();ctx.ellipse(p.x,p.y+11,16,5,0,0,TAU);ctx.fill();ctx.restore();if(p===player)drawKyrieBarrier();
    ctx.save();if(p.flashUntil>now){ctx.globalAlpha=.65;ctx.filter='brightness(1.65)';}drawSprite(makePlayerSheet(p.job||'Noviço'),p,1.18);ctx.restore();
    ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='700 10px sans-serif';ctx.fillText(p.name||'Aventureiro',p.x,p.y+31);ctx.fillStyle='#ddd5d5';ctx.font='9px sans-serif';ctx.fillText(`${p.job||'Noviço'} • Nv. ${p.level||1}`,p.x,p.y+43);
  };

  function grassPatch(x,y,size,n){
    const r=hash(x/size,y/size);const base=r<.22?'#78966c':r<.48?'#749168':r<.74?'#718d65':'#76936a';ctx.fillStyle=base;ctx.fillRect(x,y,size,size);
    if(r>.35){ctx.fillStyle='rgba(49,85,45,.22)';px(ctx,x+5+(n%5),y+8+(n%7),1,5,'rgba(48,82,43,.26)');px(ctx,x+8+(n%3),y+6+(n%9),1,4,'rgba(48,82,43,.18)');}
    if(r>.78)px(ctx,x+size-6,y+size-7,2,2,'rgba(211,210,143,.32)');
  }
  function stone(x,y,w,h,cw=28,ch=18){
    ctx.fillStyle='#968e7a';ctx.fillRect(x,y,w,h);for(let yy=y;yy<y+h;yy+=ch){const row=Math.floor((yy-y)/ch),off=row%2?cw/2:0;for(let xx=x-off;xx<x+w;xx+=cw){const rr=hash(Math.floor(xx/cw),Math.floor(yy/ch));ctx.fillStyle=rr>.55?'#a59c87':'#9d947f';ctx.fillRect(Math.round(xx+1),yy+1,cw-2,ch-2);ctx.fillStyle='rgba(255,248,213,.10)';ctx.fillRect(Math.round(xx+3),yy+3,cw-6,1);}}
  }

  drawGround=function(){
    ctx.fillStyle='#728f66';ctx.fillRect(0,0,WORLD.width,WORLD.height);const tile=24;let n=0;for(let y=0;y<WORLD.height;y+=tile)for(let x=0;x<WORLD.width;x+=tile)grassPatch(x,y,tile,n++);
    // subtle darker/bright irregular patches break the checkerboard read
    for(let i=0;i<150;i++){const x=(i*193+41)%WORLD.width,y=(i*137+83)%WORLD.height;if(x>1090&&x<1510&&y<870)continue;ctx.fillStyle=i%4===0?'rgba(48,79,43,.10)':'rgba(218,215,151,.08)';ctx.fillRect(x,y,10+(i%4)*4,3+(i%3));}
    // narrower pilgrimage road with grass transition shoulders
    ctx.fillStyle='rgba(92,82,66,.38)';ctx.fillRect(1210,0,180,WORLD.height);ctx.fillStyle='#777061';ctx.fillRect(1220,0,160,WORLD.height);stone(1228,0,144,WORLD.height,32,22);
    for(let y=0;y<WORLD.height;y+=38){const l=hash(1,y),r=hash(2,y);ctx.fillStyle='#718d65';ctx.fillRect(1214,y+Math.floor(l*10),8,22);ctx.fillRect(1378,y+Math.floor(r*10),8,22);}
    // cathedral plaza as one coherent stone field, no floating slab
    ctx.fillStyle='#766e61';ctx.fillRect(1110,374,380,470);stone(1118,382,364,454,30,20);
    // entrance and altar use the same material family
    stone(1220,342,160,66,32,18);ctx.fillStyle='#786f61';ctx.fillRect(1208,646,184,128);stone(1214,653,172,112,28,18);ctx.fillStyle='#c0b39a';ctx.fillRect(1208,644,184,6);ctx.fillStyle='#665e53';ctx.fillRect(1208,770,184,6);
  };

  drawChapel=function(s){
    const x=s.x-s.w/2,y=s.y-s.h/2,b=y+s.h;
    ctx.fillStyle='rgba(42,35,36,.22)';ctx.fillRect(x+16,y+85,s.w-32,s.h-50);
    // wall mass with vertical pilasters
    ctx.fillStyle='#8f8880';ctx.fillRect(x+24,y+76,s.w-48,s.h-76);ctx.fillStyle='#aaa198';ctx.fillRect(x+32,y+84,s.w-64,s.h-92);
    for(const px0 of[x+48,x+112,x+s.w-128,x+s.w-64]){ctx.fillStyle='#827a74';ctx.fillRect(px0,y+92,18,s.h-104);ctx.fillStyle='#b1a79d';ctx.fillRect(px0+3,y+92,5,s.h-104);}
    // roof layers
    poly(ctx,[[x-10,y+82],[s.x,y-4],[x+s.w+10,y+82]],'#4d474d');poly(ctx,[[x+24,y+77],[s.x,y+18],[x+s.w-24,y+77]],'#6e6469');ctx.fillStyle='#b7aca1';ctx.fillRect(x+26,y+76,s.w-52,9);
    // central entrance tower/arch
    ctx.fillStyle='#968e88';ctx.fillRect(s.x-58,y+98,116,b-y-98);ctx.fillStyle='#b0a69d';ctx.fillRect(s.x-50,y+106,100,b-y-106);
    const dw=48,dh=74,dx=s.x-dw/2,dy=b-dh;ctx.fillStyle='#3e3439';ctx.fillRect(dx,dy,dw,dh);ctx.fillStyle='#594744';ctx.fillRect(dx+5,dy+7,dw-10,dh-7);
    // arch cap and door seam
    ctx.fillStyle='#3e3439';ctx.beginPath();ctx.arc(s.x,dy+7,dw/2,Math.PI,0);ctx.fill();ctx.fillStyle='#594744';ctx.beginPath();ctx.arc(s.x,dy+8,(dw-10)/2,Math.PI,0);ctx.fill();ctx.fillStyle='#30282d';ctx.fillRect(s.x-2,dy+6,4,dh-6);ctx.fillStyle='#d0b276';ctx.fillRect(dx+9,dy+40,3,3);
    // windows with frames
    for(const wx of[x+85,x+s.w-117]){ctx.fillStyle='#4c5157';ctx.fillRect(wx,y+120,32,52);ctx.fillStyle='#9fbab8';ctx.fillRect(wx+3,y+123,26,46);ctx.fillStyle='#596568';ctx.fillRect(wx+14,y+123,3,46);ctx.fillRect(wx+3,y+144,26,3);ctx.fillStyle='rgba(238,240,204,.16)';ctx.fillRect(wx+6,y+127,7,13);}
    // steps are attached to the door and plaza
    ctx.fillStyle='#80776b';ctx.fillRect(s.x-40,b,80,7);ctx.fillStyle='#a69b87';ctx.fillRect(s.x-52,b+7,104,7);ctx.fillStyle='#c1b49b';ctx.fillRect(s.x-64,b+14,128,7);
    // attached cross
    ctx.fillStyle='#514a50';ctx.fillRect(s.x-5,y-19,10,29);ctx.fillRect(s.x-17,y-10,34,8);
  };

  // keep all non-chapel scenery from v6, replace chapel only
  const prevDrawScenery=drawScenery;drawScenery=function(s){if(s.type==='chapel')return drawChapel(s);return prevDrawScenery(s);};

  try{spriteCache.clear();}catch{}ctx.imageSmoothingEnabled=false;canvas.style.imageRendering='pixelated';
  log('Arte v7 ativa: sprite clerical menor, silhueta recortada e terreno sem faixas grandes.','good');
})();