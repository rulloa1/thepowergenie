/**
 * Power Genie First-Party Marketing Attribution & Funnel Analytics Engine
 * 
 * Strict Privacy & Architectural Standards:
 * - Centralized Solar Referral Destination (Preserves srep=/powergenie exactly)
 * - First-party privacy-conscious campaign attribution (UTMs + Referrer)
 * - Ephemeral non-fingerprinted session identification
 * - Zero PII collection (No names, emails, phones, addresses, SSNs in ordinary events)
 * - Outbound referral tracking immediately prior to navigation
 * - Google Analytics 4, Plausible, and First-Party Local Store dispatchers
 */

import { SOLAR_REFERRAL_URL, POWERGENIE_CONFIG } from './config.js';

// Storage Keys
const STORAGE_KEYS = {
  SESSION_ATTR: 'pg_attribution_session',
  SESSION_ID: 'pg_session_id',
  FIRST_TOUCH: 'pg_attribution_first_touch',
  LAST_TOUCH: 'pg_attribution_last_touch',
  LANDING_PAGE: 'pg_landing_page',
  EVENTS_LOG: 'pg_events_log_v1',
  STATS: 'pg_funnel_stats_v1',
  SEEDED: 'pg_has_demo_seed'
};

const MAX_EVENT_LOG_SIZE = 500;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]\d{4}/;
const ADDRESS_RE = /\b\d{1,5}\s+[a-z0-9.'-]+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)\b/i;

let solarLeadButtonsReady = false;

function scrubToken(value, fallback = '') {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!raw || EMAIL_RE.test(raw) || PHONE_RE.test(raw) || ADDRESS_RE.test(raw)) return fallback;
  return raw;
}

function scrubReferrer(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'direct' || raw === 'internal') return raw || 'direct';
  try {
    return new URL(raw).hostname.replace(/^www\./, '') || 'external_other';
  } catch (e) {
    return scrubToken(raw, 'direct');
  }
}

function toPublicEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const destination = event.destination_url === SOLAR_REFERRAL_URL ? SOLAR_REFERRAL_URL : '';
  return {
    event: scrubToken(event.event, 'unknown'),
    timestamp: scrubToken(event.timestamp, ''),
    session_id: scrubToken(event.session_id, ''),
    brand: scrubToken(event.brand, 'power_genie'),
    page: scrubToken(event.page, '/'),
    page_title: scrubToken(event.page_title, ''),
    placement: scrubToken(event.placement, 'unassigned'),
    cta_text: scrubToken(event.cta_text, ''),
    destination_url: destination,
    srep: event.srep === '/powergenie' ? '/powergenie' : '',
    utm_source: scrubToken(event.utm_source, 'direct'),
    utm_medium: scrubToken(event.utm_medium, 'direct'),
    utm_campaign: scrubToken(event.utm_campaign, 'none'),
    utm_content: scrubToken(event.utm_content, ''),
    utm_term: scrubToken(event.utm_term, ''),
    referrer: scrubReferrer(event.referrer),
    landing_page: scrubToken(event.landing_page, '/')
  };
}

/**
 * Generate a non-fingerprinted, cryptographically random anonymous session ID.
 */
function generateAnonymousSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'pg_sid_' + crypto.randomUUID();
  }
  return 'pg_sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Get or create the current anonymous session ID.
 */
export function getSessionId() {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return 'pg_sid_noscript';
  }
  try {
    let sid = window.sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!sid) {
      sid = generateAnonymousSessionId();
      window.sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sid);
    }
    return sid;
  } catch (e) {
    return generateAnonymousSessionId();
  }
}

/**
 * Clean & normalize inbound referrer domain
 */
function parseReferrerSource(refUrl) {
  if (!refUrl) return 'direct';
  try {
    const url = new URL(refUrl);
    const host = url.hostname.toLowerCase();
    
    // Internal navigation
    if (typeof window !== 'undefined' && window.location.hostname === host) {
      return 'internal';
    }
    
    // Major social & search referrers
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('facebook.com') || host.includes('fb.com')) return 'facebook';
    if (host.includes('twitter.com') || host.includes('x.com') || host.includes('t.co')) return 'twitter';
    if (host.includes('google.com') || host.includes('google.')) return 'google';
    if (host.includes('bing.com')) return 'bing';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('pinterest.com')) return 'pinterest';
    if (host.includes('reddit.com')) return 'reddit';
    
    return host.replace(/^www\./, '');
  } catch (e) {
    return 'external_other';
  }
}

/**
 * Capture and return inbound campaign attribution.
 * Supports:
 * - utm_source
 * - utm_medium
 * - utm_campaign
 * - utm_content
 * - utm_term
 * - internal landing page ID
 * - inbound referrer
 */
export function getAttribution() {
  if (typeof window === 'undefined') {
    return {
      utm_source: 'direct',
      utm_medium: 'direct',
      utm_campaign: 'none',
      utm_content: '',
      utm_term: '',
      referrer: 'direct',
      landing_page: '/',
      landing_time: new Date().toISOString()
    };
  }

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hasUtm = urlParams.has('utm_source') || urlParams.has('utm_campaign') || urlParams.has('utm_medium');
    
    // Check if we already have an active session attribution
    const existingSession = window.sessionStorage ? window.sessionStorage.getItem(STORAGE_KEYS.SESSION_ATTR) : null;
    let sessionData = existingSession ? JSON.parse(existingSession) : null;

    if (hasUtm) {
      // Inbound link with explicit marketing parameters
      const currentAttr = {
        utm_source: scrubToken((urlParams.get('utm_source') || 'direct').toLowerCase(), 'direct'),
        utm_medium: scrubToken((urlParams.get('utm_medium') || 'unknown').toLowerCase(), 'unknown'),
        utm_campaign: scrubToken((urlParams.get('utm_campaign') || 'none').toLowerCase(), 'none'),
        utm_content: scrubToken((urlParams.get('utm_content') || '').toLowerCase(), ''),
        utm_term: scrubToken((urlParams.get('utm_term') || '').toLowerCase(), ''),
        referrer: parseReferrerSource(document.referrer),
        landing_page: window.location.pathname || '/',
        landing_time: new Date().toISOString()
      };

      // Store in current session
      if (window.sessionStorage) {
        window.sessionStorage.setItem(STORAGE_KEYS.SESSION_ATTR, JSON.stringify(currentAttr));
        if (!window.sessionStorage.getItem(STORAGE_KEYS.LANDING_PAGE)) {
          window.sessionStorage.setItem(STORAGE_KEYS.LANDING_PAGE, currentAttr.landing_page);
        }
      }

      // Store first-touch and last-touch in localStorage
      if (window.localStorage && POWERGENIE_CONFIG.ENABLE_FIRST_PARTY_STORAGE !== false) {
        if (!window.localStorage.getItem(STORAGE_KEYS.FIRST_TOUCH)) {
          window.localStorage.setItem(STORAGE_KEYS.FIRST_TOUCH, JSON.stringify(currentAttr));
        }
        window.localStorage.setItem(STORAGE_KEYS.LAST_TOUCH, JSON.stringify(currentAttr));
      }

      return currentAttr;
    }

    if (sessionData) {
      // Retain the campaign attribution across multi-page navigation during the same visit
      return sessionData;
    }

    // Fresh visit without UTMs - determine by referrer
    const refSource = parseReferrerSource(document.referrer);
    const fallbackAttr = {
      utm_source: refSource === 'internal' ? 'direct' : refSource,
      utm_medium: refSource === 'direct' || refSource === 'internal' ? 'direct' : 'organic_referral',
      utm_campaign: 'none',
      utm_content: '',
      utm_term: '',
      referrer: refSource,
      landing_page: window.location.pathname || '/',
      landing_time: new Date().toISOString()
    };

    if (window.sessionStorage) {
      window.sessionStorage.setItem(STORAGE_KEYS.SESSION_ATTR, JSON.stringify(fallbackAttr));
      window.sessionStorage.setItem(STORAGE_KEYS.LANDING_PAGE, fallbackAttr.landing_page);
    }

    if (window.localStorage && POWERGENIE_CONFIG.ENABLE_FIRST_PARTY_STORAGE !== false) {
      if (!window.localStorage.getItem(STORAGE_KEYS.FIRST_TOUCH)) {
        window.localStorage.setItem(STORAGE_KEYS.FIRST_TOUCH, JSON.stringify(fallbackAttr));
      }
      window.localStorage.setItem(STORAGE_KEYS.LAST_TOUCH, JSON.stringify(fallbackAttr));
    }

    return fallbackAttr;
  } catch (e) {
    return {
      utm_source: 'direct',
      utm_medium: 'direct',
      utm_campaign: 'none',
      utm_content: '',
      utm_term: '',
      referrer: 'direct',
      landing_page: '/',
      landing_time: new Date().toISOString()
    };
  }
}

/**
 * Retrieve current brand experience identifier from page or argument.
 */
export function getBrandForPage(explicitBrand) {
  if (explicitBrand) return explicitBrand;
  if (typeof window === 'undefined') return 'power_genie';
  
  const path = window.location.pathname.toLowerCase();
  if (path.includes('celebrity-solar')) return 'celebrity_solar';
  if (path.includes('hip-hop-solar')) return 'hip_hop_solar';
  if (path.includes('gas-genie')) return 'gas_genie';
  return 'power_genie';
}

/**
 * Initialize or get local aggregate funnel stats
 */
export function getFunnelStats() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createEmptyStats();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return createEmptyStats();
    return JSON.parse(raw);
  } catch (e) {
    return createEmptyStats();
  }
}

function createEmptyStats() {
  return {
    total_sessions: 0,
    unique_visitors: 0,
    page_views: 0,
    solar_cta_views: 0,
    solar_cta_clicks: 0,
    solar_referral_outbounds: 0,
    by_brand: {
      power_genie: { page_views: 0, cta_views: 0, cta_clicks: 0, outbounds: 0 },
      celebrity_solar: { page_views: 0, cta_views: 0, cta_clicks: 0, outbounds: 0 },
      hip_hop_solar: { page_views: 0, cta_views: 0, cta_clicks: 0, outbounds: 0 },
      gas_genie: { page_views: 0, cta_views: 0, cta_clicks: 0, outbounds: 0 }
    },
    by_source: {},
    by_campaign: {},
    by_placement: {},
    by_page: {},
    last_updated: new Date().toISOString()
  };
}

/**
 * Record an event into the first-party local store & aggregates
 */
function recordFirstPartyEvent(eventPayload) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (POWERGENIE_CONFIG.ENABLE_FIRST_PARTY_STORAGE === false) return;

  try {
    // 1. Append to rolling events log
    const rawLog = window.localStorage.getItem(STORAGE_KEYS.EVENTS_LOG);
    const log = rawLog ? JSON.parse(rawLog) : [];
    log.unshift(toPublicEvent(eventPayload));
    if (log.length > MAX_EVENT_LOG_SIZE) {
      log.length = MAX_EVENT_LOG_SIZE;
    }
    window.localStorage.setItem(STORAGE_KEYS.EVENTS_LOG, JSON.stringify(log));

    // 2. Update aggregate metrics
    const stats = getFunnelStats();
    stats.last_updated = new Date().toISOString();

    const brand = eventPayload.brand || 'power_genie';
    const source = eventPayload.utm_source || 'direct';
    const campaign = eventPayload.utm_campaign || 'none';
    const placement = eventPayload.placement || 'unknown';
    const page = eventPayload.page || '/';

    // Init keys
    if (!stats.by_brand[brand]) {
      stats.by_brand[brand] = { page_views: 0, cta_views: 0, cta_clicks: 0, outbounds: 0 };
    }
    if (!stats.by_source[source]) {
      stats.by_source[source] = { visitors: 0, views: 0, clicks: 0, outbounds: 0 };
    }
    if (!stats.by_campaign[campaign]) {
      stats.by_campaign[campaign] = { source: source, visitors: 0, clicks: 0, outbounds: 0 };
    }
    if (!stats.by_placement[placement]) {
      stats.by_placement[placement] = { views: 0, clicks: 0, outbounds: 0 };
    }
    if (!stats.by_page[page]) {
      stats.by_page[page] = { views: 0, clicks: 0, outbounds: 0 };
    }

    if (eventPayload.event === 'power_genie_page_view') {
      stats.page_views++;
      stats.by_brand[brand].page_views++;
      stats.by_source[source].views++;
      stats.by_page[page].views++;

      // Check if session is new to unique visitors counter
      const sessionCounted = window.sessionStorage ? window.sessionStorage.getItem('pg_session_counted') : null;
      if (!sessionCounted) {
        stats.total_sessions++;
        stats.unique_visitors++;
        stats.by_source[source].visitors++;
        stats.by_campaign[campaign].visitors++;
        if (window.sessionStorage) {
          window.sessionStorage.setItem('pg_session_counted', 'true');
        }
      }
    } else if (eventPayload.event === 'solar_cta_view') {
      stats.solar_cta_views++;
      stats.by_brand[brand].cta_views++;
      stats.by_placement[placement].views++;
    } else if (eventPayload.event === 'solar_cta_click') {
      stats.solar_cta_clicks++;
      stats.by_brand[brand].cta_clicks++;
      stats.by_source[source].clicks++;
      stats.by_campaign[campaign].clicks++;
      stats.by_placement[placement].clicks++;
      stats.by_page[page].clicks++;
    } else if (eventPayload.event === 'solar_referral_outbound') {
      stats.solar_referral_outbounds++;
      stats.by_brand[brand].outbounds++;
      stats.by_source[source].outbounds++;
      stats.by_campaign[campaign].outbounds++;
      stats.by_placement[placement].outbounds++;
      stats.by_page[page].outbounds++;
    }

    window.localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.warn('[PowerGenie Analytics] Failed to write local store:', e);
  }
}

/**
 * Dispatch funnel event to external platforms (GA4, Plausible, DOM event)
 */
function dispatchExternalAnalytics(eventName, payload) {
  // 1. Google Analytics 4 integration
  if (typeof window !== 'undefined') {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        brand: payload.brand,
        cta_placement: payload.placement,
        cta_text: payload.cta_text,
        page_location: window.location.href,
        page_path: payload.page,
        campaign_source: payload.utm_source,
        campaign_medium: payload.utm_medium,
        campaign_name: payload.utm_campaign,
        campaign_content: payload.utm_content,
        campaign_term: payload.utm_term,
        destination_url: payload.destination_url,
        srep: payload.srep
      });
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: eventName,
        ...payload
      });
    }

    // 2. Plausible Analytics integration
    if (typeof window.plausible === 'function') {
      window.plausible(eventName, {
        props: {
          brand: payload.brand,
          placement: payload.placement,
          cta_text: payload.cta_text,
          source: payload.utm_source,
          campaign: payload.utm_campaign
        }
      });
    }

    // 3. Custom DOM Event for internal or third-party listeners
    try {
      window.dispatchEvent(new CustomEvent('powergenie:funnel_event', { detail: payload }));
    } catch (e) {}

    // 4. Debug logging if configured
    if (POWERGENIE_CONFIG.DEBUG_ANALYTICS) {
      console.log(`[PowerGenie Event: ${eventName}]`, payload);
    }
  }
}

/**
 * Master Funnel Event Tracker
 * 
 * Sanitizes input to guarantee NO PII is ever sent.
 */
export function trackFunnelEvent(eventName, customData = {}) {
  const attribution = getAttribution();
  const sessionId = getSessionId();
  const pagePath = typeof window !== 'undefined' ? window.location.pathname : '/';

  // Strict whitelist for event context - NEVER collect PII
  const payload = toPublicEvent({
    event: eventName,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    brand: customData.brand || getBrandForPage(),
    page: pagePath,
    page_title: typeof document !== 'undefined' ? document.title : '',
    placement: customData.placement || 'unassigned',
    cta_text: customData.cta_text || '',
    destination_url: customData.destination_url || '',
    srep: customData.srep || '',
    utm_source: attribution.utm_source || 'direct',
    utm_medium: attribution.utm_medium || 'direct',
    utm_campaign: attribution.utm_campaign || 'none',
    utm_content: attribution.utm_content || '',
    utm_term: attribution.utm_term || '',
    referrer: attribution.referrer || 'direct',
    landing_page: attribution.landing_page || pagePath
  });

  // Record in first-party storage for dashboard
  recordFirstPartyEvent(payload);

  // Dispatch to external analytics platforms
  dispatchExternalAnalytics(eventName, payload);

  return payload;
}

/**
 * Track Page View event
 */
export function trackPageView(explicitBrand) {
  const brand = getBrandForPage(explicitBrand);
  return trackFunnelEvent('power_genie_page_view', { brand });
}

/**
 * Set up IntersectionObserver for solar_cta_view tracking
 * Tracks each CTA view once per pageview
 */
export function initCtaViewObserver() {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

  const solarButtons = document.querySelectorAll('[data-solar-cta], a.solar-cta');
  if (!solarButtons.length) return;

  const viewedSet = new WeakSet();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !viewedSet.has(entry.target)) {
        viewedSet.add(entry.target);
        const btn = entry.target;
        const placement = btn.getAttribute('data-placement') || inferPlacement(btn);
        const brand = btn.getAttribute('data-brand') || getBrandForPage();
        const ctaText = btn.textContent ? btn.textContent.trim().replace(/\s+/g, ' ') : '';

        trackFunnelEvent('solar_cta_view', {
          placement,
          brand,
          cta_text: ctaText
        });
      }
    });
  }, {
    threshold: 0.35 // At least 35% visible in viewport
  });

  solarButtons.forEach((btn) => observer.observe(btn));
}

/**
 * Infer CTA placement if not explicitly set via data-placement attribute
 */
function inferPlacement(btn) {
  if (btn.closest('.mobile-sticky-bar')) return 'mobile_sticky';
  if (btn.closest('.site-header') || btn.closest('.nav-links')) return 'nav';
  if (btn.closest('.mobile-drawer')) return 'mobile_nav';
  if (btn.closest('#hero') || btn.closest('.hero-section')) return 'hero';
  if (btn.closest('#advisor') || btn.closest('.rep-spotlight-card')) return 'advisor';
  if (btn.closest('.site-footer')) return 'footer';
  if (btn.closest('.culture-banner') || btn.closest('.luxury-quote-card') || btn.closest('.bottom-banner')) return 'final_cta';
  return 'mid_page';
}

/**
 * Primary CTA Click & Outbound Navigation Handler
 * 
 * CRITICAL REQUIREMENTS:
 * 1. Preserves destination URL exactly: https://sunrun.my.salesforce-sites.com/purl/?srep=/powergenie
 * 2. Does NOT append UTM parameters or query arguments to Sunrun destination.
 * 3. Records solar_cta_click and solar_referral_outbound events immediately BEFORE navigation.
 */
export function handleSolarCtaClick(e, btn) {
  const placement = btn.getAttribute('data-placement') || inferPlacement(btn);
  const brand = btn.getAttribute('data-brand') || getBrandForPage();
  const ctaText = btn.textContent ? btn.textContent.trim().replace(/\s+/g, ' ') : 'Explore Solar';
  const destination = SOLAR_REFERRAL_URL;

  // 1. Record solar_cta_click
  trackFunnelEvent('solar_cta_click', {
    placement,
    brand,
    cta_text: ctaText,
    destination_url: destination
  });

  // 2. Record solar_referral_outbound immediately prior to navigation
  trackFunnelEvent('solar_referral_outbound', {
    placement,
    brand,
    cta_text: ctaText,
    destination_url: destination,
    srep: '/powergenie'
  });

  // If this was an element without native link or if default prevented, handle navigation
  if (btn.tagName.toLowerCase() !== 'a' || btn.getAttribute('href') === '#' || !btn.getAttribute('href')) {
    if (e) e.preventDefault();
    window.open(destination, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Attach listeners to all solar CTAs across the page
 */
export function initSolarLeadButtons() {
  if (typeof document === 'undefined' || solarLeadButtonsReady) return;
  solarLeadButtonsReady = true;

  const leadUrl = SOLAR_REFERRAL_URL;
  const solarButtons = document.querySelectorAll('[data-solar-cta], a.solar-cta');

  solarButtons.forEach((btn) => {
    // 1. Ensure href is set to central destination without any query string modifications
    if (btn.tagName.toLowerCase() === 'a') {
      btn.setAttribute('href', leadUrl);
      btn.setAttribute('target', '_blank');
      btn.setAttribute('rel', 'noopener noreferrer');
    }

    // 2. Attach click and touch tracking
    // Prevent duplicate handlers if re-initialized
    if (!btn.dataset.pgCtaBound) {
      btn.dataset.pgCtaBound = 'true';
      btn.addEventListener('click', (e) => {
        handleSolarCtaClick(e, btn);
      });
    }
  });

  // Initialize CTA view observer
  initCtaViewObserver();
}

/**
 * Retrieve raw events log for internal dashboard
 */
export function getRecentEvents(limit = 100) {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.EVENTS_LOG);
    if (!raw) return [];
    const events = JSON.parse(raw);
    return Array.isArray(events) ? events.slice(0, limit).map(toPublicEvent).filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Export First-Party Funnel Events as CSV
 * Suitable for offline reconciliation against Sunrun reports
 */
export function exportEventsCsv() {
  const events = getRecentEvents(1000);
  if (!events.length) {
    return 'timestamp,event,brand,placement,cta_text,utm_source,utm_medium,utm_campaign,landing_page,session_id\n';
  }

  const headers = ['timestamp', 'event', 'brand', 'placement', 'cta_text', 'utm_source', 'utm_medium', 'utm_campaign', 'landing_page', 'session_id'];
  const rows = events.map(ev => [
    ev.timestamp || '',
    ev.event || '',
    ev.brand || '',
    ev.placement || '',
    `"${(ev.cta_text || '').replace(/"/g, '""')}"`,
    ev.utm_source || '',
    ev.utm_medium || '',
    ev.utm_campaign || '',
    ev.landing_page || '',
    ev.session_id || ''
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Reset local analytics data (for testing / demo management)
 */
export function resetFunnelData() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(STORAGE_KEYS.STATS);
  window.localStorage.removeItem(STORAGE_KEYS.EVENTS_LOG);
  window.localStorage.setItem(STORAGE_KEYS.SEEDED, 'cleared');
  window.localStorage.removeItem(STORAGE_KEYS.FIRST_TOUCH);
  window.localStorage.removeItem(STORAGE_KEYS.LAST_TOUCH);
  if (window.sessionStorage) {
    window.sessionStorage.removeItem('pg_session_counted');
    window.sessionStorage.removeItem(STORAGE_KEYS.SESSION_ATTR);
  }
}

/**
 * Seed realistic demonstration marketing campaign data
 * Allows testing the Internal Attribution Dashboard immediately
 */
export function seedDemoAnalyticsData() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  
  const mockCampaigns = [
    { source: 'instagram', medium: 'social', campaign: 'solar_signup', brand: 'power_genie', page: '/index.html', count: 48, clicks: 12, outbounds: 9 },
    { source: 'tiktok', medium: 'video', campaign: 'solar_signup', brand: 'hip_hop_solar', page: '/hip-hop-solar.html', count: 62, clicks: 18, outbounds: 14 },
    { source: 'youtube', medium: 'video', campaign: 'solar_signup', brand: 'celebrity_solar', page: '/celebrity-solar.html', count: 35, clicks: 10, outbounds: 8 },
    { source: 'facebook', medium: 'paid_social', campaign: 'rate_lock_2026', brand: 'power_genie', page: '/index.html', count: 40, clicks: 9, outbounds: 7 },
    { source: 'qr', medium: 'offline', campaign: 'bay_area_flyer', brand: 'power_genie', page: '/index.html', count: 22, clicks: 6, outbounds: 5 },
    { source: 'google', medium: 'organic_referral', campaign: 'none', brand: 'power_genie', page: '/index.html', count: 55, clicks: 14, outbounds: 11 },
    { source: 'direct', medium: 'direct', campaign: 'none', brand: 'power_genie', page: '/index.html', count: 30, clicks: 7, outbounds: 5 }
  ];

  const placements = ['hero', 'mid_page', 'final_cta', 'mobile_sticky', 'nav', 'advisor'];
  const ctaTexts = ['Explore Solar', 'Get Started', 'See Your Solar Options'];

  const stats = createEmptyStats();
  const log = [];
  const now = Date.now();

  mockCampaigns.forEach((camp, cIdx) => {
    stats.total_sessions += camp.count;
    stats.unique_visitors += camp.count;
    stats.page_views += Math.round(camp.count * 1.4);

    if (!stats.by_source[camp.source]) {
      stats.by_source[camp.source] = { visitors: 0, views: 0, clicks: 0, outbounds: 0 };
    }
    stats.by_source[camp.source].visitors += camp.count;
    stats.by_source[camp.source].views += Math.round(camp.count * 1.4);
    stats.by_source[camp.source].clicks += camp.clicks;
    stats.by_source[camp.source].outbounds += camp.outbounds;

    if (!stats.by_campaign[camp.campaign]) {
      stats.by_campaign[camp.campaign] = { source: camp.source, visitors: 0, clicks: 0, outbounds: 0 };
    }
    stats.by_campaign[camp.campaign].visitors += camp.count;
    stats.by_campaign[camp.campaign].clicks += camp.clicks;
    stats.by_campaign[camp.campaign].outbounds += camp.outbounds;

    stats.by_brand[camp.brand].page_views += Math.round(camp.count * 1.4);
    stats.by_brand[camp.brand].cta_views += Math.round(camp.count * 1.1);
    stats.by_brand[camp.brand].cta_clicks += camp.clicks;
    stats.by_brand[camp.brand].outbounds += camp.outbounds;

    stats.solar_cta_views += Math.round(camp.count * 1.1);
    stats.solar_cta_clicks += camp.clicks;
    stats.solar_referral_outbounds += camp.outbounds;

    // Generate recent event log items
    for (let i = 0; i < camp.outbounds; i++) {
      const timeOffset = (cIdx * 20 + i * 4) * 60 * 1000;
      const t = new Date(now - timeOffset).toISOString();
      const placement = placements[i % placements.length];
      const text = ctaTexts[i % ctaTexts.length];
      const sid = 'pg_demo_' + Math.random().toString(36).substring(2, 8);

      if (!stats.by_placement[placement]) {
        stats.by_placement[placement] = { views: 0, clicks: 0, outbounds: 0 };
      }
      stats.by_placement[placement].views += 2;
      stats.by_placement[placement].clicks += 1;
      stats.by_placement[placement].outbounds += 1;

      if (!stats.by_page[camp.page]) {
        stats.by_page[camp.page] = { views: 0, clicks: 0, outbounds: 0 };
      }
      stats.by_page[camp.page].clicks += 1;
      stats.by_page[camp.page].outbounds += 1;

      // Add outbound event
      log.push({
        event: 'solar_referral_outbound',
        timestamp: t,
        session_id: sid,
        brand: camp.brand,
        page: camp.page,
        placement: placement,
        cta_text: text,
        destination_url: SOLAR_REFERRAL_URL,
        srep: '/powergenie',
        utm_source: camp.source,
        utm_medium: camp.medium,
        utm_campaign: camp.campaign,
        utm_content: 'ad_v' + (i % 3 + 1),
        utm_term: 'residential_solar',
        referrer: camp.source === 'direct' ? 'direct' : `https://${camp.source}.com`,
        landing_page: camp.page
      });

      // Add corresponding click event
      log.push({
        event: 'solar_cta_click',
        timestamp: new Date(now - timeOffset - 2000).toISOString(),
        session_id: sid,
        brand: camp.brand,
        page: camp.page,
        placement: placement,
        cta_text: text,
        destination_url: SOLAR_REFERRAL_URL,
        utm_source: camp.source,
        utm_medium: camp.medium,
        utm_campaign: camp.campaign,
        referrer: camp.source === 'direct' ? 'direct' : `https://${camp.source}.com`,
        landing_page: camp.page
      });
    }
  });

  stats.last_updated = new Date().toISOString();
  window.localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  window.localStorage.setItem(STORAGE_KEYS.EVENTS_LOG, JSON.stringify(log));
  window.localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
}

/**
 * Auto-initialize attribution and pageview tracking on script load
 */
function isAttributionDashboard() {
  return typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('attribution');
}

if (typeof document !== 'undefined' && !isAttributionDashboard()) {
  getAttribution();
  getSessionId();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      trackPageView();
      initSolarLeadButtons();
    });
  } else {
    trackPageView();
    initSolarLeadButtons();
  }
}
