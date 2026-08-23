const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const minimap = document.querySelector('#minimap');
const mctx = minimap.getContext('2d');
ctx.imageSmoothingEnabled = false;
mctx.imageSmoothingEnabled = false;

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

const WORLD = { width: 2600, height: 1700, margin: 42 };
const TAU = Math.PI * 2;
const keys = new Set();
const particles = [];
const texts = [];
const shockwaves = [];
const otherPlayers = new Map();
const spriteCache = new Map();
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
const dirRow = { down: 0, left: 1, right: 2, up: 3 };

const stored = JSON.parse(localStorage.getItem('roweb-save') || '{}');
const player = {
  name: stored.name || 'Aster',
  x: Number(stored.x) || 1260, y: Number(stored.y) || 900,
  radius: 15, speed: 225, dir: 'down', moving: false,
  level: Number(stored.level) || 1, xp: Number(stored.xp) || 0,
  maxHp: 110, hp: Number(stored.hp) || 110,
  maxSp: 80, sp: Number(stored.sp) || 80,
  job: 'Noviço', moveTarget: null, barrier: 0, barrierUntil: 0, barrierBurstDone: true,
  invulnerableUntil: 0, flashUntil: 0, attackingUntil: 0
};
player.job = classAt(player.level);

const skills = {
  normal: { name: 'Ataque Normal', cost: 0, cooldown: 520, range: 82, last: -99999 },
  heal: { name: 'Cura', cost: 10, cooldown: 1150, range: 355, last: -99999 },
  magnificat: { name: 'Magnificat', cost: 22, cooldown: 5200, range: 0, last: -99999 },
  blessing: { name: 'Benção', cost: 16, cooldown: 2600, range: 385, last: -99999 },
  kyrie: { name: 'Kyrie Eleison', cost: 25, cooldown: 7000, range: 0, last: -99999 }
};

const MOB_TEMPLATES = {
  imp: { name: 'Diabrete Rubro', maxHp: 68, speed: 78, damage: 8, xp: 24, radius: 16, aggro: 245 },
  eye: { name: 'Olho Profano', maxHp: 92, speed: 62, damage: 11, xp: 34, radius: 19, aggro: 280 },
  bat: { name: 'Morcego Abissal', maxHp: 54, speed: 112, damage: 7, xp: 20, radius: 14, aggro: 220 },
  poring: { name: 'Poring Demoníaco', maxHp: 420, speed: 54, damage: 18, xp: 180, radius: 31, aggro: 330, boss: true }
};

const spawnPoints = [
  ['imp', 500, 430], ['bat', 720, 540], ['eye', 930, 390], ['imp', 1660, 400],
  ['bat', 1880, 560], ['eye', 2110, 420], ['imp', 420, 1060], ['bat', 690, 1280],
  ['eye', 980, 1160], ['imp', 1690, 1180], ['bat', 1990, 1040], ['eye', 2200, 1320],
  ['poring', 2240, 820]
];

function makeMob(id, type, x, y) {
  const t = MOB_TEMPLATES[type];
  return {
    id, type, ...t, x, y, spawnX: x, spawnY: y, hp: t.maxHp, alive: true,
    dir: 'down', moving: false, angle: Math.random() * TAU, wanderUntil: 0, attackAt: 0,
    flashUntil: 0, respawnAt: 0, weakenUntil: 0, vulnerableUntil: 0, attackingUntil: 0
  };
}
const mobs = spawnPoints.map((entry, i) => makeMob(i + 1, ...entry));

const scenery = [
  { type: 'chapel', x: 1300, y: 250, w: 430, h: 270 },
  { type: 'altar', x: 1300, y: 720, w: 170, h: 86 },
  { type: 'grave', x: 420, y: 690 }, { type: 'grave', x: 520, y: 750 }, { type: 'grave', x: 365, y: 820 },
  { type: 'grave', x: 2070, y: 620 }, { type: 'grave', x: 2170, y: 690 }, { type: 'grave', x: 2050, y: 770 },
  { type: 'tree', x: 305, y: 315 }, { type: 'tree', x: 610, y: 265 }, { type: 'tree', x: 1980, y: 255 },
  { type: 'tree', x: 2310, y: 350 }, { type: 'tree', x: 285, y: 1360 }, { type: 'tree', x: 2260, y: 1380 },
  { type: 'crystal', x: 1210, y: 1360 }, { type: 'crystal', x: 1400, y: 1400 },
  { type: 'pillar', x: 1070, y: 570 }, { type: 'pillar', x: 1530, y: 570 },
  { type: 'ruin', x: 780, y: 900 }, { type: 'ruin', x: 1810, y: 890 }
];

function colliderFor(s) {
  if (s.type === 'chapel') return { kind: 'rect', x: s.x - s.w / 2 + 18, y: s.y - s.h / 2 + 55, w: s.w - 36, h: s.h - 80 };
  if (s.type === 'altar') return { kind: 'rect', x: s.x - s.w / 2 + 12, y: s.y - s.h / 2 + 22, w: s.w - 24, h: s.h - 28 };
  if (s.type === 'grave') return { kind: 'rect', x: s.x - 16, y: s.y - 10, w: 32, h: 26 };
  if (s.type === 'tree') return { kind: 'circle', x: s.x, y: s.y + 20, r: 34 };
  if (s.type === 'crystal') return { kind: 'circle', x: s.x, y: s.y + 6, r: 21 };
  if (s.type === 'pillar') return { kind: 'circle', x: s.x, y: s.y + 8, r: 23 };
  if (s.type === 'ruin') return { kind: 'rect', x: s.x - 35, y: s.y - 18, w: 70, h: 36 };
  return null;
}
const solidColliders = scenery.map(colliderFor).filter(Boolean);

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize);
resize();

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
function directionFromVector(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
function directionTo(target) { return directionFromVector(target.x - player.x, target.y - player.y); }

function circleHitsRect(x, y, r, rect) {
  const cx = clamp(x, rect.x, rect.x + rect.w);
  const cy = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy < r * r;
}
function hitsScenery(x, y, r) {
  for (const c of solidColliders) {
    if (c.kind === 'circle') {
      const dx = x - c.x, dy = y - c.y;
      if (dx * dx + dy * dy < (r + c.r) ** 2) return true;
    } else if (circleHitsRect(x, y, r, c)) return true;
  }
  return false;
}
function hitsMob(x, y, r, ignore = null) {
  for (const m of mobs) {
    if (!m.alive || m === ignore) continue;
    const dx = x - m.x, dy = y - m.y;
    if (dx * dx + dy * dy < (r + m.radius - 2) ** 2) return true;
  }
  return false;
}
function blockedAt(entity, x, y, options = {}) {
  const r = entity.radius || 14;
  if (x - r < WORLD.margin || x + r > WORLD.width - WORLD.margin || y - r < WORLD.margin || y + r > WORLD.height - WORLD.margin) return true;
  if (hitsScenery(x, y, r)) return true;
  if (options.collideMobs !== false && hitsMob(x, y, r, options.ignoreMob || null)) return true;
  if (options.collidePlayer && entity !== player) {
    const dx = x - player.x, dy = y - player.y;
    if (dx * dx + dy * dy < (r + player.radius) ** 2) return true;
  }
  return false;
}
function moveWithCollision(entity, dx, dy, options = {}) {
  let moved = false;
  if (dx) {
    const nx = entity.x + dx;
    if (!blockedAt(entity, nx, entity.y, options)) { entity.x = nx; moved = true; }
  }
  if (dy) {
    const ny = entity.y + dy;
    if (!blockedAt(entity, entity.x, ny, options)) { entity.y = ny; moved = true; }
  }
  return moved;
}
function resolveMobSeparation() {
  const alive = mobs.filter(m => m.alive);
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.hypot(dx, dy) || 0.001;
      const min = a.radius + b.radius - 1;
      if (d >= min) continue;
      const push = (min - d) * 0.5;
      dx /= d; dy /= d;
      const ax = a.x - dx * push, ay = a.y - dy * push;
      const bx = b.x + dx * push, by = b.y + dy * push;
      if (!hitsScenery(ax, ay, a.radius)) { a.x = ax; a.y = ay; }
      if (!hitsScenery(bx, by, b.radius)) { b.x = bx; b.y = by; }
    }
  }
}
function findFreeSpot(x, y, r, ignoreMob = null) {
  const probe = { radius: r };
  if (!blockedAt(probe, x, y, { ignoreMob, collideMobs: true })) return { x, y };
  for (let ring = 1; ring <= 12; ring++) {
    const rad = ring * 26;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU;
      const nx = x + Math.cos(a) * rad, ny = y + Math.sin(a) * rad;
      if (!blockedAt(probe, nx, ny, { ignoreMob, collideMobs: true })) return { x: nx, y: ny };
    }
  }
  return { x: 1300, y: 900 };
}

for (const m of mobs) {
  const p = findFreeSpot(m.x, m.y, m.radius, m);
  m.x = m.spawnX = p.x; m.y = m.spawnY = p.y;
}
if (blockedAt(player, player.x, player.y, { collideMobs: true })) {
  const p = findFreeSpot(1260, 900, player.radius);
  player.x = p.x; player.y = p.y;
}

function selectedMob() { return mobs.find(m => m.id === selectedId && m.alive) || null; }
function nearestMob(max = Infinity) {
  return mobs.filter(m => m.alive).map(m => [m, dist(player, m)]).filter(([, d]) => d <= max).sort((a, b) => a[1] - b[1])[0]?.[0] || null;
}
function selectMob(mob) { selectedId = mob?.id ?? null; if (mob) log(`${mob.name} selecionado.`, 'info'); }

function xpNeeded(level) { return 75 + level * level * 18; }
function recalcStats(heal = false) {
  const oldMaxHp = player.maxHp, oldMaxSp = player.maxSp;
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

function persist() {
  localStorage.setItem('roweb-save', JSON.stringify({ name: player.name, x: Math.round(player.x), y: Math.round(player.y), level: player.level, xp: player.xp, hp: Math.round(player.hp), sp: Math.round(player.sp) }));
}
setInterval(persist, 5000);

function gainXp(amount) {
  player.xp += amount;
  let needed = xpNeeded(player.level);
  while (player.xp >= needed) {
    player.xp -= needed;
    const oldJob = player.job;
    player.level++;
    player.job = classAt(player.level);
    recalcStats(true);
    burst(player.x, player.y, '#ffe79d', 38, 150, 3);
    shockwaves.push({ x: player.x, y: player.y, born: now, life: 1000, max: 120, color: '#fff0ad' });
    toast(`Nível ${player.level}! ${player.job}`);
    if (oldJob !== player.job) log(`Classe evoluída para ${player.job}. Habilidades fortalecidas!`, 'good');
    needed = xpNeeded(player.level);
  }
  persist();
}

function burst(x, y, color, count = 16, speed = 100, size = 3) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU, v = rand(speed * .35, speed);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: now, life: rand(450, 900), color, size: rand(size * .5, size * 1.5) });
  }
}
function floatingText(x, y, text, color = '#fff') { texts.push({ x, y, text, color, born: now, life: 900 }); }
function holyBeam(from, to, color) { shockwaves.push({ x: from.x, y: from.y - 20, x2: to.x, y2: to.y - 10, born: now, life: 380, color, beam: true, width: 2 }); }

function damageMob(mob, amount, color = '#fff1a8', source = 'Dano sagrado') {
  if (!mob?.alive) return;
  const vuln = mob.vulnerableUntil > now ? 1.22 : 1;
  const damage = Math.max(1, Math.round(amount * vuln));
  mob.hp -= damage; mob.flashUntil = now + 160;
  floatingText(mob.x, mob.y - mob.radius - 18, `-${damage}`, color);
  burst(mob.x, mob.y, color, 9, 80, 2.5);
  if (mob.hp <= 0) killMob(mob, source);
}
function killMob(mob, source) {
  mob.hp = 0; mob.alive = false; mob.respawnAt = now + (mob.boss ? 18000 : 7500);
  if (selectedId === mob.id) selectedId = null;
  kills++;
  const xp = Math.round(mob.xp * classScale());
  gainXp(xp);
  burst(mob.x, mob.y, mob.boss ? '#ff4d9d' : '#8b5aaa', mob.boss ? 55 : 24, mob.boss ? 210 : 130, 4);
  log(`${mob.name} foi purificado por ${source}. +${xp} XP`, 'good');
  if (mob.boss) toast('Poring Demoníaco purificado!');
  if (kills >= 12 && !objectiveComplete) { objectiveComplete = true; gainXp(120); toast('Missão concluída: Purificação do Vale'); }
}
function spend(skill) {
  if (now - skill.last < skill.cooldown) return false;
  if (player.sp < skill.cost) { toast('SP insuficiente'); return false; }
  player.sp -= skill.cost; skill.last = now; return true;
}
function ensureTarget(range) {
  let mob = selectedMob();
  if (!mob) mob = nearestMob(range);
  if (mob && dist(player, mob) <= range) { selectedId = mob.id; return mob; }
  toast('Nenhum demônio no alcance');
  return null;
}

function cast(name) {
  const s = skills[name]; if (!s) return;
  if (name === 'normal') {
    const target = ensureTarget(s.range); if (!target || !spend(s)) return;
    player.attackingUntil = now + 220; player.dir = directionTo(target);
    damageMob(target, (13 + player.level * 1.7) * classScale(), '#f5e5c4', 'Ataque Normal');
    shockwaves.push({ x: target.x, y: target.y, born: now, life: 240, max: 30, color: '#f4dfb3' });
    return;
  }
  if (name === 'heal') {
    const target = ensureTarget(s.range); if (!target || !spend(s)) return;
    damageMob(target, (29 + player.level * 3.1) * classScale(), '#aaf9d7', 'Cura');
    const recovered = Math.round((13 + player.level * 1.25) * classScale());
    player.hp = clamp(player.hp + recovered, 0, player.maxHp);
    floatingText(player.x, player.y - 42, `+${recovered} HP`, '#9dffd1'); holyBeam(player, target, '#aaf9d7');
    return;
  }
  if (name === 'magnificat') {
    if (!spend(s)) return;
    const radius = 270 + player.level * 3;
    const victims = mobs.filter(m => m.alive && dist(player, m) <= radius);
    shockwaves.push({ x: player.x, y: player.y, born: now, life: 900, max: radius, color: '#ffe59b' });
    [0, 180, 360].forEach((delay, pulse) => setTimeout(() => {
      if (!document.body.contains(canvas)) return;
      const t = performance.now();
      for (const m of victims) if (m.alive && dist(player, m) <= radius + 35) {
        const prev = now; now = t; damageMob(m, (13 + player.level * 1.8) * classScale(), '#ffeaa4', `Magnificat ${pulse + 1}`); now = prev;
      }
      player.sp = clamp(player.sp + 4, 0, player.maxSp);
    }, delay));
    return;
  }
  if (name === 'blessing') {
    const target = ensureTarget(s.range); if (!target || !spend(s)) return;
    damageMob(target, (35 + player.level * 3.6) * classScale(), '#d9c2ff', 'Benção');
    target.weakenUntil = now + 6500; target.vulnerableUntil = now + 6500; holyBeam(player, target, '#d9c2ff');
    return;
  }
  if (name === 'kyrie') {
    if (!spend(s)) return;
    player.barrier = Math.round((42 + player.level * 6) * classScale()); player.barrierUntil = now + 6500; player.barrierBurstDone = false;
    kyrieBurst('Kyrie Eleison');
  }
}
function kyrieBurst(source) {
  const radius = 175 + player.level * 2;
  shockwaves.push({ x: player.x, y: player.y, born: now, life: 700, max: radius, color: '#9edfff' });
  for (const m of mobs) if (m.alive && dist(player, m) <= radius) damageMob(m, (23 + player.level * 2.2) * classScale(), '#a9e7ff', source);
}

function updatePlayer(dt) {
  let dx = 0, dy = 0;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (dx || dy) player.moveTarget = null;
  else if (player.moveTarget) {
    const tx = player.moveTarget.x - player.x, ty = player.moveTarget.y - player.y;
    const d = Math.hypot(tx, ty);
    if (d < 8) player.moveTarget = null;
    else { dx = tx / d; dy = ty / d; }
  }
  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    player.dir = directionFromVector(dx, dy);
    player.moving = moveWithCollision(player, dx * player.speed * dt, dy * player.speed * dt, { collideMobs: true });
  } else player.moving = false;

  player.sp = clamp(player.sp + dt * 1.7, 0, player.maxSp);
  if (player.barrier > 0 && now >= player.barrierUntil) { player.barrier = 0; if (!player.barrierBurstDone) { player.barrierBurstDone = true; kyrieBurst('Kyrie — ruptura'); } }
}

function hurtPlayer(amount) {
  if (now < player.invulnerableUntil) return;
  const mitigated = player.barrier > 0 ? Math.min(player.barrier, amount) : 0;
  player.barrier -= mitigated; const left = amount - mitigated;
  if (left > 0) player.hp -= left;
  player.flashUntil = now + 180; player.invulnerableUntil = now + 520;
  if (player.barrier <= 0 && !player.barrierBurstDone) { player.barrierBurstDone = true; kyrieBurst('Kyrie — ruptura'); }
  if (player.hp <= 0) {
    player.hp = player.maxHp; player.sp = player.maxSp; player.x = 1260; player.y = 900; player.moveTarget = null;
    toast('Você foi derrotado e retornou ao santuário.');
  }
}

function updateMobs(dt) {
  for (const m of mobs) {
    if (!m.alive) {
      if (now >= m.respawnAt) {
        const p = findFreeSpot(m.spawnX, m.spawnY, m.radius, m);
        m.x = p.x; m.y = p.y; m.hp = m.maxHp; m.alive = true; m.flashUntil = now + 300;
      }
      continue;
    }
    let dx = 0, dy = 0;
    const dp = dist(m, player);
    if (dp <= m.aggro) {
      const vx = player.x - m.x, vy = player.y - m.y;
      const d = Math.hypot(vx, vy) || 1;
      if (d > m.radius + player.radius + 5) { dx = vx / d; dy = vy / d; }
      else if (now >= m.attackAt) {
        m.attackAt = now + (m.boss ? 1250 : 900); m.attackingUntil = now + 240;
        const dmg = Math.round(m.damage * (m.weakenUntil > now ? 0.75 : 1)); hurtPlayer(dmg);
      }
    } else {
      if (now >= m.wanderUntil) { m.wanderUntil = now + rand(900, 2400); m.angle += rand(-1.7, 1.7); }
      dx = Math.cos(m.angle); dy = Math.sin(m.angle);
    }
    if (dx || dy) {
      m.dir = directionFromVector(dx, dy);
      const speed = m.speed * (dp <= m.aggro ? 1 : 0.42);
      m.moving = moveWithCollision(m, dx * speed * dt, dy * speed * dt, { collideMobs: true, ignoreMob: m, collidePlayer: true });
      if (!m.moving && dp > m.aggro) m.angle += rand(1.2, 2.4);
    } else m.moving = false;
  }
  resolveMobSeparation();
}

function updateEffects(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy *= 0.985;
    if (now - p.born >= p.life) particles.splice(i, 1);
  }
  for (let i = texts.length - 1; i >= 0; i--) if (now - texts[i].born >= texts[i].life) texts.splice(i, 1);
  for (let i = shockwaves.length - 1; i >= 0; i--) if (now - shockwaves[i].born >= shockwaves[i].life) shockwaves.splice(i, 1);
}
function updateCamera() {
  const targetX = player.x - innerWidth / 2, targetY = player.y - innerHeight / 2;
  camera.x = lerp(camera.x, clamp(targetX, 0, Math.max(0, WORLD.width - innerWidth)), 0.11);
  camera.y = lerp(camera.y, clamp(targetY, 0, Math.max(0, WORLD.height - innerHeight)), 0.11);
}

function px(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function makePlayerSheet(job) {
  const key = `player:${job}`; if (spriteCache.has(key)) return spriteCache.get(key);
  const fw = 28, fh = 38, frames = 4, rows = 4;
  const sheet = document.createElement('canvas'); sheet.width = fw * frames; sheet.height = fh * rows;
  const c = sheet.getContext('2d'); c.imageSmoothingEnabled = false;
  const palette = job === 'Sumo Sacerdote' ? { robe:'#f7f3ff', trim:'#8d71c8', cape:'#bda8e7', hair:'#6b4d38' }
    : job === 'Sacerdote' ? { robe:'#f4f1ed', trim:'#7f91bd', cape:'#c9d3e8', hair:'#6b4d38' }
    : { robe:'#eee8df', trim:'#786f80', cape:'#d0c8bf', hair:'#6b4d38' };
  for (let row = 0; row < rows; row++) for (let f = 0; f < frames; f++) {
    const ox = f * fw, oy = row * fh; const bob = f === 1 ? 1 : f === 3 ? -1 : 0; const step = f === 1 ? -2 : f === 3 ? 2 : 0;
    px(c, ox + 8, oy + 31, 12, 3, 'rgba(25,18,24,.25)');
    if (row === 3) { px(c, ox + 8, oy + 10 + bob, 12, 8, palette.hair); px(c, ox + 7, oy + 16 + bob, 14, 14, palette.cape); }
    else {
      px(c, ox + 9, oy + 8 + bob, 10, 9, '#e5b397');
      px(c, ox + 8, oy + 6 + bob, 12, 5, palette.hair);
      if (row === 1) px(c, ox + 7, oy + 9 + bob, 3, 7, palette.hair);
      if (row === 2) px(c, ox + 18, oy + 9 + bob, 3, 7, palette.hair);
      px(c, ox + 7, oy + 17 + bob, 14, 14, palette.robe);
      px(c, ox + 13, oy + 18 + bob, 2, 12, palette.trim);
    }
    px(c, ox + 8 + step, oy + 29 + bob, 5, 5, '#4b3f46'); px(c, ox + 15 - step, oy + 29 + bob, 5, 5, '#4b3f46');
    if (job !== 'Noviço') { c.strokeStyle = job === 'Sumo Sacerdote' ? '#ffe7a1' : '#d8c4ff'; c.lineWidth = 1; c.strokeRect(ox + 9, oy + 2 + bob, 10, 2); }
    if (job === 'Sumo Sacerdote') { px(c, ox + 4, oy + 19 + bob, 3, 9, palette.cape); px(c, ox + 21, oy + 19 + bob, 3, 9, palette.cape); }
  }
  spriteCache.set(key, { sheet, fw, fh }); return spriteCache.get(key);
}
function makeMobSheet(type) {
  const key = `mob:${type}`; if (spriteCache.has(key)) return spriteCache.get(key);
  const fw = type === 'poring' ? 52 : 40, fh = type === 'poring' ? 48 : 40, frames = 4, rows = 4;
  const sheet = document.createElement('canvas'); sheet.width = fw * frames; sheet.height = fh * rows;
  const c = sheet.getContext('2d'); c.imageSmoothingEnabled = false;
  for (let row = 0; row < rows; row++) for (let f = 0; f < frames; f++) {
    const ox = f * fw, oy = row * fh; const bob = f === 1 ? -1 : f === 3 ? 1 : 0;
    if (type === 'imp') {
      px(c, ox + 11, oy + 14 + bob, 18, 17, '#b84e5f'); px(c, ox + 8, oy + 7 + bob, 7, 9, '#3b2434'); px(c, ox + 25, oy + 7 + bob, 7, 9, '#3b2434');
      px(c, ox + 14, oy + 17 + bob, 3, 3, '#ffd18f'); px(c, ox + 23, oy + 17 + bob, 3, 3, '#ffd18f'); px(c, ox + 15, oy + 31 + bob, 4, 5, '#6d2637'); px(c, ox + 22, oy + 31 + bob, 4, 5, '#6d2637');
    } else if (type === 'eye') {
      px(c, ox + 7, oy + 13 + bob, 26, 17, '#7d5ba7'); px(c, ox + 11, oy + 17 + bob, 18, 9, '#e8def7'); px(c, ox + 17, oy + 18 + bob, 6, 7, '#2f1743'); px(c, ox + 19, oy + 20 + bob, 2, 3, '#d783ff');
    } else if (type === 'bat') {
      const flap = f % 2 ? 5 : 0; px(c, ox + 16, oy + 16 + bob, 8, 12, '#4e4868');
      px(c, ox + 3, oy + 10 + flap, 14, 6, '#4e4868'); px(c, ox + 23, oy + 10 + flap, 14, 6, '#4e4868');
      px(c, ox + 17, oy + 18 + bob, 2, 2, '#ff5d87'); px(c, ox + 22, oy + 18 + bob, 2, 2, '#ff5d87');
    } else {
      const squish = f % 2 ? 2 : 0; px(c, ox + 8, oy + 10 + squish, 36, 26 - squish, '#7a1d50'); px(c, ox + 5, oy + 4 + squish, 10, 11, '#28152d'); px(c, ox + 37, oy + 4 + squish, 10, 11, '#28152d');
      px(c, ox + 17, oy + 18 + squish, 4, 4, '#1f1420'); px(c, ox + 31, oy + 18 + squish, 4, 4, '#1f1420'); px(c, ox + 23, oy + 28 + squish, 7, 2, '#ffc5dd');
    }
  }
  spriteCache.set(key, { sheet, fw, fh }); return spriteCache.get(key);
}
function drawSprite(sheetData, entity, scale = 2) {
  const { sheet, fw, fh } = sheetData; const row = dirRow[entity.dir] ?? 0;
  let frame = entity.moving ? Math.floor(now / 120) % 4 : 0;
  if (entity.attackingUntil > now) frame = 2;
  const dw = fw * scale, dh = fh * scale;
  ctx.drawImage(sheet, frame * fw, row * fh, fw, fh, Math.round(entity.x - dw / 2), Math.round(entity.y - dh + entity.radius + 6), dw, dh);
}

function drawGround() {
  ctx.fillStyle = '#7c8f72'; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  const tile = 64;
  for (let y = 0; y < WORLD.height; y += tile) for (let x = 0; x < WORLD.width; x += tile) {
    const n = ((x / tile) * 13 + (y / tile) * 7) % 5;
    ctx.fillStyle = n < 2 ? '#839676' : '#788c6d'; ctx.fillRect(x, y, tile, tile);
    ctx.fillStyle = 'rgba(51,70,45,.18)'; if (n === 0) { ctx.fillRect(x + 14, y + 18, 2, 9); ctx.fillRect(x + 19, y + 14, 2, 7); }
  }
  ctx.fillStyle = '#a99c81'; ctx.fillRect(1195, 0, 210, WORLD.height);
  for (let y = 0; y < WORLD.height; y += 45) { ctx.fillStyle = y % 90 ? '#b4a98f' : '#9c9078'; ctx.fillRect(1210, y + 7, 180, 4); }
  ctx.fillStyle = 'rgba(82,73,64,.22)'; ctx.fillRect(1195, 0, 6, WORLD.height); ctx.fillRect(1399, 0, 6, WORLD.height);
  for (let i = 0; i < 80; i++) {
    const x = (i * 211) % WORLD.width, y = (i * 137) % WORLD.height;
    if (x > 1170 && x < 1430) continue;
    ctx.fillStyle = i % 3 ? 'rgba(229,222,168,.18)' : 'rgba(52,75,44,.20)'; ctx.fillRect(x, y, 3, 8);
  }
}
function drawChapel(s) {
  const x = s.x - s.w / 2, y = s.y - s.h / 2;
  ctx.fillStyle = 'rgba(40,34,39,.25)'; ctx.fillRect(x + 16, y + 75, s.w - 32, s.h - 55);
  ctx.fillStyle = '#746d73'; ctx.fillRect(x + 18, y + 65, s.w - 36, s.h - 65);
  ctx.fillStyle = '#514b55'; ctx.beginPath(); ctx.moveTo(x, y + 72); ctx.lineTo(s.x, y); ctx.lineTo(x + s.w, y + 72); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#90868c'; ctx.fillRect(s.x - 38, y + 98, 76, 107);
  ctx.fillStyle = '#352f39'; ctx.fillRect(s.x - 21, y + 124, 42, 81);
  ctx.fillStyle = '#9fb7b7'; for (const wx of [x + 72, x + s.w - 104]) { ctx.fillRect(wx, y + 105, 32, 48); ctx.fillStyle = '#4e565d'; ctx.fillRect(wx + 14, y + 105, 4, 48); ctx.fillRect(wx, y + 126, 32, 4); ctx.fillStyle = '#9fb7b7'; }
  ctx.fillStyle = '#5d5760'; ctx.fillRect(s.x - 8, y - 35, 16, 45); ctx.fillRect(s.x - 22, y - 21, 44, 13);
}
function drawScenery(s) {
  if (s.type === 'chapel') return drawChapel(s);
  if (s.type === 'altar') {
    ctx.fillStyle = 'rgba(37,29,32,.22)'; ctx.fillRect(s.x - 86, s.y + 18, 172, 26); ctx.fillStyle = '#8f8588'; ctx.fillRect(s.x - 78, s.y - 20, 156, 48); ctx.fillStyle = '#c7bda8'; ctx.fillRect(s.x - 60, s.y - 30, 120, 13); ctx.fillStyle = '#ffe98f'; ctx.fillRect(s.x - 3, s.y - 68, 6, 40); return;
  }
  if (s.type === 'grave') {
    ctx.fillStyle = 'rgba(30,25,28,.25)'; ctx.fillRect(s.x - 20, s.y + 10, 40, 14); ctx.fillStyle = '#817b78'; ctx.fillRect(s.x - 12, s.y - 18, 24, 34); ctx.fillRect(s.x - 19, s.y - 10, 38, 8); return;
  }
  if (s.type === 'tree') {
    ctx.fillStyle = 'rgba(35,49,31,.28)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 31, 43, 18, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#5c4938'; ctx.fillRect(s.x - 8, s.y - 5, 16, 43); ctx.fillStyle = '#435f3e'; ctx.beginPath(); ctx.arc(s.x - 20, s.y - 18, 28, 0, TAU); ctx.arc(s.x + 16, s.y - 21, 31, 0, TAU); ctx.arc(s.x, s.y - 43, 31, 0, TAU); ctx.fill(); ctx.fillStyle = '#6d8654'; ctx.beginPath(); ctx.arc(s.x - 13, s.y - 39, 14, 0, TAU); ctx.fill(); return;
  }
  if (s.type === 'crystal') {
    ctx.fillStyle = 'rgba(107,202,224,.22)'; ctx.beginPath(); ctx.arc(s.x, s.y, 34, 0, TAU); ctx.fill(); ctx.fillStyle = '#88d8e7'; ctx.beginPath(); ctx.moveTo(s.x, s.y - 32); ctx.lineTo(s.x + 17, s.y + 7); ctx.lineTo(s.x, s.y + 28); ctx.lineTo(s.x - 14, s.y + 5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#cef8ff'; ctx.fillRect(s.x - 3, s.y - 20, 5, 22); return;
  }
  if (s.type === 'pillar') { ctx.fillStyle = '#7f7772'; ctx.fillRect(s.x - 15, s.y - 45, 30, 58); ctx.fillStyle = '#9c9189'; ctx.fillRect(s.x - 22, s.y - 50, 44, 9); ctx.fillRect(s.x - 22, s.y + 10, 44, 9); return; }
  if (s.type === 'ruin') { ctx.fillStyle = '#766f68'; ctx.fillRect(s.x - 34, s.y - 15, 68, 27); ctx.fillStyle = '#92887e'; ctx.fillRect(s.x - 21, s.y - 29, 43, 17); }
}

function drawMob(m) {
  if (m.id === selectedId) { ctx.strokeStyle = '#ffe99c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(m.x, m.y + 8, m.radius + 10, m.radius * .55 + 6, 0, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = 'rgba(25,18,24,.25)'; ctx.beginPath(); ctx.ellipse(m.x, m.y + 11, m.radius * 1.1, Math.max(6, m.radius * .36), 0, 0, TAU); ctx.fill();
  ctx.save(); if (m.flashUntil > now) { ctx.globalAlpha = .45; ctx.filter = 'brightness(2)'; }
  drawSprite(makeMobSheet(m.type), m, m.type === 'poring' ? 1.65 : 1.7); ctx.restore();
  const w = m.boss ? 78 : 50, y = m.y - m.radius - 42;
  ctx.fillStyle = 'rgba(20,14,20,.65)'; ctx.fillRect(m.x - w / 2, y, w, 6); ctx.fillStyle = m.boss ? '#e64b86' : '#b94863'; ctx.fillRect(m.x - w / 2, y, w * clamp(m.hp / m.maxHp, 0, 1), 6);
  ctx.fillStyle = '#f0e8ee'; ctx.font = m.boss ? '700 11px sans-serif' : '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(m.name, m.x, y - 6);
}
function drawPlayer(p, remote = false) {
  ctx.fillStyle = 'rgba(25,18,24,.22)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 11, 18, 8, 0, 0, TAU); ctx.fill();
  if (!remote && p.barrier > 0 && p.barrierUntil > now) { ctx.strokeStyle = 'rgba(155,225,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y - 13, 31 + Math.sin(now / 130) * 2, 0, TAU); ctx.stroke(); }
  ctx.save(); if (!remote && p.flashUntil > now) { ctx.globalAlpha = .55; ctx.filter = 'brightness(1.8)'; }
  drawSprite(makePlayerSheet(p.job || 'Noviço'), p, 1.8); ctx.restore();
  ctx.fillStyle = remote ? '#d6cee0' : '#fff'; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.name || 'Aventureiro', p.x, p.y + 35);
  ctx.fillStyle = '#d0c7d3'; ctx.font = '10px sans-serif'; ctx.fillText(`${p.job || 'Noviço'} • Nv. ${p.level || 1}`, p.x, p.y + 48);
}
function drawEffects() {
  for (const s of shockwaves) {
    const t = clamp((now - s.born) / s.life, 0, 1); ctx.save(); ctx.globalAlpha = 1 - t; ctx.strokeStyle = s.color; ctx.shadowBlur = 10; ctx.shadowColor = s.color;
    if (s.beam) { ctx.lineWidth = 5 * (1 - t) + 1; ctx.beginPath(); ctx.moveTo(s.x, s.y); const mx = (s.x + s.x2) / 2, my = (s.y + s.y2) / 2 - 38 * Math.sin(t * Math.PI); ctx.quadraticCurveTo(mx, my, s.x2, s.y2); ctx.stroke(); }
    else { ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, lerp(8, s.max, t), 0, TAU); ctx.stroke(); } ctx.restore();
  }
  for (const p of particles) { const t = (now - p.born) / p.life; ctx.globalAlpha = 1 - t; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - t * .5), 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const f of texts) { const t = (now - f.born) / f.life; ctx.globalAlpha = 1 - t; ctx.fillStyle = f.color; ctx.font = '800 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.text, f.x, f.y - t * 34); }
  ctx.globalAlpha = 1;
}
function drawWorld() {
  ctx.clearRect(0, 0, innerWidth, innerHeight); ctx.save(); ctx.translate(-camera.x, -camera.y); drawGround();
  const drawables = scenery.map(s => ({ y: s.y + (s.type === 'tree' ? 35 : 0), kind: 'scene', value: s }))
    .concat(mobs.filter(m => m.alive).map(m => ({ y: m.y, kind: 'mob', value: m })))
    .concat([{ y: player.y, kind: 'player', value: player }]);
  for (const [id, p] of otherPlayers) if (id !== selfId) drawables.push({ y: p.y, kind: 'remote', value: p });
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) { if (d.kind === 'scene') drawScenery(d.value); else if (d.kind === 'mob') drawMob(d.value); else drawPlayer(d.value, d.kind === 'remote'); }
  drawEffects(); ctx.restore();
}
function drawMinimap() {
  mctx.clearRect(0, 0, minimap.width, minimap.height); mctx.fillStyle = '#18231a'; mctx.fillRect(0, 0, minimap.width, minimap.height);
  const sx = minimap.width / WORLD.width, sy = minimap.height / WORLD.height;
  mctx.fillStyle = '#9c927d'; mctx.fillRect(1195 * sx, 0, 210 * sx, minimap.height);
  for (const m of mobs.filter(m => m.alive)) { mctx.fillStyle = m.boss ? '#ff4d8e' : '#bd5a72'; mctx.beginPath(); mctx.arc(m.x * sx, m.y * sy, m.boss ? 3 : 1.7, 0, TAU); mctx.fill(); }
  mctx.fillStyle = '#fff2a3'; mctx.beginPath(); mctx.arc(player.x * sx, player.y * sy, 3, 0, TAU); mctx.fill();
}
function updateUI() {
  ui.playerName.textContent = player.name; ui.classLabel.textContent = `${player.job} • Nv. ${player.level}`;
  ui.hpFill.style.width = `${clamp(player.hp / player.maxHp * 100, 0, 100)}%`; ui.hpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;
  ui.spFill.style.width = `${clamp(player.sp / player.maxSp * 100, 0, 100)}%`; ui.spText.textContent = `${Math.floor(player.sp)}/${player.maxSp}`;
  const need = xpNeeded(player.level); ui.xpFill.style.width = `${clamp(player.xp / need * 100, 0, 100)}%`; ui.xpText.textContent = `${player.xp}/${need}`;
  const target = selectedMob();
  if (target) { ui.targetPanel.classList.remove('hidden'); ui.targetName.textContent = target.name; ui.targetHpFill.style.width = `${clamp(target.hp / target.maxHp * 100, 0, 100)}%`; ui.targetHpText.textContent = `${Math.ceil(target.hp)} / ${target.maxHp} HP`; }
  else ui.targetPanel.classList.add('hidden');
  ui.questProgress.textContent = objectiveComplete ? 'Concluída — o vale foi purificado' : `Demônios purificados: ${Math.min(kills, 12)} / 12`;
  for (const button of document.querySelectorAll('.skill')) { const s = skills[button.dataset.skill]; const remaining = clamp(1 - (now - s.last) / s.cooldown, 0, 1); button.classList.toggle('on-cooldown', remaining > 0); const cd = button.querySelector('.cooldown'); if (cd) cd.style.transform = `scaleY(${remaining})`; }
}

function connectMultiplayer() {
  if (!location.protocol.startsWith('http')) return;
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  try { socket = new WebSocket(`${protocol}://${location.host}`); } catch { return; }
  socket.addEventListener('open', () => log('Conectado ao mapa multiplayer.', 'good'));
  socket.addEventListener('message', event => { try { const msg = JSON.parse(event.data); if (msg.type === 'welcome') { selfId = msg.id; for (const [id, p] of Object.entries(msg.players || {})) if (id !== selfId) otherPlayers.set(id, p); } if (msg.type === 'join' || msg.type === 'state') otherPlayers.set(msg.id, msg.player); if (msg.type === 'leave') otherPlayers.delete(msg.id); } catch {} });
  socket.addEventListener('close', () => log('Modo offline ativo. O jogo continua normalmente.', 'info'));
  socket.addEventListener('error', () => {});
}
function networkTick() {
  if (!socket || socket.readyState !== 1 || now - lastNetUpdate < 100) return; lastNetUpdate = now;
  socket.send(JSON.stringify({ type: 'state', player: { name: player.name, x: player.x, y: player.y, dir: player.dir, level: player.level, job: player.job } }));
}

function frame(ts) {
  now = ts; const dt = Math.min((ts - lastFrame) / 1000, .05); lastFrame = ts;
  updatePlayer(dt); updateMobs(dt); updateEffects(dt); updateCamera(); networkTick(); drawWorld(); drawMinimap(); updateUI(); requestAnimationFrame(frame);
}

addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys.add(k);
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  if (k === '1') cast('normal'); if (k === '2') cast('heal'); if (k === '3') cast('magnificat'); if (k === '4') cast('blessing'); if (k === '5') cast('kyrie'); if (k === ' ') cast('normal');
  if (k === 'tab') { e.preventDefault(); const alive = mobs.filter(m => m.alive).sort((a,b) => dist(player,a) - dist(player,b)); if (!alive.length) return; const idx = Math.max(-1, alive.findIndex(m => m.id === selectedId)); selectMob(alive[(idx + 1) % alive.length]); }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.worldX = e.clientX + camera.x; mouse.worldY = e.clientY + camera.y; });
canvas.addEventListener('pointerdown', e => {
  mouse.worldX = e.clientX + camera.x; mouse.worldY = e.clientY + camera.y;
  const hit = mobs.filter(m => m.alive && Math.hypot(m.x - mouse.worldX, m.y - mouse.worldY) < m.radius + 22).sort((a,b) => dist(player,a) - dist(player,b))[0];
  if (hit) { selectMob(hit); if (dist(player, hit) <= skills.normal.range + 12) cast('normal'); return; }
  const probe = { radius: player.radius };
  if (blockedAt(probe, mouse.worldX, mouse.worldY, { collideMobs: true })) { toast('Esse local está bloqueado.'); return; }
  player.moveTarget = { x: clamp(mouse.worldX, WORLD.margin, WORLD.width - WORLD.margin), y: clamp(mouse.worldY, WORLD.margin, WORLD.height - WORLD.margin) };
});

document.querySelectorAll('.skill').forEach(button => button.addEventListener('click', () => cast(button.dataset.skill)));
ui.helpToggle.addEventListener('click', () => ui.helpContent.classList.toggle('hidden'));

log('Bem-vindo ao Vale da Catedral Caída.', 'info');
log('Sprites originais 2D e colisão de cenário/mobs ativos.', 'good');
connectMultiplayer();
requestAnimationFrame(frame);
