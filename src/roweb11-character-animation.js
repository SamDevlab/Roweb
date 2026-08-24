// Roweb v11.2 character animation layer.
// Keeps every source sprite intact: movement uses whole-sprite transforms, never destructive slicing.
(() => {
  const previousDrawPlayer = drawPlayer;
  const REQUIRED = [
    'novice_front','novice_side','novice_back','novice_cast',
    'priest_front','priest_side','priest_back','priest_cast',
    'high_front','high_side','high_back','high_cast'
  ];
  const images = new Map();
  let ready = false;

  const classKey = job => job === 'Sumo Sacerdote' ? 'high' : job === 'Sacerdote' ? 'priest' : 'novice';
  const spriteHeight = job => job === 'Sumo Sacerdote' ? 101 : job === 'Sacerdote' ? 97 : 91;
  const skillColor = name => ({
    heal:'#a9ffe0', magnificat:'#ffe59c', blessing:'#e3c8ff',
    kyrie:'#bcecff', sanctuary:'#e9f7cf', normal:'#fff1ca'
  }[name] || '#f5ebc9');

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const groundY = p => p.y + p.radius + 12;

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
      ready = true;
      installCastTracker();
      drawPlayer = drawCharacter;
      log('Aster v11.2 ativo: sprite inteiro preservado, pés e caminhada corrigidos.','good');
    } catch (err) {
      console.error('Falha ao preparar sprites do Aster v11.2', err);
      drawPlayer = previousDrawPlayer;
      log('Sprites animados não carregaram; mantendo o último personagem válido.');
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

  function drawImageGrounded(im, p, opts = {}) {
    if (!im?.naturalWidth) return false;

    const baseH = opts.height || spriteHeight(p.job);
    const scale = opts.scale || 1;
    const scaleX = opts.scaleX ?? 1;
    const scaleY = opts.scaleY ?? 1;
    const h = baseH * scale;
    const w = im.naturalWidth * (h / im.naturalHeight);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (p.flashUntil > now) {
      ctx.globalAlpha = .78;
      ctx.filter = 'brightness(1.7) saturate(.82)';
    }

    // Anchor every state by the bottom of the original sprite so shoes never disappear or jump.
    ctx.translate(
      Math.round(p.x + (opts.x || 0)),
      Math.round(groundY(p) + (opts.y || 0))
    );
    if (opts.rotate) ctx.rotate(opts.rotate);
    ctx.scale((opts.flip ? -1 : 1) * scaleX, scaleY);
    ctx.drawImage(im, Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h));
    ctx.restore();
    return true;
  }

  function drawWalk(p) {
    const pose = basePose(p);
    const im = images.get(pose.key);
    if (!im) return false;

    // Four non-destructive phases. The complete PNG moves as one piece.
    const phase = Math.floor(now / 120) % 4;
    const sway = [0, -1, 0, 1][phase];
    const bob = [0, -2, 0, -1][phase];
    const squashY = [1, .986, 1, .992][phase];
    const spreadX = [1, 1.012, 1, .994][phase];
    const sideLean = p.dir === 'left' || p.dir === 'right' ? sway * .009 : sway * .004;

    return drawImageGrounded(im, p, {
      flip:pose.flip,
      x:sway * .55,
      y:bob,
      rotate:sideLean,
      scaleX:spreadX,
      scaleY:squashY
    });
  }

  function drawIdle(p) {
    const pose = basePose(p);
    const breathe = Math.sin(now / 520);
    return drawImageGrounded(images.get(pose.key), p, {
      flip:pose.flip,
      y:breathe * .35,
      scaleX:1 - breathe * .002,
      scaleY:1 + breathe * .002
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
    return drawImageGrounded(im, p, {
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
    ctx.ellipse(p.x, groundY(p) - 3, 19 + phase * 1.4, 7 + phase * .6, 0, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + now / 360;
      const rr = 22 + 2 * pulse;
      ctx.globalAlpha = .25;
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(p.x + Math.cos(a) * rr - 1.5),
        Math.round(p.y - 18 + Math.sin(a) * rr * .48 - rise - 1.5),
        3, 3
      );
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
    const pulse = [.995, 1.012, 1.022, 1.006][phase];
    const lift = [0, -2, -4, -2][phase];
    const flip = p.dir === 'left';
    const ok = drawImageGrounded(im, p, {
      flip,
      scale:pulse,
      y:lift,
      height:spriteHeight(p.job) + 3
    });
    drawCastAura(p, phase, skillColor(p.castSkill));
    return ok;
  }

  function drawCharacter(p) {
    const floor = groundY(p);

    // Shadow now follows the actual foot anchor instead of sitting under the torso.
    ctx.save();
    ctx.globalAlpha = .18;
    ctx.fillStyle = '#232027';
    ctx.beginPath();
    ctx.ellipse(floor ? p.x : p.x, floor + 1, p.job === 'Sumo Sacerdote' ? 19 : 17, 5, 0, 0, TAU);
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

    if (!ok) {
      const safe = safeClassImage(p);
      if (safe.im) drawImageGrounded(safe.im, p, { flip:safe.flip });
    }

    // Labels stay below the shoes; they no longer cover the feet/robe hem.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '700 10px sans-serif';
    ctx.fillText(p.name || 'Aventureiro', p.x, floor + 15);
    ctx.fillStyle = '#ddd5d5';
    ctx.font = '9px sans-serif';
    ctx.fillText(`${p.job || 'Noviço'} • Nv. ${p.level || 1}`, p.x, floor + 27);
  }

  function installCastTracker() {
    if (cast.__roweb112Tracked) return;
    const baseCast = cast;
    const tracked = function(name) {
      const before = player.castingUntil;
      baseCast(name);
      if (player.castingUntil > now && player.castingUntil !== before) {
        player.castSkill = name;
        player.castAnimStart = now;
      }
    };
    tracked.__roweb112Tracked = true;
    cast = tracked;
  }

  prepare();
})();
