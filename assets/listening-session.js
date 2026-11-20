/* A listening session counts playback time, never seek distance or track duration. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BanpaiListening = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function create(now) {
    now = now || Date.now;
    let scene = '', elapsed = 0, running = false, at = now();
    function settle() {
      const next = now();
      if (running) elapsed += Math.max(0, next - at) / 1000;
      at = next;
    }
    return {
      select(value) {
        settle();
        if (value !== scene) { scene = value; elapsed = 0; }
      },
      run(value) { settle(); running = !!value; },
      read() { settle(); return { scene, seconds: elapsed, running }; }
    };
  }
  function format(seconds) {
    const n = Math.max(0, Math.floor(seconds || 0));
    const pad = value => String(value).padStart(2, '0');
    return n >= 3600 ? Math.floor(n / 3600) + ':' + pad(Math.floor(n / 60) % 60) + ':' + pad(n % 60)
      : pad(Math.floor(n / 60)) + ':' + pad(n % 60);
  }
  return { create, format };
});
