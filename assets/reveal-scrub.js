// Image reveal (cursor mask) and scroll-scrubbed video. Both are self-contained and leave the hero/scene alone.
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Image reveal: pointer position -> CSS vars, written once per frame ---
  const hero = document.getElementById('reveal');
  if (hero && !reduceMotion) {
    let x = 0, y = 0, queued = false;
    const apply = () => {
      queued = false;
      hero.style.setProperty('--reveal-x', `${x}px`);
      hero.style.setProperty('--reveal-y', `${y}px`);
    };
    const track = e => {
      const r = hero.getBoundingClientRect();
      x = e.clientX - r.left; y = e.clientY - r.top;
      hero.classList.add('is-revealing');
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    };
    hero.addEventListener('pointermove', track, { passive: true });
    // Touch has no hover: a tap opens the window where the finger lands and it stays until scrolled away.
    hero.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') track(e); });
    hero.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hero.classList.remove('is-revealing'); });
    new IntersectionObserver(([e]) => { if (!e.isIntersecting) hero.classList.remove('is-revealing'); }, { threshold: 0.4 }).observe(hero);
  }

  // --- Scroll scrub: section scroll progress -> video.currentTime, eased in one rAF loop ---
  const sec = document.getElementById('scrub');
  if (!sec) return;
  const video = sec.querySelector('video'), bar = sec.querySelector('.scrub-bar span');
  const caps = [...sec.querySelectorAll('.scrub-cap')].map(el => ({ el, from: +el.dataset.from, to: +el.dataset.to }));
  let duration = 0, shown = 0, raf = 0, inView = false, lastCap = null;

  video.pause();
  // Reduced motion: no scroll-driven animation, just one still frame (the house mid-teardown) with all captions shown.
  if (reduceMotion) {
    const still = () => { video.currentTime = video.duration * 0.45; };
    if (video.readyState >= 1) still(); else video.addEventListener('loadedmetadata', still, { once: true });
    return;
  }
  // Section-local version of clamp(scrollTop / (scrollHeight - innerHeight), 0, 1).
  const progress = () => {
    const r = sec.getBoundingClientRect(), span = r.height - innerHeight;
    return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
  };

  function frame() {
    raf = 0;
    if (!duration) return;
    const target = progress() * duration;
    // Ease the displayed time toward the target; snap when close so the loop can settle.
    shown += (target - shown) * 0.18;
    if (Math.abs(target - shown) < 0.004) shown = target;
    // One currentTime write per frame at most, and none while the previous seek is still decoding.
    if (!video.seeking && Math.abs(video.currentTime - shown) > 0.001) video.currentTime = shown;

    const p = shown / duration;
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
    const cap = caps.find(c => p >= c.from && p < c.to) || null;
    if (cap !== lastCap) { lastCap?.el.classList.remove('on'); cap?.el.classList.add('on'); lastCap = cap; }

    if (inView || shown !== target) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && duration) raf = requestAnimationFrame(frame); };

  const onMeta = () => {
    duration = video.duration;
    shown = progress() * duration;
    video.currentTime = shown;
    kick();
  };
  if (video.readyState >= 1) onMeta(); else video.addEventListener('loadedmetadata', onMeta, { once: true });
  // Never let it play: this is seeking only.
  video.addEventListener('play', () => video.pause());

  new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) kick(); }).observe(sec);
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick, { passive: true });
})();
