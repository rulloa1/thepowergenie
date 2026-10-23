/**
 * Power Genie Centralized Configuration
 * 
 * Single source of truth for:
 * 1. The confirmed Sunrun sales representative referral destination (srep=/powergenie)
 * 2. Representative credentials (Horace Lawrence)
 * 3. Sub-brand identifiers and first-party marketing attribution settings
 */

// Confirmed Authorized Sunrun Salesforce Referral Destination
// CRITICAL: Preserve this exact destination and its srep=/powergenie parameter.
// Do NOT append query parameters to this URL.
export const SOLAR_REFERRAL_URL = "https://sunrun.my.salesforce-sites.com/purl/?srep=/powergenie";

export const POWERGENIE_CONFIG = {
  // Centralized Solar Referral Destination (Preserved srep=/powergenie)
  SOLAR_REFERRAL_URL: SOLAR_REFERRAL_URL,
  
  // Backward compatibility alias for existing components
  SUNRUN_SOLAR_LEAD_URL: SOLAR_REFERRAL_URL,
  
  // Sales representative profile
  REP_NAME: "Horace Lawrence",
  REP_TITLE: "The Block Sales Expert Team Lead",
  REP_PHONE: "510-241-7007",
  REP_PHONE_TEL: "tel:+15102417007",
  REP_EMAIL: "horace.lawrence@sunrun.com",
  REP_EMAIL_MAILTO: "mailto:horace.lawrence@sunrun.com?subject=Power%20Genie%20Solar%20Inquiry",
  
  // Brand experiences
  BRANDS: {
    POWER_GENIE: "power_genie",
    CELEBRITY_SOLAR: "celebrity_solar",
    HIP_HOP_SOLAR: "hip_hop_solar",
    GAS_GENIE: "gas_genie"
  },
  
  // Analytics configuration (Set with real production IDs when available)
  // Zero fabricated IDs - left empty by default
  GA4_MEASUREMENT_ID: "", // e.g. "G-XXXXXXXXXX"
  PLAUSIBLE_DOMAIN: "",   // e.g. "powergenie.com"
  ENABLE_FIRST_PARTY_STORAGE: true,
  DEBUG_ANALYTICS: false,

  BRAND_NAME: "Power Genie",
  LEGAL_DISCLAIMER: "Power Genie is an independent clean energy advisory and brand platform. Solar energy systems, battery storage, proposals, and installations are fulfilled through authorized Sunrun representatives. Power Genie is not owned by or an official affiliate of Sunrun Inc. Sales Representative: Horace Lawrence.",
  
  // Gas-Genie separate status (Strictly isolated from solar referral)
  GAS_GENIE_STATUS: "pilot_evaluation",
  GAS_GENIE_NOTICE: "Gas-Genie is a separate concept currently under development. It does NOT route inquiries to Sunrun solar lead capture.",

  // Homeowner Referral Program & Rewards Config
  REFERRAL_REWARD_AMOUNT: 1000, // Standard referral reward ($1,000)
  REFERRAL_REWARD_TIERS: [
    { id: "solar_basic", name: "Standard Solar System", reward: 500, description: "Homeowner installs Sunrun residential solar" },
    { id: "solar_powerwall", name: "Solar + Tesla Powerwall", reward: 1000, description: "Homeowner installs solar + Tesla Powerwall / Battery backup", featured: true },
    { id: "whole_estate", name: "Estate Dual Powerwall System", reward: 1500, description: "Homeowner installs premium dual/triple Powerwall estate backup" }
  ],
  HOMEOWNER_APP_URL: "homeowner-app.html",

  // Horace Lawrence Advisor Portal & Dashboard Credentials
  ADVISOR_PORTAL: {
    DASHBOARD_URL: "attribution.html",
    LIVE_URL: "https://thepowergenie-kys1.vercel.app/attribution.html",
    REP_NAME: "Horace Lawrence",
    REP_EMAIL: "horace.lawrence@sunrun.com",
    REP_PHONE: "510-241-7007",
    DEFAULT_PIN: "7007",
    BACKUP_PIN: "powergenie2026"
  }
};

// Global browser window attachment for vanilla JS compatibility
if (typeof window !== 'undefined') {
  window.SOLAR_REFERRAL_URL = SOLAR_REFERRAL_URL;
  window.POWERGENIE_CONFIG = POWERGENIE_CONFIG;
}

/**
 * Reusable Lead CTA Initializer
 * Wires solar CTAs to the centralized destination and triggers attribution tracking.
 */
export async function initSolarLeadButtons() {
  if (typeof document === 'undefined') return;
  try {
    const { initSolarLeadButtons: initTracking } = await import('./analytics.js');
    initTracking();
  } catch (err) {
    // Fallback if analytics module fails to load
    const leadUrl = SOLAR_REFERRAL_URL;
    const solarButtons = document.querySelectorAll('[data-solar-cta], a.solar-cta');
    solarButtons.forEach(btn => {
      if (btn.tagName.toLowerCase() === 'a') {
        btn.setAttribute('href', leadUrl);
        btn.setAttribute('target', '_blank');
        btn.setAttribute('rel', 'noopener noreferrer');
      } else {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          window.open(leadUrl, '_blank', 'noopener,noreferrer');
        });
      }
    });
  }
}

// Auto-initialize when loaded in browser
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSolarLeadButtons);
  } else {
    initSolarLeadButtons();
  }
}
