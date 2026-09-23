export const GAME_MODES = Object.freeze({
  NORMAL: 'normal',
  TURBO: 'turbo'
});

export const MEDAL_THRESHOLDS = Object.freeze([
  Object.freeze({ name: 'PLATINA', minimumScore: 50 }),
  Object.freeze({ name: 'OURO', minimumScore: 35 }),
  Object.freeze({ name: 'PRATA', minimumScore: 20 }),
  Object.freeze({ name: 'BRONZE', minimumScore: 10 })
]);

export function getMedal(score) {
  const normalizedScore = Number.isFinite(score) ? Math.max(0, score) : 0;
  return MEDAL_THRESHOLDS.find((medal) => normalizedScore >= medal.minimumScore) ?? null;
}

export function calculateCoinsEarned({ score, mode, isNewRecord = false }) {
  const normalizedScore = Number.isFinite(score) ? Math.max(0, score) : 0;
  const pointMultiplier = mode === GAME_MODES.TURBO ? 2 : 1;
  const medalBonus = normalizedScore >= 50
    ? 35
    : normalizedScore >= 35
      ? 20
      : normalizedScore >= 20
        ? 10
        : normalizedScore >= 10
          ? 5
          : 0;
  const recordBonus = isNewRecord && normalizedScore > 0 ? 5 : 0;

  return normalizedScore * pointMultiplier + medalBonus + recordBonus;
}

export function normalizeSave(save = {}) {
  const coins = Number.isFinite(save.coins) && save.coins >= 0 ? Math.floor(save.coins) : 0;
  const unlockedSkins = Array.isArray(save.unlockedSkins)
    ? [...new Set(save.unlockedSkins.filter((skin) => typeof skin === 'string'))]
    : [];
  const bestScores = save.bestScores && typeof save.bestScores === 'object'
    ? save.bestScores
    : {};

  return {
    version: 1,
    coins,
    unlockedSkins: unlockedSkins.includes('classic_hd')
      ? unlockedSkins
      : ['classic_hd', ...unlockedSkins],
    currentSkin: typeof save.currentSkin === 'string' ? save.currentSkin : 'classic_hd',
    muted: save.muted === true,
    graphicsMode: save.graphicsMode === 'retro' ? 'retro' : 'hd',
    gameMode: save.gameMode === GAME_MODES.TURBO ? GAME_MODES.TURBO : GAME_MODES.NORMAL,
    bestScores: {
      normal: Number.isFinite(bestScores.normal) && bestScores.normal >= 0
        ? Math.floor(bestScores.normal)
        : 0,
      turbo: Number.isFinite(bestScores.turbo) && bestScores.turbo >= 0
        ? Math.floor(bestScores.turbo)
        : 0
    }
  };
}
