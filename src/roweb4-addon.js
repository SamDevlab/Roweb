// Roweb v4 addon: Sanctuary, procedural audio, pixel render scaling and attributes.
(() => {
  const saved = JSON.parse(localStorage.getItem('roweb-save') || '{}');
  const attributes = { str: 1, agi: 1, vit: 3, int: 5, dex: 4, luk: 1, points: 0, ...(saved.attributes || {}) };
  const sanctuaries = [];
  let audioCtx = null;

  skills.sanctuary = { name: 'Santuário', cost: 34, cooldown: 10000, range: 0, last: -99999 };

  function holyPower() { return attributes.int * 1.8 + attributes.dex * 0.6 + player.level * 1.2; }
  function physicalPower() { return attributes.str * 1.6 + attributes.agi * 0.5 + player.level; }

  const baseRecalcStats = recalcStats;
  recalcStats = function (heal = false) {
    const oldHp = player.maxHp;
    const oldSp = player.maxSp;
    const rank = player.job === 'Sumo Sacerdote' ? 2 : player.job === 'Sacerdote' ? 1 : 0;
    player.maxHp = Math.round(90 + player.level * 8 + attributes.vit * 14 + rank * 35);
    player.maxSp = Math.round(60 + player.level * 6 + attributes.int * 12 + rank * 24);
    player.speed = 220 + attributes.agi * 1.6;
    if (heal) {
      player.hp = player.maxHp;
      player.sp = player.maxSp;
    } else {
      player.hp = clamp(player.hp + (player.maxHp - oldHp), 1, player.maxHp);
      player.sp = clamp(player.sp + (player.maxSp - oldSp), 0, player.maxSp);
    }
  };
  recalcStats(false);

  const basePersist = persist;
  persist = function () {
    localStorage.setItem('roweb-save', JSON.stringify({
      name: player.name, x: Math.round(player.x), y: Math.round(player.y),
      level: player.level, xp: player.xp, hp: Math.round(player.hp), sp: Math.round(player.sp), attributes
    }));
  };

  const baseGainXp = gainXp;
  gainXp = function (amount) {
    const before = player.level;
    baseGainXp(amount);
    const levels = player.level - before;
    if (levels > 0) {
      attributes.points += levels * 3;
      recalcStats(true);
      persist();
      updateAttributeUI();
      toast(`Nível ${player.level}! +${levels * 3} pontos de atributo`);
    }
  };

  function audio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function tone(freq, duration = 0.12, type = 'sine', gain = 0.025, delay = 0) {
    try {
      const a = audio(), osc = a.createOscillator(), amp = a.createGain(), t = a.currentTime + delay;
      osc.type = type; osc.frequency.setValueAtTime(freq, t);
      amp.gain.setValueAtTime(0.0001, t); amp.gain.exponentialRampToValueAtTime(gain, t + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(amp); amp.connect(a.destination); osc.start(t); osc.stop(t + duration + 0.03);
    } catch {}
  }
  function noise(duration = 0.06, gain = 0.014) {
    try {
      const a = audio(), len = Math.floor(a.sampleRate * duration), buf = a.createBuffer(1, len, a.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = a.createBufferSource(), amp = a.createGain(); src.buffer = buf; amp.gain.value = gain;
      src.connect(amp); amp.connect(a.destination); src.start();
    } catch {}
  }
  function playSkillSound(name) {
    if (name === 'normal') { noise(); tone(180, .05, 'square', .012); }
    if (name === 'heal') { tone(720, .12, 'sine', .026); tone(940, .16, 'triangle', .023, .05); tone(1180, .18, 'sine', .012, .11); }
    if (name === 'magnificat') { tone(420, .22, 'triangle', .026); tone(620, .26, 'sine', .021, .07); tone(820, .32, 'sine', .018, .15); }
    if (name === 'blessing') { tone(860, .10, 'triangle', .022); tone(1080, .16, 'sine', .019, .05); }
    if (name === 'kyrie') { tone(280, .12, 'square', .013); tone(540, .22, 'triangle', .024, .04); tone(760, .28, 'sine', .014, .11); }
    if (name === 'sanctuary') { tone(520, .20, 'triangle', .024); tone(660, .28, 'sine', .019, .07); tone(840, .34, 'sine', .016, .14); tone(1040, .38, 'sine', .010, .22); }
    if (name === 'sanctuaryTick') tone(760, .07, 'sine', .012);
    if (name === 'point') tone(980, .06, 'triangle', .014);
  }

  const baseCast = cast;
  cast = function (name) {
    if (name === 'sanctuary') {
      const s = skills.sanctuary;
      if (!spend(s)) return;
      player.castingUntil = now + 700;
      sanctuaries.push({ x: Math.round(player.x), y: Math.round(player.y), born: now, life: 7200, radius: 125, nextTick: now + 300, tickEvery: 700 });
      addFx('sanctuaryCast', { x: player.x, y: player.y, life: 1000 });
      playSkillSound('sanctuary');
      return;
    }
    baseCast(name);
    if (['normal','heal','magnificat','blessing','kyrie'].includes(name)) playSkillSound(name);
  };

  function updateSanctuaries() {
    for (let i = sanctuaries.length - 1; i >= 0; i--) {
      const s = sanctuaries[i];
      if (now - s.born >= s.life) { sanctuaries.splice(i, 1); continue; }
      if (now < s.nextTick) continue;
      s.nextTick += s.tickEvery;
      let affected = false;
      if (Math.hypot(player.x - s.x, player.y - s.y) <= s.radius) {
        const heal = Math.round(8 + attributes.int * .9 + player.level * .7);
        player.hp = clamp(player.hp + heal, 0, player.maxHp);
        floatingText(player.x, player.y - 46, `+${heal}`, '#9dffc6'); affected = true;
      }
      for (const m of mobs) {
        if (!m.alive || Math.hypot(m.x - s.x, m.y - s.y) > s.radius) continue;
        damageMob(m, (10 + holyPower() * .95) * classScale(), '#e8ffb7', 'Santuário');
        const dx = m.x - s.x, dy = m.y - s.y, d = Math.hypot(dx, dy) || 1;
        const nx = m.x + dx / d * 12, ny = m.y + dy / d * 12;
        if (!blockedAt(m, nx, ny, { ignoreMob: m, collideMobs: true, collidePlayer: true })) { m.x = nx; m.y = ny; }
        affected = true;
      }
      addFx('sanctuaryPulse', { x: s.x, y: s.y, radius: s.radius, life: 420 });
      if (affected) playSkillSound('sanctuaryTick');
    }
  }

  function drawSanctuaries() {
    if (!sanctuaries.length) return;
    ctx.save(); ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
    for (const s of sanctuaries) {
      const life = 1 - (now - s.born) / s.life;
      ctx.save(); ctx.globalAlpha = .42 * life + .18;
      ctx.fillStyle = 'rgba(216,255,220,.15)'; ctx.fillRect(s.x - 66, s.y - 66, 132, 132);
      const cell = 24; ctx.strokeStyle = '#d9ffb5'; ctx.lineWidth = 1;
      for (let gx = -2; gx <= 2; gx++) for (let gy = -2; gy <= 2; gy++) {
        ctx.strokeRect(Math.round(s.x + gx * cell - cell / 2), Math.round(s.y + gy * cell - cell / 2), cell, cell);
      }
      ctx.globalAlpha = .12 + .12 * Math.sin(now / 140); ctx.fillStyle = '#efffd0';
      for (let i = -2; i <= 2; i++) ctx.fillRect(s.x - 52 + i * 26, s.y - 78, 7, 150);
      ctx.globalAlpha = .88; ctx.strokeStyle = '#fff7c8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - 20); ctx.lineTo(s.x, s.y + 20); ctx.moveTo(s.x - 13, s.y - 5); ctx.lineTo(s.x + 13, s.y - 5); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  const baseDrawWorld = drawWorld;
  drawWorld = function () { baseDrawWorld(); drawSanctuaries(); };

  const baseUpdateEffects = updateEffects;
  updateEffects = function (dt) { updateSanctuaries(); baseUpdateEffects(dt); };

  const baseDrawFxItem = drawFxItem;
  drawFxItem = function (e) {
    if (e.type === 'sanctuaryCast' || e.type === 'sanctuaryPulse') {
      const t = clamp((now - e.born) / e.life, 0, 1), a = 1 - t;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#e7ffb8'; ctx.lineWidth = 2;
      if (e.type === 'sanctuaryCast') {
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(e.x, e.y, 18 + 30 * t + i * 8, 0, TAU); ctx.stroke(); }
      } else { ctx.beginPath(); ctx.arc(e.x, e.y, lerp(20, e.radius, t), 0, TAU); ctx.stroke(); }
      ctx.restore(); return;
    }
    baseDrawFxItem(e);
  };

  function updateAttributeUI() {
    const points = document.querySelector('#attr-points'); if (points) points.textContent = `Pontos: ${attributes.points}`;
    for (const stat of ['str','agi','vit','int','dex','luk']) {
      const value = document.querySelector(`[data-attr-value="${stat}"]`); if (value) value.textContent = attributes[stat];
      const plus = document.querySelector(`[data-attr-plus="${stat}"]`); if (plus) plus.disabled = attributes.points <= 0;
    }
  }
  function raiseAttribute(stat) {
    if (attributes.points <= 0 || !Object.hasOwn(attributes, stat) || stat === 'points') return;
    attributes[stat]++; attributes.points--; recalcStats(false); persist(); updateAttributeUI(); playSkillSound('point');
  }
  document.querySelectorAll('[data-attr-plus]').forEach(btn => btn.addEventListener('click', () => raiseAttribute(btn.dataset.attrPlus)));

  const baseUpdateUI = updateUI;
  updateUI = function () { baseUpdateUI(); updateAttributeUI(); };

  function applyPixelResolution() {
    const scale = devicePixelRatio >= 1.5 ? 0.72 : 0.62;
    canvas.width = Math.floor(innerWidth * scale); canvas.height = Math.floor(innerHeight * scale);
    canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
    canvas.style.imageRendering = 'pixelated'; ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.imageSmoothingEnabled = false;
  }
  applyPixelResolution(); addEventListener('resize', () => requestAnimationFrame(applyPixelResolution));

  addEventListener('keydown', e => { if (e.key === '6') { try { audio(); } catch {} cast('sanctuary'); } });
  document.addEventListener('pointerdown', () => { try { audio(); } catch {} }, { once: true });
  updateAttributeUI();
  log('Santuário, sons e atributos v4 carregados.', 'good');
})();
