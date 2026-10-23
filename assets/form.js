/**
 * Legacy Form Interceptor & Sunrun Redirect Handler
 * Ensures no duplicate CRM or simulated submission occurs.
 * Directs all solar inquiries directly to the confirmed Sunrun portal.
 */
(() => {
  const getReferralUrl = () => {
    if (typeof window !== 'undefined' && window.SOLAR_REFERRAL_URL) {
      return window.SOLAR_REFERRAL_URL;
    }
    if (typeof window !== 'undefined' && window.POWERGENIE_CONFIG?.SOLAR_REFERRAL_URL) {
      return window.POWERGENIE_CONFIG.SOLAR_REFERRAL_URL;
    }
    return "https://sunrun.my.salesforce-sites.com/purl/?srep=/powergenie";
  };

  const form = document.getElementById('lead');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      window.open(getReferralUrl(), '_blank', 'noopener,noreferrer');
    });
  }

  const yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
