// Roweb v9 player renderer, loaded through the existing v8 entrypoint.
// Uses original sprites extracted from the approved Aster concept sheet.
(() => {
  const previousDrawPlayer=drawPlayer;
  const images=new Map();
  let loaded=false;

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
  }

  async function prepare(){
    try{
      await Promise.all([
        loadScript('/roweb9-novice-data.js'),
        loadScript('/roweb9-priest-data.js'),
        loadScript('/roweb9-high-data.js')
      ]);
      for(const [key,src] of Object.entries(window.ROWEB9_SPRITE_DATA||{})){
        const im=new Image();im.decoding='async';im.src=src;images.set(key,im);
      }
      await Promise.all([...images.values()].map(im=>im.decode?.().catch(()=>{})||Promise.resolve()));
      loaded=true;
      log('Sprite v9 ativo: Aster agora usa a arte aprovada do concept sheet.','good');
    }catch(err){
      console.error('Falha ao carregar sprite v9',err);
      log('Sprite v9 não carregou; usando fallback anterior.');
    }
  }
  prepare();

  const classKey=job=>job==='Sumo Sacerdote'?'high':job==='Sacerdote'?'priest':'novice';
  function poseFor(p){
    const k=classKey(p.job);
    if(p.dir==='up')return{key:`${k}_back`,flip:false};
    if(p.dir==='left')return{key:`${k}_side`,flip:false};
    if(p.dir==='right')return{key:`${k}_side`,flip:true};
    return{key:`${k}_front`,flip:false};
  }
  const spriteHeight=job=>job==='Sumo Sacerdote'?92:job==='Sacerdote'?88:84;

  function renderConcept(p){
    if(!loaded)return false;
    const pose=poseFor(p),im=images.get(pose.key);
    if(!im?.naturalWidth)return false;
    const stride=p.moving?Math.floor(now/145)%2:0;
    const bob=p.moving?(stride?-2:0):Math.sin(now/430)*.45;
    const h=spriteHeight(p.job)+bob;
    const w=im.naturalWidth*(h/im.naturalHeight);
    const y=Math.round(p.y-h+p.radius+12);
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(p.flashUntil>now){ctx.globalAlpha=.75;ctx.filter='brightness(1.7) saturate(.82)';}
    if(pose.flip){ctx.translate(Math.round(p.x*2),0);ctx.scale(-1,1);}
    ctx.drawImage(im,Math.round(p.x-w/2),y,Math.round(w),Math.round(h));
    ctx.restore();
    return true;
  }

  drawPlayer=function(p){
    ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#242126';ctx.beginPath();ctx.ellipse(p.x,p.y+11,p.job==='Sumo Sacerdote'?20:18,6,0,0,TAU);ctx.fill();ctx.restore();
    if(p===player)drawKyrieBarrier();
    if(!renderConcept(p)){previousDrawPlayer(p);return;}
    ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='700 10px sans-serif';ctx.fillText(p.name||'Aventureiro',p.x,p.y+34);
    ctx.fillStyle='#ddd5d5';ctx.font='9px sans-serif';ctx.fillText(`${p.job||'Noviço'} • Nv. ${p.level||1}`,p.x,p.y+46);
  };
})();