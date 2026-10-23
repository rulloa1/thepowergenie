/**
 * Power Genie Homeowner App & Referral System
 * Handles Tesla Powerwall / Energy Firewall monitor,
 * blackout islanding simulation, interactive referral calculator,
 * link generation, QR modal, and live referral submission pipeline.
 */

import { POWERGENIE_CONFIG, SOLAR_REFERRAL_URL } from './config.js';

// Pre-loaded realistic sample referrals
const DEFAULT_REFERRALS = [
  {
    id: "REF-1092",
    name: "Marcus Sterling",
    location: "Oakland Hills, CA",
    system: "Solar (9.2 kW) + Tesla Powerwall 3",
    date: "Oct 12, 2026",
    status: "paid",
    statusLabel: "Installed & Verified",
    reward: 1000,
    payoutMethod: "Zelle Payout Sent"
  },
  {
    id: "REF-1093",
    name: "Elena Rostova",
    location: "Berkeley, CA",
    system: "Solar (11.4 kW) + Tesla Powerwall 3",
    date: "Oct 18, 2026",
    status: "pending",
    statusLabel: "Permits Approved (Install Next Week)",
    reward: 1000,
    payoutMethod: "ACH Direct Deposit Pending"
  },
  {
    id: "REF-1094",
    name: "Devon Washington",
    location: "Richmond, CA",
    system: "Standard Solar Energy System",
    date: "Oct 21, 2026",
    status: "review",
    statusLabel: "Site Energy Audit Completed",
    reward: 500,
    payoutMethod: "Pending Contract Execution"
  }
];

// Profile data configurations
const PROFILES = {
  horace: {
    name: "Horace Lawrence Estate",
    location: "Oakland Hills, CA",
    system: "Dual Tesla Powerwall 3 (27.0 kWh)",
    solarCapacity: "12.8 kW Solar Array",
    batteryPct: 88,
    batteryKwh: 23.8,
    batteryCapacity: 27.0,
    solarKw: 8.4,
    homeKw: 2.6,
    batteryChargeKw: 4.6,
    gridExportKw: 1.2,
    refCode: "PG-HORACE-7721"
  },
  vance: {
    name: "Marcus & Elena Vance",
    location: "Austin, TX",
    system: "Tesla Powerwall+ (13.5 kWh)",
    solarCapacity: "8.6 kW Solar Array",
    batteryPct: 92,
    batteryKwh: 12.4,
    batteryCapacity: 13.5,
    solarKw: 6.8,
    homeKw: 2.1,
    batteryChargeKw: 3.2,
    gridExportKw: 1.5,
    refCode: "PG-VANCE-3304"
  }
};

let currentProfile = PROFILES.horace;
let isOutageSimulated = false;
let selectedRewardPerReferral = 1000;

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initPowerwallMonitor();
  initReferralSystem();
  initProfileSelector();
  checkUrlHash();
});

/**
 * Tab Navigation Controller
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.app-tab-btn');
  const tabPanels = document.querySelectorAll('.app-tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

export function switchTab(tabId) {
  const tabButtons = document.querySelectorAll('.app-tab-btn');
  const tabPanels = document.querySelectorAll('.app-tab-panel');

  tabButtons.forEach(b => {
    const isTarget = b.getAttribute('data-tab') === tabId;
    b.classList.toggle('active', isTarget);
    b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  tabPanels.forEach(panel => {
    const isTarget = panel.id === `tab-${tabId}`;
    panel.style.display = isTarget ? 'block' : 'none';
  });

  // Update URL hash without jumping
  if (history.pushState) {
    history.pushState(null, null, `#${tabId}`);
  }
}

function checkUrlHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'referral-tab' || hash === 'referral' || hash === 'referrals') {
    switchTab('referral');
  } else if (hash === 'analytics') {
    switchTab('analytics');
  } else if (hash === 'concierge') {
    switchTab('concierge');
  } else {
    switchTab('powerwall');
  }
}

/**
 * Tesla Powerwall & Energy Firewall Monitor
 */
function initPowerwallMonitor() {
  updatePowerwallVisuals();

  // Outage Islanding Simulator Button
  const simBtn = document.getElementById('btnSimulateOutage');
  const simBox = document.getElementById('outageSimBox');

  if (simBtn) {
    simBtn.addEventListener('click', () => {
      isOutageSimulated = !isOutageSimulated;
      updateOutageState();
    });
  }

  // Backup Reserve Slider
  const reserveSlider = document.getElementById('reserveSlider');
  const reserveValue = document.getElementById('reserveValue');
  if (reserveSlider && reserveValue) {
    reserveSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      reserveValue.textContent = `${val}%`;
    });
  }
}

function updatePowerwallVisuals() {
  const p = currentProfile;

  // Battery percentage ring
  const ring = document.getElementById('batteryRingProgress');
  const pctText = document.getElementById('batteryPctText');
  const kwhText = document.getElementById('batteryKwhText');
  const backupHours = document.getElementById('backupHoursText');

  if (pctText) pctText.textContent = `${p.batteryPct}%`;
  if (kwhText) kwhText.textContent = `${p.batteryKwh} / ${p.batteryCapacity} kWh Stored`;

  // Circumference = 2 * PI * 90 = 565.48
  if (ring) {
    const totalCircumference = 565;
    const offset = totalCircumference - (totalCircumference * p.batteryPct / 100);
    ring.style.strokeDashoffset = offset;
  }

  // Estimated backup hours based on current home load
  if (backupHours) {
    const hours = (p.batteryKwh / p.homeKw).toFixed(1);
    backupHours.textContent = `${hours} Hours`;
  }

  // Flow Nodes
  const solarVal = document.getElementById('flowSolarVal');
  const batteryVal = document.getElementById('flowBatteryVal');
  const homeVal = document.getElementById('flowHomeVal');
  const gridVal = document.getElementById('flowGridVal');

  if (solarVal) solarVal.textContent = `${p.solarKw} kW`;
  if (batteryVal) batteryVal.textContent = `+${p.batteryChargeKw} kW`;
  if (homeVal) homeVal.textContent = `${p.homeKw} kW`;
  if (gridVal) gridVal.textContent = isOutageSimulated ? '0.0 kW (Islanded)' : `-${p.gridExportKw} kW (Export)`;
}

function updateOutageState() {
  const simBtn = document.getElementById('btnSimulateOutage');
  const simBox = document.getElementById('outageSimBox');
  const statusChip = document.getElementById('systemStatusChip');
  const gridNode = document.getElementById('flowGridNode');
  const gridVal = document.getElementById('flowGridVal');
  const flowBatteryVal = document.getElementById('flowBatteryVal');
  const islandAlert = document.getElementById('islandModeAlert');

  if (isOutageSimulated) {
    // ISLAND MODE ACTIVE
    if (simBtn) {
      simBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        Restore Grid Connection
      `;
      simBtn.style.background = "#10b981";
    }
    if (simBox) simBox.classList.add('sim-active');
    if (statusChip) {
      statusChip.classList.add('outage-active');
      statusChip.innerHTML = `<span class="status-dot"></span> ⚠️ ISLAND MODE: Grid Disconnected (Powerwall Supplying Home)`;
    }
    if (gridNode) {
      gridNode.classList.remove('grid-node');
      gridNode.classList.add('grid-disconnected');
    }
    if (gridVal) gridVal.textContent = "0.0 kW (Isolated)";
    if (flowBatteryVal) flowBatteryVal.textContent = "-2.6 kW (Discharging to Home)";
    if (islandAlert) islandAlert.style.display = "flex";

    showToast("⚠️ Outage Activated! Tesla Backup Gateway isolated in <10ms. Home running 100% on Powerwall!");
  } else {
    // GRID RESTORED
    if (simBtn) {
      simBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        Simulate Grid Outage (Blackout Test)
      `;
      simBtn.style.background = "#ef4444";
    }
    if (simBox) simBox.classList.remove('sim-active');
    if (statusChip) {
      statusChip.classList.remove('outage-active');
      statusChip.innerHTML = `<span class="status-dot"></span> ⚡ System Normal | Grid: Connected (60Hz) | Powerwall: ${currentProfile.batteryPct}%`;
    }
    if (gridNode) {
      gridNode.classList.add('grid-node');
      gridNode.classList.remove('grid-disconnected');
    }
    if (islandAlert) islandAlert.style.display = "none";
    updatePowerwallVisuals();

    showToast("✅ Grid Restored. Tesla Powerwall synchronized back with utility grid.");
  }
}

/**
 * Referral System & Cash Rewards Engine
 */
function initReferralSystem() {
  renderReferralLink();
  initTierSelection();
  initCalculatorSlider();
  initShareButtons();
  initReferralForm();
  renderReferralPipeline();
  initQrModal();
}

function getReferrals() {
  const saved = localStorage.getItem('pg_homeowner_referrals');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing saved referrals", e);
    }
  }
  return DEFAULT_REFERRALS;
}

function saveReferrals(list) {
  localStorage.setItem('pg_homeowner_referrals', JSON.stringify(list));
}

function renderReferralLink() {
  const code = currentProfile.refCode;
  const link = `${SOLAR_REFERRAL_URL}&ref=${code}`;
  const linkTextEl = document.getElementById('referralUrlText');
  if (linkTextEl) {
    linkTextEl.textContent = link;
  }
}

function initTierSelection() {
  const tierCards = document.querySelectorAll('.reward-tier-card');
  tierCards.forEach(card => {
    card.addEventListener('click', () => {
      tierCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedRewardPerReferral = parseInt(card.getAttribute('data-reward'), 10) || 1000;
      updateCalculator();
    });
  });
}

function initCalculatorSlider() {
  const slider = document.getElementById('referralCountSlider');
  const countEl = document.getElementById('referralCountText');
  if (slider && countEl) {
    slider.addEventListener('input', (e) => {
      countEl.textContent = e.target.value;
      updateCalculator();
    });
  }
  updateCalculator();
}

function updateCalculator() {
  const slider = document.getElementById('referralCountSlider');
  const totalEarnedEl = document.getElementById('calcTotalEarned');
  if (slider && totalEarnedEl) {
    const count = parseInt(slider.value, 10);
    const total = count * selectedRewardPerReferral;
    totalEarnedEl.textContent = `$${total.toLocaleString()}`;
  }
}

function initShareButtons() {
  const copyBtn = document.getElementById('btnCopyReferralLink');
  const smsBtn = document.getElementById('btnShareSms');
  const waBtn = document.getElementById('btnShareWhatsApp');
  const emailBtn = document.getElementById('btnShareEmail');

  const refUrl = `${SOLAR_REFERRAL_URL}&ref=${currentProfile.refCode}`;
  const shareText = `Hey! I went solar with Power Genie & Sunrun with our Tesla Powerwall battery storage. It cut our electric bill and keeps our house protected during blackouts. Use my private referral link to claim your custom solar proposal, and Horace Lawrence's team will take care of you: ${refUrl}`;

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(refUrl);
        copyBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          Copied to Clipboard!
        `;
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy Link
          `;
        }, 2200);
        showToast("✅ Referral link copied! Share with your neighbors to earn $1,000.");
      } catch (err) {
        showToast("Copied link: " + refUrl);
      }
    });
  }

  if (smsBtn) {
    smsBtn.href = `sms:?&body=${encodeURIComponent(shareText)}`;
  }
  if (waBtn) {
    waBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  }
  if (emailBtn) {
    emailBtn.href = `mailto:?subject=${encodeURIComponent("Check out our Sunrun Solar & Tesla Powerwall setup")}&body=${encodeURIComponent(shareText)}`;
  }
}

function initReferralForm() {
  const form = document.getElementById('directReferralForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('refNeighborName');
    const phoneInput = document.getElementById('refNeighborPhone');
    const addressInput = document.getElementById('refNeighborAddress');
    const billInput = document.getElementById('refNeighborBill');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';
    const bill = billInput ? billInput.value : '$250-$350';

    if (!name || !phone) {
      showToast("Please provide your neighbor's name and phone number.");
      return;
    }

    const newReferral = {
      id: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name,
      location: address || "Local Homeowner",
      system: `Solar + Tesla Powerwall (${bill}/mo bill)`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: "pending",
      statusLabel: "Referral Submitted (Rep Contacting)",
      reward: selectedRewardPerReferral,
      payoutMethod: "Direct Deposit on PTO"
    };

    const referrals = getReferrals();
    referrals.unshift(newReferral);
    saveReferrals(referrals);
    renderReferralPipeline();

    form.reset();
    showToast(`🎉 Referral submitted for ${name}! $${selectedRewardPerReferral.toLocaleString()} reward marked as pending.`);
  });
}

function renderReferralPipeline() {
  const container = document.getElementById('referralPipelineList');
  const earnedStatEl = document.getElementById('statTotalEarned');
  const pendingStatEl = document.getElementById('statPendingEarned');
  const countStatEl = document.getElementById('statTotalCount');

  const referrals = getReferrals();

  let totalEarned = 0;
  let totalPending = 0;

  referrals.forEach(r => {
    if (r.status === 'paid') totalEarned += r.reward;
    if (r.status === 'pending') totalPending += r.reward;
  });

  if (earnedStatEl) earnedStatEl.textContent = `$${totalEarned.toLocaleString()}`;
  if (pendingStatEl) pendingStatEl.textContent = `$${totalPending.toLocaleString()}`;
  if (countStatEl) countStatEl.textContent = referrals.length;

  if (!container) return;

  container.innerHTML = referrals.map(r => {
    const initials = r.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const badgeClass = r.status === 'paid' ? 'paid' : (r.status === 'pending' ? 'pending' : 'review');
    const badgeIcon = r.status === 'paid' ? '✅' : (r.status === 'pending' ? '⏳' : '🔍');

    return `
      <div class="pipeline-item">
        <div class="pipeline-person">
          <div class="person-avatar">${initials}</div>
          <div>
            <div style="font-weight:700; color:#fff; font-size:1rem;">${r.name}</div>
            <div style="font-size:0.8rem; color:#94a3b8;">${r.location} • <span style="color:#cbd5e1;">${r.system}</span></div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <div>
            <span class="status-badge ${badgeClass}">
              ${badgeIcon} ${r.statusLabel}
            </span>
            <div style="font-size:0.75rem; color:#64748b; margin-top:4px; text-align:right;">Submitted: ${r.date}</div>
          </div>

          <div style="text-align:right; min-width:90px;">
            <div style="font-size:1.25rem; font-weight:800; color:#f6b24a; font-family:var(--font-display, sans-serif);">$${r.reward.toLocaleString()}</div>
            <div style="font-size:0.75rem; color:#94a3b8;">${r.payoutMethod}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function initQrModal() {
  const qrBtn = document.getElementById('btnShowQrCode');
  const modal = document.getElementById('qrCodeModal');
  const closeBtn = document.getElementById('btnCloseQrModal');

  if (qrBtn && modal) {
    qrBtn.addEventListener('click', () => {
      modal.classList.add('open');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }
}

/**
 * Profile Switcher
 */
function initProfileSelector() {
  const selector = document.getElementById('profileSelector');
  if (!selector) return;

  selector.addEventListener('change', (e) => {
    const key = e.target.value;
    if (PROFILES[key]) {
      currentProfile = PROFILES[key];
      updatePowerwallVisuals();
      renderReferralLink();
      initShareButtons();
      showToast(`Switched profile to: ${currentProfile.name}`);
    }
  });
}

/**
 * UI Toast Feedback
 */
function showToast(msg) {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(11, 17, 34, 0.95);
      color: #fff;
      border: 1px solid rgba(246, 178, 74, 0.4);
      box-shadow: 0 10px 30px rgba(0,0,0,0.7);
      padding: 14px 22px;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 600;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(10px);
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
  }, 4000);
}
