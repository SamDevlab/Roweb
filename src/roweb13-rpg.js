// Roweb v13 RPG loop: ground loot, Zeny, inventory and equipment.
(() => {
  const R = window.Roweb;
  if (!R?.events || !R?.game) {
    console.error('Roweb v13 RPG requires roweb13-core.js');
    return;
  }

  const CATALOG = {
    novice_staff: { name:'Cajado de Peregrino', icon:'⚕', rarity:'common', slot:'weapon', description:'Um cajado leve usado por jovens clérigos.', stats:{ attack:4, holy:6 } },
    cotton_robe: { name:'Túnica de Linho', icon:'♙', rarity:'common', slot:'armor', description:'Vestes simples reforçadas para longas peregrinações.', stats:{ hp:24, sp:10 } },
    wing_sandals: { name:'Sandálias Abissais', icon:'♢', rarity:'uncommon', slot:'shoes', description:'Leves demais para terem vindo de uma criatura tão sombria.', stats:{ speed:12, sp:8 } },
    rosary: { name:'Rosário Purificado', icon:'✣', rarity:'uncommon', slot:'accessory', description:'A antiga corrupção foi convertida em poder sagrado.', stats:{ holy:9, sp:18 } },
    valley_staff: { name:'Cajado do Vale', icon:'✦', rarity:'rare', slot:'weapon', description:'Canaliza energia purificada da Catedral Caída.', stats:{ attack:8, holy:19, sp:24 } },
    sanctified_robe: { name:'Manto da Aurora', icon:'♜', rarity:'rare', slot:'armor', description:'Um manto que parece guardar a primeira luz da manhã.', stats:{ hp:62, sp:28, holy:7 } },
    demon_horn: { name:'Chifre Demoníaco', icon:'⌁', rarity:'material', description:'Material deixado por Diabretes Rubros.' },
    profane_lens: { name:'Lente Profana', icon:'◉', rarity:'material', description:'Fragmento ainda pulsante de um Olho Profano.' },
    abyss_wing: { name:'Asa Abissal', icon:'⌁', rarity:'material', description:'Membrana escura de um Morcego Abissal.' },
    demonic_jelly: { name:'Essência do Poring Demoníaco', icon:'●', rarity:'boss', description:'Uma essência rara, instável e surpreendentemente elástica.' }
  };

  const rarityLabel = { common:'Comum', uncommon:'Incomum', rare:'Raro', material:'Material', boss:'Chefe' };
  const slotLabel = { weapon:'Arma', armor:'Armadura', shoes:'Calçados', accessory:'Acessório' };
  const saved = R.save.read().rpg;
  const fresh = !saved;
  const state = {
    version: 1,
    zeny: Number(saved?.zeny) || 0,
    inventory: { ...(fresh ? { novice_staff:1, cotton_robe:1 } : {}), ...(saved?.inventory || {}) },
    equipment: { weapon:null, armor:null, shoes:null, accessory:null, ...(fresh ? { weapon:'novice_staff', armor:'cotton_robe' } : {}), ...(saved?.equipment || {}) }
  };

  const groundLoot = [];
  let lootSeq = 1;
  let panelOpen = false;
  let uiDirty = true;
  let lastUiPaint = 0;

  const shell = document.querySelector('#game-shell');
  const layer = document.createElement('div');
  layer.id = 'loot-layer';
  layer.setAttribute('aria-hidden', 'true');
  shell.append(layer);

  const toggle = document.createElement('button');
  toggle.id = 'inventory-toggle';
  toggle.type = 'button';
  toggle.innerHTML = '<b>I</b><span>Inventário</span>';
  shell.append(toggle);

  const panel = document.createElement('section');
  panel.id = 'rpg-panel';
  panel.className = 'panel hidden';
  panel.setAttribute('aria-label', 'Inventário e equipamentos');
  panel.innerHTML = `
    <header class="rpg-head">
      <div><span class="eyebrow">PERSONAGEM</span><strong>Inventário & Equipamentos</strong></div>
      <div class="rpg-wallet"><span>ZENY</span><b id="rpg-zeny">0</b></div>
      <button id="rpg-close" type="button" aria-label="Fechar">×</button>
    </header>
    <div class="rpg-body">
      <section class="equipment-section">
        <div class="rpg-section-title">EQUIPAMENTOS</div>
        <div id="equipment-grid" class="equipment-grid"></div>
        <div id="equipment-stats" class="equipment-stats"></div>
      </section>
      <section class="inventory-section">
        <div class="rpg-section-title">MOCHILA <small>Clique em um equipamento para vestir</small></div>
        <div id="inventory-grid" class="inventory-grid"></div>
      </section>
    </div>`;
  shell.append(panel);

  const zenyEl = panel.querySelector('#rpg-zeny');
  const equipmentGrid = panel.querySelector('#equipment-grid');
  const equipmentStats = panel.querySelector('#equipment-stats');
  const inventoryGrid = panel.querySelector('#inventory-grid');

  function bonuses() {
    const out = { attack:0, holy:0, hp:0, sp:0, speed:0 };
    for (const id of Object.values(state.equipment)) {
      const stats = CATALOG[id]?.stats;
      if (!stats) continue;
      for (const key of Object.keys(out)) out[key] += Number(stats[key]) || 0;
    }
    return out;
  }

  function statsText(stats={}) {
    const names = { attack:'ATQ', holy:'Sagrado', hp:'HP', sp:'SP', speed:'Vel.' };
    return Object.entries(stats).filter(([,v])=>v).map(([k,v])=>`+${v} ${names[k] || k}`).join(' • ');
  }

  function saveSnapshot() {
    return { version:state.version, zeny:state.zeny, inventory:{...state.inventory}, equipment:{...state.equipment} };
  }
  R.save.register('rpg', saveSnapshot);

  const recalcBase = recalcStats;
  recalcStats = function rowebRecalcWithGear(heal=false) {
    const old = { hp:player.hp, sp:player.sp, maxHp:player.maxHp, maxSp:player.maxSp };
    recalcBase(false);
    const b = bonuses();
    player.maxHp += b.hp;
    player.maxSp += b.sp;
    player.speed += b.speed;
    if (heal) {
      player.hp = player.maxHp;
      player.sp = player.maxSp;
    } else {
      player.hp = clamp(old.hp + (player.maxHp - old.maxHp), 1, player.maxHp);
      player.sp = clamp(old.sp + (player.maxSp - old.maxSp), 0, player.maxSp);
    }
  };

  const damageBase = damageMob;
  damageMob = function rowebDamageWithGear(mob, amount, color='#fff1a8', source='Dano sagrado') {
    const b = bonuses();
    const pct = source === 'Ataque Normal' ? b.attack : b.holy;
    damageBase(mob, amount * (1 + pct / 100), color, source);
  };

  function addItem(id, qty=1) {
    if (!CATALOG[id]) return;
    state.inventory[id] = (state.inventory[id] || 0) + qty;
    uiDirty = true;
  }

  function equip(id) {
    const item = CATALOG[id];
    if (!item?.slot || !state.inventory[id]) return;
    const previous = state.equipment[item.slot];
    if (previous === id) state.equipment[item.slot] = null;
    else state.equipment[item.slot] = id;
    recalcStats(false);
    R.save.flush();
    uiDirty = true;
    R.game.toast(previous === id ? `${item.name} removido.` : `${item.name} equipado.`);
  }

  function unequip(slot) {
    if (!state.equipment[slot]) return;
    state.equipment[slot] = null;
    recalcStats(false);
    R.save.flush();
    uiDirty = true;
  }

  function roll(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
  const TABLES = {
    imp: [ ['demon_horn', .62], ['cotton_robe', .055] ],
    eye: [ ['profane_lens', .62], ['rosary', .10] ],
    bat: [ ['abyss_wing', .62], ['wing_sandals', .10] ],
    poring: [ ['demonic_jelly', 1], ['valley_staff', .48], ['sanctified_robe', .22] ]
  };

  function makeDrop(kind, value, x, y, rarity='common') {
    const id = lootSeq++;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `world-drop rarity-${rarity}`;
    el.dataset.lootId = String(id);
    const item = kind === 'item' ? CATALOG[value] : null;
    el.innerHTML = `<span>${kind === 'zeny' ? '●' : item?.icon || '✦'}</span><small>${kind === 'zeny' ? `${value}z` : item?.name || value}</small>`;
    el.title = kind === 'zeny' ? `${value} Zeny` : `${item?.name || value}${item?.stats ? ` — ${statsText(item.stats)}` : ''}`;
    layer.append(el);
    const drop = { id, kind, value, x, y, born:performance.now(), expires:performance.now()+30000, el };
    groundLoot.push(drop);
    el.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (Math.hypot(player.x-drop.x, player.y-drop.y) <= 115) pickup(drop);
      else R.game.toast('Chegue mais perto para pegar o item.');
    });
  }

  function spawnDeathLoot(mob) {
    const zeny = mob.boss ? roll(120,220) : roll(4,15);
    makeDrop('zeny', zeny, mob.x + roll(-14,14), mob.y + roll(-10,10), mob.boss ? 'rare' : 'common');
    for (const [id,chance] of TABLES[mob.type] || []) {
      if (Math.random() > chance) continue;
      const item = CATALOG[id];
      makeDrop('item', id, mob.x + roll(-22,22), mob.y + roll(-16,16), item.rarity);
    }
  }

  function pickup(drop) {
    const idx = groundLoot.indexOf(drop);
    if (idx < 0) return;
    groundLoot.splice(idx,1);
    drop.el.remove();
    if (drop.kind === 'zeny') {
      state.zeny += drop.value;
      R.game.floatingText(player.x, player.y-54, `+${drop.value} Zeny`, '#ffe38a');
    } else {
      addItem(drop.value,1);
      const item = CATALOG[drop.value];
      R.game.log(`Drop obtido: ${item.name}.`, item.rarity === 'rare' || item.rarity === 'boss' ? 'good' : 'info');
      if (item.rarity === 'rare' || item.rarity === 'boss') R.game.toast(`${item.name} encontrado!`);
    }
    R.save.flush();
    uiDirty = true;
  }

  function nearestLoot(range=90) {
    let best=null, bestD=range;
    for (const drop of groundLoot) {
      const d=Math.hypot(player.x-drop.x,player.y-drop.y);
      if(d<bestD){best=drop;bestD=d;}
    }
    return best;
  }

  function updateDrops() {
    const t=performance.now();
    for (let i=groundLoot.length-1;i>=0;i--) {
      const drop=groundLoot[i];
      if (t>=drop.expires) { drop.el.remove(); groundLoot.splice(i,1); continue; }
      const sx=Math.round(drop.x-camera.x), sy=Math.round(drop.y-camera.y);
      drop.el.style.transform=`translate(${sx}px,${sy}px) translate(-50%,-100%)`;
      drop.el.classList.toggle('drop-near', Math.hypot(player.x-drop.x,player.y-drop.y)<85);
      if (Math.hypot(player.x-drop.x,player.y-drop.y)<34) pickup(drop);
    }
  }

  function renderPanel() {
    if (!uiDirty && performance.now()-lastUiPaint<1000) return;
    lastUiPaint=performance.now(); uiDirty=false;
    zenyEl.textContent=state.zeny.toLocaleString('pt-BR');
    equipmentGrid.innerHTML='';
    for (const slot of ['weapon','armor','shoes','accessory']) {
      const id=state.equipment[slot], item=CATALOG[id];
      const card=document.createElement('button');
      card.type='button'; card.className=`equipment-slot ${item ? `rarity-${item.rarity}` : ''}`;
      card.innerHTML=`<span class="slot-label">${slotLabel[slot]}</span><b>${item?.icon || '＋'}</b><strong>${item?.name || 'Vazio'}</strong><small>${item?.stats ? statsText(item.stats) : 'Clique em um item da mochila'}</small>`;
      if(item) card.addEventListener('click',()=>unequip(slot)); else card.disabled=true;
      equipmentGrid.append(card);
    }
    const b=bonuses();
    equipmentStats.innerHTML=`<span>ATQ <b>+${b.attack}%</b></span><span>SAGRADO <b>+${b.holy}%</b></span><span>HP <b>+${b.hp}</b></span><span>SP <b>+${b.sp}</b></span><span>VEL <b>+${b.speed}</b></span>`;

    inventoryGrid.innerHTML='';
    const entries=Object.entries(state.inventory).filter(([,qty])=>qty>0).sort((a,b)=>{
      const order={boss:4,rare:3,uncommon:2,common:1,material:0};
      return (order[CATALOG[b[0]]?.rarity]||0)-(order[CATALOG[a[0]]?.rarity]||0);
    });
    if(!entries.length){inventoryGrid.innerHTML='<div class="inventory-empty">A mochila está vazia. Purifique demônios para encontrar itens.</div>';return;}
    for(const [id,qty] of entries){
      const item=CATALOG[id]; if(!item) continue;
      const card=document.createElement('button'); card.type='button';
      const equipped=Object.values(state.equipment).includes(id);
      card.className=`inventory-item rarity-${item.rarity}${equipped?' equipped':''}`;
      card.innerHTML=`<span class="item-icon">${item.icon}</span><div><strong>${item.name}</strong><small>${rarityLabel[item.rarity]}${item.stats?` • ${statsText(item.stats)}`:''}</small></div><b class="item-qty">${qty>1?`×${qty}`:equipped?'E':''}</b>`;
      card.title=item.description;
      if(item.slot) card.addEventListener('click',()=>equip(id)); else card.disabled=true;
      inventoryGrid.append(card);
    }
  }

  function setPanel(open) {
    panelOpen=Boolean(open);
    panel.classList.toggle('hidden',!panelOpen);
    toggle.classList.toggle('active',panelOpen);
    if(panelOpen){uiDirty=true;renderPanel();}
  }

  toggle.addEventListener('click',()=>setPanel(!panelOpen));
  panel.querySelector('#rpg-close').addEventListener('click',()=>setPanel(false));
  addEventListener('keydown',e=>{
    if(e.key.toLowerCase()==='i'&&!e.repeat){e.preventDefault();setPanel(!panelOpen);}
    if(e.key.toLowerCase()==='e'&&!e.repeat){const drop=nearestLoot(95);if(drop)pickup(drop);}
    if(e.key==='Escape'&&panelOpen)setPanel(false);
  });

  R.events.on('mob:killed',spawnDeathLoot);
  R.events.on('frame',()=>{updateDrops();if(panelOpen)renderPanel();});

  recalcStats(false);
  R.save.flush();
  renderPanel();
  R.rpg={ state, catalog:CATALOG, bonuses, addItem, equip, openInventory:()=>setPanel(true) };
  R.game.log('RPG v13 ativo: drops no chão, Zeny, inventário e equipamentos. Pressione I.','good');
})();
