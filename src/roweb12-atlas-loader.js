// Roweb v12.3 clean atlas loader: the first 3 chunks contain the compact lossless WebP atlas.
(() => {
  const parts = window.ROWEB12_ATLAS_PARTS || [];
  if (parts.length < 3) {
    console.error('Aster v12.3 atlas incomplete:', parts.length, 'of 3 chunks');
    window.ROWEB12_SPRITE_SHEET = '';
    return;
  }
  window.ROWEB12_SPRITE_SHEET = 'data:image/webp;base64,' + parts.slice(0, 3).join('');
})();
