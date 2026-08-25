// Roweb v13 runtime boundary.
// Creates a small event/save API around the legacy global engine so new systems
// can grow without reaching into roweb3.js for every feature.
(() => {
  const root = window.Roweb = window.Roweb || {};
  const listeners = new Map();
  const saveSections = new Map();

  const events = root.events = root.events || {
    on(name, handler) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(handler);
      return () => listeners.get(name)?.delete(handler);
    },
    emit(name, payload) {
      for (const handler of listeners.get(name) || []) {
        try { handler(payload); }
        catch (error) { console.error(`[Roweb:${name}]`, error); }
      }
    }
  };

  root.game = {
    get player() { return player; },
    get mobs() { return mobs; },
    get camera() { return camera; },
    get world() { return WORLD; },
    get time() { return now; },
    distance(a, b) { return dist(a, b); },
    clamp,
    log,
    toast,
    floatingText,
    burst,
    addFx
  };

  root.save = {
    register(key, getter) {
      if (typeof getter === 'function') saveSections.set(key, getter);
    },
    read() {
      try { return JSON.parse(localStorage.getItem('roweb-save') || '{}'); }
      catch { return {}; }
    },
    flush() { persist(); }
  };

  // Persist stays owned by the gameplay layer; v13 only appends registered sections.
  const persistBase = persist;
  persist = function rowebPersistWithSections() {
    persistBase();
    try {
      const data = root.save.read();
      for (const [key, getter] of saveSections) data[key] = getter();
      localStorage.setItem('roweb-save', JSON.stringify(data));
    } catch (error) {
      console.warn('Roweb v13 save section failed', error);
    }
  };

  // Emit one stable death event after the legacy death pipeline finishes.
  const killMobBase = killMob;
  killMob = function rowebKillMobWithEvent(mob, source) {
    const wasAlive = Boolean(mob?.alive);
    const snapshot = wasAlive ? {
      id: mob.id,
      type: mob.type,
      name: mob.name,
      boss: Boolean(mob.boss),
      x: mob.x,
      y: mob.y,
      level: player.level,
      source
    } : null;
    killMobBase(mob, source);
    if (snapshot && !mob.alive) events.emit('mob:killed', snapshot);
  };

  // A common frame event is enough for loot pickup, UI refresh and later systems.
  const updateEffectsBase = updateEffects;
  updateEffects = function rowebUpdateEffectsWithRuntime(dt) {
    updateEffectsBase(dt);
    events.emit('frame', { dt, now, player, camera });
  };

  root.version = '13.0.0';
  log('Core v13 ativo: runtime modular e eventos preparados para novos sistemas.','good');
})();
