/**
 * Power Genie Centralized Configuration
 * 
 * Single source of truth for the confirmed Sunrun lead-capture destination
 * and representative credentials.
 */
export const POWERGENIE_CONFIG = {
  // Official Sunrun Salesforce PURL lead capture URL (Preserved exactly with srep=/powergenie)
  SUNRUN_SOLAR_LEAD_URL: "https://sunrun.my.salesforce-sites.com/purl/?srep=/powergenie",
  
  // Sales representative profile
  REP_NAME: "Horace Lawrence",
  REP_TITLE: "The Block Sales Expert Team Lead",
  REP_PHONE: "510-241-7007",
  REP_PHONE_TEL: "tel:+15102417007",
  REP_EMAIL: "horace.lawrence@sunrun.com",
  REP_EMAIL_MAILTO: "mailto:horace.lawrence@sunrun.com?subject=Power%20Genie%20Solar%20Inquiry",
  
  // Brand identifiers
  BRAND_NAME: "Power Genie",
  LEGAL_DISCLAIMER: "Power Genie is an independent clean energy advisory and brand platform. Solar energy systems, battery storage, proposals, and installations are fulfilled through authorized Sunrun representatives. Power Genie is not owned by or an official affiliate of Sunrun Inc.",
  
  // Gas-Genie separate status
  GAS_GENIE_STATUS: "pilot_evaluation",
  GAS_GENIE_NOTICE: "Gas-Genie is a separate concept currently under development. It does NOT route inquiries to Sunrun solar lead capture."
};

// Global browser window attachment for vanilla JS compatibility
if (typeof window !== 'undefined') {
  window.POWERGENIE_CONFIG = POWERGENIE_CONFIG;
}

/**
 * Reusable Lead CTA Initializer
 * Automatically attaches the verified Sunrun lead capture URL to all solar CTAs.
 */
export function initSolarLeadButtons() {
  if (typeof document === 'undefined') return;
  
  const leadUrl = POWERGENIE_CONFIG.SUNRUN_SOLAR_LEAD_URL;
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

// Auto-initialize when loaded in browser
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSolarLeadButtons);
  } else {
    initSolarLeadButtons();
  }
}
