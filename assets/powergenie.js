/**
 * Power Genie Interactive Engine
 * Handles interactive blackout house reveal, solar day simulator,
 * mobile drawer, and centralized lead CTA navigation.
 */

import { POWERGENIE_CONFIG, initSolarLeadButtons } from './config.js';

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPowerGenie);
  } else {
    initPowerGenie();
  }
}

function initPowerGenie() {
  // 1. Centralized Solar CTA Initialization
  initSolarLeadButtons();

  // 1b. Hero View Mode Switcher
  initHeroViewSwitch();

  // 2. Interactive House Reveal
  initInteractiveReveal();

  // 3. Solar Day Simulator
  initSolarSimulator();

  // 4. Mobile Menu Drawer
  initMobileMenu();

  // 5. Gas-Genie Modal / Status Handlers
  initGasGenieHandlers();

  // 6. Solar & Battery Savings Estimator
  initSavingsCalculator();

  // 7. Interactive Portfolio Tabs (Celebrity & Hip-Hop Solar)
  initPortfolioTabs();

  // 8. Controlled Smooth Anchor Scrolling
  initSmoothAnchorLinks();
}

/**
 * Controlled Smooth Anchor Navigation
 * Smoothly scrolls only when clicking anchor links, keeping wheel/trackpad scrolling native
 */
function initSmoothAnchorLinks() {
  document.querySelectorAll('a[href^="#"]:not([href="#"]):not([data-portfolio-target])').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;
      try {
        const targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (history.pushState) {
            history.pushState(null, '', href);
          }
        }
      } catch (err) {}
    });
  });
}

/**
 * Hero View Mode Switcher
 * Switches between Architectural Solar Photo and Outage Simulator
 */
function initHeroViewSwitch() {
  const tabPhoto = document.getElementById('tabPhoto');
  const tabReveal = document.getElementById('tabReveal');
  const photoCard = document.getElementById('photoCard');
  const houseRevealCard = document.getElementById('houseRevealCard');

  if (!tabPhoto || !tabReveal || !photoCard || !houseRevealCard) return;

  tabPhoto.addEventListener('click', () => {
    tabPhoto.classList.add('active');
    tabPhoto.setAttribute('aria-selected', 'true');
    tabReveal.classList.remove('active');
    tabReveal.setAttribute('aria-selected', 'false');

    photoCard.style.display = 'block';
    houseRevealCard.style.display = 'none';
  });

  tabReveal.addEventListener('click', () => {
    tabReveal.classList.add('active');
    tabReveal.setAttribute('aria-selected', 'true');
    tabPhoto.classList.remove('active');
    tabPhoto.setAttribute('aria-selected', 'false');

    houseRevealCard.style.display = 'block';
    photoCard.style.display = 'none';
  });
}

/**
 * Interactive House Reveal
 * Masking cursor over blackout house to reveal powered solar home
 */
function initInteractiveReveal() {
  const card = document.getElementById('houseRevealCard');
  if (!card) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  let ticking = false;
  let targetX = 50;
  let targetY = 50;

  function updateMask() {
    card.style.setProperty('--mask-x', `${targetX}%`);
    card.style.setProperty('--mask-y', `${targetY}%`);
    ticking = false;
  }

  function handlePointer(e) {
    const rect = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    targetX = ((x / rect.width) * 100).toFixed(2);
    targetY = ((y / rect.height) * 100).toFixed(2);

    if (!ticking) {
      requestAnimationFrame(updateMask);
      ticking = true;
    }
  }

  card.addEventListener('pointermove', handlePointer, { passive: true });
  card.addEventListener('pointerdown', handlePointer, { passive: true });

  card.addEventListener('pointerleave', () => {
    targetX = 50;
    targetY = 50;
    if (!ticking) {
      requestAnimationFrame(updateMask);
      ticking = true;
    }
  });
}

/**
 * Solar Day Simulator
 * Interactive time-of-day slider calculating production vs consumption
 */
function initSolarSimulator() {
  const slider = document.getElementById('simSunSlider');
  if (!slider) return;

  const timeVal = document.getElementById('simTimeVal');
  const outputVal = document.getElementById('simOutputVal');
  const batteryVal = document.getElementById('simBatteryVal');
  const gridStatus = document.getElementById('simGridStatus');
  const simNote = document.getElementById('simNote');

  function updateSim() {
    const val = parseFloat(slider.value);
    const hour = Math.floor(val);
    const min = Math.round((val - hour) * 60);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const displayMin = min < 10 ? `0${min}` : min;

    if (timeVal) {
      timeVal.textContent = `${displayHour}:${displayMin} ${ampm}`;
    }

    // Solar curve peaking around 1:00 PM (13.0)
    let solarKw = 0;
    if (val >= 6.5 && val <= 19.5) {
      const peakDist = Math.abs(val - 13);
      const normalized = Math.max(0, 1 - (peakDist / 6.5));
      solarKw = (Math.sin(normalized * (Math.PI / 2)) * 6.8).toFixed(1);
    }

    if (outputVal) {
      outputVal.textContent = `${solarKw} kW`;
    }

    // Battery & Flow state
    if (solarKw > 4.5) {
      if (batteryVal) batteryVal.textContent = '100% (Full)';
      if (gridStatus) {
        gridStatus.textContent = '100% Self-Sustained';
        gridStatus.style.color = 'var(--solar-gold)';
      }
      if (simNote) simNote.textContent = 'Solar powers the entire home with excess charging battery storage.';
    } else if (solarKw > 1.5) {
      if (batteryVal) batteryVal.textContent = '88% (Charging)';
      if (gridStatus) {
        gridStatus.textContent = 'Solar + Battery Active';
        gridStatus.style.color = 'var(--electric-cyan)';
      }
      if (simNote) simNote.textContent = 'Rooftop panels covering daytime baseline appliances.';
    } else {
      if (batteryVal) batteryVal.textContent = '74% (Discharging)';
      if (gridStatus) {
        gridStatus.textContent = 'Protected by Battery';
        gridStatus.style.color = '#38bdf8';
      }
      if (simNote) simNote.textContent = 'Sun is down: home battery powers interior lights and refrigerator seamlessly.';
    }
    // Sync range slider track progress & accessibility attributes
    const minVal = parseFloat(slider.min) || 6;
    const maxVal = parseFloat(slider.max) || 20;
    const progressPct = ((val - minVal) / (maxVal - minVal)) * 100;
    slider.style.setProperty('--slider-progress', `${progressPct}%`);
    slider.setAttribute('aria-valuenow', val.toFixed(1));
    slider.setAttribute('aria-valuetext', `${displayHour}:${displayMin} ${ampm} - ${solarKw} kW Solar Production`);
  }

  slider.addEventListener('input', updateSim);
  updateSim();
}

/**
 * Mobile Navigation Drawer
 * Seamless slide-in drawer with blur backdrop and keyboard accessibility
 */
function initMobileMenu() {
  const toggles = document.querySelectorAll('.mobile-nav-toggle');
  const drawer = document.getElementById('mobileDrawer');
  const closeBtn = document.getElementById('closeMobileDrawer');

  if (!drawer || toggles.length === 0) return;

  // Ensure backdrop exists
  let backdrop = document.getElementById('mobileDrawerBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'mobileDrawerBackdrop';
    backdrop.className = 'mobile-drawer-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
  }

  function openDrawer() {
    drawer.removeAttribute('style');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      openDrawer();
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDrawer();
    });
  }

  backdrop.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

/**
 * Interactive Portfolio Tabs
 * Handles dynamic specification toggles for Celebrity Solar & Hip-Hop Solar
 */
function initPortfolioTabs() {
  const sections = document.querySelectorAll('.portfolio-section');
  sections.forEach(section => {
    const tabs = section.querySelectorAll('.portfolio-tab-btn');
    const cards = section.querySelectorAll('.portfolio-spec-card');

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = tab.getAttribute('data-portfolio-target');
        if (!targetId) return;

        // Update tabs active state
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update cards active state
        cards.forEach(card => {
          if (card.id === targetId) {
            card.classList.add('active');
          } else {
            card.classList.remove('active');
          }
        });
      });
    });
  });
}

/**
 * Gas-Genie Handlers
 * Clearly maintains isolation: does not route to Sunrun solar lead capture
 */
function initGasGenieHandlers() {
  const gasForms = document.querySelectorAll('.gas-genie-notify-form');
  gasForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const email = input ? input.value : '';
      if (!email) return;

      const successBox = form.nextElementSibling;
      form.style.display = 'none';
      if (successBox) {
        successBox.style.display = 'block';
        successBox.replaceChildren();
        const note = document.createElement('div');
        note.style.cssText = 'padding:16px;border-radius:12px;background:rgba(14,165,233,0.15);border:1px solid rgba(14,165,233,0.3);color:#e0f2fe;font-size:0.9rem;';
        const title = document.createElement('strong');
        title.textContent = 'Thank you.';
        const detail = document.createElement('small');
        detail.style.cssText = 'color:#94a3b8;display:block;margin-top:6px;';
        detail.textContent = 'Gas-Genie is strictly independent from Sunrun solar lead capture.';
        note.append(title, ' We will notify you once the Gas-Genie pilot program is officially open for beta enrollment.');
        note.appendChild(detail);
        successBox.appendChild(note);
      }
    });
  });
}

/**
 * Solar & Battery Savings Estimator
 * Calculates compounding utility monopoly inflation vs predictable solar rate lock
 */
function initSavingsCalculator() {
  const slider = document.getElementById('calcBillSlider');
  if (!slider) return;

  const billDisplay = document.getElementById('calcBillDisplay');
  const utilityCostEl = document.getElementById('calcUtilityCost');
  const solarCostEl = document.getElementById('calcSolarCost');
  const savingsEl = document.getElementById('calcSavings');
  const batteryTitleEl = document.getElementById('calcBatteryTitle');
  const batteryDescEl = document.getElementById('calcBatteryDesc');

  function updateSavings() {
    const monthlyBill = parseFloat(slider.value);

    if (billDisplay) {
      billDisplay.textContent = `$${monthlyBill.toLocaleString()}/mo`;
    }

    // 25-Year Utility Monopoly Bill with compounding 4.8% annual inflation
    let totalUtility = 0;
    const rateHike = 0.048;
    for (let yr = 0; yr < 25; yr++) {
      totalUtility += (monthlyBill * 12) * Math.pow(1 + rateHike, yr);
    }
    const roundedUtility = Math.round(totalUtility);

    // Predictable Solar + Storage Rate (~38% lower over 25-year lifecycle)
    const solarFactor = 0.62;
    const roundedSolar = Math.round(roundedUtility * solarFactor);

    // Net savings
    const roundedSavings = roundedUtility - roundedSolar;

    if (utilityCostEl) {
      utilityCostEl.textContent = `$${roundedUtility.toLocaleString()}`;
    }
    if (solarCostEl) {
      solarCostEl.textContent = `$${roundedSolar.toLocaleString()}`;
    }
    if (savingsEl) {
      savingsEl.textContent = `$${roundedSavings.toLocaleString()}`;
    }

    // Battery Storage recommendation based on consumption
    if (batteryTitleEl && batteryDescEl) {
      if (monthlyBill < 300) {
        batteryTitleEl.textContent = '1× Intelligent Battery Storage (Sunrun Shift / Tesla Powerwall)';
        batteryDescEl.textContent = 'Engineered for critical circuits: automatically powers refrigerators, lighting, Wi-Fi, home office, and medical devices during grid blackouts.';
      } else {
        batteryTitleEl.textContent = '2× High-Capacity Batteries (Whole-Home Backup Architecture)';
        batteryDescEl.textContent = 'Engineered for high-demand residences: supports Central HVAC/AC systems, EV charging, laundry, and whole-house continuous power through multi-day grid failures.';
      }
    }

    // Sync range slider track progress & accessibility attributes
    const minVal = parseFloat(slider.min) || 100;
    const maxVal = parseFloat(slider.max) || 1200;
    const progressPct = ((monthlyBill - minVal) / (maxVal - minVal)) * 100;
    slider.style.setProperty('--slider-progress', `${progressPct}%`);
    slider.setAttribute('aria-valuenow', monthlyBill);
    slider.setAttribute('aria-valuetext', `$${monthlyBill} per month - estimated $${roundedSavings.toLocaleString()} 25-year net savings`);
  }

  slider.addEventListener('input', updateSavings);
  updateSavings();
}
