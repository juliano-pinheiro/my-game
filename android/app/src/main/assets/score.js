(() => {
  const GAME_MODES = Object.freeze({
    NORMAL: 'normal',
    TURBO: 'turbo'
  });

  function normalizeScore(score) {
    return Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  }

  function calculateMedalBonus(score) {
    const normalizedScore = normalizeScore(score);
    if (normalizedScore >= 50) return 35;
    if (normalizedScore >= 35) return 20;
    if (normalizedScore >= 20) return 10;
    if (normalizedScore >= 10) return 5;
    return 0;
  }

  function calculateRoundReward({ score, mode, isNewRecord = false }) {
    const normalizedScore = normalizeScore(score);
    const pointMultiplier = mode === GAME_MODES.TURBO ? 2 : 1;
    const recordBonus = isNewRecord && normalizedScore > 0 ? 5 : 0;

    return {
      earned: normalizedScore * pointMultiplier,
      bonusRecord: recordBonus,
      bonusMedal: calculateMedalBonus(normalizedScore),
      total: normalizedScore * pointMultiplier
        + recordBonus
        + calculateMedalBonus(normalizedScore)
    };
  }

  function evaluateRound({ score, mode, bestScore }) {
    const normalizedScore = normalizeScore(score);
    const normalizedBestScore = normalizeScore(bestScore);
    const isNewRecord = normalizedScore > normalizedBestScore;
    const reward = calculateRoundReward({
      score: normalizedScore,
      mode,
      isNewRecord
    });

    return {
      score: normalizedScore,
      bestScore: Math.max(normalizedBestScore, normalizedScore),
      isNewRecord,
      reward
    };
  }

  window.FlyingBirdScore = Object.freeze({
    GAME_MODES,
    calculateRoundReward,
    evaluateRound
  });
})();
