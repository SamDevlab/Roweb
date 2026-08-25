// Roweb v19 — authored world composition and zone-aware mob placement.
// Keeps Aster, combat, skills, loot and v18 rendering untouched.
(() => {
  const ZONES = {
    cathedral: { name:'Praça da Catedral', x:1300, y:560, rx:330, ry:390 },
    westCemetery: { name:'Cemitério do Poente', x:470, y:790, rx:300, ry:260 },
    eastCemetery: { name:'Cemitério Profanado', x:2110, y:760, rx:300, ry:250 },
    westRuins: { name:'Ruínas do Peregrino', x:790, y:1030, rx:290, ry:250 },
    eastRuins: { name:'Ruínas Abissais', x:1810, y:1030, rx:300, ry:260 },
    southGrove: { name:'Bosque das Relíquias', x:1300, y:1430, rx:470, ry:220 },
    bossClearing: { name:'Clareira Demoníaca', x:2240, y:980, rx:250, ry:220 }
  };

  const sceneLayout = [
    {type:'chapel',x:1300,y:250,w:430,h:270,zone:'cathedral'},
    {type:'altar',x:1300,y:708,w:170,h:86,zone:'cathedral'},
    {type:'pillar',x:1080,y:590,zone:'cathedral'},
    {type:'pillar',x:1520,y:590,zone:'cathedral'},
    {type:'grave',x:1015,y:470,zone:'cathedral'},
    {type:'grave',x:1585,y:470,zone:'cathedral'},

    // West cemetery — dense enough to read as a place, but with navigable lanes.
    {type:'grave',x:315,y:675,zone:'westCemetery'},{type:'grave',x:405,y:650,zone:'westCemetery'},
    {type:'grave',x:500,y:680,zone:'westCemetery'},{type:'grave',x:585,y:650,zone:'westCemetery'},
    {type:'grave',x:350,y:760,zone:'westCemetery'},{type:'grave',x:455,y:745,zone:'westCemetery'},
    {type:'grave',x:565,y:770,zone:'westCemetery'},{type:'grave',x:305,y:855,zone:'westCemetery'},
    {type:'grave',x:410,y:845,zone:'westCemetery'},{type:'grave',x:520,y:875,zone:'westCemetery'},
    {type:'tree',x:235,y:625,zone:'westCemetery'},{type:'tree',x:665,y:690,zone:'westCemetery'},
    {type:'tree',x:250,y:930,zone:'westCemetery'},{type:'ruin',x:620,y:900,zone:'westCemetery'},

    // East cemetery mirrors the theme but not the geometry.
    {type:'grave',x:1990,y:650,zone:'eastCemetery'},{type:'grave',x:2090,y:680,zone:'eastCemetery'},
    {type:'grave',x:2195,y:650,zone:'eastCemetery'},{type:'grave',x:2260,y:725,zone:'eastCemetery'},
    {type:'grave',x:2015,y:770,zone:'eastCemetery'},{type:'grave',x:2120,y:790,zone:'eastCemetery'},
    {type:'grave',x:2205,y:835,zone:'eastCemetery'},{type:'grave',x:1980,y:875,zone:'eastCemetery'},
    {type:'grave',x:2090,y:900,zone:'eastCemetery'},{type:'tree',x:2315,y:640,zone:'eastCemetery'},
    {type:'tree',x:1910,y:705,zone:'eastCemetery'},{type:'tree',x:2290,y:930,zone:'eastCemetery'},
    {type:'ruin',x:1935,y:930,zone:'eastCemetery'},

    // West ruins — broken architecture creates a readable combat arena.
    {type:'ruin',x:700,y:945,zone:'westRuins'},{type:'ruin',x:850,y:980,zone:'westRuins'},
    {type:'ruin',x:760,y:1120,zone:'westRuins'},{type:'pillar',x:645,y:1040,zone:'westRuins'},
    {type:'pillar',x:925,y:1080,zone:'westRuins'},{type:'tree',x:590,y:1180,zone:'westRuins'},
    {type:'tree',x:970,y:1215,zone:'westRuins'},

    // East ruins — more open center for imp/bat combat.
    {type:'ruin',x:1705,y:955,zone:'eastRuins'},{type:'ruin',x:1880,y:985,zone:'eastRuins'},
    {type:'ruin',x:1795,y:1145,zone:'eastRuins'},{type:'pillar',x:1640,y:1080,zone:'eastRuins'},
    {type:'pillar',x:1970,y:1090,zone:'eastRuins'},{type:'tree',x:1605,y:1215,zone:'eastRuins'},
    {type:'tree',x:2025,y:1205,zone:'eastRuins'},

    // Southern grove / relic field.
    {type:'tree',x:880,y:1370,zone:'southGrove'},{type:'tree',x:1030,y:1500,zone:'southGrove'},
    {type:'tree',x:1570,y:1490,zone:'southGrove'},{type:'tree',x:1740,y:1370,zone:'southGrove'},
    {type:'crystal',x:1110,y:1375,zone:'southGrove'},{type:'crystal',x:1215,y:1460,zone:'southGrove'},
    {type:'crystal',x:1395,y:1480,zone:'southGrove'},{type:'crystal',x:1510,y:1370,zone:'southGrove'},
    {type:'ruin',x:980,y:1305,zone:'southGrove'},{type:'ruin',x:1625,y:1300,zone:'southGrove'},

    // Forest framing, kept away from the pilgrimage road.
    {type:'tree',x:240,y:300},{type:'tree',x:440,y:335},{type:'tree',x:680,y:260},
    {type:'tree',x:1920,y:270},{type:'tree',x:2160,y:320},{type:'tree',x:2390,y:285},
    {type:'tree',x:260,y:1290},{type:'tree',x:470,y:1450},{type:'tree',x:2130,y:1440},{type:'tree',x:2360,y:1270}
  ];

  const spawnPools = {
    eye: [
      [340,710],[455,705],[585,735],[330,830],[465,900],[590,840],
      [1985,705],[2100,725],[2210,700],[2010,845],[2130,875],[2240,845]
    ],
    imp: [
      [675,1010],[790,940],[900,1035],[710,1140],[860,1160],
      [1680,1010],[1800,950],[1920,1035],[1710,1160],[1870,1165]
    ],
    bat: [
      [320,420],[545,480],[745,420],[390,1180],[650,1310],[820,1400],
      [1840,430],[2050,470],[2290,430],[1760,1350],[2000,1310],[2310,1180]
    ],
    poring: [[2240,980]]
  };

  function rebuildScenery(){
    scenery.splice(0,scenery.length,...sceneLayout.map(s=>({...s})));
    solidColliders.splice(0,solidColliders.length,...scenery.map(colliderFor).filter(Boolean));

    // Saved coordinates can land inside newly-authored scenery; relocate only when necessary.
    if(blockedAt(player,player.x,player.y,{collideMobs:false})){
      const p=findFreeSpot(1300,900,player.radius);
      player.x=p.x; player.y=p.y; player.moveTarget=null;
    }
  }

  function redistributeMobs(){
    const cursors={eye:0,imp:0,bat:0,poring:0};
    for(const m of mobs){
      const pool=spawnPools[m.type]||spawnPools.imp;
      const i=cursors[m.type]??0;
      const base=pool[i%pool.length];
      cursors[m.type]=i+1;
      const ring=Math.floor(i/pool.length);
      const angle=(i*2.399963229728653)+ring*.7;
      const jitter=ring?34+ring*23:0;
      const tx=base[0]+Math.cos(angle)*jitter;
      const ty=base[1]+Math.sin(angle)*jitter;
      const spot=findFreeSpot(tx,ty,m.radius,m);
      m.x=m.spawnX=spot.x;
      m.y=m.spawnY=spot.y;
      m.angle=angle;
      m.wanderUntil=0;
    }
  }

  function zoneAt(x,y){
    let best=null,bestScore=Infinity;
    for(const [id,z] of Object.entries(ZONES)){
      const score=((x-z.x)/z.rx)**2+((y-z.y)/z.ry)**2;
      if(score<1&&score<bestScore){best={id,...z};bestScore=score;}
    }
    return best;
  }

  // Semantic minimap mirrors the authored composition instead of showing only a vertical stripe.
  drawMinimap=function roweb19Minimap(){
    const w=minimap.width,h=minimap.height,sx=w/WORLD.width,sy=h/WORLD.height;
    mctx.clearRect(0,0,w,h);
    mctx.fillStyle='#1b2b1e';mctx.fillRect(0,0,w,h);

    // Zone silhouettes.
    const zoneStyle={
      cathedral:'#777568', westCemetery:'#35483b', eastCemetery:'#35483b',
      westRuins:'#4a4a3f', eastRuins:'#4a4a3f', southGrove:'#2b4934', bossClearing:'#402d3b'
    };
    mctx.save();mctx.globalAlpha=.72;
    for(const [id,z] of Object.entries(ZONES)){
      mctx.fillStyle=zoneStyle[id]||'#314733';mctx.beginPath();
      mctx.ellipse(z.x*sx,z.y*sy,z.rx*sx,z.ry*sy,0,0,TAU);mctx.fill();
    }
    mctx.restore();

    // Main pilgrimage road follows the actual v17/v18 centerline.
    mctx.save();mctx.strokeStyle='#a39a7c';mctx.lineWidth=8;mctx.lineCap='round';mctx.beginPath();
    for(let y=700,first=true;y<=WORLD.height;y+=60){
      const x=window.RowebTerrain?.roadCenterX?.(y)??1300;
      if(first){mctx.moveTo(x*sx,y*sy);first=false}else mctx.lineTo(x*sx,y*sy);
    }
    mctx.stroke();mctx.restore();

    // Cathedral footprint.
    mctx.fillStyle='#c2b9a3';mctx.fillRect((1300-120)*sx,120*sy,240*sx,170*sy);

    for(const m of mobs){
      if(!m.alive)continue;
      mctx.fillStyle=m.boss?'#ff4d8e':'#c65f7b';mctx.beginPath();
      mctx.arc(m.x*sx,m.y*sy,m.boss?3.2:1.7,0,TAU);mctx.fill();
    }
    mctx.fillStyle='#fff2a3';mctx.beginPath();mctx.arc(player.x*sx,player.y*sy,3,0,TAU);mctx.fill();
  };

  let currentZone='';
  const baseUpdateCamera=updateCamera;
  updateCamera=function roweb19Camera(){
    baseUpdateCamera();
    const z=zoneAt(player.x,player.y);
    const next=z?.id||'road';
    if(next!==currentZone){
      currentZone=next;
      if(z) log(`Área descoberta: ${z.name}.`,'info');
    }
  };

  function apply(){
    rebuildScenery();
    // v10 adds extra mobs in a zero-delay timer; wait one beat so the complete population is composed.
    setTimeout(()=>{
      redistributeMobs();
      resolveMobSeparation();
      window.RowebWorldV19={version:'19.0.0',zones:ZONES,zoneAt,sceneCount:scenery.length,mobCount:mobs.length};
      log(`Mapa v19 ativo: ${scenery.length} objetos organizados em regiões e ${mobs.length} demônios distribuídos por habitat.`,'good');
    },120);
  }

  apply();
})();
