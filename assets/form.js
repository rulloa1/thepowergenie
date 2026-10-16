/**
 * Legacy Form Interceptor & Sunrun Redirect Handler
 * Ensures no duplicate CRM or simulated submission occurs.
 * Directs all solar inquiries directly to the confirmed Sunrun portal.
 */
(() => {
  const SUNRUN_URL = "https://sunrun.my.salesforce-sites.com/purl/?srep=/powergenie";

  const form = document.getElementById('lead');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      window.open(SUNRUN_URL, '_blank', 'noopener,noreferrer');
    });
  }

  const yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
