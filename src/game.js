const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const minimap = document.querySelector('#minimap');
const mctx = minimap.getContext('2d');

const ui = {
  playerName: document.querySelector('#player-name'),
  classLabel: document.querySelector('#class-label'),
  hpFill: document.querySelector('#hp-fill'), hpText: document.querySelector('#hp-text'),
  spFill: document.querySelector('#sp-fill'), spText: document.querySelector('#sp-text'),
  xpFill: document.querySelector('#xp-fill'), xpText: document.querySelector('#xp-text'),
  targetPanel: document.querySelector('#target-panel'), targetName: document.querySelector('#target-name'),
  targetHpFill: document.querySelector('#target-hp-fill'), targetHpText: document.querySelector('#target-hp-text'),
  questProgress: document.querySelector('#quest-progress'), battleLog: document.querySelector('#battle-log'),
  toast: document.querySelector('#toast'), helpToggle: document.querySelector('#help-toggle'), helpContent: document.querySelector('#help-content')
};

const WORLD = { width: 2600, height: 1700 };
const TAU = Math.PI * 2;
const keys = new Set();
const particles = [];
const texts = [];
const shockwaves = [];
const otherPlayers = new Map();
let selfId = null;
let socket = null;
let lastNetUpdate = 0;
let now = performance.now();
let lastFrame = now;
let selectedId = null;
let kills = 0;
let toastTimer = null;
let objectiveComplete = false;

const camera = { x: 0, y: 0 };
const mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };

const classAt = level => level >= 16 ? 'Sumo Sacerdote' : level >= 8 ? 'Sacerdote' : 'Noviço';
const classScale = () => player.job === 'Sumo Sacerdote' ? 1.45 : player.job === 'Sacerdote' ? 1.22 : 1;

const stored = JSON.parse(localStorage.getItem('roweb-save') || '{}');
const player = {
  name: stored.name || 'Aster',
  x: Number(stored.x) || 1260, y: Number(stored.y) || 840,
  radius: 17, speed: 230, dir: 'down',
  level: Number(stored.level) || 1, xp: Number(stored.xp) || 0,
  maxHp: 110, hp: Number(stored.hp) || 110,
  maxSp: 80, sp: Number(stored.sp) || 80,
  job: 'Noviço', moveTarget: null, barrier: 0, barrierUntil: 0, barrierBurstDone: true,
  invulnerableUntil: 0, flashUntil: 0
};
player.job = classAt(player.level);

const skills = {
  normal: { name: 'Ataque Normal', cost: 0, cooldown: 520, range: 90, last: -99999 },
  heal: { name: 'Cura', cost: 10, cooldown: 1150, range: 360, last: -99999 },
  magnificat: { name: 'Magnificat', cost: 22, cooldown: 5200, range: 0, last: -99999 },
  blessing: { name: 'Benção', cost: 16, cooldown: 2600, range: 390, last: -99999 },
  kyrie: { name: 'Kyrie Eleison', cost: 25, cooldown: 7000, range: 0, last: -99999 }
};

const MOB_TEMPLATES = {
  imp: { name: 'Diabrete Rubro', maxHp: 68, speed: 82, damage: 8, xp: 24, radius: 16, tone: '#c05568' },
  eye: { name: 'Olho Profano', maxHp: 92, speed: 66, damage: 11, xp: 34, radius: 19, tone: '#8059a8' },
  bat: { name: 'Morcego Abissal', maxHp: 54, speed: 118, damage: 7, xp: 20, radius: 14, tone: '#4d4669' },
  poring: { name: 'Poring Demoníaco', maxHp: 420, speed: 58, damage: 18, xp: 180, radius: 34, tone: '#7e1e50', boss: true }
};

const spawnPoints = [
  ['imp', 500, 430], ['bat', 720, 540], ['eye', 930, 360], ['imp', 1580, 380],
  ['bat', 1870, 540], ['eye', 2100, 420], ['imp', 420, 1040], ['bat', 690, 1270],
  ['eye', 980, 1160], ['imp', 1690, 1180], ['bat', 1990, 1030], ['eye', 2200, 1320],
  ['poring', 2240, 800]
];

const mobs = spawnPoints.map((entry, i) => makeMob(i + 1, ...entry));

function makeMob(id, type, x, y) {
  const t = MOB_TEMPLATES[type];
  return {
    id, type, ...t, x, y, spawnX: x, spawnY: y, hp: t.maxHp, alive: true,
    angle: Math.random() * TAU, wanderUntil: 0, attackAt: 0, flashUntil: 0,
    respawnAt: 0, weakenUntil: 0, vulnerableUntil: 0, bossPulse: Math.random() * TAU
  };
}

const scenery = [
  { type: 'chapel', x: 1300, y: 240, w: 420, h: 250 },
  { type: 'altar', x: 1298, y: 720, w: 170, h: 90 },
  { type: 'grave', x: 420, y: 690 }, { type: 'grave', x: 520, y: 740 }, { type: 'grave', x: 370, y: 810 },
  { type: 'grave', x: 2070, y: 620 }, { type: 'grave', x: 2170, y: 690 }, { type: 'grave', x: 2050, y: 760 },
  { type: 'tree', x: 310, y: 310 }, { type: 'tree', x: 610, y: 260 }, { type: 'tree', x: 1980, y: 250 },
  { type: 'tree', x: 2300, y: 340 }, { type: 'tree', x: 280, y: 1350 }, { type: 'tree', x: 2260, y: 1380 },
  { type: 'crystal', x: 1210, y: 1350 }, { type: 'crystal', x: 1400, y: 1390 }
];

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize); resize();

function log(message, type = 'info') {
  const line = document.createElement('div');
  line.className = `log-${type}`;
  line.textContent = message;
  ui.battleLog.append(line);
  while (ui.battleLog.children.length > 5) ui.battleLog.firstChild.remove();
}

function toast(message) {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => ui.toast.classList.add('hidden'), 2200);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return min + Math.random() * (max - min); }

function selectedMob() { return mobs.find(m => m.id === selectedId && m.alive) || null; }
function nearestMob(max = Infinity) {
  return mobs.filter(m => m.alive).map(m => [m, dist(player, m)]).filter(([,d]) => d <= max).sort((a,b) => a[1]-b[1])[0]?.[0] || null;
}

function selectMob(mob) {
  selectedId = mob?.id ?? null;
  if (mob) log(`${mob.name} selecionado.`, 'info');
}

function xpNeeded(level) { return 75 + level * level * 18; }
function recalcStats(heal = false) {
  const oldMaxHp = player.maxHp;
  const oldMaxSp = player.maxSp;
  const rank = player.job === 'Sumo Sacerdote' ? 2 : player.job === 'Sacerdote' ? 1 : 0;
  player.maxHp = 100 + player.level * 10 + rank * 45;
  player.maxSp = 70 + player.level * 9 + rank * 32;
  if (heal) { player.hp = player.maxHp; player.sp = player.maxSp; }
  else {
    player.hp = clamp(player.hp + (player.maxHp - oldMaxHp), 1, player.maxHp);
    player.sp = clamp(player.sp + (player.maxSp - oldMaxSp), 0, player.maxSp);
  }
}
recalcStats(false);

function gainXp(amount) {
  player.xp += amount;
  let needed = xpNeeded(player.level);
  while (player.xp >= needed) {
    player.xp -= needed;
    const oldJob = player.job;
    player.level++;
    player.job = classAt(player.level);
    recalcStats(true);
    burst(player.x, player.y, '#ffe79d', 38, 150);
    shockwaves.push({ x: player.x, y: player.y, born: now, life: 1000, max: 120, color: '#fff0ad' });
    toast(`Nível ${player.level}! ${player.job}`);
    log(`Você alcançou o nível ${player.level}.`, 'good');
    if (oldJob !== player.job) {
      toast(`Evolução: ${player.job}!`);
      log(`Classe evoluída para ${player.job}. Habilidades fortalecidas!`, 'good');
    }
    needed = xpNeeded(player.level);
  }
  persist();
}

function persist() {
  localStorage.setItem('roweb-save', JSON.stringify({
    name: player.name, x: Math.round(player.x), y: Math.round(player.y), level: player.level,
    xp: player.xp, hp: Math.round(player.hp), sp: Math.round(player.sp)
  }));
}
setInterval(persist, 5000);

function burst(x, y, color, count = 16, speed = 100, size = 3) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const v = rand(speed * .35, speed);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: now, life: rand(450, 900), color, size: rand(size * .5, size * 1.5), gravity: rand(-5, 15) });
  }
}

function floatingText(x, y, text, color = '#fff') {
  texts.push({ x, y, text, color, born: now, life: 900 });
}

function damageMob(mob, amount, color = '#fff1a8', source = 'Dano sagrado') {
  if (!mob?.alive) return;
  const vuln = mob.vulnerableUntil > now ? 1.22 : 1;
  const damage = Math.max(1, Math.round(amount * vuln));
  mob.hp -= damage;
  mob.flashUntil = now + 130;
  floatingText(mob.x, mob.y - mob.radius - 8, `-${damage}`, color);
  burst(mob.x, mob.y, color, 9, 80, 2.5);
  if (mob.hp <= 0) killMob(mob, source);
}

function killMob(mob, source) {
  mob.hp = 0; mob.alive = false; mob.respawnAt = now + (mob.boss ? 18000 : 7500);
  if (selectedId === mob.id) selectedId = null;
  kills++;
  gainXp(Math.round(mob.xp * classScale()));
  burst(mob.x, mob.y, mob.boss ? '#ff4d9d' : '#8b5aaa', mob.boss ? 55 : 24, mob.boss ? 210 : 130, 4);
  shockwaves.push({ x: mob.x, y: mob.y, born: now, life: 900, max: mob.boss ? 150 : 75, color: mob.boss ? '#ff5ba8' : '#9b6aca' });
  log(`${mob.name} foi purificado por ${source}. +${Math.round(mob.xp * classScale())} XP`, 'good');
  if (mob.boss) {
    toast('Poring Demoníaco purificado!');
    log('O coração demoníaco do vale foi quebrado.', 'good');
  }
  if (kills >= 12 && !objectiveComplete) {
    objectiveComplete = true;
    gainXp(120);
    toast('Missão concluída: Purificação do Vale');
    log('Missão concluída! Bônus de 120 XP.', 'good');
  }
}

function spend(skill) {
  if (now - skill.last < skill.cooldown) return false;
  if (player.sp < skill.cost) { toast('SP insuficiente'); return false; }
  player.sp -= skill.cost;
  skill.last = now;
  return true;
}

function ensureTarget(range) {
  let mob = selectedMob();
  if (!mob) mob = nearestMob(range);
  if (mob && dist(player, mob) <= range) { selectedId = mob.id; return mob; }
  toast('Nenhum demônio no alcance');
  return null;
}

function cast(name) {
  const s = skills[name];
  if (!s) return;

  if (name === 'normal') {
    const target = ensureTarget(s.range);
    if (!target || !spend(s)) return;
    const dmg = (13 + player.level * 1.7) * classScale();
    damageMob(target, dmg, '#f1e7cf', 'Ataque Normal');
    player.dir = directionTo(target);
    shockwaves.push({ x: target.x, y: target.y, born: now, life: 240, max: 30, color: '#f4dfb3' });
    return;
  }

  if (name === 'heal') {
    const target = ensureTarget(s.range);
    if (!target || !spend(s)) return;
    const dmg = (29 + player.level * 3.1) * classScale();
    damageMob(target, dmg, '#aaf9d7', 'Cura');
    const recovered = Math.round((13 + player.level * 1.25) * classScale());
    player.hp = clamp(player.hp + recovered, 0, player.maxHp);
    floatingText(player.x, player.y - 35, `+${recovered} HP`, '#9dffd1');
    holyBeam(player, target, '#aaf9d7');
    log(`Cura causou dano sagrado e recuperou ${recovered} HP.`, 'good');
    return;
  }

  if (name === 'magnificat') {
    if (!spend(s)) return;
    const radius = 265 + player.level * 3;
    const victims = mobs.filter(m => m.alive && dist(player, m) <= radius);
    shockwaves.push({ x: player.x, y: player.y, born: now, life: 1100, max: radius, color: '#ffe7a0' });
    for (let p = 0; p < 3; p++) {
      setTimeout(() => {
        const pulseNow = performance.now();
        now = Math.max(now, pulseNow);
        for (const mob of victims.filter(v => v.alive && dist(player, v) <= radius + 35)) {
          damageMob(mob, (13 + player.level * 1.35) * classScale(), '#ffeeb0', 'Magnificat');
        }
        burst(player.x, player.y, '#ffe8a0', 18, 145, 3);
      }, p * 260);
    }
    player.sp = clamp(player.sp + Math.round(8 * classScale()), 0, player.maxSp);
    log(`Magnificat atingiu ${victims.length} demônio(s) em área.`, 'hit');
    return;
  }

  if (name === 'blessing') {
    const target = ensureTarget(s.range);
    if (!target || !spend(s)) return;
    damageMob(target, (38 + player.level * 3.7) * classScale(), '#d8beff', 'Benção');
    target.weakenUntil = now + 6000;
    target.vulnerableUntil = now + 6000;
    holyBeam(player, target, '#d8beff', 2);
    shockwaves.push({ x: target.x, y: target.y, born: now, life: 720, max: 60, color: '#d3b7ff' });
    log('Benção corrompeu a força demoníaca: -25% ataque e +22% dano recebido.', 'good');
    return;
  }

  if (name === 'kyrie') {
    if (!spend(s)) return;
    player.barrier = Math.round((42 + player.level * 4) * classScale());
    player.barrierUntil = now + 6000;
    player.barrierBurstDone = false;
    const radius = 185;
    for (const mob of mobs.filter(m => m.alive && dist(player, m) <= radius)) {
      damageMob(mob, (25 + player.level * 2.1) * classScale(), '#9adeff', 'Kyrie Eleison');
    }
    shockwaves.push({ x: player.x, y: player.y, born: now, life: 900, max: radius, color: '#8ad9ff' });
    burst(player.x, player.y, '#9adeff', 24, 155, 3);
    log(`Kyrie Eleison criou ${player.barrier} de barreira e explodiu em dano sagrado.`, 'good');
  }
}

function expireKyrie() {
  if (player.barrierBurstDone || player.barrierUntil <= 0) return;
  player.barrierBurstDone = true;
  const radius = 210;
  for (const mob of mobs.filter(m => m.alive && dist(player, m) <= radius)) {
    damageMob(mob, (20 + player.level * 1.8) * classScale(), '#b5eaff', 'Explosão de Kyrie');
  }
  shockwaves.push({ x: player.x, y: player.y, born: now, life: 700, max: radius, color: '#b5eaff' });
  burst(player.x, player.y, '#b5eaff', 20, 140, 3);
  player.barrier = 0; player.barrierUntil = 0;
  log('Kyrie Eleison terminou em uma segunda explosão sagrada.', 'hit');
}

function holyBeam(a, b, color, width = 1) {
  shockwaves.push({ beam: true, x: a.x, y: a.y - 8, x2: b.x, y2: b.y - 5, born: now, life: 320, color, width });
}

function directionTo(target) {
  const dx = target.x - player.x, dy = target.y - player.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

function hurtPlayer(amount) {
  if (now < player.invulnerableUntil) return;
  let remaining = amount;
  if (player.barrier > 0 && now < player.barrierUntil) {
    const absorbed = Math.min(player.barrier, remaining);
    player.barrier -= absorbed;
    remaining -= absorbed;
    floatingText(player.x, player.y - 42, `Bloqueio ${absorbed}`, '#9adeff');
    if (player.barrier <= 0) expireKyrie();
  }
  if (remaining > 0) {
    player.hp -= remaining;
    player.flashUntil = now + 180;
    floatingText(player.x, player.y - 34, `-${remaining}`, '#ff8295');
    burst(player.x, player.y, '#c24b61', 7, 72, 2.5);
  }
  player.invulnerableUntil = now + 260;
  if (player.hp <= 0) respawnPlayer();
}

function respawnPlayer() {
  player.hp = player.maxHp;
  player.sp = player.maxSp;
  player.x = 1290; player.y = 840; player.moveTarget = null;
  player.invulnerableUntil = now + 2500;
  toast('A luz do altar restaurou você');
  log('Você foi derrotado e retornou ao altar.', 'bad');
}

function updatePlayer(dt) {
  let dx = 0, dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy--;
  if (keys.has('s') || keys.has('arrowdown')) dy++;
  if (keys.has('a') || keys.has('arrowleft')) dx--;
  if (keys.has('d') || keys.has('arrowright')) dx++;
  if (dx || dy) {
    player.moveTarget = null;
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    player.x += dx * player.speed * dt; player.y += dy * player.speed * dt;
    if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left'; else player.dir = dy > 0 ? 'down' : 'up';
  } else if (player.moveTarget) {
    const tx = player.moveTarget.x - player.x, ty = player.moveTarget.y - player.y;
    const d = Math.hypot(tx, ty);
    if (d < 7) player.moveTarget = null;
    else {
      const step = Math.min(d, player.speed * dt);
      player.x += tx / d * step; player.y += ty / d * step;
      if (Math.abs(tx) > Math.abs(ty)) player.dir = tx > 0 ? 'right' : 'left'; else player.dir = ty > 0 ? 'down' : 'up';
    }
  }
  player.x = clamp(player.x, 55, WORLD.width - 55);
  player.y = clamp(player.y, 80, WORLD.height - 55);
  player.sp = clamp(player.sp + (player.job === 'Sumo Sacerdote' ? 5.4 : player.job === 'Sacerdote' ? 4.1 : 3.1) * dt, 0, player.maxSp);
  if (player.barrierUntil > 0 && now >= player.barrierUntil) expireKyrie();
}

function updateMobs(dt) {
  for (const mob of mobs) {
    if (!mob.alive) {
      if (now >= mob.respawnAt) {
        mob.alive = true; mob.hp = mob.maxHp; mob.x = mob.spawnX; mob.y = mob.spawnY;
        mob.weakenUntil = 0; mob.vulnerableUntil = 0;
        burst(mob.x, mob.y, '#6e437e', 14, 80, 2.5);
      }
      continue;
    }
    const d = dist(player, mob);
    const aggro = mob.boss ? 430 : 270;
    if (d < aggro) {
      const dx = player.x - mob.x, dy = player.y - mob.y;
      if (d > player.radius + mob.radius + 14) {
        const s = mob.speed * dt;
        mob.x += dx / d * s; mob.y += dy / d * s;
      } else if (now >= mob.attackAt) {
        const weakened = mob.weakenUntil > now ? .75 : 1;
        hurtPlayer(Math.round(mob.damage * weakened));
        mob.attackAt = now + (mob.boss ? 1050 : 1350);
        if (mob.boss) bossAttack(mob);
      }
    } else {
      if (now > mob.wanderUntil) { mob.angle = Math.random() * TAU; mob.wanderUntil = now + rand(1000, 3000); }
      mob.x += Math.cos(mob.angle) * mob.speed * .2 * dt;
      mob.y += Math.sin(mob.angle) * mob.speed * .2 * dt;
      const homeDx = mob.spawnX - mob.x, homeDy = mob.spawnY - mob.y;
      if (Math.hypot(homeDx, homeDy) > 130) mob.angle = Math.atan2(homeDy, homeDx);
    }
  }
}

function bossAttack(mob) {
  mob.bossPulse += 1;
  if (Math.floor(mob.bossPulse) % 3 !== 0) return;
  shockwaves.push({ x: mob.x, y: mob.y, born: now, life: 800, max: 160, color: '#ff477f' });
  if (dist(player, mob) < 160) hurtPlayer(10);
}

function updateEffects(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985; p.vy *= .985; p.vy += p.gravity * dt;
    if (now - p.born > p.life) particles.splice(i, 1);
  }
  for (let i = texts.length - 1; i >= 0; i--) if (now - texts[i].born > texts[i].life) texts.splice(i, 1);
  for (let i = shockwaves.length - 1; i >= 0; i--) if (now - shockwaves[i].born > shockwaves[i].life) shockwaves.splice(i, 1);
}

function updateCamera() {
  camera.x = lerp(camera.x, clamp(player.x - innerWidth / 2, 0, Math.max(0, WORLD.width - innerWidth)), .09);
  camera.y = lerp(camera.y, clamp(player.y - innerHeight / 2, 0, Math.max(0, WORLD.height - innerHeight)), .09);
}

function drawWorld() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.save(); ctx.translate(-camera.x, -camera.y);

  const grad = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  grad.addColorStop(0, '#27313c'); grad.addColorStop(.52, '#202c32'); grad.addColorStop(1, '#17232a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  drawGround(); drawRoads(); drawScenery(); drawAmbientRunes();

  const drawable = [];
  for (const m of mobs) if (m.alive) drawable.push({ y: m.y, kind: 'mob', value: m });
  for (const [id, p] of otherPlayers) if (id !== selfId) drawable.push({ y: p.y, kind: 'other', value: p });
  drawable.push({ y: player.y, kind: 'player', value: player });
  drawable.sort((a,b) => a.y - b.y);
  for (const item of drawable) {
    if (item.kind === 'mob') drawMob(item.value);
    else if (item.kind === 'player') drawPlayer(item.value, false);
    else drawPlayer(item.value, true);
  }

  drawEffects();
  ctx.restore();
}

function drawGround() {
  ctx.save();
  for (let x = 0; x < WORLD.width; x += 64) {
    for (let y = 0; y < WORLD.height; y += 64) {
      const n = ((x / 64) * 17 + (y / 64) * 23) % 7;
      ctx.fillStyle = n < 2 ? 'rgba(126,142,120,.035)' : 'rgba(0,0,0,.02)';
      ctx.fillRect(x, y, 64, 64);
      if (n === 1) {
        ctx.fillStyle = 'rgba(125,143,121,.13)';
        ctx.fillRect(x + 18, y + 36, 2, 7); ctx.fillRect(x + 23, y + 33, 2, 10);
      }
    }
  }
  ctx.strokeStyle = 'rgba(91,66,105,.18)'; ctx.lineWidth = 6;
  ctx.strokeRect(25, 25, WORLD.width - 50, WORLD.height - 50);
  ctx.restore();
}

function drawRoads() {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(117,112,107,.19)'; ctx.lineWidth = 145;
  ctx.beginPath(); ctx.moveTo(1300, 1600); ctx.bezierCurveTo(1270, 1250, 1330, 980, 1300, 700); ctx.bezierCurveTo(1280, 500, 1300, 390, 1300, 290); ctx.stroke();
  ctx.strokeStyle = 'rgba(190,173,144,.065)'; ctx.lineWidth = 5; ctx.setLineDash([18, 32]);
  ctx.beginPath(); ctx.moveTo(1300, 1600); ctx.lineTo(1300, 330); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}

function drawScenery() {
  for (const o of scenery) {
    if (o.type === 'chapel') drawChapel(o);
    if (o.type === 'altar') drawAltar(o);
    if (o.type === 'grave') drawGrave(o.x, o.y);
    if (o.type === 'tree') drawTree(o.x, o.y);
    if (o.type === 'crystal') drawCrystal(o.x, o.y);
  }
}

function drawChapel(o) {
  ctx.save(); ctx.translate(o.x, o.y);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 95, 250, 70, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#383947'; ctx.fillRect(-o.w/2, -o.h/2, o.w, o.h);
  ctx.fillStyle = '#2d2d3a'; ctx.fillRect(-85, -o.h/2 + 35, 170, o.h - 35);
  ctx.fillStyle = '#15151f'; ctx.fillRect(-32, 20, 64, 105);
  ctx.fillStyle = '#4a4857'; ctx.beginPath(); ctx.moveTo(-240,-125); ctx.lineTo(0,-260); ctx.lineTo(240,-125); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#352e42'; ctx.beginPath(); ctx.moveTo(-80,-125); ctx.lineTo(0,-205); ctx.lineTo(80,-125); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(206,183,255,.2)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0,-65,28,0,TAU); ctx.stroke();
  ctx.restore();
}

function drawAltar(o) {
  ctx.save(); ctx.translate(o.x, o.y);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 40, 115, 30, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#474752'; ctx.fillRect(-85, -20, 170, 70); ctx.fillStyle = '#5c5967'; ctx.fillRect(-72, -32, 144, 25);
  const g = ctx.createRadialGradient(0,-40,3,0,-40,72); g.addColorStop(0,'rgba(255,236,156,.7)'); g.addColorStop(1,'rgba(255,236,156,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,-40,72,0,TAU); ctx.fill();
  ctx.fillStyle = '#fff0a8'; ctx.beginPath(); ctx.moveTo(0,-80); ctx.lineTo(10,-50); ctx.lineTo(0,-20); ctx.lineTo(-10,-50); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawGrave(x,y) {
  ctx.save(); ctx.translate(x,y); ctx.fillStyle='rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0,16,24,10,0,0,TAU); ctx.fill();
  ctx.fillStyle='#4a4b50'; ctx.fillRect(-12,-25,24,45); ctx.beginPath(); ctx.arc(0,-25,12,Math.PI,TAU); ctx.fill();
  ctx.strokeStyle='#2f3035'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,-22);ctx.lineTo(0,4);ctx.moveTo(-7,-12);ctx.lineTo(7,-12);ctx.stroke(); ctx.restore();
}

function drawTree(x,y) {
  ctx.save(); ctx.translate(x,y); ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath();ctx.ellipse(0,20,45,16,0,0,TAU);ctx.fill();
  ctx.strokeStyle='#382f38';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(0,18);ctx.lineTo(-4,-50);ctx.lineTo(-28,-88);ctx.moveTo(-4,-50);ctx.lineTo(25,-78);ctx.stroke();
  ctx.fillStyle='#263638'; for(const [cx,cy,r] of [[-30,-88,31],[25,-85,35],[-2,-112,38]]){ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fill();} ctx.restore();
}

function drawCrystal(x,y) {
  ctx.save();ctx.translate(x,y); const pulse=.6+.4*Math.sin(now/500+x); ctx.shadowBlur=18;ctx.shadowColor='#8b65c9'; ctx.fillStyle=`rgba(118,83,168,${.55+.2*pulse})`;
  ctx.beginPath();ctx.moveTo(0,-45);ctx.lineTo(17,-8);ctx.lineTo(7,28);ctx.lineTo(-13,15);ctx.lineTo(-19,-12);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.restore();
}

function drawAmbientRunes() {
  ctx.save(); ctx.translate(1300, 790); ctx.strokeStyle='rgba(224,198,255,.08)'; ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(0,0,120,0,TAU);ctx.arc(0,0,92,0,TAU);ctx.stroke();
  for(let i=0;i<8;i++){const a=i/8*TAU+now/18000;ctx.save();ctx.rotate(a);ctx.strokeRect(102,-8,14,16);ctx.restore();} ctx.restore();
}

function drawMob(m) {
  const selected = m.id === selectedId;
  ctx.save(); ctx.translate(m.x, m.y);
  if (selected) { ctx.strokeStyle='#ffe58a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,9,m.radius+12,m.radius*.55+9,0,0,TAU);ctx.stroke(); }
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,m.radius*.7,m.radius*1.05,m.radius*.42,0,0,TAU);ctx.fill();
  if (m.type === 'poring') drawDemonPoring(m); else if (m.type === 'imp') drawImp(m); else if (m.type === 'eye') drawEye(m); else drawBat(m);
  if (m.weakenUntil > now) { ctx.strokeStyle='rgba(205,174,255,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-m.radius-7,8+Math.sin(now/160)*2,0,TAU);ctx.stroke(); }
  drawMobBar(m);
  ctx.restore();
}

function drawDemonPoring(m) {
  const squish = 1 + Math.sin(now/260 + m.bossPulse) * .06;
  ctx.save(); ctx.scale(1/squish, squish); ctx.shadowBlur=20;ctx.shadowColor='#8f1452';ctx.fillStyle=m.flashUntil>now?'#ffd5e6':m.tone;
  ctx.beginPath();ctx.moveTo(-35,9);ctx.bezierCurveTo(-42,-10,-25,-38,0,-41);ctx.bezierCurveTo(25,-38,42,-10,35,9);ctx.bezierCurveTo(22,34,-24,34,-35,9);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#201322';ctx.beginPath();ctx.arc(-12,-5,5,0,TAU);ctx.arc(12,-5,5,0,TAU);ctx.fill();ctx.strokeStyle='#ffcfdf';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,8,10,.15*Math.PI,.85*Math.PI);ctx.stroke();
  ctx.fillStyle='#2b172d';ctx.beginPath();ctx.moveTo(-25,-30);ctx.lineTo(-38,-51);ctx.lineTo(-13,-38);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(25,-30);ctx.lineTo(38,-51);ctx.lineTo(13,-38);ctx.closePath();ctx.fill();ctx.restore();
}

function drawImp(m) {
  ctx.fillStyle=m.flashUntil>now?'#ffd1d9':m.tone;ctx.beginPath();ctx.arc(0,-4,m.radius,0,TAU);ctx.fill();
  ctx.fillStyle='#362234';ctx.beginPath();ctx.moveTo(-11,-17);ctx.lineTo(-20,-33);ctx.lineTo(-4,-23);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(11,-17);ctx.lineTo(20,-33);ctx.lineTo(4,-23);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffd3a2';ctx.beginPath();ctx.arc(-6,-7,2.5,0,TAU);ctx.arc(6,-7,2.5,0,TAU);ctx.fill();
}
function drawEye(m) {
  ctx.fillStyle=m.flashUntil>now?'#e5d9ff':m.tone;ctx.beginPath();ctx.ellipse(0,-4,m.radius*1.2,m.radius*.8,0,0,TAU);ctx.fill();
  ctx.fillStyle='#ddd4f8';ctx.beginPath();ctx.ellipse(0,-4,m.radius*.62,m.radius*.43,0,0,TAU);ctx.fill();ctx.fillStyle='#35194d';ctx.beginPath();ctx.arc(0,-4,6,0,TAU);ctx.fill();
}
function drawBat(m) {
  const flap=Math.sin(now/90+m.id)*7;ctx.fillStyle=m.flashUntil>now?'#d8d1ef':m.tone;ctx.beginPath();ctx.arc(0,-3,8,0,TAU);ctx.fill();
  ctx.beginPath();ctx.moveTo(-5,-4);ctx.quadraticCurveTo(-20,-18-flap,-34,-5);ctx.quadraticCurveTo(-20,-1+flap,-6,4);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(5,-4);ctx.quadraticCurveTo(20,-18-flap,34,-5);ctx.quadraticCurveTo(20,-1+flap,6,4);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ff6c88';ctx.fillRect(-4,-5,2,2);ctx.fillRect(3,-5,2,2);
}

function drawMobBar(m) {
  const w=m.boss?78:48;const y=-m.radius-22;ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(-w/2,y,w,5);ctx.fillStyle=m.boss?'#e64982':'#ad4763';ctx.fillRect(-w/2,y,w*(m.hp/m.maxHp),5);
  ctx.fillStyle=m.boss?'#ffd2e4':'#e8dfe9';ctx.font=m.boss?'700 11px sans-serif':'10px sans-serif';ctx.textAlign='center';ctx.fillText(m.name,0,y-5);
}

function drawPlayer(p, remote) {
  ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=remote?.75:1;
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,13,18,8,0,0,TAU);ctx.fill();
  if (!remote && p.barrier>0 && p.barrierUntil>now) {
    const pulse=1+Math.sin(now/120)*.025;ctx.save();ctx.scale(pulse,pulse);ctx.strokeStyle='rgba(137,220,255,.85)';ctx.lineWidth=2;ctx.shadowBlur=14;ctx.shadowColor='#8fddff';ctx.beginPath();ctx.arc(0,-8,29,0,TAU);ctx.stroke();ctx.shadowBlur=0;ctx.restore();
  }
  const job=p.job||'Noviço'; const robe=job==='Sumo Sacerdote'?'#eee6ff':job==='Sacerdote'?'#e8e1ef':'#e5e2dd'; const trim=job==='Sumo Sacerdote'?'#8b6cc7':job==='Sacerdote'?'#9478b0':'#7b7483';
  ctx.fillStyle=robe;ctx.beginPath();ctx.moveTo(-11,-7);ctx.lineTo(11,-7);ctx.lineTo(16,19);ctx.lineTo(-16,19);ctx.closePath();ctx.fill();ctx.strokeStyle=trim;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(0,17);ctx.stroke();
  ctx.fillStyle='#e5b59b';ctx.beginPath();ctx.arc(0,-20,10,0,TAU);ctx.fill();ctx.fillStyle='#5a473e';ctx.beginPath();ctx.arc(0,-23,10,Math.PI,TAU);ctx.fill();
  if(job!=='Noviço'){ctx.strokeStyle=job==='Sumo Sacerdote'?'#ffe8a1':'#cfb8ef';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-34,11,0,TAU);ctx.stroke();}
  if(!remote&&p.flashUntil>now){ctx.fillStyle='rgba(255,80,100,.28)';ctx.beginPath();ctx.arc(0,-4,26,0,TAU);ctx.fill();}
  ctx.fillStyle=remote?'#c5bfd1':'#fff';ctx.font='700 10px sans-serif';ctx.textAlign='center';ctx.fillText(p.name||'Aventureiro',0,35);ctx.font='9px sans-serif';ctx.fillStyle='#b6b1c0';ctx.fillText(`${job} • Nv. ${p.level||1}`,0,46);ctx.restore();
}

function drawEffects() {
  for(const s of shockwaves){const t=clamp((now-s.born)/s.life,0,1);ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle=s.color;ctx.shadowBlur=10;ctx.shadowColor=s.color;if(s.beam){ctx.lineWidth=(s.width||1)*3*(1-t)+1;ctx.beginPath();ctx.moveTo(s.x,s.y);const mx=(s.x+s.x2)/2, my=(s.y+s.y2)/2-50*Math.sin(t*Math.PI);ctx.quadraticCurveTo(mx,my,s.x2,s.y2);ctx.stroke();}else{ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,lerp(8,s.max,t),0,TAU);ctx.stroke();}ctx.restore();}
  for(const p of particles){const t=(now-p.born)/p.life;ctx.globalAlpha=1-t;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(1-t*.5),0,TAU);ctx.fill();}
  ctx.globalAlpha=1;
  for(const f of texts){const t=(now-f.born)/f.life;ctx.globalAlpha=1-t;ctx.fillStyle=f.color;ctx.font='800 13px sans-serif';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y-t*32);}
  ctx.globalAlpha=1;
}

function drawMinimap() {
  mctx.clearRect(0,0,minimap.width,minimap.height);mctx.fillStyle='#121a22';mctx.fillRect(0,0,minimap.width,minimap.height);
  const sx=minimap.width/WORLD.width, sy=minimap.height/WORLD.height;
  mctx.strokeStyle='rgba(212,194,226,.15)';mctx.lineWidth=9;mctx.beginPath();mctx.moveTo(1300*sx,1600*sy);mctx.lineTo(1300*sx,300*sy);mctx.stroke();
  for(const m of mobs.filter(m=>m.alive)){mctx.fillStyle=m.boss?'#ff4d8e':'#9a5474';mctx.beginPath();mctx.arc(m.x*sx,m.y*sy,m.boss?3:1.6,0,TAU);mctx.fill();}
  mctx.fillStyle='#fff2a3';mctx.beginPath();mctx.arc(player.x*sx,player.y*sy,3,0,TAU);mctx.fill();
}

function updateUI() {
  ui.playerName.textContent=player.name;ui.classLabel.textContent=`${player.job} • Nv. ${player.level}`;
  ui.hpFill.style.width=`${clamp(player.hp/player.maxHp*100,0,100)}%`;ui.hpText.textContent=`${Math.ceil(player.hp)}/${player.maxHp}`;
  ui.spFill.style.width=`${clamp(player.sp/player.maxSp*100,0,100)}%`;ui.spText.textContent=`${Math.floor(player.sp)}/${player.maxSp}`;
  const need=xpNeeded(player.level);ui.xpFill.style.width=`${clamp(player.xp/need*100,0,100)}%`;ui.xpText.textContent=`${player.xp}/${need}`;
  const target=selectedMob();
  if(target){ui.targetPanel.classList.remove('hidden');ui.targetName.textContent=target.name;ui.targetHpFill.style.width=`${Math.max(0,target.hp/target.maxHp*100)}%`;ui.targetHpText.textContent=`${Math.ceil(target.hp)} / ${target.maxHp} HP`;}else ui.targetPanel.classList.add('hidden');
  ui.questProgress.textContent=objectiveComplete?'Concluída — o vale foi purificado':`Demônios purificados: ${Math.min(kills,12)} / 12`;
  for(const button of document.querySelectorAll('.skill')){const s=skills[button.dataset.skill];const remaining=clamp(1-(now-s.last)/s.cooldown,0,1);button.classList.toggle('on-cooldown',remaining>0);button.querySelector('.cooldown').style.transform=`scaleY(${remaining})`;}
}

function connectMultiplayer() {
  if (!location.protocol.startsWith('http')) return;
  const protocol=location.protocol==='https:'?'wss':'ws';
  try { socket=new WebSocket(`${protocol}://${location.host}`); } catch { return; }
  socket.addEventListener('open',()=>log('Conectado ao mapa multiplayer.', 'good'));
  socket.addEventListener('message',event=>{try{const msg=JSON.parse(event.data);if(msg.type==='welcome'){selfId=msg.id;for(const [id,p] of Object.entries(msg.players||{}))if(id!==selfId)otherPlayers.set(id,p);}if(msg.type==='join'||msg.type==='state')otherPlayers.set(msg.id,msg.player);if(msg.type==='leave')otherPlayers.delete(msg.id);}catch{}});
  socket.addEventListener('close',()=>log('Modo offline ativo. O jogo continua normalmente.', 'info'));
}

function networkTick() {
  if(!socket||socket.readyState!==1||now-lastNetUpdate<100)return;lastNetUpdate=now;
  socket.send(JSON.stringify({type:'state',player:{name:player.name,x:player.x,y:player.y,dir:player.dir,level:player.level,job:player.job}}));
}

function frame(ts) {
  now=ts;const dt=Math.min((ts-lastFrame)/1000,.05);lastFrame=ts;
  updatePlayer(dt);updateMobs(dt);updateEffects(dt);updateCamera();networkTick();drawWorld();drawMinimap();updateUI();requestAnimationFrame(frame);
}

addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys.add(k);
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  if(k==='1')cast('normal');if(k==='2')cast('heal');if(k==='3')cast('magnificat');if(k==='4')cast('blessing');if(k==='5')cast('kyrie');if(k===' ')cast('normal');
  if(k==='tab'){e.preventDefault();const alive=mobs.filter(m=>m.alive).sort((a,b)=>dist(player,a)-dist(player,b));if(!alive.length)return;const idx=Math.max(-1,alive.findIndex(m=>m.id===selectedId));selectMob(alive[(idx+1)%alive.length]);}
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

canvas.addEventListener('pointermove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.worldX=e.clientX+camera.x;mouse.worldY=e.clientY+camera.y;});
canvas.addEventListener('pointerdown',e=>{
  mouse.worldX=e.clientX+camera.x;mouse.worldY=e.clientY+camera.y;
  const hit=mobs.filter(m=>m.alive&&Math.hypot(m.x-mouse.worldX,m.y-mouse.worldY)<m.radius+18).sort((a,b)=>dist(player,a)-dist(player,b))[0];
  if(hit){selectMob(hit);if(dist(player,hit)<=skills.normal.range+20)cast('normal');return;}
  player.moveTarget={x:clamp(mouse.worldX,55,WORLD.width-55),y:clamp(mouse.worldY,80,WORLD.height-55)};
});

document.querySelectorAll('.skill').forEach(button=>button.addEventListener('click',()=>cast(button.dataset.skill)));
ui.helpToggle.addEventListener('click',()=>ui.helpContent.classList.toggle('hidden'));

log('Bem-vindo ao Vale da Catedral Caída.', 'info');
log('As artes de suporte foram convertidas em poder sagrado ofensivo contra demônios.', 'good');
connectMultiplayer();
requestAnimationFrame(frame);
