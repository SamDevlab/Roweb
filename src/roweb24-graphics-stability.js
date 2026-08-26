// Roweb v24 — graphics stabilization pass.
// Fixes monster frame sampling/anchoring and replaces fragile exterior prop crops
// with deterministic, coherent terrain/props. Aster and Cathedral v20 are preserved.
(() => {
  const previousDrawGround = drawGround;
  const previousDrawScenery = drawScenery;
  const previousDrawMob = drawMob;
  const previousBlockedAt = blockedAt;

  const cathedral = window.RowebCathedral;
  const mobAtlas = new Image();
  mobAtlas.decoding = 'async';
  let mobsReady = false;
  let frameW = 128;
  let frameH = 128;

  mobAtlas.onload = () => {
    const w = mobAtlas.naturalWidth || mobAtlas.width;
    const h = mobAtlas.naturalHeight || mobAtlas.height;
    if (w % 17 !== 0 || h % 4 !== 0) {
      console.error(`Roweb v24: atlas inesperado ${w}x${h}; esperado 17 colunas e 4 linhas.`);
      return;
    }
    frameW = w / 17;
    frameH = h / 4;
    mobsReady = true;
    log(`Mobs v24 ativos: atlas validado em ${frameW}×${frameH} por frame.`, 'good');
  };
  mobAtlas.onerror = error => console.error('Roweb v24 mob atlas failed', error);
  mobAtlas.src = '/assets/v18/mobs.webp';

  const MOB = {
    poring: { row:0, drawW:92, drawH:92, bossW:118, bossH:118, baseline:17, hover:0, hud:62 },
    bat:    { row:1, drawW:96, drawH:96, baseline:15, hover:-12, hud:62 },
    eye:    { row:2, drawW:92, drawH:92, baseline:15, hover:-9, hud:61 },
    imp:    { row:3, drawW:88, drawH:88, baseline:17, hover:0, hud:58 }
  };
  const SEQ = {
    idle:[0,1,2,3],
    move:[4,5,6,7],
    attack:[8,9,10],
    hit:[11,12],
    death:[13,14,15,16]
  };

  const secondaryPaths = [
    [[1300,790],[1040,820],[690,790],[470,770]],
    [[1300,790],[1570,810],[1910,790],[2110,760]],
    [[1260,990],[1040,1015],[790,1030]],
    [[1340,990],[1560,1015],[1810,1030]],
    [[1300,1110],[1260,1300],[1215,1450]],
    [[1300,1110],[1390,1300],[1510,1380]]
  ];

  function insideCathedral(){ return cathedral?.state?.scene === 'interior'; }
  function hash(x,y,seed=0){
    let n=(Math.imul((x|0)+seed,374761393)+Math.imul((y|0)-seed,668265263))|0;
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967295;
  }
  function roadCenter(y){ return window.RowebTerrain?.roadCenterX?.(y) ?? (1300 + Math.sin((y-760)/350)*22); }
  function roadHalf(y){ return window.RowebTerrain?.roadHalfWidth?.(y) ?? (62 + Math.sin(y/270)*7); }

  function roundedRect(x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath();ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
    ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
    ctx.lineTo(x+rr,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rr);ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.closePath();
  }
  function visibleBounds(pad=100){
    return {x0:Math.max(0,camera.x-pad),y0:Math.max(0,camera.y-pad),x1:Math.min(WORLD.width,camera.x+innerWidth+pad),y1:Math.min(WORLD.height,camera.y+innerHeight+pad)};
  }
  function pointSegmentDistance(px,py,ax,ay,bx,by){
    const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,len=vx*vx+vy*vy||1;
    const t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/len));
    return Math.hypot(px-(ax+vx*t),py-(ay+vy*t));
  }
  function distanceToSecondary(x,y){
    let best=Infinity;
    for(const path of secondaryPaths){
      for(let i=1;i<path.length;i++) best=Math.min(best,pointSegmentDistance(x,y,...path[i-1],...path[i]));
    }
    return best;
  }

  function drawGrass(b){
    ctx.fillStyle='#526d45';ctx.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);
    const step=112;
    for(let y=Math.floor(b.y0/step)*step;y<b.y1;y+=step){
      for(let x=Math.floor(b.x0/step)*step;x<b.x1;x+=step){
        const a=hash(x/step,y/step,7),c=hash(x/step,y/step,19);
        ctx.save();ctx.globalAlpha=.08+a*.09;ctx.fillStyle=a>.58?'#344f36':'#829061';
        ctx.beginPath();ctx.ellipse(x+15+c*78,y+10+a*82,38+a*34,25+c*32,a*.45,0,TAU);ctx.fill();ctx.restore();
        const blades=a>.68?5:a>.35?3:1;
        ctx.save();ctx.globalAlpha=.32;ctx.fillStyle=a>.65?'#9daa69':'#35563a';
        for(let i=0;i<blades;i++){
          const px=x+12+((c*83+i*31)%84),py=y+15+((a*77+i*37)%78);
          ctx.fillRect(Math.round(px),Math.round(py),2,4+(i%3));
          if(i%2===0)ctx.fillRect(Math.round(px+3),Math.round(py+2),1,3);
        }
        ctx.restore();
      }
    }
  }

  function strokePolyline(points,width,color,alpha=1){
    if(points.length<2)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.stroke();ctx.restore();
  }

  function mainRoadPoints(b){
    const points=[];const y0=Math.max(430,Math.floor((b.y0-120)/28)*28),y1=Math.min(WORLD.height,b.y1+120);
    for(let y=y0;y<=y1;y+=28){
      const blend=Math.max(0,Math.min(1,(y-470)/220));
      const x=1300*(1-blend)+roadCenter(y)*blend;points.push([x,y]);
    }
    return points;
  }

  function drawRoads(b){
    const main=mainRoadPoints(b);if(main.length){
      const half=roadHalf((main[0][1]+main[main.length-1][1])/2);
      strokePolyline(main,half*2+52,'#3e5139',.72); // worn/moss shoulder
      strokePolyline(main,half*2+28,'#665d4d',1);  // earth border
      strokePolyline(main,Math.max(72,half*2-12),'#777165',1); // stone core
      strokePolyline(main,Math.max(56,half*2-30),'#858074',.72);
    }
    for(const path of secondaryPaths){
      strokePolyline(path,70,'#40533b',.55);strokePolyline(path,50,'#685b49',.94);strokePolyline(path,31,'#736a58',.82);
    }

    // Small broken pavers add texture without turning the entire map into a grid.
    ctx.save();ctx.globalAlpha=.26;
    for(let y=Math.max(510,Math.floor(b.y0/44)*44);y<b.y1;y+=44){
      const x=roadCenter(y),off=(hash(y,17,3)-.5)*38;
      ctx.fillStyle=hash(y,31,5)>.5?'#aca595':'#4e5048';
      ctx.fillRect(Math.round(x+off-12),Math.round(y-5),24+Math.round(hash(y,9,7)*10),7);
    }
    ctx.restore();
  }

  function drawPlaza(){
    const x=1065,y=330,w=470,h=500;
    ctx.save();roundedRect(x,y,w,h,58);ctx.clip();
    ctx.fillStyle='#6e6b62';ctx.fillRect(x,y,w,h);
    const tw=54,th=34;
    for(let yy=y-8,row=0;yy<y+h+10;yy+=th,row++){
      const offset=row%2?-27:0;
      for(let xx=x+offset;xx<x+w+20;xx+=tw){
        const r=hash(xx,yy,14);ctx.fillStyle=r>.62?'#77746c':r>.3?'#625f58':'#858077';
        ctx.globalAlpha=.56+r*.18;ctx.fillRect(xx+2,yy+2,tw-5,th-5);
        ctx.globalAlpha=.15;ctx.fillStyle='#d3cab8';ctx.fillRect(xx+6,yy+5,tw-13,2);
      }
    }
    // Moss on the plaza edges and cracks.
    ctx.globalAlpha=.30;ctx.fillStyle='#60704b';
    for(let i=0;i<34;i++){
      const r=hash(i,61,3),q=hash(i,88,11);const px=x+8+r*(w-20),py=y+9+q*(h-20);
      if(px<x+42||px>x+w-42||py<y+42||py>y+h-42)ctx.fillRect(px,py,8+r*14,3+q*5);
    }
    ctx.restore();

    // Cathedral threshold keeps the animated door visually connected to the plaza.
    ctx.save();ctx.fillStyle='#817a6d';roundedRect(1190,405,220,180,26);ctx.fill();
    ctx.fillStyle='#a09889';ctx.fillRect(1210,466,180,16);ctx.fillStyle='#5c574f';ctx.fillRect(1220,492,160,12);
    ctx.restore();
  }

  function drawZoneWear(){
    const zones=[
      [470,790,270,215,'#344d3a',.18],[2110,760,270,210,'#344d3a',.18],
      [790,1030,250,210,'#514f40',.17],[1810,1030,260,220,'#514f40',.17],
      [1300,1430,430,190,'#294b35',.14],[2240,980,220,190,'#493b43',.12]
    ];
    ctx.save();for(const [x,y,rx,ry,color,a] of zones){ctx.globalAlpha=a;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();}ctx.restore();
  }

  drawGround=function roweb24Ground(){
    if(insideCathedral()){previousDrawGround();return;}
    try{const b=visibleBounds();drawGrass(b);drawZoneWear();drawRoads(b);drawPlaza();}
    catch(error){console.error('Roweb v24 ground fallback',error);previousDrawGround();}
  };

  // Stable procedural exterior props replace fragile atlas crops.
  function propShadow(x,y,rx,ry,a=.18){ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#172018';ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();ctx.restore();}
  function drawGrave(s){
    const x=Math.round(s.x),y=Math.round(s.y);propShadow(x,y+19,18,5,.2);ctx.save();
    ctx.fillStyle='#3d403b';ctx.fillRect(x-15,y-8,30,31);ctx.fillStyle='#77766c';ctx.fillRect(x-12,y-18,24,35);ctx.fillStyle='#918f82';ctx.fillRect(x-9,y-15,18,3);
    ctx.fillStyle='#51564b';ctx.fillRect(x-2,y-10,4,18);ctx.fillRect(x-7,y-5,14,4);ctx.fillStyle='#536847';ctx.fillRect(x-13,y+15,7,5);ctx.fillRect(x+6,y+13,6,6);ctx.restore();
  }
  function drawPillar(s){
    const x=Math.round(s.x),y=Math.round(s.y);propShadow(x,y+24,20,6,.18);ctx.save();ctx.fillStyle='#55534e';ctx.fillRect(x-18,y+16,36,10);ctx.fillStyle='#8b877b';ctx.fillRect(x-13,y-42,26,59);ctx.fillStyle='#a09b8d';ctx.fillRect(x-18,y-46,36,9);ctx.fillStyle='#64645c';ctx.fillRect(x-9,y-36,5,47);ctx.restore();
  }
  function drawRuin(s){
    const x=Math.round(s.x),y=Math.round(s.y);propShadow(x,y+18,40,7,.16);ctx.save();const blocks=[[-37,1,27,18],[-12,-12,31,29],[20,2,28,17],[-30,-16,18,14],[10,-22,23,16]];
    for(let i=0;i<blocks.length;i++){const [bx,by,w,h]=blocks[i];ctx.fillStyle=i%2?'#6e6b61':'#595a52';ctx.fillRect(x+bx,y+by,w,h);ctx.fillStyle='rgba(205,198,178,.12)';ctx.fillRect(x+bx+3,y+by+3,w-6,2);}ctx.fillStyle='#536348';ctx.fillRect(x-32,y+9,18,5);ctx.fillRect(x+10,y+8,22,5);ctx.restore();
  }
  function drawTree(s){
    const x=Math.round(s.x),y=Math.round(s.y),dead=hash(Math.floor(x/80),Math.floor(y/80),61)<.28;propShadow(x,y+40,dead?30:45,10,.18);ctx.save();ctx.fillStyle='#5a4431';ctx.fillRect(x-7,y-10,14,52);ctx.fillStyle='#76553a';ctx.fillRect(x-3,y-8,5,48);
    if(dead){ctx.fillStyle='#4c4a3c';ctx.fillRect(x-4,y-48,8,42);ctx.fillRect(x-30,y-34,32,7);ctx.fillRect(x+1,y-27,28,7);ctx.fillRect(x-25,y-48,8,22);ctx.fillRect(x+22,y-42,7,22);}
    else{for(const [ox,oy,r,c] of [[-24,-35,28,'#375d3b'],[5,-43,33,'#416a42'],[27,-29,25,'#345737'],[-3,-18,34,'#3a603b']]){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x+ox,y+oy,r,0,TAU);ctx.fill();}ctx.fillStyle='rgba(184,197,111,.22)';ctx.beginPath();ctx.arc(x-12,y-50,12,0,TAU);ctx.fill();}
    ctx.restore();
  }
  function drawCrystal(s){
    const x=Math.round(s.x),y=Math.round(s.y),pulse=.5+.5*Math.sin(now/360+x);ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,3,x,y,52);g.addColorStop(0,`rgba(111,221,255,${.18+.08*pulse})`);g.addColorStop(1,'rgba(111,221,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,52,0,TAU);ctx.fill();ctx.restore();propShadow(x,y+21,18,5,.14);
    ctx.save();ctx.fillStyle='#57c6df';ctx.beginPath();ctx.moveTo(x,y-37);ctx.lineTo(x+14,y-5);ctx.lineTo(x+7,y+23);ctx.lineTo(x,y+31);ctx.lineTo(x-10,y+10);ctx.lineTo(x-13,y-7);ctx.closePath();ctx.fill();ctx.fillStyle='#b8f2ff';ctx.beginPath();ctx.moveTo(x,y-31);ctx.lineTo(x+5,y-4);ctx.lineTo(x,y+19);ctx.lineTo(x-5,y-2);ctx.closePath();ctx.fill();ctx.restore();
  }
  function drawAltar(s){
    const x=Math.round(s.x),y=Math.round(s.y);propShadow(x,y+39,74,9,.19);ctx.save();ctx.fillStyle='#56534d';ctx.fillRect(x-76,y+10,152,35);ctx.fillStyle='#8f8778';ctx.fillRect(x-66,y-7,132,33);ctx.fillStyle='#b5aa91';ctx.fillRect(x-72,y-12,144,10);ctx.fillStyle='#e6cc79';ctx.fillRect(x-4,y-55,8,48);ctx.fillRect(x-20,y-39,40,8);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.15+.05*Math.sin(now/240);const g=ctx.createRadialGradient(x,y-35,3,x,y-35,85);g.addColorStop(0,'#ffe59a');g.addColorStop(1,'rgba(255,229,154,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y-35,85,0,TAU);ctx.fill();ctx.restore();
  }

  drawScenery=function roweb24Scenery(s){
    if(insideCathedral() || s.type==='chapel' || String(s.type).startsWith('v21-')){previousDrawScenery(s);return;}
    switch(s.type){
      case 'grave': drawGrave(s);break;
      case 'pillar': drawPillar(s);break;
      case 'ruin': drawRuin(s);break;
      case 'tree': drawTree(s);break;
      case 'crystal': drawCrystal(s);break;
      case 'altar': drawAltar(s);break;
      default: previousDrawScenery(s);
    }
  };

  function mobState(m){if(m.flashUntil>now)return'hit';if(m.attackingUntil>now)return'attack';return m.moving?'move':'idle';}
  function mobFrame(state,id){
    const seq=SEQ[state]||SEQ.idle;const ms=state==='attack'?115:state==='hit'?100:state==='move'?145:260;
    return seq[(Math.floor((now+(id||0)*43)/ms))%seq.length];
  }
  function mobDims(m){const d=MOB[m.type]||MOB.imp;if(m.boss&&m.type==='poring')return{w:d.bossW,h:d.bossH};return{w:d.drawW,h:d.drawH};}
  function drawSelection(m,w){
    if(selectedId!==m.id)return;ctx.save();ctx.strokeStyle='rgba(255,231,142,.88)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(m.x,m.y+18,w*.43,11,0,0,TAU);ctx.stroke();ctx.restore();
  }
  function drawMobHud(m,dims,def){
    const top=m.y-def.hud-(dims.h-88)*.28;ctx.save();ctx.textAlign='center';ctx.font=m.boss?'700 11px sans-serif':'10px sans-serif';ctx.fillStyle='#f5eded';ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=2;ctx.fillText(m.name,m.x,top);ctx.shadowBlur=0;
    const w=m.boss?82:58,h=5,x=m.x-w/2,y=top+7;ctx.fillStyle='rgba(22,18,27,.82)';ctx.fillRect(x,y,w,h);ctx.fillStyle=m.boss?'#dc3f83':'#c54d69';ctx.fillRect(x,y,w*Math.max(0,m.hp/m.maxHp),h);ctx.restore();
  }

  drawMob=function roweb24Mob(m){
    if(!m?.alive)return;
    if(!mobsReady||!MOB[m.type]){previousDrawMob(m);return;}
    const def=MOB[m.type],state=mobState(m),frame=mobFrame(state,m.id),dims=mobDims(m);
    const hover=def.hover+(m.type==='bat'?Math.sin(now/130+(m.id||0))*4:m.type==='eye'?Math.sin(now/180+(m.id||0))*3:state==='move'?Math.sin(now/100+(m.id||0))*1.5:0);
    const baseline=m.y+def.baseline+hover;
    ctx.save();ctx.globalAlpha=.19;ctx.fillStyle='#142018';ctx.beginPath();ctx.ellipse(m.x,m.y+18,dims.w*(m.type==='bat'?.30:.36),m.type==='bat'?5:7,0,0,TAU);ctx.fill();ctx.restore();
    drawSelection(m,dims.w);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(m.x),Math.round(baseline));if(m.dir==='right')ctx.scale(-1,1);
    const sx=Math.round(frame*frameW),sy=Math.round(def.row*frameH);
    ctx.drawImage(mobAtlas,sx,sy,Math.round(frameW),Math.round(frameH),-dims.w/2,-dims.h,dims.w,dims.h);ctx.restore();
    drawMobHud(m,dims,def);
  };

  // Extra exterior collision follows the visible Cathedral facade while keeping the door corridor open.
  blockedAt=function roweb24Blocked(entity,x,y,o={}){
    if(!insideCathedral()){
      const r=entity?.radius||14;
      const body=(x+r>1120&&x-r<1480&&y+r>75&&y-r<382);
      const leftWing=(x+r>1110&&x-r<1238&&y+r>350&&y-r<472);
      const rightWing=(x+r>1362&&x-r<1490&&y+r>350&&y-r<472);
      if(body||leftWing||rightWing)return true;
    }
    return previousBlockedAt(entity,x,y,o);
  };

  window.RowebGraphicsV24={
    version:'24.0.0',
    mobAtlas:'/assets/v18/mobs.webp',
    frameMeta:()=>({width:frameW,height:frameH,columns:17,rows:4}),
    terrain:'semantic-continuous-v2'
  };
  log('Gráficos v24 ativos: mobs estabilizados, terreno contínuo e props externos reconstruídos.','good');
})();