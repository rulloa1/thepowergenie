// Hero 3D scene (Three.js r128, desktop only), solar simulator, and card tilt.
(() => {
  const THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const THREE_SRI = 'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sim = initSimulator();
  if (!reduceMotion && matchMedia('(hover: hover)').matches) initTilt();

  // Phones skip the 3D entirely: the form matters more than 600KB of WebGL.
  if (matchMedia('(min-width: 961px)').matches) {
    const s = document.createElement('script');
    s.src = THREE_SRC; s.integrity = THREE_SRI; s.crossOrigin = 'anonymous';
    s.onload = () => { const scene = createScene(); if (scene) sim.attach(scene); };
    document.head.appendChild(s);
  }

  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,240,190,1)'); grd.addColorStop(0.25, 'rgba(255,184,28,.55)'); grd.addColorStop(1, 'rgba(255,184,28,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function createScene() {
    const container = document.getElementById('canvas-container');
    const hero = container.closest('.hero');
    const anchor = document.getElementById('house-anchor');
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    hero.classList.add('has-3d');

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x061535, 40, 95);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    const LOOK = new THREE.Vector3(0, 2.6, 0), CAM = new THREE.Vector3(24, 13, 31);
    // Ground-plane axes relative to the view: the sun arcs left to right behind the house.
    const fwd = LOOK.clone().sub(CAM).setY(0).normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    // Opening fly-in from further out (skipped for reduced motion).
    camera.position.copy(CAM).multiplyScalar(reduceMotion ? 1 : 1.6);

    // Three lights: sky fill, sun key, warm porch glow at night.
    const hemi = new THREE.HemisphereLight(0xc4d4ff, 0x0a1a3d, 0.9);
    const key = new THREE.DirectionalLight(0xfff0d0, 1.6);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004;
    Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
    const porch = new THREE.PointLight(0xffb81c, 0, 9);
    porch.position.set(0, 2.2, 4.8);
    scene.add(hemi, key, key.target, porch);

    const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, o));
    const mesh = (geo, mat, x, y, z, parent) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true; parent.add(m); return m;
    };

    const ground = mesh(new THREE.PlaneGeometry(160, 160), std(0x071737, { roughness: 1 }), 0, 0, 0, scene);
    ground.rotation.x = -Math.PI / 2;
    const world = new THREE.Group(); scene.add(world);
    mesh(new THREE.CylinderGeometry(10, 10, 0.06, 72), std(0x0f2a5e, { roughness: 1 }), 0, 0.03, 0, world).castShadow = false;
    const grid = new THREE.PolarGridHelper(26, 16, 7, 72, 0x1d47c9, 0x123073);
    grid.position.y = 0.065; world.add(grid);

    // House: walls, attic, roof shell with overhang.
    const house = new THREE.Group(); world.add(house);
    const wallMat = std(0xe8edf7, { roughness: 0.9 }), roofMat = std(0x0c1b38, { roughness: 0.6 });
    mesh(new THREE.BoxGeometry(6, 3.2, 5), wallMat, 0, 1.6, 0, house);
    const attic = new THREE.Shape(); attic.moveTo(-3, 0); attic.lineTo(0, 1.94); attic.lineTo(3, 0); attic.closePath();
    mesh(new THREE.ExtrudeGeometry(attic, { depth: 5, bevelEnabled: false }), wallMat, 0, 3.2, -2.5, house);
    const shell = new THREE.Shape();
    shell.moveTo(-3.4, 0); shell.lineTo(0, 2.2); shell.lineTo(3.4, 0); shell.lineTo(3.4, -0.2); shell.lineTo(0, 2); shell.lineTo(-3.4, -0.2); shell.closePath();
    mesh(new THREE.ExtrudeGeometry(shell, { depth: 5.4, bevelEnabled: false }), roofMat, 0, 3.2, -2.7, house);

    const glowMat = new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffb81c, emissiveIntensity: 0.6, roughness: 0.4 });
    for (const x of [-1.7, 1.7]) mesh(new THREE.BoxGeometry(1.2, 1.1, 0.08), glowMat, x, 1.95, 2.52, house);
    mesh(new THREE.BoxGeometry(0.95, 1.9, 0.08), std(0x0b2554, { roughness: 0.5 }), 0, 0.95, 2.52, house);
    mesh(new THREE.BoxGeometry(0.08, 1.1, 1.4), glowMat, 3.02, 1.95, -0.9, house);

    // Home battery on the side wall with a status strip.
    mesh(new THREE.BoxGeometry(0.4, 1.6, 0.9), std(0xf7f9fc, { roughness: 0.3, metalness: 0.3 }), 3.22, 0.8, 1.2, house);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x22e08a });
    mesh(new THREE.BoxGeometry(0.03, 1.1, 0.08), ledMat, 3.44, 0.85, 1.2, house).castShadow = false;

    const leaf = std(0x1c6b55, { roughness: 0.9, flatShading: true }), trunk = std(0x3b2a1e);
    for (const [x, z, s] of [[-6.6, 2.4, 1.1], [-5.4, -3.9, 1.4], [6.3, -4.6, 1.2], [-8.2, -0.6, 0.8], [7.4, 1.8, 0.9]]) {
      const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); world.add(t);
      mesh(new THREE.CylinderGeometry(0.15, 0.2, 1, 8), trunk, 0, 0.5, 0, t);
      mesh(new THREE.ConeGeometry(1, 2.4, 7), leaf, 0, 2.1, 0, t);
    }

    // Panels sit flush on each roof slope: 4 rows x 5 columns per side, camera-facing slope fills first.
    const pitch = Math.atan2(2.2, 3.4);
    const frameGeo = new THREE.BoxGeometry(0.85, 0.06, 0.9), cellGeo = new THREE.BoxGeometry(0.77, 0.07, 0.82);
    const frameMat = std(0xb9c3d6, { metalness: 0.6, roughness: 0.35 });
    const cellMat = new THREE.MeshStandardMaterial({ color: 0x0a2a8a, metalness: 0.7, roughness: 0.22, emissive: 0x0031ff, emissiveIntensity: 0.12 });
    const panels = [];
    for (const side of [1, -1]) {
      const slope = new THREE.Group(); slope.position.set(0, 5.4, 0); slope.rotation.z = -side * pitch; house.add(slope);
      for (let c = 4; c >= 0; c--) for (let r = 0; r < 4; r++) {
        const p = new THREE.Group(); p.position.set(side * (0.625 + r * 0.97), 0.09, -2.04 + c * 1.02); slope.add(p);
        mesh(frameGeo, frameMat, 0, 0, 0, p);
        mesh(cellGeo, cellMat, 0, 0, 0, p).castShadow = false;
        panels.push(p);
      }
    }

    const glowTex = glowTexture();
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffc845, fog: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb81c, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    halo.scale.setScalar(11); sun.add(halo); scene.add(sun);

    // Energy: glowing points travel from the sun into the visible panels.
    const N = 70, pPos = new Float32Array(N * 3), pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: glowTex, color: 0xffd27a, size: 0.6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    points.frustumCulled = false; scene.add(points);
    const flow = Array.from({ length: N }, () => ({ t: Math.random(), speed: 0.35 + Math.random() * 0.35, target: Math.floor(Math.random() * 40), arc: Math.random() * 1.5 }));

    const state = { hour: 12, day: !reduceMotion, spin: false, energy: !reduceMotion };
    let turn = 0, dragging = false, lastX = 0, glow = 0, onHour = null, running = false, inView = true;
    const pointer = { x: 0, y: 0 }, camTarget = new THREE.Vector3(), tmp = new THREE.Vector3(), sunPos = new THREE.Vector3();
    const clock = new THREE.Clock();

    function applyHour() {
      const a = ((state.hour - 6) / 12) * Math.PI, day = Math.max(0, Math.sin(a));
      // Arc sits right of the house, in the gap between headline and form.
      sunPos.copy(fwd).multiplyScalar(18).addScaledVector(right, -Math.cos(a) * 8 + 10.5);
      sunPos.y = 1 + Math.sin(a) * 10;
      sun.position.copy(sunPos);
      key.position.copy(right).multiplyScalar(-Math.cos(a) * 14).addScaledVector(fwd, -8);
      key.position.y = 4 + day * 18;
      key.intensity = 0.2 + day * 1.5;
      hemi.intensity = 0.35 + day * 0.6;
      glowMat.emissiveIntensity = 1.5 - day * 1.1;
      porch.intensity = (1 - day) * 1.1;
      return day;
    }

    function step(dt) {
      if (state.day) { state.hour += dt * 0.45; if (state.hour > 20) state.hour = 5; if (onHour) onHour(state.hour); }
      const day = applyHour();
      if (state.spin && !dragging) turn += dt * 0.25;
      world.rotation.y += (turn - world.rotation.y) * (reduceMotion ? 1 : 0.08);

      const lit = panels.filter(p => p.visible);
      points.visible = state.energy && day > 0.12 && lit.length > 0;
      if (points.visible) {
        flow.forEach((f, i) => {
          f.t += dt * f.speed;
          if (f.t >= 1) { f.t = 0; f.target = Math.floor(Math.random() * lit.length); glow = Math.min(glow + 0.04, 0.35); }
          lit[f.target % lit.length].getWorldPosition(tmp);
          const e = f.t * f.t * (3 - 2 * f.t);
          pPos[i * 3] = sunPos.x + (tmp.x - sunPos.x) * e;
          pPos[i * 3 + 1] = sunPos.y + (tmp.y - sunPos.y) * e + Math.sin(f.t * Math.PI) * f.arc;
          pPos[i * 3 + 2] = sunPos.z + (tmp.z - sunPos.z) * e;
        });
        pGeo.attributes.position.needsUpdate = true;
      }
      glow *= 0.94;
      cellMat.emissiveIntensity = 0.1 + glow * day;
      // Battery strip breathes slowly while charging, faster at night while it powers the home.
      ledMat.color.setHSL(0.42, 0.8, 0.42 + 0.14 * Math.sin(clock.elapsedTime * (day > 0.12 ? 2 : 5)));

      const scroll = Math.min(1, Math.max(0, scrollY / hero.offsetHeight));
      camTarget.copy(CAM).addScaledVector(right, pointer.x * 1.4);
      camTarget.y += -pointer.y * 0.9 + scroll * 5;
      if (reduceMotion) camera.position.copy(CAM); else camera.position.lerp(camTarget, 0.05);
      camera.lookAt(LOOK);
      renderer.render(scene, camera);
    }

    const wantsLoop = () => inView && !document.hidden && (!reduceMotion || state.day || state.spin || state.energy);
    let raf = 0;
    function loop() { step(Math.min(clock.getDelta(), 0.05)); raf = requestAnimationFrame(loop); }
    function sync() {
      const next = wantsLoop();
      if (next && !running) { clock.getDelta(); raf = requestAnimationFrame(loop); }
      if (!next) cancelAnimationFrame(raf);
      running = next;
      if (!running) step(0);
      document.querySelectorAll('[data-scene]').forEach(b => b.setAttribute('aria-pressed', String(state[b.dataset.scene])));
    }

    // Center the house in the empty space under the headline, whatever the viewport.
    function resize() {
      const W = hero.clientWidth, H = hero.clientHeight, a = anchor.getBoundingClientRect(), h = hero.getBoundingClientRect();
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.setViewOffset(W, H, W / 2 - (a.left + a.width / 2 - h.left), H / 2 - (a.top + a.height * 0.55 - h.top), W, H);
      camera.updateProjectionMatrix();
      if (!running) step(0);
    }
    new ResizeObserver(resize).observe(hero);
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }).observe(hero);
    document.addEventListener('visibilitychange', sync);

    addEventListener('pointermove', e => {
      pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1;
      if (dragging) { turn += (e.clientX - lastX) * 0.008; lastX = e.clientX; if (!running) step(0); }
    }, { passive: true });
    renderer.domElement.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; hero.classList.add('dragging'); });
    addEventListener('pointerup', () => { dragging = false; hero.classList.remove('dragging'); });

    document.querySelectorAll('[data-scene]').forEach(b => b.addEventListener('click', () => {
      state[b.dataset.scene] = !state[b.dataset.scene]; sync();
    }));

    resize(); sync();
    return {
      setHour(h) { state.hour = h; state.day = false; sync(); if (!running) step(0); },
      setPanels(n) { panels.forEach((p, i) => { p.visible = i < n; }); if (!running) step(0); },
      onHour(fn) { onHour = fn; },
      get hour() { return state.hour; },
    };
  }

  // Simulator works with or without the 3D scene; the scene just mirrors it when present.
  function initSimulator() {
    const sunEl = document.getElementById('slider-sun'), panelsEl = document.getElementById('slider-panels');
    if (!sunEl || !panelsEl) return { attach() {} };
    const $ = id => document.getElementById(id);
    let hour = +sunEl.value, shown = '';
    const fmt = h => { const H = Math.floor(h) % 24, m = Math.floor((h % 1) * 60); return `${(H + 11) % 12 + 1}:${String(m).padStart(2, '0')} ${H >= 12 ? 'PM' : 'AM'}`; };
    function render() {
      const n = +panelsEl.value, kw = n * 0.4, day = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
      const key = `${fmt(hour)}|${n}`;
      if (key === shown) return;
      shown = key;
      $('val-sun-time').textContent = fmt(hour);
      $('val-panels').textContent = `${n} panels`;
      $('val-size').textContent = `About a ${kw.toFixed(1)} kW system`;
      if (day > 0.05) {
        $('val-output').textContent = `${(kw * 0.8 * day).toFixed(1)} kW`;
        $('val-note').textContent = 'Powering the home, with extra charging the battery';
      } else {
        $('val-output').textContent = 'Battery';
        $('val-note').textContent = 'After sunset, the battery keeps the lights on';
      }
    }
    let scene = null;
    sunEl.addEventListener('input', () => { hour = +sunEl.value; if (scene) scene.setHour(hour); render(); });
    panelsEl.addEventListener('input', () => { if (scene) scene.setPanels(+panelsEl.value); render(); });
    render();
    return {
      attach(s) {
        scene = s;
        s.setPanels(+panelsEl.value);
        s.onHour(h => { hour = h; sunEl.value = Math.min(18, Math.max(6, h)); render(); });
      },
    };
  }

  function initTilt() {
    document.querySelectorAll('.steps li, .sim-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const rx = (-(e.clientY - r.top - r.height / 2) / r.height) * 10, ry = ((e.clientX - r.left - r.width / 2) / r.width) * 10;
        card.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(8px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }
})();
