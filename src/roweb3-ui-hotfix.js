// Roweb UI compatibility hotfix.
// Keeps the base v3 HUD alive when newer addons add hotbar buttons before
// their skill definitions are registered.
(() => {
  updateUI = function safeUpdateUI() {
    ui.playerName.textContent = player.name;
    ui.classLabel.textContent = `${player.job} • Nv. ${player.level}`;

    ui.hpFill.style.width = `${clamp(player.hp / player.maxHp * 100, 0, 100)}%`;
    ui.hpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;
    ui.spFill.style.width = `${clamp(player.sp / player.maxSp * 100, 0, 100)}%`;
    ui.spText.textContent = `${Math.floor(player.sp)}/${player.maxSp}`;

    const need = xpNeeded(player.level);
    ui.xpFill.style.width = `${clamp(player.xp / need * 100, 0, 100)}%`;
    ui.xpText.textContent = `${player.xp}/${need}`;

    const target = selectedMob();
    if (target) {
      ui.targetPanel.classList.remove('hidden');
      ui.targetName.textContent = target.name;
      ui.targetHpFill.style.width = `${clamp(target.hp / target.maxHp * 100, 0, 100)}%`;
      ui.targetHpText.textContent = `${Math.ceil(target.hp)} / ${target.maxHp} HP`;
    } else {
      ui.targetPanel.classList.add('hidden');
    }

    ui.questProgress.textContent = objectiveComplete
      ? 'Concluída — o vale foi purificado'
      : `Demônios purificados: ${Math.min(kills, 12)} / 12`;

    for (const button of document.querySelectorAll('.skill')) {
      const skillName = button.dataset.skill;
      const skill = skills[skillName];
      const cooldownLayer = button.querySelector('.cooldown');

      // Addons may already have placed a button in the DOM while the matching
      // skill object is still being registered. Treat it as ready instead of
      // crashing the entire render loop.
      if (!skill) {
        button.classList.remove('on-cooldown');
        if (cooldownLayer) cooldownLayer.style.transform = 'scaleY(0)';
        continue;
      }

      const remaining = clamp(1 - (now - skill.last) / skill.cooldown, 0, 1);
      button.classList.toggle('on-cooldown', remaining > 0);
      if (cooldownLayer) cooldownLayer.style.transform = `scaleY(${remaining})`;
    }
  };

  log('Hotfix de HUD ativo: skills adicionais não interrompem mais o render.', 'good');
})();
