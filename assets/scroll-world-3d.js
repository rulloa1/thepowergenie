/**
 * Power Genie × Scroll-World 3D Engine
 * Real-time WebGL / Three.js continuous camera flight through a miniature solar energy world.
 * Features:
 * - Isometric floating diorama island with central residential solar estate
 * - Celebrity Solar cantilevered luxury pavilion & Hip-Hop Solar studio penthouse
 * - Tier-1 monocrystalline solar panels with metallic frames and emissive silicon cells
 * - Sunrun Shift / Tesla Powerwall battery storage with dynamic blackout islanding
 * - Animated photon particle streams & cybernetic energy conduits
 * - Smooth scroll-scrubbed camera spline flight with lerp damping & mouse parallax
 * - Direct navigation dots, keyboard controls, and reduced-motion support
 */

(function () {
  'use strict';

  // Three.js CDN loader
  const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

  function loadThree(callback) {
    if (window.THREE) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = THREE_CDN;
    script.crossOrigin = 'anonymous';
    script.onload = () => callback();
    script.onerror = () => {
      console.warn('Three.js CDN failed to load; using static fallback.');
      document.body.classList.add('no-webgl');
    };
    document.head.appendChild(script);
  }

  // Story sections config matching the 5-scene journey
  const SCENES = [
    {
      id: 'generation',
      step: '01',
      label: 'The Rooftop Power Plant',
      eyebrow: '01 · Energy Generation',
      title: 'Monocrystalline Solar Generation.',
      body: 'Tier-1 rooftop solar panels capture California sunlight at golden hour, generating clean residential power and shielding homeowners from monopoly PG&E utility rate inflation.',
      tags: ['Tier-1 Monocrystalline', 'Zero Rate Hikes', 'Net-Zero Offset Target'],
      camPos: { x: 26, y: 20, z: 32 },
      camLook: { x: 0, y: 2.5, z: 0 },
      sunHour: 15.5,
      blackout: false,
      cta: {
        label: 'Explore Solar Consultation →',
        href: 'https://sunrun.my.salesforce-sites.com/purl/?srep=/powergenie'
      }
    },
    {
      id: 'panels',
      step: '02',
      label: 'Precision Silicon Arrays',
      eyebrow: '02 · Architectural Hardware',
      title: 'Engineered for Max Irradiance.',
      body: 'High-density solar cells convert direct photon streams into high-efficiency direct current with low-profile flashing and concealed wiring that preserves home aesthetics.',
      tags: ['Anti-Reflective Coating', 'Concealed Conduits', 'Wind & Snow Rated'],
      camPos: { x: 3.2, y: 7.2, z: 3.8 },
      camLook: { x: 1.2, y: 4.8, z: 0.2 },
      sunHour: 13.0,
      blackout: false,
      cta: {
        label: 'View System Specs →',
        href: 'https://sunrun.my.salesforce-sites.com/purl/?srep=/powergenie'
      }
    },
    {
      id: 'battery',
      step: '03',
      label: 'Instant Blackout Defense',
      eyebrow: '03 · Battery Resilience & Storage',
      title: 'Sub-10ms Islanding Protection.',
      body: 'Intelligent Sunrun Shift and Tesla Powerwall storage automatically island critical circuits in milliseconds when the utility grid goes down, powering refrigeration, medical gear, and Wi-Fi.',
      tags: ['Sub-10ms Islanding', 'Whole-Home Backup', 'Storm Watch Mode'],
      camPos: { x: 7.2, y: 2.8, z: 3.9 },
      camLook: { x: 3.4, y: 1.2, z: 1.2 },
      sunHour: 22.0,
      blackout: true, // Triggers grid outage simulation!
      cta: {
        label: 'Check Battery Eligibility →',
        href: 'https://sunrun.my.salesforce-sites.com/purl/?srep=/powergenie'
      }
    },
    {
      id: 'brand-hub',
      step: '04',
      label: 'Connected Brand Pavilions',
      eyebrow: '04 · Architectural & Cultural Editions',
      title: 'Celebrity & Hip-Hop Solar Hub.',
      body: 'Discover our specialized editions: Celebrity Solar brings ultra-luxury blacked-out architecture for contemporary estates, while Hip-Hop Solar delivers pure harmonic power (<1.8% THD) for creative recording studios.',
      tags: ['VIP Architectural Discretion', 'Studio Harmonic Clean Power', 'Generational Equity'],
      camPos: { x: -16, y: 14, z: 16 },
      camLook: { x: -4, y: 2.2, z: -2 },
      sunHour: 18.0,
      blackout: false,
      brandLinks: [
        { label: '💎 Celebrity Solar', href: 'celebrity-solar.html' },
        { label: '🎧 Hip-Hop Solar', href: 'hip-hop-solar.html' },
        { label: '⚡ Power Genie Main', href: 'index.html' }
      ]
    },
    {
      id: 'consultation',
      step: '05',
      label: 'Horace Lawrence Advisory',
      eyebrow: '05 · Direct Sunrun Consultation',
      title: 'Your Dedicated Solar Team Lead.',
      body: 'Connect directly with Sunrun Team Lead Horace Lawrence for customized roof irradiance modeling, utility tariff optimization, and zero out-of-pocket residential installations.',
      tags: ['Direct: 510-241-7007', 'San Francisco Bay Area', 'Authorized Sunrun Portal'],
      camPos: { x: 18, y: 16, z: 24 },
      camLook: { x: 0, y: 2.4, z: 0 },
      sunHour: 16.5,
      blackout: false,
      cta: {
        primary: {
          label: 'Lock In Rates on Sunrun →',
          href: 'https://sunrun.my.salesforce-sites.com/purl/?srep=/powergenie'
        },
        secondary: {
          label: 'Call Horace: 510-241-7007',
          href: 'tel:5102417007'
        }
      }
    }
  ];

  class ScrollWorldApp {
    constructor() {
      this.container = document.getElementById('world-canvas-container');
      this.cardsContainer = document.getElementById('story-cards-wrapper');
      this.navRail = document.getElementById('scene-nav-rail');
      this.progressBar = document.getElementById('scroll-progress-fill');
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      this.currentProgress = 0;
      this.targetProgress = 0;
      this.activeSceneIndex = 0;

      this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
      this.clock = null;

      this.init();
    }

    init() {
      loadThree(() => {
        this.setupThreeScene();
        this.buildDioramaWorld();
        this.setupScrollListener();
        this.setupInteractivity();
        this.animate();
        this.updateSceneUI(0);
      });
    }

    setupThreeScene() {
      const THREE = window.THREE;
      this.clock = new THREE.Clock();

      // Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.container.appendChild(this.renderer.domElement);

      // Scene & Fog
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x060913, 0.012);

      // Camera
      this.camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 250);
      this.cameraPos = new THREE.Vector3().copy(SCENES[0].camPos);
      this.cameraLook = new THREE.Vector3().copy(SCENES[0].camLook);
      this.camera.position.copy(this.cameraPos);
      this.camera.lookAt(this.cameraLook);

      // Lighting
      this.ambientLight = new THREE.HemisphereLight(0xb4c6fc, 0x071126, 0.85);
      this.sunLight = new THREE.DirectionalLight(0xfff3d6, 1.8);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.bias = -0.0003;
      this.sunLight.shadow.camera.near = 1;
      this.sunLight.shadow.camera.far = 120;
      this.sunLight.shadow.camera.left = -22;
      this.sunLight.shadow.camera.right = 22;
      this.sunLight.shadow.camera.top = 22;
      this.sunLight.shadow.camera.bottom = -22;

      // Porch / Home interior point lights for night/blackout
      this.interiorLight = new THREE.PointLight(0xffb84a, 0, 16);
      this.interiorLight.position.set(0, 2.2, 0);

      this.batteryGlowLight = new THREE.PointLight(0x10b981, 0.4, 6);
      this.batteryGlowLight.position.set(3.6, 1.0, 1.2);

      this.scene.add(this.ambientLight, this.sunLight, this.sunLight.target, this.interiorLight, this.batteryGlowLight);

      // Sun Mesh & Glow Halo
      const sunGeo = new THREE.SphereGeometry(1.4, 32, 16);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdf6d, fog: false });
      this.sunMesh = new THREE.Mesh(sunGeo, sunMat);

      const haloCanvas = document.createElement('canvas');
      haloCanvas.width = haloCanvas.height = 128;
      const hctx = haloCanvas.getContext('2d');
      const grad = hctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 235, 170, 1)');
      grad.addColorStop(0.3, 'rgba(246, 178, 74, 0.6)');
      grad.addColorStop(1, 'rgba(246, 178, 74, 0)');
      hctx.fillStyle = grad;
      hctx.fillRect(0, 0, 128, 128);
      this.haloTex = new THREE.CanvasTexture(haloCanvas);

      const haloSpriteMat = new THREE.SpriteMaterial({
        map: this.haloTex,
        color: 0xffb81c,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      });
      const haloSprite = new THREE.Sprite(haloSpriteMat);
      haloSprite.scale.set(16, 16, 1);
      this.sunMesh.add(haloSprite);
      this.scene.add(this.sunMesh);

      // Resize event
      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    buildDioramaWorld() {
      const THREE = window.THREE;
      this.world = new THREE.Group();
      this.scene.add(this.world);

      const matStd = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...opts });
      const addMesh = (geo, mat, x, y, z, parent = this.world) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        return m;
      };

      // 1. Floating Isometric Island Platform (Emons / Scroll-World style)
      const islandBaseGeo = new THREE.CylinderGeometry(15, 14, 1.2, 64);
      const islandBaseMat = matStd(0x0c172e, { roughness: 0.9, metalness: 0.1 });
      const island = addMesh(islandBaseGeo, islandBaseMat, 0, -0.6, 0);

      // Island grass/upper turf
      const turfGeo = new THREE.CylinderGeometry(14.9, 14.9, 0.1, 64);
      const turfMat = matStd(0x0f274a, { roughness: 0.95 });
      addMesh(turfGeo, turfMat, 0, 0.05, 0);

      // Polar cybernetic energy grid
      const polarGrid = new THREE.PolarGridHelper(30, 20, 8, 64, 0x38bdf8, 0x1e3a8a);
      polarGrid.position.y = 0.11;
      this.world.add(polarGrid);

      // Deep ground plane for soft shadows
      const groundPlane = addMesh(new THREE.PlaneGeometry(240, 240), matStd(0x060913, { roughness: 1 }), 0, -1.2, 0, this.scene);
      groundPlane.rotation.x = -Math.PI / 2;
      groundPlane.receiveShadow = true;

      // 2. Central Power Genie Residential Solar Estate
      this.houseGroup = new THREE.Group();
      this.world.add(this.houseGroup);

      const wallMat = matStd(0xf1f5f9, { roughness: 0.85 });
      const roofMat = matStd(0x0a1428, { roughness: 0.5 });
      const woodMat = matStd(0x8a532d, { roughness: 0.75 });

      // Main house body
      addMesh(new THREE.BoxGeometry(6.6, 3.4, 5.4), wallMat, 0, 1.7, 0, this.houseGroup);

      // Modern garage wing on right side
      addMesh(new THREE.BoxGeometry(3.6, 2.6, 4.2), wallMat, 4.8, 1.3, -0.4, this.houseGroup);
      addMesh(new THREE.BoxGeometry(3.2, 2.2, 0.1), woodMat, 4.8, 1.1, 1.72, this.houseGroup); // garage door

      // Gable attic
      const atticShape = new THREE.Shape();
      atticShape.moveTo(-3.3, 0);
      atticShape.lineTo(0, 2.1);
      atticShape.lineTo(3.3, 0);
      atticShape.closePath();
      const atticGeo = new THREE.ExtrudeGeometry(atticShape, { depth: 5.4, bevelEnabled: false });
      const atticMesh = addMesh(atticGeo, wallMat, 0, 3.4, -2.7, this.houseGroup);

      // Roof Overhang Shell
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-3.7, 0);
      roofShape.lineTo(0, 2.35);
      roofShape.lineTo(3.7, 0);
      roofShape.lineTo(3.7, -0.22);
      roofShape.lineTo(0, 2.13);
      roofShape.lineTo(-3.7, -0.22);
      roofShape.closePath();
      const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 5.8, bevelEnabled: false });
      addMesh(roofGeo, roofMat, 0, 3.4, -2.9, this.houseGroup);

      // Glowing Windows
      this.windowGlowMat = new THREE.MeshStandardMaterial({
        color: 0xffe2a0,
        emissive: 0xffb81c,
        emissiveIntensity: 0.8,
        roughness: 0.3
      });
      // Front windows
      for (const x of [-1.8, 1.8]) {
        addMesh(new THREE.BoxGeometry(1.4, 1.2, 0.08), this.windowGlowMat, x, 2.1, 2.72, this.houseGroup);
      }
      // Front door
      addMesh(new THREE.BoxGeometry(1.1, 2.1, 0.08), matStd(0x0f172a), 0, 1.05, 2.72, this.houseGroup);

      // 3. Home Battery System (Sunrun Shift / Tesla Powerwall) on garage exterior wall
      const batteryBodyGeo = new THREE.BoxGeometry(0.35, 1.8, 1.0);
      const batteryMat = matStd(0xffffff, { roughness: 0.25, metalness: 0.4 });
      addMesh(batteryBodyGeo, batteryMat, 6.75, 1.1, 1.2, this.houseGroup);

      // Battery LED Status Strip (Emerald Islanding Indicator)
      this.batteryLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      this.batteryLedMesh = addMesh(new THREE.BoxGeometry(0.04, 1.4, 0.08), this.batteryLedMat, 6.94, 1.15, 1.2, this.houseGroup);
      this.batteryLedMesh.castShadow = false;

      // 4. Precision Monocrystalline Solar Panel Arrays
      const pitch = Math.atan2(2.35, 3.7);
      const frameGeo = new THREE.BoxGeometry(0.88, 0.06, 0.94);
      const cellGeo = new THREE.BoxGeometry(0.80, 0.07, 0.86);
      const frameMat = matStd(0x94a3b8, { metalness: 0.7, roughness: 0.3 });
      this.cellMat = new THREE.MeshStandardMaterial({
        color: 0x021b4f,
        metalness: 0.85,
        roughness: 0.18,
        emissive: 0x0044ff,
        emissiveIntensity: 0.18
      });

      this.panelTargets = [];
      for (const side of [1, -1]) {
        const slopeGroup = new THREE.Group();
        slopeGroup.position.set(0, 5.75, 0);
        slopeGroup.rotation.z = -side * pitch;
        this.houseGroup.add(slopeGroup);

        for (let col = 4; col >= 0; col--) {
          for (let row = 0; row < 4; row++) {
            const pGroup = new THREE.Group();
            pGroup.position.set(side * (0.68 + row * 1.02), 0.09, -2.15 + col * 1.08);
            slopeGroup.add(pGroup);

            addMesh(frameGeo, frameMat, 0, 0, 0, pGroup);
            const cell = addMesh(cellGeo, this.cellMat, 0, 0, 0, pGroup);
            cell.castShadow = false;

            if (side === 1) {
              this.panelTargets.push(pGroup);
            }
          }
        }
      }

      // 5. West Wing: Celebrity Solar Architectural Estate Pavilion
      const celebGroup = new THREE.Group();
      celebGroup.position.set(-8.5, 0, -3.5);
      this.world.add(celebGroup);

      const celebStoneMat = matStd(0x1e293b, { roughness: 0.3, metalness: 0.2 });
      const celebGoldMat = matStd(0xdfba73, { roughness: 0.3, metalness: 0.8 });
      // Cantilevered luxury structure
      addMesh(new THREE.BoxGeometry(4.8, 1.8, 3.6), celebStoneMat, 0, 0.9, 0, celebGroup);
      addMesh(new THREE.BoxGeometry(3.6, 1.4, 4.2), celebStoneMat, -0.6, 2.2, 0.4, celebGroup); // cantilever
      addMesh(new THREE.BoxGeometry(0.1, 0.1, 4.2), celebGoldMat, 1.2, 2.9, 0.4, celebGroup); // gold trim

      // Architectural infinity pool
      const poolGeo = new THREE.BoxGeometry(3.2, 0.2, 2.0);
      const poolMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.6 });
      addMesh(poolGeo, poolMat, 1.2, 0.1, 2.2, celebGroup);

      // Celebrity all-black stealth solar roof
      const celebPanels = addMesh(new THREE.BoxGeometry(3.0, 0.06, 3.2), matStd(0x05070c, { metalness: 0.9, roughness: 0.1 }), -0.6, 2.95, 0.4, celebGroup);

      // 6. East Wing: Hip-Hop Solar Creative Studio Penthouse
      const studioGroup = new THREE.Group();
      studioGroup.position.set(7.5, 0, -6.5);
      this.world.add(studioGroup);

      const studioMat = matStd(0x334155, { roughness: 0.5 });
      const neonPurpleMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
      const neonGoldMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

      addMesh(new THREE.BoxGeometry(4.2, 3.2, 3.8), studioMat, 0, 1.6, 0, studioGroup);
      addMesh(new THREE.BoxGeometry(4.4, 0.1, 4.0), neonGoldMat, 0, 3.25, 0, studioGroup); // neon band
      addMesh(new THREE.BoxGeometry(2.4, 1.4, 0.08), neonPurpleMat, 0, 1.8, 1.92, studioGroup); // acoustic glow window

      // Studio rooftop solar array
      addMesh(new THREE.BoxGeometry(3.6, 0.06, 3.0), this.cellMat, 0, 3.32, 0, studioGroup);

      // 7. Surrounding Landscape Pine Trees & Shrubbery
      const trunkMat = matStd(0x3e2723);
      const foliageMat = matStd(0x0d47a1, { roughness: 0.85, flatShading: true }); // stylized twilight pine
      const treeCoords = [
        [-5.8, 4.2, 1.1],
        [-9.8, 1.8, 0.9],
        [-3.8, -6.4, 1.3],
        [4.8, 5.2, 1.0],
        [10.2, 1.2, 0.8],
        [10.5, -3.2, 1.2]
      ];
      for (const [tx, tz, ts] of treeCoords) {
        const t = new THREE.Group();
        t.position.set(tx, 0, tz);
        t.scale.setScalar(ts);
        this.world.add(t);
        addMesh(new THREE.CylinderGeometry(0.14, 0.2, 0.8, 8), trunkMat, 0, 0.4, 0, t);
        addMesh(new THREE.ConeGeometry(0.95, 2.2, 7), foliageMat, 0, 1.8, 0, t);
      }

      // 8. Energy Particle Flow from Sun to Solar Panels
      this.initEnergyParticles();
    }

    initEnergyParticles() {
      const THREE = window.THREE;
      this.photonCount = 80;
      const posArray = new Float32Array(this.photonCount * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

      const mat = new THREE.PointsMaterial({
        map: this.haloTex,
        color: 0xf6b24a,
        size: 0.55,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      this.photonPoints = new THREE.Points(geo, mat);
      this.photonPoints.frustumCulled = false;
      this.scene.add(this.photonPoints);

      this.photons = Array.from({ length: this.photonCount }, () => ({
        t: Math.random(),
        speed: 0.3 + Math.random() * 0.4,
        targetIdx: Math.floor(Math.random() * (this.panelTargets.length || 1)),
        arcHeight: 1.0 + Math.random() * 1.5
      }));
    }

    setupScrollListener() {
      // Calculate scroll progress from page scroll
      const updateScroll = () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        this.targetProgress = maxScroll > 0 ? Math.min(Math.max(scrollTop / maxScroll, 0), 1) : 0;
      };

      window.addEventListener('scroll', updateScroll, { passive: true });
      updateScroll();
    }

    setupInteractivity() {
      // Mouse move tilt parallax
      window.addEventListener('mousemove', (e) => {
        this.pointer.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        this.pointer.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      });

      // Keyboard navigation
      window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
          this.jumpToScene(Math.min(this.activeSceneIndex + 1, SCENES.length - 1));
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
          this.jumpToScene(Math.max(this.activeSceneIndex - 1, 0));
        }
      });
    }

    jumpToScene(index) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const targetScroll = (index / (SCENES.length - 1)) * maxScroll;
      window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }

    updateSceneUI(index) {
      if (this.activeSceneIndex === index && this.hasRenderedCard) return;
      this.activeSceneIndex = index;
      this.hasRenderedCard = true;
      const sceneData = SCENES[index];

      // Update active nav rail dot
      if (this.navRail) {
        const dots = this.navRail.querySelectorAll('.nav-dot');
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
      }

      // Update story card content with smooth fade
      if (this.cardsContainer) {
        let ctaHtml = '';
        if (sceneData.brandLinks) {
          ctaHtml = `
            <div class="sw-brand-links">
              ${sceneData.brandLinks.map(b => `<a href="${b.href}" class="sw-hub-link">${b.label}</a>`).join('')}
            </div>
          `;
        } else if (sceneData.cta?.primary) {
          ctaHtml = `
            <div class="sw-cta-group">
              <a href="${sceneData.cta.primary.href}" target="_blank" rel="noopener noreferrer" class="sw-btn-primary">${sceneData.cta.primary.label}</a>
              <a href="${sceneData.cta.secondary.href}" class="sw-btn-ghost">${sceneData.cta.secondary.label}</a>
            </div>
          `;
        } else if (sceneData.cta) {
          ctaHtml = `
            <div class="sw-cta-group">
              <a href="${sceneData.cta.href}" target="_blank" rel="noopener noreferrer" class="sw-btn-primary">${sceneData.cta.label}</a>
            </div>
          `;
        }

        const tagsHtml = sceneData.tags.map(t => `<span class="sw-pill">${t}</span>`).join('');

        this.cardsContainer.innerHTML = `
          <div class="sw-story-card active" data-scene-id="${sceneData.id}">
            <div class="sw-card-meta">
              <span class="sw-step-indicator">${sceneData.step} / 05</span>
              <span class="sw-card-eyebrow">${sceneData.eyebrow}</span>
            </div>
            <h2 class="sw-card-title">${sceneData.title}</h2>
            <p class="sw-card-body">${sceneData.body}</p>
            <div class="sw-card-tags">${tagsHtml}</div>
            ${ctaHtml}
          </div>
        `;
      }
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      const dt = this.clock.getDelta();

      // Smooth progress interpolation
      const lerpFactor = this.reduceMotion ? 1 : 0.08;
      this.currentProgress += (this.targetProgress - this.currentProgress) * lerpFactor;

      // Update scroll progress bar
      if (this.progressBar) {
        this.progressBar.style.width = `${this.currentProgress * 100}%`;
      }

      // Determine active scene from progress
      const rawIndex = this.currentProgress * (SCENES.length - 1);
      const sceneIdx = Math.floor(rawIndex);
      const nextIdx = Math.min(sceneIdx + 1, SCENES.length - 1);
      const segT = rawIndex - sceneIdx; // segment 0..1

      this.updateSceneUI(Math.round(rawIndex));

      // Interpolate camera position and lookAt along spline
      const curScene = SCENES[sceneIdx];
      const nxtScene = SCENES[nextIdx];

      // Smooth ease for segment
      const easeT = segT * segT * (3 - 2 * segT);

      const targetX = curScene.camPos.x + (nxtScene.camPos.x - curScene.camPos.x) * easeT;
      const targetY = curScene.camPos.y + (nxtScene.camPos.y - curScene.camPos.y) * easeT;
      const targetZ = curScene.camPos.z + (nxtScene.camPos.z - curScene.camPos.z) * easeT;

      const lookX = curScene.camLook.x + (nxtScene.camLook.x - curScene.camLook.x) * easeT;
      const lookY = curScene.camLook.y + (nxtScene.camLook.y - curScene.camLook.y) * easeT;
      const lookZ = curScene.camLook.z + (nxtScene.camLook.z - curScene.camLook.z) * easeT;

      // Pointer parallax smoothing
      this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.05;
      this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.05;

      const parallaxMult = this.reduceMotion ? 0 : 0.8;
      this.camera.position.set(
        targetX + this.pointer.x * parallaxMult,
        targetY - this.pointer.y * parallaxMult * 0.6,
        targetZ
      );
      this.camera.lookAt(lookX, lookY, lookZ);

      // Sun position & day/blackout lighting
      const sunHour = curScene.sunHour + (nxtScene.sunHour - curScene.sunHour) * easeT;
      const sunAngle = ((sunHour - 6) / 12) * Math.PI;
      const isDay = Math.max(0, Math.sin(sunAngle));

      const isBlackout = curScene.blackout && (1 - Math.abs(segT - 0.5) * 2) > 0.4;

      this.sunMesh.position.set(
        Math.cos(sunAngle) * 32,
        Math.max(sunAngle > 0 ? Math.sin(sunAngle) * 22 : -10, -5),
        -Math.sin(sunAngle) * 16 - 10
      );
      this.sunLight.position.copy(this.sunMesh.position);

      if (isBlackout) {
        // Grid failure: ambient dim, home window glow increases, battery pulses bright emerald!
        this.sunLight.intensity = 0.1;
        this.ambientLight.intensity = 0.2;
        this.interiorLight.intensity = 1.8;
        this.batteryGlowLight.intensity = 1.6 + Math.sin(this.clock.getElapsedTime() * 4) * 0.4;
        this.windowGlowMat.emissiveIntensity = 1.4;
        this.batteryLedMat.color.setHex(0x10b981);
      } else {
        this.sunLight.intensity = 0.3 + isDay * 1.5;
        this.ambientLight.intensity = 0.35 + isDay * 0.5;
        this.interiorLight.intensity = 0.2;
        this.batteryGlowLight.intensity = 0.5;
        this.windowGlowMat.emissiveIntensity = 0.8;
      }

      // Update photon particle streams
      this.updatePhotons(dt, isDay && !isBlackout);

      // Render
      this.renderer.render(this.scene, this.camera);
    }

    updatePhotons(dt, active) {
      if (!this.photonPoints || !this.panelTargets.length) return;
      this.photonPoints.visible = active;
      if (!active) return;

      const THREE = window.THREE;
      const positions = this.photonPoints.geometry.attributes.position.array;
      const sunPos = this.sunMesh.position;
      const tmp = new THREE.Vector3();

      this.photons.forEach((p, i) => {
        p.t += dt * p.speed;
        if (p.t >= 1) {
          p.t = 0;
          p.targetIdx = Math.floor(Math.random() * this.panelTargets.length);
        }

        const targetPanel = this.panelTargets[p.targetIdx % this.panelTargets.length];
        targetPanel.getWorldPosition(tmp);

        // Smooth cubic ease from sun to panel
        const ease = p.t * p.t * (3 - 2 * p.t);
        positions[i * 3] = sunPos.x + (tmp.x - sunPos.x) * ease;
        positions[i * 3 + 1] = sunPos.y + (tmp.y - sunPos.y) * ease + Math.sin(p.t * Math.PI) * p.arcHeight;
        positions[i * 3 + 2] = sunPos.z + (tmp.z - sunPos.z) * ease;
      });

      this.photonPoints.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ScrollWorldApp());
  } else {
    new ScrollWorldApp();
  }
})();
