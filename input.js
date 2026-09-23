(() => {
  function bindInput({ canvas, onCanvasAction, onKeyDown }) {
    window.addEventListener('keydown', onKeyDown);

    if (window.PointerEvent) {
      canvas.addEventListener('pointerdown', (event) => {
        if (event.isPrimary) {
          event.preventDefault();
          onCanvasAction(event, true);
        }
      }, { passive: false });
      return;
    }

    canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      onCanvasAction(event, true);
    }, { passive: false });

    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) onCanvasAction(event, true);
    });
  }

  window.FlyingBirdInput = Object.freeze({ bindInput });
})();
