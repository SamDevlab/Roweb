// Rebuild the v12 PNG data URL from ordered atlas chunks.
(() => {
  const parts = window.ROWEB12_ATLAS_PARTS || [];
  if (parts.length !== 12) {
    console.error('Aster v12 atlas incomplete:', parts.length, 'of 12 chunks');
    window.ROWEB12_SPRITE_SHEET = '';
    return;
  }
  window.ROWEB12_SPRITE_SHEET = 'data:image/png;base64,' + parts.join('');
})();
