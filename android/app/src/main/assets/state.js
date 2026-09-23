(() => {
  function createGameState({ config, save }) {
    return {
      currentState: config.STATE.READY,
      previousState: config.STATE.READY,
      frames: 0,
      score: 0,
      currentMode: save.gameMode,
      bestScoreNormal: save.bestScores.normal,
      bestScoreTurbo: save.bestScores.turbo,
      isNewRecord: false,
      gameOverTime: 0,
      scoreCounterAnimation: 0,
      scoreScale: 1,
      screenShake: 0,
      flashAlpha: 0,
      graphicsMode: save.graphicsMode,
      coins: save.coins,
      lastCoinsEarned: 0,
      unlockedSkins: [...save.unlockedSkins],
      currentSkinIndex: 0,
      isMuted: save.muted,
      shopPage: 0,
      confirmingSkinPurchase: null
    };
  }

  window.FlyingBirdState = Object.freeze({ createGameState });
})();
