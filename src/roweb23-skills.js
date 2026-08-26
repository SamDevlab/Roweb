// Roweb v23 — persistent cleric skill progression.
// Adds skill ranks without replacing existing skill visuals/audio/behavior.
(() => {
  const R = window.Roweb;
  if (!R?.save || !R?.game) {
    console.error('Roweb v23 requires the v13 runtime.');
    return;
  }

  const META = {
    normal:     { label:'Ataque Normal', icon:'⚔', cap:5,  damageStep:.06, desc:'Golpe básico. Cada nível aumenta o dano e reduz levemente o intervalo.' },
    heal:       { label:'Cura',          icon:'✚', cap:10, damageStep:.09, desc:'Poder sagrado ofensivo contra demônios e recuperação adicional de HP.' },
    magnificat: { label:'Magnificat',    icon:'✹', cap:5,  damageStep:.08, desc:'Explosão sagrada em área. Níveis reduzem recarga e elevam o dano.' },
    blessing:   { label:'Benção',        icon:'✧', cap:10, damageStep:.075,desc:'Benção convertida em poder ofensivo. Amplifica o dano por nível.' },
    kyrie:      { label:'Kyrie Eleison', icon:'◉', cap:10, damageStep:.08, desc:'Barreira sagrada ofensiva. Fortalece dano e a absorção do escudo.' },
    sanctuary:  { label:'Santuário',     icon:'✠', cap:10, damageStep:.10, desc:'Área sagrada persistente. Cada nível aumenta muito o dano dos pulsos.' }
  };

  const saved = R.save.read().skills || {};
  const state = {
    levels: Object.fromEntries(Object.keys(META).map(k => [k, Math.max(1, Math.min(META[k].cap, Number(saved.levels?.[k]) || 1))]))
  };

  const baseStats = {};
  for (const key of Object.keys(META)) {
    if (!skills[key]) continue;
    baseStats[key] = { cost:skills[key].cost, cooldown:skills[key].cooldown };
  }

  function spentPoints(){return Object.values(state.levels).reduce((sum,v)=>sum+Math.max(0,v-1),0);}
  function earnedPoints(){return Math.max(0,(Number(player.level)||1)-1);}
  function availablePoints(){return Math.max(0,earnedPoints()-spentPoints());}
  function levelOf(key){return state.levels[key] || 1;}

  function configureSkill(key){
    const skill=skills[key],base=baseStats[key];
    if(!skill||!base)return;
    const lv=levelOf(key),extra=lv-1;
    const cooldownReduction=Math.min(.32,extra*(key==='normal'?.03:.035));
    skill.cooldown=Math.max(260,Math.round(base.cooldown*(1-cooldownReduction)));
    if(key==='normal') skill.cost=0;
    else {
      const costStep=key==='sanctuary'?2:key==='magnificat'?2:1;
      skill.cost=Math.round(base.cost+extra*costStep);
    }
  }
  function configureAll(){Object.keys(META).forEach(configureSkill);refreshHotbar();}

  function sourceSkill(source=''){
    const s=String(source).toLowerCase();
    if(s.includes('ataque'))return 'normal';
    if(s.includes('cura'))return 'heal';
    if(s.includes('magnificat'))return 'magnificat';
    if(s.includes('benção')||s.includes('bencao'))return 'blessing';
    if(s.includes('kyrie'))return 'kyrie';
    if(s.includes('santuário')||s.includes('santuario'))return 'sanctuary';
    return null;
  }

  const damageBase=damageMob;
  damageMob=function roweb23SkillDamage(mob,amount,color='#fff1a8',source='Dano sagrado'){
    const key=sourceSkill(source),meta=key&&META[key];
    const mult=meta?1+(levelOf(key)-1)*meta.damageStep:1;
    damageBase(mob,amount*mult,color,source);
  };

  const castBase=cast;
  cast=function roweb23SkillCast(name){
    configureSkill(name);
    const skill=skills[name],beforeLast=skill?.last,beforeHp=player.hp,beforeBarrier=player.barrier||0,beforeBarrierMax=player.barrierMax||0;
    castBase(name);
    if(!skill||skill.last===beforeLast)return;
    const lv=levelOf(name),extra=lv-1;
    if(name==='heal'&&extra>0){
      const bonus=Math.max(1,Math.round(extra*(4+player.level*.28)));
      player.hp=clamp(player.hp+bonus,0,player.maxHp);
      if(player.hp>beforeHp)floatingText(player.x,player.y-62,`+${bonus} skill`,'#caffdf');
    }
    if(name==='kyrie'&&extra>0&&player.barrier>beforeBarrier){
      const gained=player.barrier-beforeBarrier,bonus=Math.round(gained*extra*.10);
      player.barrier+=bonus;
      player.barrierMax=Math.max(player.barrierMax,beforeBarrierMax+gained+bonus);
      floatingText(player.x,player.y-62,`+${bonus} barreira`,'#9eeaff');
    }
    R.save.flush();
  };

  R.save.register('skills',()=>({version:1,levels:{...state.levels}}));

  const shell=document.querySelector('#game-shell');
  const style=document.createElement('style');
  style.textContent=`
    #skill-tree-toggle{position:fixed;right:20px;bottom:112px;z-index:25;border:1px solid rgba(191,169,236,.28);background:rgba(24,21,38,.93);color:#eee7ff;border-radius:13px;padding:9px 13px;font:700 12px/1 system-ui;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.22)}
    #skill-tree-toggle b{display:inline-grid;place-items:center;min-width:20px;height:20px;margin-right:7px;border-radius:6px;background:#322b4d;color:#dfceff}
    #skill-tree-panel{position:fixed;z-index:40;left:50%;top:50%;transform:translate(-50%,-50%);width:min(720px,calc(100vw - 28px));max-height:calc(100vh - 42px);overflow:auto;background:rgba(22,19,34,.97);border:1px solid rgba(190,168,230,.28);border-radius:18px;padding:18px;color:#eee9f5;box-shadow:0 24px 70px rgba(0,0,0,.48)}
    #skill-tree-panel.hidden{display:none}
    .skill-tree-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}.skill-tree-head strong{display:block;font:800 18px/1.15 system-ui}.skill-tree-head small{color:#b9b0c8}.skill-tree-points{color:#ffe58d;font:800 13px system-ui;white-space:nowrap}.skill-tree-close{border:0;background:#342e46;color:#fff;border-radius:9px;width:34px;height:34px;font-size:21px;cursor:pointer}
    .skill-tree-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.skill-node{display:grid;grid-template-columns:46px 1fr auto;gap:10px;align-items:center;padding:12px;border-radius:13px;background:#282438;border:1px solid rgba(255,255,255,.07)}.skill-node .node-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:10px;background:#393150;font-size:23px}.skill-node strong{font:800 13px system-ui}.skill-node p{margin:4px 0 0;color:#aaa3b5;font:11px/1.35 system-ui}.skill-node .node-rank{color:#e9dcff;font:800 12px system-ui}.skill-node button{width:38px;height:38px;border:1px solid rgba(220,199,255,.25);border-radius:10px;background:#44385f;color:#fff;font-size:20px;cursor:pointer}.skill-node button:disabled{opacity:.28;cursor:not-allowed}.skill-node.max{border-color:rgba(255,225,135,.22)}
    .skill-rank-badge{position:absolute;right:6px;top:6px;min-width:25px;padding:2px 5px;border-radius:7px;background:rgba(255,228,143,.14);color:#ffe99c;font:800 9px system-ui;pointer-events:none}
    @media(max-width:620px){.skill-tree-grid{grid-template-columns:1fr}#skill-tree-toggle{right:10px;bottom:105px}.skill-node{grid-template-columns:42px 1fr auto}}
  `;
  document.head.append(style);

  const toggle=document.createElement('button');toggle.id='skill-tree-toggle';toggle.type='button';toggle.innerHTML='<b>K</b>Habilidades';shell.append(toggle);
  const panel=document.createElement('section');panel.id='skill-tree-panel';panel.className='hidden';panel.setAttribute('aria-label','Árvore de habilidades');panel.innerHTML=`<header class="skill-tree-head"><div><small>PROGRESSÃO CLERICAL</small><strong>Habilidades de Aster</strong></div><span id="skill-tree-points" class="skill-tree-points"></span><button type="button" class="skill-tree-close" aria-label="Fechar">×</button></header><div id="skill-tree-grid" class="skill-tree-grid"></div>`;shell.append(panel);
  const grid=panel.querySelector('#skill-tree-grid'),pointsEl=panel.querySelector('#skill-tree-points');
  let open=false,lastLevel=-1,lastPoints=-1;

  function setOpen(value){open=!!value;panel.classList.toggle('hidden',!open);if(open)renderPanel();}
  function upgrade(key){const meta=META[key];if(!meta||availablePoints()<=0||levelOf(key)>=meta.cap)return;state.levels[key]++;configureSkill(key);R.save.flush();renderPanel();R.game.toast(`${meta.label} Nv. ${levelOf(key)}`);try{const A=window.AudioContext||window.webkitAudioContext;if(A){const ac=window.__rowebSkillAudio||(window.__rowebSkillAudio=new A());const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(720,t);o.frequency.exponentialRampToValueAtTime(1080,t+.16);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.045,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+.24);}}catch{}}

  function renderPanel(){pointsEl.textContent=`Pontos: ${availablePoints()}`;grid.innerHTML='';for(const [key,meta] of Object.entries(META)){const lv=levelOf(key),node=document.createElement('article');node.className=`skill-node${lv>=meta.cap?' max':''}`;const sk=skills[key];node.innerHTML=`<span class="node-icon">${meta.icon}</span><div><strong>${meta.label}</strong> <span class="node-rank">Nv. ${lv}/${meta.cap}</span><p>${meta.desc}<br>${sk?`${sk.cost} SP • ${(sk.cooldown/1000).toFixed(1)}s recarga`:''}</p></div><button type="button" aria-label="Aumentar ${meta.label}" ${availablePoints()<=0||lv>=meta.cap?'disabled':''}>+</button>`;node.querySelector('button').addEventListener('click',()=>upgrade(key));grid.append(node);}lastLevel=player.level;lastPoints=availablePoints();}

  function refreshHotbar(){for(const [key,meta] of Object.entries(META)){const button=document.querySelector(`.skill[data-skill="${key}"]`);if(!button)continue;let badge=button.querySelector('.skill-rank-badge');if(!badge){badge=document.createElement('span');badge.className='skill-rank-badge';button.style.position='relative';button.append(badge);}badge.textContent=`Nv.${levelOf(key)}`;const small=button.querySelector('small');if(small&&skills[key])small.textContent=`${skills[key].cost} SP`;button.title=`${meta.label} Nv. ${levelOf(key)} — ${meta.desc}`;}}

  toggle.addEventListener('click',()=>setOpen(!open));panel.querySelector('.skill-tree-close').addEventListener('click',()=>setOpen(false));addEventListener('keydown',e=>{if(e.key.toLowerCase()==='k'&&!e.repeat){const tag=e.target?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;e.preventDefault();setOpen(!open);}if(e.key==='Escape'&&open)setOpen(false);});
  R.events.on('frame',()=>{const pts=availablePoints();if(player.level!==lastLevel||pts!==lastPoints){configureAll();if(open)renderPanel();lastLevel=player.level;lastPoints=pts;}});

  configureAll();
  window.RowebSkills={version:'23.0',state,meta:META,level:levelOf,availablePoints,upgrade,open:()=>setOpen(true)};
  R.game.log('Habilidades v23 ativas: níveis persistentes, pontos por nível e painel K.','good');
})();
