// Roweb bootstrap compatibility guard.
// The v3 engine scans every `.skill` button on its first animation frame.
// Sanctuary is registered by the v4 addon a moment later, so keep that button
// out of the scan until the matching skill object exists.
(() => {
  const sanctuaryButton = document.querySelector('[data-skill="sanctuary"]');
  if (!sanctuaryButton) return;

  sanctuaryButton.classList.remove('skill');
  sanctuaryButton.dataset.addonPending = 'sanctuary';

  const activateWhenReady = () => {
    let ready = false;
    try {
      ready = Boolean(skills && skills.sanctuary);
    } catch {}

    if (!ready) {
      setTimeout(activateWhenReady, 0);
      return;
    }

    sanctuaryButton.classList.add('skill');
    delete sanctuaryButton.dataset.addonPending;
    log('Santuário sincronizado com a engine sem interromper o render.', 'good');
  };

  activateWhenReady();
})();
