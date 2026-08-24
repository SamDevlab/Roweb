// Roweb v11.1 character animation layer.
// The concept-sheet sprites are loaded atomically before this layer takes ownership of drawPlayer.
(() => {
  const previousDrawPlayer = drawPlayer;
  const REQUIRED = [
    'novice_front','novice_side','novice_back','novice_cast',
    'priest_front','priest_side','priest_back','priest_cast',
    'high_front','high_side','high_back','high_cast'
  ];
  const images = new Map();
  const walkFrames = new Map();
  let ready = false;

  const classKey = job => job === 'Sumo Sacerdote' ? 'high' : job === 'Sacerdote' ? 'priest' : 'novice';
  const spriteHeight = job => job === 'Sumo Sacerdote' ? 99 : job === 'Sacerdote' ? 94 : 89;
  const skillColor = name => ({
    heal:'#a9ffe0', magnificat:'#ffe59c', blessing:'#e3c8ff',
    kyrie:'#bcecff', sanctuary:'#e9f7cf', normal:'#fff1ca'
  }[name] || '#f5ebc9');

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function waitForSpriteData(timeoutMs = 5000) {
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      if (REQUIRED.every(key => typeof window.ROWEB9_SPRITE_DATA?.[key] === 'string')) return;
      await sleep(25);
    }
    const missing = REQUIRED.filter(key => !window.ROWEB9_SPRITE_DATA?.[key]);
    throw new Error(`sprite data incomplete: ${missing.join(', ')}`);
  }

  function decodeImage(key, src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => im.naturalWidth ? resolve(im) : reject(new Error(`${key}: empty image`));
      im.onerror = () => reject(new Error(`${key}: image decode failed`));
      im.src = src;
      if (im.complete && im.naturalWidth) resolve(im);
    });
  }

  async function prepare() {
    try {
      await waitForSpriteData();
      const loaded = await Promise.all(REQUIRED.map(async key => [key, await decodeImage(key, window.ROWEB9_SPRITE_DATA[key])]));
      for (const [key, im] of loaded) images.set(key, im);
      buildWalkFrames();
      ready = true;
      installCastTracker();
      drawPlayer = drawCharacter;
      log('Aster v11.1 ativo: sprites carregados, caminhada e conjuração corrigidas.','good');
    } catch (err) {
      console.error('Falha ao preparar sprites do Aster v11.1', err);
      // Keep the last complete renderer instead of replacing the player with a placeholder orb.
      drawPlayer = previousDrawPlayer;
      log('Sprites animados não carregaram; mantendo o último personagem válido.');
    }
  }

  function makeWalkFrame(im, dir, phase) {
    const pad = 6, w = im.naturalWidth, h = im.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w + pad * 2;
    c.height = h + pad * 2;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;

    const stride = [0, 1, 0, -1][phase];
    const lift = [0, -1, 0, -1][phase];
    const split = Math.floor(h * .67);
    const lower = h - split;

    // Upper body: subtle counter-motion.
    g.drawImage(im, 0, 0, w, split, pad - stride, pad + lift, w, split);

    if (dir === 'side') {
      // Side walk: lower body advances/recedes more than the torso.
      g.drawImage(im, 0, split, w, lower, pad + stride * 2, pad + split - lift, w, lower);
    } else {
      // Front/back walk: split lower half to suggest alternating steps.
      const half = Math.floor(w / 2);
      g.drawImage(im, 0, split, half, lower, pad - stride, pad + split + (stride > 0 ? 1 : 0), half, lower);
      g.drawImage(im, half, split, w - half, lower, pad + half + stride, pad + split + (stride < 0 ? 1 : 0), w - half, lower);
    }
    return c;
  }

  function buildWalkFrames() {
    for (const key of REQUIRED.filter(key => !key.endsWith('_cast'))) {
      const im = images.get(key);
      if (!im?.naturalWidth) continue;
      const dir = key.endsWith('_side') ? 'side' : 'frontback';
      walkFrames.set(key, [0,1,2,3].map(phase => makeWalkFrame(im, dir, phase)));
    }
  }

  function basePose(p) {
    const k = classKey(p.job);
    if (p.dir === 'up') return { key:`${k}_back`, flip:false };
    if (p.dir === 'left') return { key:`${k}_side`, flip:false };
    if (p.dir === 'right') return { key:`${k}_side`, flip:true };
    return { key:`${k}_front`, flip:false };
  }

  function safeClassImage(p) {
    const pose = basePose(p);
    return { im: images.get(pose.key) || images.get(`${classKey(p.job)}_front`), flip: pose.flip };
  }

  function drawImageCentered(im, p, opts = {}) {
    if (!im?.naturalWidth) return false;
    const h = (opts.height || spriteHeight(p.job)) * (opts.scale || 1);
    const w = im.naturalWidth * (h / im.naturalHeight);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (p.flashUntil > now) {
      ctx.globalAlpha = .78;
      ctx.filter = 'brightness(1.7) saturate(.82)';
    }
    ctx.translate(Math.round(p.x + (opts.x || 0)), Math.round(p.y + p.radius + 12 + (opts.y || 0)));
    if (opts.rotate) ctx.rotate(opts.rotate);
    if (opts.flip) ctx.scale(-1, 1);
    ctx.drawImage(im, Math.round(-w/2), Math.round(-h), Math.round(w), Math.round(h));
    ctx.restore();
    return true;
  }

  function drawWalk(p) {
    const pose = basePose(p);
    const frames = walkFrames.get(pose.key);
    const phase = Math.floor(now / 115) % 4;
    const im = frames?.[phase] || images.get(pose.key);
    if (!im) return false;
    const stride = [0,1,0,-1][phase];
    const bob = [0,-2,0,-1][phase];
    return drawImageCentered(im, p, {
      flip:pose.flip,
      x:stride * .45,
      y:bob,
      rotate:stride * .006,
      height:spriteHeight(p.job)
    });
  }

  function drawIdle(p) {
    const pose = basePose(p);
    return drawImageCentered(images.get(pose.key), p, {
      flip:pose.flip,
      y:Math.sin(now / 520) * .35
    });
  }

  function drawAttack(p) {
    const pose = basePose(p);
    const im = images.get(pose.key);
    if (!im) return false;
    const t = Math.max(0, Math.min(1, (p.attackingUntil - now) / 240));
    const kick = Math.sin((1 - t) * Math.PI) * 3;
    const dx = p.dir === 'right' ? kick : p.dir === 'left' ? -kick : 0;
    const dy = p.dir === 'up' ? -kick * .45 : p.dir === 'down' ? kick * .35 : 0;
    return drawImageCentered(im, p, {
      flip:pose.flip,
      x:dx,
      y:dy,
      rotate:(p.dir === 'right' ? 1 : p.dir === 'left' ? -1 : 0) * .018 * Math.sin((1 - t) * Math.PI)
    });
  }

  function drawCastAura(p, phase, color) {
    const pulse = .5 + .5 * Math.sin(now / 85);
    const rise = phase * 1.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .18 + .12 * pulse;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 8, 19 + phase * 1.4, 7 + phase * .6, 0, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + now / 360;
      const rr = 22 + 2 * pulse;
      ctx.globalAlpha = .25;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(p.x + Math.cos(a) * rr - 1.5), Math.round(p.y - 18 + Math.sin(a) * rr * .48 - rise - 1.5), 3, 3);
    }
    ctx.restore();
  }

  function drawCast(p) {
    const k = classKey(p.job);
    const castImage = images.get(`${k}_cast`);
    const safe = safeClassImage(p);
    const im = castImage?.naturalWidth ? castImage : safe.im;
    if (!im) return false;
    const phase = Math.floor(now / 105) % 4;
    const pulse = [.99, 1.015, 1.025, 1.005][phase];
    const lift = [0, -2, -4, -2][phase];
    const flip = p.dir === 'left';
    const ok = drawImageCentered(im, p, { flip, scale:pulse, y:lift, height:spriteHeight(p.job) + 4 });
    drawCastAura(p, phase, skillColor(p.castSkill));
    return ok;
  }

  function drawCharacter(p) {
    ctx.save();
    ctx.globalAlpha = .16;
    ctx.fillStyle = '#232027';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 11, p.job === 'Sumo Sacerdote' ? 20 : 18, 6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (p === player) drawKyrieBarrier();

    let ok = false;
    if (ready) {
      if (p.castingUntil > now) ok = drawCast(p);
      else if (p.attackingUntil > now) ok = drawAttack(p);
      else if (p.moving) ok = drawWalk(p);
      else ok = drawIdle(p);
    }

    // Never render the old procedural body or a glowing orb once v11.1 is active.
    if (!ok) {
      const safe = safeClassImage(p);
      if (safe.im) drawImageCentered(safe.im, p, { flip:safe.flip });
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '700 10px sans-serif';
    ctx.fillText(p.name || 'Aventureiro', p.x, p.y + 35);
    ctx.fillStyle = '#ddd5d5';
    ctx.font = '9px sans-serif';
    ctx.fillText(`${p.job || 'Noviço'} • Nv. ${p.level || 1}`, p.x, p.y + 47);
  }

  function installCastTracker() {
    if (cast.__roweb111Tracked) return;
    const baseCast = cast;
    const tracked = function(name) {
      const before = player.castingUntil;
      baseCast(name);
      if (player.castingUntil > now && player.castingUntil !== before) {
        player.castSkill = name;
        player.castAnimStart = now;
      }
    };
    tracked.__roweb111Tracked = true;
    cast = tracked;
  }

  prepare();
})();
