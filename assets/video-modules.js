// Scroll-triggered video (#push) and mouse-scrubbed video (#flow).
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const whenMeta = (v, fn) => { if (v.readyState >= 1) fn(); else v.addEventListener('loadedmetadata', fn, { once: true }); };

  // --- Scroll-triggered: one downward gesture plays the whole clip, input is locked until it ends ---
  const push = document.getElementById('push');
  if (push) {
    const video = push.querySelector('video');
    let state = 'idle', lockTop = 0, lastTop = push.getBoundingClientRect().top;
    const setState = s => { state = s; push.dataset.state = s; };
    const finish = () => {
      video.pause();
      whenMeta(video, () => { if (Math.abs(video.currentTime - video.duration) > 0.05) video.currentTime = video.duration; });
      setState('done');
    };
    const reset = () => { video.pause(); video.currentTime = 0; setState('idle'); };

    // Scroll keys that would move the page while the clip plays.
    const KEYS = new Set([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'End', 'Home']);
    const block = e => { if (state === 'playing' && (e.type !== 'keydown' || KEYS.has(e.key))) e.preventDefault(); };
    addEventListener('wheel', block, { passive: false });
    addEventListener('touchmove', block, { passive: false });
    addEventListener('keydown', block);

    function start() {
      lockTop = Math.round(push.getBoundingClientRect().top + scrollY);
      scrollTo({ top: lockTop, behavior: 'instant' });
      setState('playing');
      video.play().catch(finish); // a muted clip should always be allowed; if not, show the end state
    }
    video.addEventListener('ended', finish);

    setState('idle');
    if (reduceMotion) finish(); // no forced playback or scroll lock: just the final frame
    else if (push.getBoundingClientRect().bottom <= 0) finish(); // page restored below the section

    addEventListener('scroll', () => {
      const top = push.getBoundingClientRect().top;
      if (state === 'playing') {
        // Scrollbar drags and anything else that slips past the input lock snap back.
        if (Math.abs(scrollY - lockTop) > 1) scrollTo({ top: lockTop, behavior: 'instant' });
      } else if (state === 'idle' && !reduceMotion && lastTop > 0 && top <= 0 && top > -push.offsetHeight * 3) {
        start(); // crossed the top of the viewport going down: that gesture is the trigger
      } else if (state === 'done' && !reduceMotion && top >= innerHeight) {
        reset(); // scrolled back above the section: ready to play again on the way down
      }
      lastTop = state === 'playing' ? 0 : top;
    }, { passive: true });
  }

  // --- Mouse scrub: pointer X across the window seeks the clip; the video never plays ---
  const flow = document.getElementById('flow');
  if (flow) {
    const video = flow.querySelector('video'), steps = [...flow.querySelectorAll('.flow-steps li')];
    let duration = 0, target = 0, shown = 0, raf = 0, active = -1;
    video.pause();
    video.addEventListener('play', () => video.pause());

    function frame() {
      raf = 0;
      shown += (target - shown) * 0.2;
      if (Math.abs(target - shown) < 0.003) shown = target;
      if (!video.seeking && Math.abs(video.currentTime - shown) > 0.001) video.currentTime = shown; // one write per frame at most
      const i = Math.min(steps.length - 1, Math.floor((shown / duration) * steps.length));
      if (i !== active) { steps[active]?.classList.remove('on'); steps[i]?.classList.add('on'); active = i; }
      if (shown !== target || video.seeking) raf = requestAnimationFrame(frame); // stop when settled
    }
    const aim = ratio => {
      if (!duration) return;
      target = Math.min(1, Math.max(0, ratio)) * duration;
      if (!raf) raf = requestAnimationFrame(frame);
    };

    whenMeta(video, () => { duration = video.duration; aim(0); });
    flow.addEventListener('pointermove', e => aim(e.clientX / innerWidth), { passive: true });
    flow.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') aim(e.clientX / innerWidth); });
    // Keyboard: arrows step through the clip when the section has focus.
    flow.addEventListener('keydown', e => {
      const step = { ArrowRight: 0.05, ArrowLeft: -0.05 }[e.key];
      if (step && duration) { e.preventDefault(); aim(target / duration + step); }
    });
  }

  // --- Finale curtain: the fixed footer only becomes visible (and focusable) once the spacer uncovers it ---
  const finale = document.getElementById('finale'), spacer = document.querySelector('.finale-spacer');
  if (finale && spacer) {
    new IntersectionObserver(([e]) => finale.classList.toggle('is-live', e.isIntersecting), { rootMargin: '0px 0px -1px 0px' }).observe(spacer);
    // Keyboard: tabbing forward out of the last story section scrolls the curtain open and lands on the first CTA.
    flow?.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || e.shiftKey) return;
      e.preventDefault();
      scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      finale.classList.add('is-live');
      finale.querySelector('a')?.focus();
    });
  }
})();
