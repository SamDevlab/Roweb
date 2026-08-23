// Roweb v5 — original pre-rendered pixel-art sprite sheets.
// Visual language is inspired by classic 2D MMORPGs, but every frame is original.
(() => {
  const OUT = '#382b31', SKIN = '#e6b091', SKIN_D = '#c98268';
  const px = (c,x,y,w,h,color) => { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };

  function faceFront(c,oX,oY,p,longHair=false){
    px(c,oX+12,oY+7,16,15,OUT); px(c,oX+13,oY+9,14,12,SKIN); px(c,oX+13,oY+18,14,3,SKIN_D);
    px(c,oX+10,oY+6,20,8,OUT); px(c,oX+11,oY+7,18,7,p.hair); px(c,oX+14,oY+5,12,4,p.hair);
    px(c,oX+12,oY+11,4,6,p.hair); px(c,oX+17,oY+10,4,5,p.hair); px(c,oX+23,oY+10,5,5,p.hair);
    if(longHair){ px(c,oX+9,oY+12,4,12,p.hair); px(c,oX+27,oY+12,4,12,p.hair); }
    px(c,oX+15,oY+7,6,2,p.hairHi); px(c,oX+15,oY+15,2,2,'#554047'); px(c,oX+23,oY+15,2,2,'#554047'); px(c,oX+19,oY+19,2,1,'#9a5c55');
  }
  function faceBack(c,oX,oY,p,longHair=false){
    px(c,oX+11,oY+6,18,16,OUT); px(c,oX+12,oY+7,16,14,p.hair); px(c,oX+14,oY+5,12,4,p.hair); px(c,oX+16,oY+7,6,2,p.hairHi);
    if(longHair){ px(c,oX+9,oY+13,5,13,OUT); px(c,oX+10,oY+13,4,12,p.hair); px(c,oX+26,oY+13,5,13,OUT); px(c,oX+26,oY+13,4,12,p.hair); }
  }
  function faceSide(c,oX,oY,p,right,longHair=false){
    const flip = right ? 1 : -1;
    px(c,oX+12,oY+7,16,15,OUT); px(c,oX+13,oY+9,14,12,SKIN);
    if(right){ px(c,oX+15,oY+6,14,8,p.hair); px(c,oX+24,oY+11,5,7,p.hair); px(c,oX+24,oY+15,2,2,'#554047'); px(c,oX+27,oY+17,2,2,SKIN); if(longHair)px(c,oX+26,oY+14,4,12,p.hair); }
    else { px(c,oX+11,oY+6,14,8,p.hair); px(c,oX+11,oY+11,5,7,p.hair); px(c,oX+14,oY+15,2,2,'#554047'); px(c,oX+11,oY+17,2,2,SKIN); if(longHair)px(c,oX+10,oY+14,4,12,p.hair); }
    px(c,oX+17,oY+7,6,2,p.hairHi);
  }

  function playerSheet(job){
    const fw=40, fh=56, sheet=document.createElement('canvas'); sheet.width=fw*4; sheet.height=fh*4;
    const c=sheet.getContext('2d'); c.imageSmoothingEnabled=false;
    const p = job==='Sumo Sacerdote'
      ? {hair:'#dcc19e',hairHi:'#f2d9b7',robe:'#f3f0e9',robe2:'#d2ddea',outer:'#5f769c',trim:'#ce9856',accent:'#6f86a9',boots:'#55494b',long:true}
      : job==='Sacerdote'
      ? {hair:'#d5d1cc',hairHi:'#f1eeea',robe:'#efe4d9',robe2:'#ad4652',outer:'#733c46',trim:'#6f333d',accent:'#e4cca4',boots:'#584446',long:true}
      : {hair:'#b97856',hairHi:'#dda17a',robe:'#ead2b1',robe2:'#c78e67',outer:'#744e3e',trim:'#7d523d',accent:'#f2dfc3',boots:'#65493f',long:false};

    for(let row=0;row<4;row++) for(let f=0;f<4;f++){
      const ox=f*fw, oy=row*fh, bob=f===1?1:f===3?-1:0, step=f===1?-2:f===3?2:0, attack=f===2;
      px(c,ox+9,oy+50,22,3,'rgba(37,28,31,.20)');
      if(row===0) faceFront(c,ox,oy+bob,p,p.long); else if(row===3) faceBack(c,ox,oy+bob,p,p.long); else faceSide(c,ox,oy+bob,p,row===2,p.long);
      px(c,ox+8,oy+22+bob,24,22,OUT);
      if(row===3){ px(c,ox+9,oy+23+bob,22,19,p.outer); px(c,ox+13,oy+24+bob,14,18,p.robe2); }
      else { px(c,ox+9,oy+23+bob,22,20,p.robe); px(c,ox+12,oy+24+bob,16,17,p.robe2); px(c,ox+18,oy+23+bob,4,19,p.accent); }
      px(c,ox+13,oy+22+bob,14,2,p.trim);

      if(job==='Noviço'){
        px(c,ox+4,oy+25+bob,7,16,OUT); px(c,ox+5,oy+26+bob,6,14,p.robe); px(c,ox+29,oy+25+bob,7,16,OUT); px(c,ox+29,oy+26+bob,6,14,p.robe);
        px(c,ox+14,oy+26+bob,12,2,p.accent); px(c,ox+10,oy+35+bob,20,3,p.trim);
      } else if(job==='Sacerdote'){
        px(c,ox+4,oy+24+bob,7,18,OUT); px(c,ox+5,oy+25+bob,6,16,p.robe2); px(c,ox+29,oy+24+bob,7,18,OUT); px(c,ox+29,oy+25+bob,6,16,p.robe2);
        px(c,ox+6,oy+37+bob,5,2,p.accent); px(c,ox+29,oy+37+bob,5,2,p.accent); px(c,ox+14,oy+32+bob,12,2,p.trim);
        px(c,ox+19,oy+26+bob,2,8,p.accent); px(c,ox+17,oy+29+bob,6,2,p.accent);
      } else {
        px(c,ox+4,oy+24+bob,7,18,OUT); px(c,ox+5,oy+25+bob,6,16,p.robe2); px(c,ox+29,oy+24+bob,7,18,OUT); px(c,ox+29,oy+25+bob,6,16,p.robe2);
        px(c,ox+6,oy+27+bob,5,3,p.trim); px(c,ox+29,oy+27+bob,5,3,p.trim); px(c,ox+12,oy+34+bob,16,3,p.trim);
        px(c,ox+19,oy+25+bob,2,8,'#e1b269'); px(c,ox+17,oy+28+bob,6,2,'#e1b269');
        c.strokeStyle='#ffe2a1'; c.lineWidth=1; c.beginPath(); c.ellipse(ox+20,oy+3+bob,9,2,0,0,Math.PI*2); c.stroke();
      }

      if(attack && row!==3){
        if(row===0){ px(c,ox+3,oy+31+bob,7,6,OUT); px(c,ox+4,oy+32+bob,6,5,SKIN); px(c,ox+30,oy+31+bob,7,6,OUT); px(c,ox+30,oy+32+bob,6,5,SKIN); }
        if(row===1){ px(c,ox+1,oy+30+bob,10,7,OUT); px(c,ox+2,oy+31+bob,9,5,p.robe2); px(c,ox+1,oy+33+bob,4,4,SKIN); }
        if(row===2){ px(c,ox+29,oy+30+bob,10,7,OUT); px(c,ox+29,oy+31+bob,9,5,p.robe2); px(c,ox+35,oy+33+bob,4,4,SKIN); }
      } else if(row!==3){ px(c,ox+6,oy+39+bob,5,4,SKIN_D); px(c,ox+29,oy+39+bob,5,4,SKIN_D); }

      if(job==='Noviço'){
        px(c,ox+10+step,oy+43+bob,8,7,OUT); px(c,ox+11+step,oy+43+bob,7,6,p.outer); px(c,ox+22-step,oy+43+bob,8,7,OUT); px(c,ox+22-step,oy+43+bob,7,6,p.outer);
      } else { px(c,ox+11,oy+40+bob,18,7,p.robe); px(c,ox+18,oy+40+bob,4,7,p.trim); }
      px(c,ox+9+step,oy+48+bob,10,5,OUT); px(c,ox+10+step,oy+48+bob,9,4,p.boots); px(c,ox+21-step,oy+48+bob,10,5,OUT); px(c,ox+21-step,oy+48+bob,9,4,p.boots);
      px(c,ox+12,oy+25+bob,2,9,'rgba(255,255,255,.18)');
    }
    return {sheet,fw,fh};
  }

  function mobSheet(type){
    const poring=type==='poring', fw=poring?56:48, fh=poring?52:48, sheet=document.createElement('canvas'); sheet.width=fw*4; sheet.height=fh*4;
    const c=sheet.getContext('2d'); c.imageSmoothingEnabled=false;
    for(let row=0;row<4;row++) for(let f=0;f<4;f++){
      const ox=f*fw, oy=row*fh, bob=f===1?-1:f===3?1:0, attack=f===2;
      if(type==='imp'){
        px(c,ox+9,oy+40,30,3,'rgba(35,25,30,.18)'); px(c,ox+13,oy+31+bob,7,9,OUT); px(c,ox+28,oy+31+bob,7,9,OUT); px(c,ox+14,oy+32+bob,6,7,'#6c2d38'); px(c,ox+29,oy+32+bob,6,7,'#6c2d38');
        px(c,ox+10,oy+16+bob,28,19,OUT); px(c,ox+11,oy+17+bob,26,17,'#b74655'); px(c,ox+13,oy+18+bob,20,6,'#ce5b66');
        px(c,ox+5,oy+8+bob,9,11,OUT); px(c,ox+6,oy+9+bob,7,9,'#34222e'); px(c,ox+34,oy+8+bob,9,11,OUT); px(c,ox+35,oy+9+bob,7,9,'#34222e');
        if(row!==3){ px(c,ox+16,oy+22+bob,3,3,'#ffd479'); px(c,ox+29,oy+22+bob,3,3,'#ffd479'); px(c,ox+22,oy+28+bob,5,2,'#5b2531'); }
        if(attack){ px(c,ox+4,oy+23+bob,9,7,OUT); px(c,ox+35,oy+23+bob,9,7,OUT); px(c,ox+5,oy+24+bob,8,6,'#8b3745'); px(c,ox+35,oy+24+bob,8,6,'#8b3745'); }
        else { px(c,ox+7,oy+25+bob,6,9,'#8b3745'); px(c,ox+35,oy+25+bob,6,9,'#8b3745'); }
      } else if(type==='eye'){
        px(c,ox+7,oy+40,34,3,'rgba(35,25,30,.16)'); for(const tx of [12,20,28,36]){ px(c,ox+tx,oy+31+bob,3,8,OUT); px(c,ox+tx+1,oy+32+bob,2,6,'#5d4779'); }
        c.fillStyle=OUT;c.beginPath();c.ellipse(ox+24,oy+23+bob,19,13,0,0,Math.PI*2);c.fill(); c.fillStyle='#725393';c.beginPath();c.ellipse(ox+24,oy+23+bob,17,11,0,0,Math.PI*2);c.fill();
        c.fillStyle='#eadff2';c.beginPath();c.ellipse(ox+24,oy+23+bob,12,8,0,0,Math.PI*2);c.fill(); c.fillStyle='#2c153e';c.beginPath();c.ellipse(ox+24,oy+23+bob,6,8,0,0,Math.PI*2);c.fill(); c.fillStyle='#d77bff';c.beginPath();c.ellipse(ox+24,oy+23+bob,3,4,0,0,Math.PI*2);c.fill(); px(c,ox+24,oy+19+bob,2,2,'#fff4ff');
        if(attack){ c.strokeStyle='#bb90db';c.lineWidth=2;c.beginPath();c.ellipse(ox+24,oy+23+bob,21,15,0,0,Math.PI*2);c.stroke(); }
      } else if(type==='bat'){
        const flap=f===1||f===3?-3:3; px(c,ox+9,oy+40,30,3,'rgba(35,25,30,.12)');
        c.fillStyle=OUT;c.beginPath();c.moveTo(ox+21,oy+18+bob);c.lineTo(ox+6,oy+9+flap);c.lineTo(ox+2,oy+20+flap);c.lineTo(ox+14,oy+24+bob);c.fill(); c.fillStyle='#55506e';c.beginPath();c.moveTo(ox+20,oy+19+bob);c.lineTo(ox+7,oy+11+flap);c.lineTo(ox+5,oy+19+flap);c.lineTo(ox+15,oy+23+bob);c.fill();
        c.fillStyle=OUT;c.beginPath();c.moveTo(ox+27,oy+18+bob);c.lineTo(ox+42,oy+9+flap);c.lineTo(ox+46,oy+20+flap);c.lineTo(ox+34,oy+24+bob);c.fill(); c.fillStyle='#55506e';c.beginPath();c.moveTo(ox+28,oy+19+bob);c.lineTo(ox+41,oy+11+flap);c.lineTo(ox+43,oy+19+flap);c.lineTo(ox+33,oy+23+bob);c.fill();
        px(c,ox+18,oy+15+bob,12,18,OUT); px(c,ox+19,oy+16+bob,10,16,'#49445f'); c.fillStyle='#39344b';c.beginPath();c.moveTo(ox+19,oy+16+bob);c.lineTo(ox+17,oy+9+bob);c.lineTo(ox+22,oy+14+bob);c.fill();c.beginPath();c.moveTo(ox+29,oy+16+bob);c.lineTo(ox+31,oy+9+bob);c.lineTo(ox+26,oy+14+bob);c.fill();
        if(row!==3){ px(c,ox+21,oy+20+bob,2,2,'#ff6b91'); px(c,ox+26,oy+20+bob,2,2,'#ff6b91'); if(attack)px(c,ox+22,oy+25+bob,5,2,'#dacadc'); }
      } else {
        const squish=f===1||f===3?3:0; px(c,ox+10,oy+46,36,3,'rgba(35,20,28,.18)');
        c.fillStyle=OUT;c.beginPath();c.moveTo(ox+14,oy+14+squish);c.lineTo(ox+5,oy+3+squish);c.lineTo(ox+8,oy+18+squish);c.fill();c.beginPath();c.moveTo(ox+42,oy+14+squish);c.lineTo(ox+51,oy+3+squish);c.lineTo(ox+48,oy+18+squish);c.fill();
        c.fillStyle='#2c1830';c.beginPath();c.moveTo(ox+14,oy+14+squish);c.lineTo(ox+7,oy+6+squish);c.lineTo(ox+10,oy+17+squish);c.fill();c.beginPath();c.moveTo(ox+42,oy+14+squish);c.lineTo(ox+49,oy+6+squish);c.lineTo(ox+46,oy+17+squish);c.fill();
        c.fillStyle=OUT;c.beginPath();c.roundRect(ox+7,oy+12+squish,42,31,12);c.fill(); c.fillStyle='#7f1f51';c.beginPath();c.roundRect(ox+9,oy+14+squish,38,27,10);c.fill(); px(c,ox+13,oy+15+squish,30,5,'#a52f67');
        if(row!==3){ px(c,ox+18,oy+24+squish,4,4,'#24151f'); px(c,ox+34,oy+24+squish,4,4,'#24151f'); px(c,ox+19,oy+24+squish,1,1,'#ffb2d0'); px(c,ox+35,oy+24+squish,1,1,'#ffb2d0'); px(c,ox+25,oy+33+squish,7,2,'#ffc5dd'); }
        if(attack){ c.strokeStyle='#d34c85';c.lineWidth=2;for(const ax of [12,28,44]){c.beginPath();c.moveTo(ox+28,oy+10);c.lineTo(ox+ax,oy+2);c.stroke();} }
      }
    }
    return {sheet,fw,fh};
  }

  const PACK = {
    'Noviço': playerSheet('Noviço'), 'Sacerdote': playerSheet('Sacerdote'), 'Sumo Sacerdote': playerSheet('Sumo Sacerdote'),
    imp: mobSheet('imp'), eye: mobSheet('eye'), bat: mobSheet('bat'), poring: mobSheet('poring')
  };

  makePlayerSheet = job => PACK[job] || PACK['Noviço'];
  makeMobSheet = type => PACK[type] || PACK.imp;
  try { spriteCache.clear(); } catch {}
  ctx.imageSmoothingEnabled=false; mctx.imageSmoothingEnabled=false;
  log('Sprite pack v5 ativo: Noviço, Sacerdote, Sumo Sacerdote e demônios em pixel art original.', 'good');
})();