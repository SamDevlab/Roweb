// Prevent addon hotbar entries from being observed by the v3 HUD before their skills exist.
(() => {
  const sanctuary = document.querySelector('[data-skill="sanctuary"]');
  if (!sanctuary) return;
  sanctuary.classList.remove('skill');
  sanctuary.dataset.addonPending = 'sanctuary';
})();
