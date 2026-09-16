// Shared scroll-reveal engine — same timings across every page.
export function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const IN = 620, OUT = 280, DIST = 22;
  const EASE = 'cubic-bezier(0.16,0.8,0.3,1)';
  const state = {};
  const setup = () => {
    const nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length) return;
    // will-change is set only for the duration of one transition and cleared
    // on transitionend — holding it on every node for the page's whole life
    // pins that many compositor layers at once, and Chrome has been seen to
    // leave one of them unpainted after a scroll (content stuck at opacity:0
    // or a stale frame despite computed style reporting opacity:1).
    const clearWillChange = (e) => { if (e.propertyName === 'opacity') e.target.style.willChange = 'auto'; };
    const hide = (el, from) => {
      el.style.willChange = 'opacity, transform';
      el.style.transition = 'opacity ' + OUT + 'ms ease-out, transform ' + OUT + 'ms ease-out';
      el.style.opacity = '0';
      el.style.transform = 'translateY(' + (from > 0 ? DIST : -DIST) + 'px)';
      el.addEventListener('transitionend', clearWillChange, { once: true });
    };
    const show = (el, delay) => {
      el.style.willChange = 'opacity, transform';
      el.style.transition =
        'opacity ' + IN + 'ms ' + EASE + ' ' + delay + 'ms, transform ' + IN + 'ms ' + EASE + ' ' + delay + 'ms';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      el.addEventListener('transitionend', clearWillChange, { once: true });
    };
    // Geometry is the single source of truth: every pass re-measures, so a
    // stale flag can never leave a visible block blank.
    const reconcile = (animate) => {
      const vh = window.innerHeight;
      let i = 0;
      nodes.forEach((el) => {
        const r = el.getBoundingClientRect();
        const inView = r.top < vh * 0.88 && r.bottom > vh * 0.08;
        const fullyOut = r.bottom < 0 || r.top > vh;
        if (inView && el.dataset.shown !== '1') {
          el.dataset.shown = '1';
          if (animate) {
            show(el, Math.min(i++, 3) * 90);
          } else {
            el.style.transition = 'none';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }
        } else if (fullyOut && el.dataset.shown !== '0') {
          el.dataset.shown = '0';
          if (animate) {
            hide(el, r.top > 0 ? 1 : -1);
          } else {
            el.style.transition = 'none';
            el.style.opacity = '0';
            el.style.transform = 'translateY(' + (r.top > 0 ? DIST : -DIST) + 'px)';
          }
        }
      });
    };
    reconcile(false);
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; reconcile(true); });
    };
    state.onScroll = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Catches smooth-scroll landings that end between animation frames.
    state.settle = setInterval(() => reconcile(true), 400);
  };
  state.raf = requestAnimationFrame(() => requestAnimationFrame(setup));
  return () => {
    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.settle) clearInterval(state.settle);
    if (state.onScroll) {
      window.removeEventListener('scroll', state.onScroll);
      window.removeEventListener('resize', state.onScroll);
    }
  };
}
