(() => {
  function getPipeSpeed({ mode, baseSpeed, score }) {
    if (mode === 'turbo') {
      return Math.min(3.6, baseSpeed + score * 0.05);
    }
    return baseSpeed;
  }

  function getSpawnInterval(speed) {
    return Math.round(228 / speed);
  }

  function checkCollision({ bird, pipe, pipeWidth, pipeGap }) {
    const margin = 2;
    const radius = bird.radius - margin;
    const pipeRight = pipe.x + pipeWidth;
    const bottomPipeTop = pipe.top + pipeGap;

    if (bird.x + radius > pipe.x && bird.x - radius < pipeRight) {
      return bird.y - radius < pipe.top || bird.y + radius > bottomPipeTop;
    }

    return false;
  }

  window.FlyingBirdPhysics = Object.freeze({
    getPipeSpeed,
    getSpawnInterval,
    checkCollision
  });
})();
