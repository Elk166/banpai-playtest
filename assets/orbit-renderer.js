/* Shared transparent orbital renderer: 32 quiet tracks and 9 audio-driven arcs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BanpaiOrbit = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // Time-based easing gives the same motion at 30/60/120Hz without beat-induced jumps.
  function advance(state, seconds, target, playing) {
    const dt = Math.min(.08, Math.max(0, seconds || 0));
    target = playing ? Math.max(0, Math.min(1, target || 0)) : 0;
    const energy = state.energy || 0;
    const smooth = energy + (target - energy) * (1 - Math.exp(-dt / (target > energy ? .14 : .45)));
    const speed = (state.speed === undefined ? .65 : state.speed);
    const nextSpeed = speed + (.65 + smooth * .2 - speed) * (1 - Math.exp(-dt / .7));
    return {energy:smooth,speed:nextSpeed,phase:(state.phase || 0) + (playing ? (speed + nextSpeed) * .5 * dt : 0)};
  }
  function draw(ctx, width, height, options) {
    const o = options || {}, tau = Math.PI * 2;
    const energy = Math.max(0, Math.min(1, o.energy || 0));
    const phase = o.reduced ? 0 : (o.phase || 0);
    const radius = Math.min(width, height) * .485;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.lineCap = 'round';
    ctx.strokeStyle = o.color || '#665c80';
    ctx.fillStyle = o.color || '#665c80';
    // The centre is completely empty, reserved for the scene listening clock.
    for (let i = 0; i < 32; i++) {
      const r = radius * (.37 + i * .02);
      ctx.globalAlpha = (.13 - Math.abs(i - 13) * .0035) * (i > 26 ? (32 - i) / 6 : 1);
      ctx.lineWidth = .5;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, tau); ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const r = radius * (.44 + i * .057);
      const direction = i % 3 === 0 ? -1 : 1;
      const start = i * 2.39996 + phase * direction * (.26 + i * .028);
      const local = energy * (.55 + .45 * Math.sin(i * 1.7 + phase) ** 2);
      const length = 1.05 + (i % 4) * .27 + local * .18;
      ctx.globalAlpha = .38 + local * .48;
      ctx.lineWidth = .7 + local * (1.6 + i % 3 * .45);
      ctx.beginPath(); ctx.arc(0, 0, r, start, start + length); ctx.stroke();
      ctx.beginPath(); ctx.arc(Math.cos(start + length) * r, Math.sin(start + length) * r, 1.1 + local * .65, 0, tau); ctx.fill();
    }
    ctx.restore();
  }
  return { draw, advance };
});
