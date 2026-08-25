// Roweb v12.3 character renderer.
// Uses the compact clean 5x8 WebP spritesheet for every Aster visual state.
(() => {
  const previousDrawPlayer = drawPlayer;
  const sheet = new Image();
  sheet.decoding = 'async';
  let ready = false;

  const FRAME_W = 64;
  const FRAME_H = 64;
  const DRAW_H = 88;

  const cell = (r, c) => ({ r, c });
  const frames = {
    idle: {
      down: [cell(0,0), cell(0,4)],
      left: [cell(0,1)],
      right: [cell(0,2)],
      up: [cell(0,3)]
    },
    walk: {
      down: [cell(1,0), cell(1,1), cell(1,2), cell(1,1)],
      left: [cell(1,3), cell(1,4), cell(2,0), cell(2,1)],
      right: [cell(1,3), cell(1,4), cell(2,0), cell(2,1)],
      up: [cell(2,2), cell(2,3), cell(2,4), cell(3,0)]
    },
    cast: {
      down: [cell(3,1), cell(3,2), cell(3,3), cell(3,4)],
      left: [cell(4,0), cell(4,1), cell(4,2), cell(4,3)],
      right: [cell(4,0), cell(4,1), cell(4,2), cell(4,3)],
      up: [cell(4,4), cell(5,0), cell(5,1), cell(5,2)]
    },
    attack: {
      down: [cell(5,3), cell(5,4), cell(6,0)],
      left: [cell(6,1), cell(6,2), cell(6,3)],
      right: [cell(6,1), cell(6,2), cell(6,3)],
      up: [cell(6,4), cell(7,0), cell(6,4)]
    }
  };

  const direction = p => p.dir === 'up' ? 'up' : p.dir === 'left' ? 'left' : p.dir === 'right' ? 'right' : 'down';
  const flipFor = (state, dir) => dir === 'right' && (state === 'walk' || state === 'cast' || state === 'attack');
  const groundY = p => p.y + p.radius + 12;

  function pick(state, dir, speed) {
    const list = frames[state][dir] || frames[state].down;
    return list[Math.floor(now / speed) % list.length];
  }

  function drawFrame(frame, p, opts = {}) {
    if (!ready || !frame) return false;
    const sx = frame.c * FRAME_W;
    const sy = frame.r * FRAME_H;
    const h = (opts.height || DRAW_H) * (opts.scale || 1);
    const w = FRAME_W * (h / FRAME_H);
    const gy = groundY(p);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (p.flashUntil > now) {
      ctx.globalAlpha = .82;
      ctx.filter = 'brightness(1.55) saturate(.9)';
    }
    ctx.translate(Math.round(p.x + (opts.x || 0)), Math.round(gy + (opts.y || 0)));
    if (opts.rotate) ctx.rotate(opts.rotate);
    if (opts.flip) ctx.scale(-1, 1);
    ctx.drawImage(sheet, sx, sy, FRAME_W, FRAME_H, Math.round(-w/2), Math.round(-h), Math.round(w), Math.round(h));
    ctx.restore();
    return true;
  }

  function drawShadow(p) {
    const gy = groundY(p);
    ctx.save();
    ctx.globalAlpha = .18;
    ctx.fillStyle = '#191821';
    ctx.beginPath();
    ctx.ellipse(p.x, gy + 1, 17, 5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawCastAura(p) {
    const color = ({heal:'#a9ffe0', magnificat:'#ffe59c', blessing:'#e3c8ff', kyrie:'#bcecff', sanctuary:'#eef8c9'}[p.castSkill] || '#fff1bd');
    const gy = groundY(p), pulse = .5 + .5 * Math.sin(now / 75);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .12 + pulse * .12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(p.x, gy - 2, 18 + pulse * 3, 6 + pulse, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawCharacter(p) {
    const dir = direction(p);
    drawShadow(p);
    if (p === player) drawKyrieBarrier();

    let state = 'idle', speed = 430;
    if (p.castingUntil > now) { state = 'cast'; speed = 95; }
    else if (p.attackingUntil > now) { state = 'attack'; speed = 75; }
    else if (p.moving) { state = 'walk'; speed = 105; }

    const frame = pick(state, dir, speed);
    const flip = flipFor(state, dir);
    let y = 0, x = 0, rotate = 0;
    if (state === 'idle') y = Math.sin(now / 500) * .25;
    if (state === 'walk') {
      const phase = Math.floor(now / speed) % 4;
      y = [0, -1.5, 0, -1][phase];
      x = [0, -.4, 0, .4][phase];
      rotate = (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) * [0,.006,0,-.006][phase];
    }
    if (state === 'cast') {
      const phase = Math.floor(now / speed) % 4;
      y = [0,-1,-3,-1][phase];
      drawCastAura(p);
    }

    if (!drawFrame(frame, p, { flip, x, y, rotate })) {
      previousDrawPlayer(p);
      return;
    }

    const gy = groundY(p);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '700 10px sans-serif';
    ctx.fillText(p.name || 'Aster', p.x, gy + 15);
    ctx.fillStyle = '#ddd5d5';
    ctx.font = '9px sans-serif';
    ctx.fillText(`${p.job || 'Noviço'} • Nv. ${p.level || 1}`, p.x, gy + 27);
  }

  function installCastTracker() {
    if (cast.__roweb12Tracked) return;
    const baseCast = cast;
    const tracked = function(name) {
      const before = player.castingUntil;
      baseCast(name);
      if (player.castingUntil > now && player.castingUntil !== before) {
        player.castSkill = name;
        player.castAnimStart = now;
      }
    };
    tracked.__roweb12Tracked = true;
    cast = tracked;
  }

  sheet.onload = () => {
    ready = sheet.naturalWidth === 320 && sheet.naturalHeight === 512;
    if (!ready) {
      console.error('Aster v12.3 sheet dimensions invalid', sheet.naturalWidth, sheet.naturalHeight);
      return;
    }
    installCastTracker();
    drawPlayer = drawCharacter;
    log('Aster v12.3 ativo: sprites limpos com idle, corrida, conjuração e ataque.','good');
  };
  sheet.onerror = err => {
    console.error('Falha ao carregar spritesheet Aster v12.3', err);
    log('Falha ao carregar Aster v12.3; mantendo o personagem anterior.');
  };
  sheet.src = window.ROWEB12_SPRITE_SHEET || '';
})();
