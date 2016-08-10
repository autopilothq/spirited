function stupidRenderLoop(fn) {
  const startedAt = performance.now();
  let running = true;

  function step(timestamp) {
    fn(timestamp);

    if (running) {
      window.requestAnimationFrame(step);
    }
  }

  window.requestAnimationFrame(step);

  return {
    get startedAt() {
      return startedAt;
    },

    stop() {
      running = false;
    },
  };
}
