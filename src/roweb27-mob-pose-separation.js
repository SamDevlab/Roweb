// Roweb v27 — generated sheets are pose atlases, not guaranteed frame-by-frame animation.
// Stabilizes the problematic Eye/Vigia animation and prevents large sprites from visually stacking.
(() => {
  const v26 = window.RowebMobAnimationsV26;
  if (!v26?.manifest) {
    console.error('Roweb v27 requires RowebMobAnimationsV26.');
    return;
  }

  const step = (frame, duration) => ({ frame, duration });
  const manifest = v26.manifest;

  // The generated Eye sheet contains multiple viewing angles/poses in frames 0–7.
  // Playing them sequentially makes one creature look like several bodies morphing together.
  // Use one canonical front pose for locomotion and reserve the real effect poses for combat.
  manifest.eye.idle = [step(0, 720), step(2, 720)];
  manifest.eye.move = [step(0, 260), step(2, 260)];
  manifest.eye.attack = [step(8, 120), step(9, 170), step(8, 130)];
  manifest.eye.hit = [step(11, 120), step(0, 180)];
  manifest.eye.death = [step(14, 150), step(15, 190), step(16, 560)];

  // Keep only coherent wing poses. The attack is a short side lunge, not a tour through every pose.
  manifest.bat.idle = [step(0, 220), step(1, 190), step(2, 220), step(3, 190)];
  manifest.bat.move = [step(4, 145), step(5, 135), step(6, 145), step(7, 145)];
  manifest.bat.attack = [step(9, 115), step(10, 155), step(9, 110)];
  manifest.bat.hit = [step(11, 120), step(0, 175)];

  // Frame 5 of the generated Imp sheet literally contains two imps; it remains excluded.
  manifest.imp.idle = [step(0, 350), step(2, 330), step(0, 350), step(1, 300)];
  manifest.imp.move = [step(4, 155), step(6, 145), step(7, 155), step(6, 145)];
  manifest.imp.attack = [step(8, 100), step(9, 125), step(10, 155)];
  manifest.imp.hit = [step(11, 125), step(0, 185)];

  // Poring is the only sheet whose first animation groups are already visually coherent.
  manifest.poring.idle = [step(0, 360), step(1, 330), step(2, 350), step(3, 330)];
  manifest.poring.move = [step(4, 170), step(5, 165), step(6, 170), step(7, 175)];

  const cathedral = window.RowebCathedral;
  const previousUpdateMobs = updateMobs;
  const VISUAL_SPACING = { poring: 66, bat: 68, eye: 74, imp: 70 };
  const MIN_RADIUS = { poring: 27, bat: 25, eye: 28, imp: 27 };
  let lastSeparateAt = 0;

  function activeForScene(m) {
    if (!m?.alive) return false;
    const interior = cathedral?.state?.scene === 'interior';
    return interior ? !!m.dungeon : !m.dungeon;
  }

  function normalizeCollisionRadii() {
    for (const m of mobs) {
      if (!m || m.boss || !MIN_RADIUS[m.type]) continue;
      m.radius = Math.max(Number(m.radius) || 0, MIN_RADIUS[m.type]);
    }
  }

  function positionFree(m, x, y) {
    try {
      return !blockedAt(m, x, y, { collideMobs: false, collidePlayer: false });
    } catch {
      return true;
    }
  }

  function pushMob(m, dx, dy) {
    const nx = m.x + dx;
    const ny = m.y + dy;
    if (!positionFree(m, nx, ny)) return false;
    m.x = nx;
    m.y = ny;
    return true;
  }

  function separateVisualBodies() {
    const list = mobs.filter(activeForScene);
    // Two gentle passes are enough to resolve a cluster without making creatures vibrate.
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (a.boss) continue;
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          if (b.boss) continue;
          const visualA = VISUAL_SPACING[a.type] || 62;
          const visualB = VISUAL_SPACING[b.type] || 62;
          const desired = Math.max(
            (visualA + visualB) / 2,
            (a.radius || 18) + (b.radius || 18) + 8
          );
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy);
          if (dist >= desired) continue;
          if (dist < 0.001) {
            const seed = (((a.id || 1) * 31 + (b.id || 1) * 17) % 360) * Math.PI / 180;
            dx = Math.cos(seed);
            dy = Math.sin(seed);
            dist = 1;
          }
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = desired - dist;
          const shift = Math.min(4, Math.max(0.7, overlap * 0.24));
          const movedA = pushMob(a, -nx * shift, -ny * shift);
          const movedB = pushMob(b, nx * shift, ny * shift);
          if (!movedA && movedB) pushMob(b, nx * shift * 0.5, ny * shift * 0.5);
          if (movedA && !movedB) pushMob(a, -nx * shift * 0.5, -ny * shift * 0.5);
        }
      }
    }
  }

  normalizeCollisionRadii();

  updateMobs = function roweb27UpdateMobs(dt) {
    previousUpdateMobs(dt);
    normalizeCollisionRadii();
    if (now - lastSeparateAt >= 45) {
      lastSeparateAt = now;
      separateVisualBodies();
    }
  };

  window.RowebMobPosesV27 = {
    version: '27.0.0',
    mode: 'pose-atlas',
    visualSpacing: VISUAL_SPACING,
    diagnostics: {
      eyeLocomotionFrames: [0, 2],
      eyeProjectileFrameExcluded: 10,
      impDuplicateFrameExcluded: 5,
      mobSeparation: true
    }
  };

  log('v27 ativa: Olho/Vigia estabilizado como atlas de poses e mobs separados visualmente.', 'good');
})();
