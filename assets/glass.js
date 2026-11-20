/* Standalone design review. Gesture feedback and synthetic audio stay local. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const home = document.querySelector('#screen-main');
  const hero = document.querySelector('.atmosphere-hero');
  hero.innerHTML = '<button class="glass-orb companion" aria-label="轻触圆环，放松一下"><span class="orb-light" aria-hidden="true"></span><span class="orb-satellite" aria-hidden="true"></span></button>';
  const orb = hero.querySelector('.companion');
  const cue = document.createElement('div');
  cue.className = 'swipe-cue';
  cue.setAttribute('aria-hidden', 'true');
  document.querySelector('.home-state-zone').append(cue);
  let drag = null;
  let reaction;
  function settle(x = 0, y = 0) {
    reaction?.cancel();
    if (reduced.matches) return;
    reaction = orb.animate([
      { transform: `translate(${x}px, ${y}px)` },
      { transform: 'translate(0, -7px)', offset: .36 },
      { transform: 'translate(0, 2px)', offset: .68 },
      { transform: 'translate(0, 0)' }
    ], { duration: 720, easing: 'cubic-bezier(.22,.8,.3,1)' });
    orb.classList.remove('greet');
    void orb.offsetWidth;
    orb.classList.add('greet');
  }
  orb.addEventListener('pointerdown', event => {
    event.stopPropagation();
    reaction?.cancel();
    orb.setPointerCapture(event.pointerId);
    drag = { x: event.clientX, y: event.clientY, dx: 0, dy: 0 };
  });
  orb.addEventListener('pointermove', event => {
    if (!drag) return;
    drag.dx = Math.max(-24, Math.min(24, (event.clientX - drag.x) * .3));
    drag.dy = Math.max(-20, Math.min(20, (event.clientY - drag.y) * .3));
    if (!reduced.matches) orb.style.transform = `translate(${drag.dx}px, ${drag.dy}px)`;
  });
  function release(event) {
    if (!drag) return;
    event.stopPropagation();
    const { dx, dy } = drag;
    drag = null;
    orb.style.transform = '';
    settle(dx, dy);
  }
  orb.addEventListener('pointerup', release);
  orb.addEventListener('pointercancel', release);
  orb.addEventListener('click', event => {
    event.stopPropagation();
    if (event.detail === 0) settle();
  });
  let start;
  home.addEventListener('pointerdown', event => {
    if (!event.target.closest('button,input,[role=button]')) start = { x: event.clientX, y: event.clientY };
  });
  home.addEventListener('pointerup', event => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (dy < -55 && Math.abs(dy) > Math.abs(dx)) {
      event.stopImmediatePropagation();
      document.querySelector('#open-scenes').click();
    }
  }, true);
  home.addEventListener('wheel', event => {
    if (event.deltaY > 45 && !event.target.closest('.rail')) document.querySelector('#open-scenes').click();
  }, { passive: true });
})();

/* The reference's etched circular tracks belong to the glass, on both pages. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const markup = '<svg class="etched-tracks" viewBox="0 0 240 240" aria-hidden="true"><g class="track-lines"><circle cx="120" cy="120" r="101"/><circle cx="120" cy="120" r="94"/><circle cx="120" cy="120" r="86" stroke-dasharray="480 60"/></g><g class="track-orbit"><circle class="track-dot" cx="204" cy="94" r="2.4"/></g></svg>';
  document.querySelectorAll('.glass-orb').forEach(ring => {
    ring.insertAdjacentHTML('beforeend', markup);
    ring.addEventListener('click', () => {
      if (reduced.matches) return;
      const lines = ring.querySelector('.track-lines');
      const point = ring.querySelector('.track-orbit');
      lines.getAnimations().forEach(animation => animation.cancel());
      point.getAnimations().forEach(animation => animation.cancel());
      lines.animate([
        { rotate: '0deg', opacity: .5 },
        { rotate: '16deg', opacity: 1, offset: .4 },
        { rotate: '0deg', opacity: .65 }
      ], { duration: 1000, easing: 'cubic-bezier(.16,1,.3,1)' });
      point.animate([{ rotate: '0deg' }, { rotate: '32deg' }], { duration: 1000, easing: 'cubic-bezier(.16,1,.3,1)' });
    });
  });
  const frame = document.querySelector('#xy-preview');
  function styleAdjustment() {
    const doc = frame.contentDocument;
    if (!doc?.head || doc.querySelector('#glass-adjust-material')) return;
    const link = doc.createElement('link');
    link.id = 'glass-adjust-material';
    link.rel = 'stylesheet';
    link.href = 'assets/glass-adjust.css';
    doc.head.append(link);
  }
  function syncAdjustmentLabel() {
    const label = frame.contentDocument?.querySelector('.top small');
    const names = { commute: '通勤', office: '办公', reading: '阅读', focus: '刷题', creative: '创作' };
    if (label) label.textContent = names[document.querySelector('#phone').dataset.theme] || '通勤';
  }
  frame.addEventListener('load', () => { styleAdjustment(); syncAdjustmentLabel(); });
  new MutationObserver(syncAdjustmentLabel).observe(document.querySelector('#phone'), { attributes: true, attributeFilter: ['data-theme'] });
  styleAdjustment();
  syncAdjustmentLabel();
})();
