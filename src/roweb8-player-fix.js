// Roweb v8 player-only art fix.
// Keeps v7 map/scenery intact and replaces only player sprite construction.
(() => {
  const px=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const poly=(c,pts,col)=>{c.fillStyle=col;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();c.fill();};

  function pal(job){
    if(job==='Sumo Sacerdote') return {ol:'#342f3c',skin:'#e9b69b',skinSh:'#c77e6d',hair:'#d7c5ae',hairHi:'#f1dfc8',white:'#eeeae2',whiteSh:'#c6ced7',main:'#60799e',mainSh:'#465c7c',trim:'#d8ae63',pants:'#726276',boot:'#51464d'};
    if(job==='Sacerdote') return {ol:'#382e37',skin:'#e9b69b',skinSh:'#c77e6d',hair:'#c9c1ba',hairHi:'#eee6dd',white:'#eee3d7',whiteSh:'#d6c5b6',main:'#a74354',mainSh:'#76313f',trim:'#e3c593',pants:'#765662',boot:'#554148'};
    return {ol:'#403239',skin:'#e9b69b',skinSh:'#c77e6d',hair:'#b87251',hairHi:'#d99a72',white:'#e8cfaa',whiteSh:'#c69570',main:'#81543f',mainSh:'#684133',trim:'#b98058',pants:'#8a654c',boot:'#5e463c'};
  }

  function hairFront(c,x,y,p){
    px(c,x+16,y+5,16,2,p.ol); px(c,x+12,y+7,24,7,p.ol); px(c,x+10,y+11,4,10,p.ol); px(c,x+34,y+11,4,10,p.ol);
    px(c,x+14,y+8,20,7,p.hair); px(c,x+12,y+11,5,9,p.hair); px(c,x+31,y+11,5,9,p.hair);
    px(c,x+18,y+6,11,3,p.hairHi); px(c,x+14,y+17,3,4,p.hair); px(c,x+31,y+17,3,4,p.hair);
  }

  function headFront(c,x,y,p,bob){
    const yy=y+bob; px(c,x+14,yy+9,20,15,p.ol); px(c,x+15,yy+10,18,13,p.skin); hairFront(c,x,yy,p);
    px(c,x+19,yy+15,2,2,'#40343a'); px(c,x+27,yy+15,2,2,'#40343a'); px(c,x+23,yy+20,3,1,'#965f5c');
  }
  function headBack(c,x,y,p,bob){
    const yy=y+bob; px(c,x+14,yy+8,20,15,p.ol); px(c,x+15,yy+9,18,13,p.hair); px(c,x+12,yy+11,5,11,p.hair); px(c,x+31,yy+11,5,11,p.hair); px(c,x+18,yy+7,12,3,p.hairHi); px(c,x+17,yy+20,14,3,p.ol);
  }
  function headSide(c,x,y,p,bob,right){
    const yy=y+bob; px(c,x+15,yy+9,18,14,p.ol); px(c,x+16,yy+10,16,12,p.skin);
    px(c,x+(right?16:12),yy+7,20,7,p.ol); px(c,x+(right?17:13),yy+8,18,7,p.hair); px(c,x+(right?31:11),yy+11,4,11,p.hair); px(c,x+20,yy+7,8,3,p.hairHi);
    px(c,x+(right?28:18),yy+15,2,2,'#40343a'); px(c,x+(right?31:13),yy+18,2,2,p.skinSh);
  }

  function frontNovice(c,x,y,p,bob,step,cast){
    // short tunic, clearly visible pants and feet
    poly(c,[[x+14,y+25+bob],[x+34,y+25+bob],[x+36,y+39+bob],[x+31,y+43+bob],[x+17,y+43+bob],[x+12,y+39+bob]],p.ol);
    poly(c,[[x+16,y+26+bob],[x+32,y+26+bob],[x+33,y+38+bob],[x+29,y+41+bob],[x+19,y+41+bob],[x+15,y+38+bob]],p.white);
    px(c,x+21,y+27+bob,6,13,p.whiteSh); px(c,x+22,y+27+bob,4,13,p.main); px(c,x+16,y+35+bob,16,2,p.trim);
    // sleeves separate from torso
    poly(c,[[x+11,y+27+bob],[x+16,y+28+bob],[x+15,y+39+bob],[x+10,y+39+bob]],p.ol); poly(c,[[x+12,y+29+bob],[x+15,y+29+bob],[x+14,y+38+bob],[x+11,y+38+bob]],p.white);
    poly(c,[[x+32,y+28+bob],[x+37,y+27+bob],[x+38,y+39+bob],[x+33,y+39+bob]],p.ol); poly(c,[[x+33,y+29+bob],[x+36,y+29+bob],[x+37,y+38+bob],[x+34,y+38+bob]],p.white);
    if(cast){px(c,x+7,y+31+bob,5,4,p.skin);px(c,x+37,y+31+bob,5,4,p.skin);}else{px(c,x+10,y+38+bob,4,3,p.skinSh);px(c,x+34,y+38+bob,4,3,p.skinSh);}
    // pants, legs and shoes are never covered by tunic
    px(c,x+17+step,y+42+bob,7,8,p.pants); px(c,x+25-step,y+42+bob,7,8,p.pants);
    px(c,x+14+step,y+49+bob,10,5,p.ol);px(c,x+24-step,y+49+bob,10,5,p.ol);px(c,x+15+step,y+49+bob,8,4,p.boot);px(c,x+25-step,y+49+bob,8,4,p.boot);
  }

  function frontPriest(c,x,y,p,bob,step,cast,high){
    // compact torso
    poly(c,[[x+14,y+25+bob],[x+34,y+25+bob],[x+35,y+39+bob],[x+31,y+42+bob],[x+17,y+42+bob],[x+13,y+39+bob]],p.ol);
    poly(c,[[x+16,y+26+bob],[x+32,y+26+bob],[x+33,y+38+bob],[x+29,y+40+bob],[x+19,y+40+bob],[x+15,y+38+bob]],p.white);
    // shoulder/side colored panels
    poly(c,[[x+15,y+26+bob],[x+20,y+27+bob],[x+19,y+39+bob],[x+15,y+39+bob]],p.main);
    poly(c,[[x+33,y+26+bob],[x+28,y+27+bob],[x+29,y+39+bob],[x+33,y+39+bob]],p.main);
    // stole and cross detail
    px(c,x+22,y+27+bob,4,14,p.trim); px(c,x+19,y+31+bob,10,2,p.trim); px(c,x+23,y+27+bob,2,12,high?'#f7e3a0':'#f0ddb9');
    // sleeves separated from robe
    poly(c,[[x+10,y+28+bob],[x+16,y+29+bob],[x+15,y+40+bob],[x+9,y+40+bob]],p.ol); poly(c,[[x+11,y+29+bob],[x+15,y+30+bob],[x+14,y+39+bob],[x+10,y+39+bob]],p.main);
    poly(c,[[x+32,y+29+bob],[x+38,y+28+bob],[x+39,y+40+bob],[x+33,y+40+bob]],p.ol); poly(c,[[x+33,y+30+bob],[x+37,y+29+bob],[x+38,y+39+bob],[x+34,y+39+bob]],p.main);
    if(cast){px(c,x+6,y+31+bob,5,4,p.skin);px(c,x+38,y+31+bob,5,4,p.skin);}else{px(c,x+9,y+39+bob,5,3,p.skinSh);px(c,x+34,y+39+bob,5,3,p.skinSh);}
    // two separate coat tails: visible gap in the middle is the key fix
    poly(c,[[x+16,y+40+bob],[x+23,y+40+bob],[x+22,y+49+bob],[x+17,y+51+bob],[x+14,y+47+bob]],p.ol);
    poly(c,[[x+17,y+41+bob],[x+22,y+41+bob],[x+21,y+48+bob],[x+18,y+49+bob],[x+16,y+47+bob]],high?p.whiteSh:p.main);
    poly(c,[[x+25,y+40+bob],[x+32,y+40+bob],[x+34,y+47+bob],[x+31,y+51+bob],[x+26,y+49+bob]],p.ol);
    poly(c,[[x+26,y+41+bob],[x+31,y+41+bob],[x+32,y+47+bob],[x+30,y+49+bob],[x+27,y+48+bob]],high?p.whiteSh:p.main);
    // legs visible between tails
    px(c,x+19+step,y+43+bob,5,8,p.pants);px(c,x+25-step,y+43+bob,5,8,p.pants);
    px(c,x+15+step,y+50+bob,10,5,p.ol);px(c,x+24-step,y+50+bob,10,5,p.ol);px(c,x+16+step,y+50+bob,8,4,p.boot);px(c,x+25-step,y+50+bob,8,4,p.boot);
    if(high){px(c,x+18,y+39+bob,12,2,p.trim);}
  }

  function backBody(c,x,y,job,p,bob,step){
    if(job==='Noviço'){
      poly(c,[[x+14,y+25+bob],[x+34,y+25+bob],[x+35,y+41+bob],[x+30,y+43+bob],[x+18,y+43+bob],[x+13,y+41+bob]],p.ol);
      poly(c,[[x+16,y+26+bob],[x+32,y+26+bob],[x+33,y+40+bob],[x+29,y+41+bob],[x+19,y+41+bob],[x+15,y+40+bob]],p.white);
      px(c,x+18,y+28+bob,12,12,p.whiteSh); px(c,x+17+step,y+42+bob,7,8,p.pants);px(c,x+25-step,y+42+bob,7,8,p.pants);
    }else{
      poly(c,[[x+14,y+25+bob],[x+34,y+25+bob],[x+35,y+39+bob],[x+31,y+42+bob],[x+17,y+42+bob],[x+13,y+39+bob]],p.ol);
      poly(c,[[x+16,y+26+bob],[x+32,y+26+bob],[x+33,y+38+bob],[x+29,y+40+bob],[x+19,y+40+bob],[x+15,y+38+bob]],p.main);
      px(c,x+21,y+27+bob,6,12,p.white);px(c,x+23,y+28+bob,2,10,p.trim);
      // split back tails
      poly(c,[[x+16,y+40+bob],[x+23,y+40+bob],[x+22,y+49+bob],[x+17,y+51+bob],[x+14,y+47+bob]],p.ol);poly(c,[[x+17,y+41+bob],[x+22,y+41+bob],[x+21,y+48+bob],[x+18,y+49+bob],[x+16,y+47+bob]],p.mainSh);
      poly(c,[[x+25,y+40+bob],[x+32,y+40+bob],[x+34,y+47+bob],[x+31,y+51+bob],[x+26,y+49+bob]],p.ol);poly(c,[[x+26,y+41+bob],[x+31,y+41+bob],[x+32,y+47+bob],[x+30,y+49+bob],[x+27,y+48+bob]],p.mainSh);
      px(c,x+19+step,y+43+bob,5,8,p.pants);px(c,x+25-step,y+43+bob,5,8,p.pants);
    }
    px(c,x+15+step,y+50+bob,10,5,p.ol);px(c,x+24-step,y+50+bob,10,5,p.ol);px(c,x+16+step,y+50+bob,8,4,p.boot);px(c,x+25-step,y+50+bob,8,4,p.boot);
  }

  function sideBody(c,x,y,job,p,bob,step,cast,right){
    const sx=right?1:-1;
    // narrow side torso instead of front-facing slab
    poly(c,[[x+18,y+25+bob],[x+31,y+25+bob],[x+32,y+40+bob],[x+28,y+43+bob],[x+19,y+42+bob],[x+16,y+38+bob]],p.ol);
    poly(c,[[x+19,y+26+bob],[x+30,y+26+bob],[x+30,y+39+bob],[x+27,y+41+bob],[x+20,y+40+bob],[x+18,y+37+bob]],job==='Noviço'?p.white:p.main);
    if(job!=='Noviço'){px(c,x+(right?20:27),y+28+bob,3,12,p.white);px(c,x+(right?21:28),y+29+bob,1,10,p.trim);}
    // near/far arm
    const armX=right?29:13; poly(c,[[x+armX,y+28+bob],[x+armX+5,y+29+bob],[x+armX+4,y+41+bob],[x+armX-1,y+40+bob]],p.ol);px(c,x+armX,y+30+bob,4,9,job==='Noviço'?p.white:p.main);px(c,x+armX,y+39+bob,4,3,p.skinSh);
    if(cast){const hx=right?35:8;px(c,x+hx,y+31+bob,5,4,p.skin);}
    // one coat tail at side, with visible leg
    if(job!=='Noviço'){poly(c,[[x+20,y+40+bob],[x+31,y+40+bob],[x+32,y+48+bob],[x+27,y+51+bob],[x+21,y+48+bob]],p.ol);poly(c,[[x+21,y+41+bob],[x+30,y+41+bob],[x+30,y+47+bob],[x+27,y+49+bob],[x+22,y+47+bob]],p.mainSh);}
    px(c,x+20+step,y+43+bob,6,8,p.pants);px(c,x+26-step,y+44+bob,5,7,p.pants);px(c,x+17+step,y+50+bob,10,5,p.ol);px(c,x+25-step,y+50+bob,10,5,p.ol);px(c,x+18+step,y+50+bob,8,4,p.boot);px(c,x+26-step,y+50+bob,8,4,p.boot);
  }

  makePlayerSheet=function(job){
    const key=`v8:p:${job}`;if(spriteCache.has(key))return spriteCache.get(key);
    const fw=48,fh=58,frames=4,rows=4,s=document.createElement('canvas');s.width=fw*frames;s.height=fh*rows;const c=s.getContext('2d');c.imageSmoothingEnabled=false;const p=pal(job);
    for(let row=0;row<rows;row++)for(let f=0;f<frames;f++){
      const x=f*fw,y=row*fh,bob=f===1?1:f===3?-1:0,step=f===1?-1:f===3?1:0,cast=f===2;
      px(c,x+12,y+54,24,2,'rgba(35,28,32,.16)');
      if(row===0){headFront(c,x,y,p,bob);if(job==='Noviço')frontNovice(c,x,y,p,bob,step,cast);else frontPriest(c,x,y,p,bob,step,cast,job==='Sumo Sacerdote');}
      else if(row===3){headBack(c,x,y,p,bob);backBody(c,x,y,job,p,bob,step);}
      else {const right=row===2;headSide(c,x,y,p,bob,right);sideBody(c,x,y,job,p,bob,step,cast,right);}
      if(job==='Sumo Sacerdote'){c.strokeStyle='#e8c470';c.lineWidth=1;c.beginPath();c.ellipse(x+24,y+3+bob,8,2,0,0,TAU);c.stroke();}
    }
    const out={sheet:s,fw,fh};spriteCache.set(key,out);return out;
  };

  drawPlayer=function(p){
    ctx.save();ctx.globalAlpha=.20;ctx.fillStyle='#29272a';ctx.beginPath();ctx.ellipse(p.x,p.y+11,16,5,0,0,TAU);ctx.fill();ctx.restore();
    if(p===player)drawKyrieBarrier();
    ctx.save();if(p.flashUntil>now){ctx.globalAlpha=.66;ctx.filter='brightness(1.65)';}drawSprite(makePlayerSheet(p.job||'Noviço'),p,1.22);ctx.restore();
    ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='700 10px sans-serif';ctx.fillText(p.name||'Aventureiro',p.x,p.y+31);ctx.fillStyle='#ddd5d5';ctx.font='9px sans-serif';ctx.fillText(`${p.job||'Noviço'} • Nv. ${p.level||1}`,p.x,p.y+43);
  };

  try{for(const key of [...spriteCache.keys()])if(String(key).startsWith('v7:p:')||String(key).startsWith('v8:p:'))spriteCache.delete(key);}catch{}
  log('Player v8 ativo: túnica dividida, pernas visíveis e poses laterais corrigidas.','good');
})();
