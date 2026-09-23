(() => {
  const GAME_WIDTH = 360;
  const GAME_HEIGHT = 640;
  const GROUND_HEIGHT = 112;

  window.FlyingBirdConfig = Object.freeze({
    GAME_WIDTH,
    GAME_HEIGHT,
    GROUND_HEIGHT,
    GROUND_Y: GAME_HEIGHT - GROUND_HEIGHT,
    GRAPHICS_MODE: Object.freeze({
      RETRO: 'retro',
      HD: 'hd'
    }),
    GAME_MODE: Object.freeze({
      NORMAL: 'normal',
      TURBO: 'turbo'
    }),
    STATE: Object.freeze({
      READY: 0,
      PLAYING: 1,
      GAMEOVER: 2,
      PAUSED: 3,
      SHOP: 4
    })
  });
})();
