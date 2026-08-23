// Activate Sanctuary only after roweb4-addon has registered skills.sanctuary.
(() => {
  const sanctuary = document.querySelector('[data-skill="sanctuary"]');
  if (!sanctuary) return;

  if (!skills?.sanctuary) {
    console.error('Roweb: Sanctuary activation skipped because the skill is not registered.');
    return;
  }

  sanctuary.classList.add('skill');
  delete sanctuary.dataset.addonPending;

  // The v3 click binding ran while this button was intentionally outside `.skill`,
  // so bind this one explicitly after the addon is ready.
  sanctuary.addEventListener('click', () => cast('sanctuary'));

  log('Santuário ativado após a inicialização segura da engine.', 'good');
})();
