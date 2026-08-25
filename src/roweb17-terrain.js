// Roweb v17 — semantic terrain generation.
// Keeps Aster, mobs, combat and scenery untouched; only replaces drawGround.
(() => {
  const previousDrawGround = drawGround;
  const TILE = 40;
  let announced = false;

  const COLORS = {
    grass: ['#5f7750','#637c54','#597149','#688159','#556c47'],
    grassDark: ['#4c6140','#506744','#465b3b'],
    worn: ['#6f7350','#777552','#686a49'],
    dirt: ['#786851','#817058','#6e604b'],
    stone: ['#777568','#706e62','#817e70','#69685e'],
    stoneDark: '#57574f',
    moss: '#667348'
  };

  function hash(x,y,seed=0){
    let n=(Math.imul((x|0)+seed,374761393)+Math.imul((y|0)-seed,668265263))|0;
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967295;
  }

  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

  function roadCenterX(y){
    return 1300 + Math.sin((y-760)/350)*24 + Math.sin((y+120)/115)*7;
  }

  function roadHalfWidth(y){
    return 58 + 9*Math.sin(y/290) + 4*Math.sin(y/91);
  }

  function pointSegmentDistance(px,py,ax,ay,bx,by){
    const vx=bx-ax, vy=by-ay, wx=px-ax, wy=py-ay;
    const len=vx*vx+vy*vy || 1;
    const t=clamp((wx*vx+wy*vy)/len,0,1);
    return Math.hypot(px-(ax+vx*t),py-(ay+vy*t));
  }

  const SECONDARY = [
    [470,760,1185,810],   // cemetery west -> road
    [2120,700,1415,790],  // cemetery east -> road
    [780,930,1190,1010],  // western ruins -> road
    [1810,920,1410,1005], // eastern ruins -> road
    [1210,1360,1275,1110],// crystals south-west -> road
    [1400,1400,1330,1120] // crystals south-east -> road
  ];

  function secondaryDistance(x,y){
    let d=Infinity;
    for(const p of SECONDARY) d=Math.min(d,pointSegmentDistance(x,y,...p));
    return d;
  }

  function inPlaza(x,y){
    // Broad cathedral forecourt, but never the whole map.
    const cx=1300, cy=610, rx=225, ry=278;
    const nx=Math.abs(x-cx), ny=Math.abs(y-cy);
    if(nx<188 && ny<244) return true;
    const dx=Math.max(0,nx-188), dy=Math.max(0,ny-244);
    return dx*dx+dy*dy < 37*37;
  }

  function cemeteryFactor(x,y){
    const a=((x-455)/240)**2+((y-760)/210)**2;
    const b=((x-2110)/245)**2+((y-700)/210)**2;
    return Math.min(a,b);
  }

  function ruinFactor(x,y){
    const a=((x-780)/210)**2+((y-925)/175)**2;
    const b=((x-1810)/220)**2+((y-910)/180)**2;
    return Math.min(a,b);
  }

  function terrainAt(x,y){
    if(inPlaza(x,y)) return 'plaza';

    const roadD=Math.abs(x-roadCenterX(y));
    const roadW=roadHalfWidth(y);
    if(y>735 && roadD<roadW) return 'road';
    if(y>735 && roadD<roadW+28) return 'roadEdge';

    const sideD=secondaryDistance(x,y);
    if(sideD<25) return 'path';
    if(sideD<48) return 'pathEdge';

    const cemetery=cemeteryFactor(x,y);
    if(cemetery<1) return hash(Math.floor(x/TILE),Math.floor(y/TILE),41)>.66?'dirt':'darkGrass';

    const ruin=ruinFactor(x,y);
    if(ruin<1) return hash(Math.floor(x/TILE),Math.floor(y/TILE),81)>.55?'worn':'darkGrass';

    return 'grass';
  }

  function visibleBounds(){
    return {
      x0:Math.max(0,Math.floor(camera.x/TILE)*TILE-TILE*2),
      y0:Math.max(0,Math.floor(camera.y/TILE)*TILE-TILE*2),
      x1:Math.min(WORLD.width,camera.x+innerWidth+TILE*2),
      y1:Math.min(WORLD.height,camera.y+innerHeight+TILE*2)
    };
  }

  function cellColor(type,gx,gy){
    const r=hash(gx,gy,7);
    if(type==='grass') return COLORS.grass[Math.floor(r*COLORS.grass.length)%COLORS.grass.length];
    if(type==='darkGrass') return COLORS.grassDark[Math.floor(r*COLORS.grassDark.length)%COLORS.grassDark.length];
    if(type==='roadEdge'||type==='pathEdge'||type==='worn') return COLORS.worn[Math.floor(r*COLORS.worn.length)%COLORS.worn.length];
    if(type==='path'||type==='dirt') return COLORS.dirt[Math.floor(r*COLORS.dirt.length)%COLORS.dirt.length];
    return COLORS.stone[Math.floor(r*COLORS.stone.length)%COLORS.stone.length];
  }

  function drawGrassDetails(x,y,gx,gy,type){
    const r=hash(gx,gy,17);
    const r2=hash(gx,gy,23);
    ctx.save();
    if(type==='grass'||type==='darkGrass'||type==='roadEdge'||type==='pathEdge'){
      ctx.globalAlpha=type==='darkGrass'?.28:.22;
      ctx.fillStyle=r>.5?'#93a36a':'#405b37';
      const count=r>.76?3:2;
      for(let i=0;i<count;i++){
        const px=x+6+((r2*37+i*13)%28), py=y+8+((r*31+i*17)%25);
        ctx.fillRect(Math.round(px),Math.round(py),2,6);
        if(i===0&&r>.62) ctx.fillRect(Math.round(px+3),Math.round(py+2),2,4);
      }
      if(r>.84){
        ctx.globalAlpha=.14; ctx.fillStyle='#d0c77a';
        ctx.fillRect(x+Math.floor(r2*30)+4,y+Math.floor(r*26)+5,3,3);
      }
    }
    ctx.restore();
  }

  function drawStoneDetails(x,y,gx,gy,type){
    const r=hash(gx,gy,33), r2=hash(gx,gy,38);
    ctx.save();
    ctx.globalAlpha=.26;
    ctx.strokeStyle=COLORS.stoneDark;
    ctx.lineWidth=1;
    ctx.beginPath();
    const inset=3+(r>0.55?1:0);
    ctx.rect(x+inset,y+inset,TILE-inset*2,TILE-inset*2);
    if(r>.45){
      ctx.moveTo(x+TILE*.18,y+TILE*.48);
      ctx.lineTo(x+TILE*(.58+r2*.16),y+TILE*.48);
    }
    if(r>.72){
      ctx.moveTo(x+TILE*.55,y+TILE*.12);
      ctx.lineTo(x+TILE*.48,y+TILE*.32);
      ctx.lineTo(x+TILE*.62,y+TILE*.42);
    }
    ctx.stroke();
    if((type==='road'||type==='plaza')&&r>.76){
      ctx.globalAlpha=.2; ctx.fillStyle=COLORS.moss;
      ctx.fillRect(x+5+Math.floor(r2*21),y+4+Math.floor(r*20),8,3);
    }
    ctx.restore();
  }

  function drawCell(x,y,type){
    const gx=Math.floor(x/TILE), gy=Math.floor(y/TILE);
    ctx.fillStyle=cellColor(type,gx,gy);
    ctx.fillRect(x,y,TILE+1,TILE+1);

    if(type==='road'||type==='plaza') drawStoneDetails(x,y,gx,gy,type);
    else if(type==='path'||type==='dirt'){
      const r=hash(gx,gy,52);
      ctx.save(); ctx.globalAlpha=.16; ctx.fillStyle='#b39a72';
      ctx.fillRect(x+5+Math.floor(r*17),y+8+Math.floor(r*14),4,3);
      if(r>.62) ctx.fillRect(x+23,y+25,5,3);
      ctx.restore();
    } else drawGrassDetails(x,y,gx,gy,type);
  }

  function drawTransitionOverlays(bounds){
    // Irregular vegetation shoulders make paths feel embedded in the biome.
    ctx.save();
    for(let y=bounds.y0;y<bounds.y1;y+=TILE){
      const cx=roadCenterX(y+TILE/2), w=roadHalfWidth(y+TILE/2);
      if(y<720) continue;
      for(const side of [-1,1]){
        const x=cx+side*(w+5);
        const r=hash(Math.floor(x/TILE),Math.floor(y/TILE),71);
        ctx.globalAlpha=.32;
        ctx.fillStyle=r>.5?'#718555':'#536d46';
        ctx.beginPath();
        ctx.ellipse(x,y+TILE/2,8+r*7,15+r*9,0,0,TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawSacredForecourt(){
    // Subtle holy stone ring around the altar area, not a giant square slab.
    ctx.save();
    ctx.globalAlpha=.18;
    ctx.strokeStyle='#d7ca8d';
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.ellipse(1300,720,108,64,0,0,TAU);
    ctx.stroke();
    ctx.globalAlpha=.08;
    ctx.beginPath();
    ctx.ellipse(1300,720,124,78,0,0,TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawGround=function roweb17Ground(){
    try{
      const b=visibleBounds();
      ctx.fillStyle='#5b734d';
      ctx.fillRect(0,0,WORLD.width,WORLD.height);

      for(let y=b.y0;y<b.y1;y+=TILE){
        for(let x=b.x0;x<b.x1;x+=TILE){
          drawCell(x,y,terrainAt(x+TILE/2,y+TILE/2));
        }
      }

      drawTransitionOverlays(b);
      drawSacredForecourt();
    }catch(error){
      console.error('Roweb v17 terrain fallback',error);
      previousDrawGround();
    }
  };

  // Expose semantic terrain for future spawn/quest systems without coupling them to rendering.
  window.RowebTerrain={
    version:'17.0.0',
    tileSize:TILE,
    terrainAt,
    roadCenterX,
    roadHalfWidth,
    zones:{
      cathedral:{x:1300,y:610,radius:260},
      westCemetery:{x:455,y:760,radius:230},
      eastCemetery:{x:2110,y:700,radius:235},
      westRuins:{x:780,y:925,radius:200},
      eastRuins:{x:1810,y:910,radius:210}
    }
  };

  if(!announced){
    announced=true;
    log('Terreno v17 ativo: campos de grama, estrada, caminhos secundários, cemitério e ruínas por zonas.','good');
  }
})();
