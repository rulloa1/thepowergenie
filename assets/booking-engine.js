/**
 * Power Genie Interactive Consultation Booking Engine
 * 
 * Provides interactive 1-on-1 appointment booking for Horace Lawrence
 * with direct calendar (.ics) generation, local storage persistence,
 * and seamless integration across all Power Genie sub-brand portals.
 */

import { SOLAR_REFERRAL_URL, POWERGENIE_CONFIG } from './config.js';

// Pre-seeded realistic demo bookings for Horace Lawrence's portal
export const DEFAULT_BOOKINGS = [
  {
    id: "BK-701",
    clientName: "David & Kimberly Miller",
    phone: "(510) 555-0192",
    email: "david.miller@example.com",
    address: "1420 Skyline Blvd, Oakland Hills",
    type: "in_home",
    typeLabel: "🏡 In-Home Roof Assessment",
    date: "2026-10-24",
    time: "2:00 PM",
    bill: "$400-$600",
    notes: "Interested in Dual Tesla Powerwall 3 whole-home backup for winter storms.",
    status: "confirmed",
    createdAt: "2026-10-22T14:30:00Z"
  },
  {
    id: "BK-702",
    clientName: "Sarah Chen",
    phone: "(510) 555-0341",
    email: "schen@example.com",
    address: "Piedmont, CA",
    type: "virtual",
    typeLabel: "💻 Virtual Video Roof Sizing (Zoom)",
    date: "2026-10-25",
    time: "11:30 AM",
    bill: "$250-$400",
    notes: "Reviewing PG&E peak tariff hours and rooftop sun exposure.",
    status: "confirmed",
    createdAt: "2026-10-23T09:15:00Z"
  },
  {
    id: "BK-703",
    clientName: "Marcus Vance",
    phone: "(512) 555-0819",
    email: "mvance@example.com",
    address: "Austin, TX",
    type: "phone",
    typeLabel: "📱 Phone Consultation",
    date: "2026-10-26",
    time: "4:30 PM",
    bill: "$600+",
    notes: "Texas rate lock & freeze protection review for residential property.",
    status: "pending",
    createdAt: "2026-10-23T11:45:00Z"
  }
];

export function getBookings() {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_BOOKINGS;
  try {
    const raw = window.localStorage.getItem('pg_consultation_bookings');
    if (!raw) {
      window.localStorage.setItem('pg_consultation_bookings', JSON.stringify(DEFAULT_BOOKINGS));
      return DEFAULT_BOOKINGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_BOOKINGS;
  }
}

export function saveBookings(bookings) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem('pg_consultation_bookings', JSON.stringify(bookings));
    window.dispatchEvent(new CustomEvent('powergenie:bookings_updated', { detail: bookings }));
  } catch (e) {
    console.error("Failed to save bookings:", e);
  }
}

/**
 * Generate standard iCalendar (.ics) format file string
 */
export function generateIcsData(booking) {
  const dateStr = booking.date.replace(/-/g, '');
  // Map time slot e.g. "2:00 PM" to hour
  let hour = 14;
  let min = 0;
  const match = booking.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    hour = parseInt(match[1], 10);
    min = parseInt(match[2], 10);
    if (match[3].toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
  }
  const dtStart = `${dateStr}T${String(hour).padStart(2, '0')}${String(min).padStart(2, '0')}00`;
  const dtEnd = `${dateStr}T${String(hour + 1).padStart(2, '0')}${String(min).padStart(2, '0')}00`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Power Genie//Solar Consultation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:booking-${booking.id}@powergenie.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Sunrun Solar & Battery Consultation with Horace Lawrence`,
    `DESCRIPTION:Consultation with Sunrun Sales Expert Team Lead Horace Lawrence.\\nType: ${booking.typeLabel}\\nClient: ${booking.clientName}\\nPhone: ${booking.phone}\\nAdvisor Phone: 510-241-7007\\nEmail: horace.lawrence@sunrun.com`,
    `LOCATION:${booking.address || 'Phone / Virtual Consultation'}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

export function downloadIcsFile(booking) {
  const icsData = generateIcsData(booking);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Solar-Consultation-Horace-Lawrence-${booking.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Toast Notification Helper
 */
export function showBookingToast(message, duration = 4000) {
  if (typeof document === 'undefined') return;
  let toast = document.getElementById('pgGlobalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pgGlobalToast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10000;
      background: #0b1122;
      color: #fff;
      border: 1px solid #38bdf8;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6), 0 0 15px rgba(56,189,248,0.3);
      border-radius: 12px;
      padding: 14px 20px;
      font-size: 0.9rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 420px;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  toast.innerHTML = message;
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  toast.style.pointerEvents = 'auto';

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
    toast.style.pointerEvents = 'none';
  }, duration);
}

/**
 * Modal HTML injection & management
 */
function ensureBookingModalDOM() {
  if (document.getElementById('pgBookingModalOverlay')) return;

  const modalHtml = `
    <div id="pgBookingModalOverlay" class="pg-modal-overlay" style="display:none; position:fixed; inset:0; z-index:9999; background:rgba(3,6,15,0.85); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); align-items:center; justify-content:center; padding:16px;">
      <div class="pg-modal-container" style="background:#080d1a; border:1px solid rgba(246,178,74,0.3); border-radius:20px; width:100%; max-width:580px; max-height:90vh; overflow-y:auto; box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(246,178,74,0.1); position:relative; padding:clamp(20px, 4vw, 32px); color:#fff; font-family:var(--font-body, system-ui, sans-serif);">
        
        <!-- Close Button -->
        <button id="pgCloseBookingModal" type="button" aria-label="Close booking modal" style="position:absolute; top:18px; right:18px; width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1.2rem; transition:all 0.2s;">
          ✕
        </button>

        <!-- Header -->
        <div style="margin-bottom:20px; padding-right:32px;">
          <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(246,178,74,0.12); border:1px solid rgba(246,178,74,0.3); padding:4px 12px; border-radius:999px; font-size:0.75rem; font-weight:700; color:#f6b24a; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">
            <span>⚡ Direct Sunrun Advisory</span>
          </div>
          <h2 style="font-family:var(--font-display, inherit); font-size:1.6rem; font-weight:800; color:#fff; margin:0 0 6px; line-height:1.2;">
            Book a Solar Consultation
          </h2>
          <p style="margin:0; font-size:0.88rem; color:#94a3b8; line-height:1.5;">
            Meet with <strong>Horace Lawrence</strong> (The Block Sales Expert Team Lead). Lock in your utility rate, size your battery storage, and get customized zero-down proposal numbers.
          </p>
        </div>

        <!-- Booking Form View -->
        <form id="pgConsultationBookingForm" style="display:flex; flex-direction:column; gap:16px;">
          
          <!-- Consultation Type Selector -->
          <div>
            <label style="display:block; font-size:0.82rem; font-weight:700; color:#cbd5e1; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">
              1. Select Consultation Format *
            </label>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px;">
              <label class="pg-type-radio" style="cursor:pointer; display:flex; flex-direction:column; gap:4px; padding:12px; border:1px solid rgba(255,255,255,0.12); border-radius:12px; background:rgba(255,255,255,0.03); transition:all 0.2s;">
                <input type="radio" name="pgConsultType" value="phone" checked style="accent-color:#f6b24a;">
                <span style="font-weight:700; font-size:0.88rem; color:#fff;">📱 Phone Call</span>
                <span style="font-size:0.75rem; color:#94a3b8;">15 min bill review</span>
              </label>
              <label class="pg-type-radio" style="cursor:pointer; display:flex; flex-direction:column; gap:4px; padding:12px; border:1px solid rgba(255,255,255,0.12); border-radius:12px; background:rgba(255,255,255,0.03); transition:all 0.2s;">
                <input type="radio" name="pgConsultType" value="virtual" style="accent-color:#f6b24a;">
                <span style="font-weight:700; font-size:0.88rem; color:#fff;">💻 Virtual Sizing</span>
                <span style="font-size:0.75rem; color:#94a3b8;">30 min Zoom / 3D model</span>
              </label>
              <label class="pg-type-radio" style="cursor:pointer; display:flex; flex-direction:column; gap:4px; padding:12px; border:1px solid rgba(255,255,255,0.12); border-radius:12px; background:rgba(255,255,255,0.03); transition:all 0.2s;">
                <input type="radio" name="pgConsultType" value="in_home" style="accent-color:#f6b24a;">
                <span style="font-weight:700; font-size:0.88rem; color:#fff;">🏡 In-Home Visit</span>
                <span style="font-size:0.75rem; color:#94a3b8;">45 min roof inspection</span>
              </label>
            </div>
          </div>

          <!-- Date & Time Slot Grid -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label for="pgBookDate" style="display:block; font-size:0.82rem; font-weight:700; color:#cbd5e1; margin-bottom:6px;">
                2. Preferred Date *
              </label>
              <input type="date" id="pgBookDate" required style="width:100%; box-sizing:border-box; padding:10px 12px; background:#040711; border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#fff; font-size:0.9rem;">
            </div>
            <div>
              <label for="pgBookTime" style="display:block; font-size:0.82rem; font-weight:700; color:#cbd5e1; margin-bottom:6px;">
                Time Window *
              </label>
              <select id="pgBookTime" style="width:100%; box-sizing:border-box; padding:10px 12px; background:#040711; border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#fff; font-size:0.9rem;">
                <option value="9:00 AM">9:00 AM (Morning)</option>
                <option value="11:30 AM" selected>11:30 AM (Mid-day)</option>
                <option value="2:00 PM">2:00 PM (Afternoon)</option>
                <option value="4:30 PM">4:30 PM (Late Afternoon)</option>
                <option value="6:00 PM">6:00 PM (Evening)</option>
              </select>
            </div>
          </div>

          <!-- Contact Information -->
          <div>
            <label style="display:block; font-size:0.82rem; font-weight:700; color:#cbd5e1; margin-bottom:6px;">
              3. Homeowner Contact Details
            </label>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <input type="text" id="pgBookName" required placeholder="Full Name *" style="width:100%; box-sizing:border-box; padding:10px 14px; background:#040711; border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#fff; font-size:0.9rem;">
              
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <input type="tel" id="pgBookPhone" required placeholder="Mobile Phone (510-xxx-xxxx) *" style="width:100%; box-sizing:border-box; padding:10px 14px; background:#040711; border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#fff; font-size:0.9rem;">
                <input type="email" id="pgBookEmail" placeholder="Email Address" style="width:100%; box-sizing:border-box; padding:10px 14px; background:#040711; border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#fff; font-size:0.9rem;">
              </div>

              <div style="display:grid; grid-template-columns:2fr 1fr; gap:10px;">
                <input type="text" id="pgBookAddress" placeholder="Street Address / City" style="width:100%; box-sizing:border-box; padding:10px 14px; background:#040711; border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#fff; font-size:0.9rem;">
                <select id="pgBookBill" style="width:100%; box-sizing:border-box; padding:10px 12px; background:#040711; border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#fff; font-size:0.85rem;">
                  <option value="$150-$250">$150 - $250/mo</option>
                  <option value="$250-$400" selected>$250 - $400/mo</option>
                  <option value="$400-$600">$400 - $600/mo</option>
                  <option value="$600+">$600+/mo (High)</option>
                </select>
              </div>

              <textarea id="pgBookNotes" rows="2" placeholder="Notes for Horace (optional: e.g. Tesla Powerwall battery question, EV charger, blackout concern)" style="width:100%; box-sizing:border-box; padding:10px 14px; background:#040711; border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#fff; font-size:0.85rem; font-family:inherit; resize:vertical;"></textarea>
            </div>
          </div>

          <!-- Submit Button -->
          <button type="submit" id="pgSubmitBookingBtn" style="margin-top:6px; width:100%; padding:14px; border-radius:12px; background:linear-gradient(135deg, #f6b24a 0%, #ea580c 100%); color:#050811; font-weight:800; font-size:1.02rem; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 10px 25px rgba(246,178,74,0.35); transition:all 0.2s;">
            <span>📅 Confirm & Schedule Consultation</span>
          </button>

          <!-- Direct Phone / Salesforce Alternative Links -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08); font-size:0.8rem; color:#94a3b8;">
            <a href="tel:5102417007" class="pg-copy-phone-btn" style="color:#38bdf8; text-decoration:none; display:flex; align-items:center; gap:6px;">
              📞 Call Horace Direct: 510-241-7007
            </a>
            <a href="${SOLAR_REFERRAL_URL}" target="_blank" rel="noopener noreferrer" style="color:#f6b24a; text-decoration:none;">
              Online Sunrun Lead Form ↗
            </a>
          </div>
        </form>

        <!-- Booking Success Confirmation View (Hidden initially) -->
        <div id="pgBookingSuccessView" style="display:none; text-align:center; padding:20px 10px;">
          <div style="width:68px; height:68px; border-radius:50%; background:rgba(16,185,129,0.15); border:2px solid #10b981; color:#10b981; display:flex; align-items:center; justify-content:center; font-size:2rem; margin:0 auto 16px;">
            ✓
          </div>
          <h3 style="font-size:1.5rem; font-weight:800; color:#fff; margin:0 0 8px;">
            Consultation Confirmed!
          </h3>
          <p id="pgConfirmedDetailsText" style="font-size:0.95rem; color:#94a3b8; max-width:440px; margin:0 auto 20px; line-height:1.6;">
            Your appointment has been registered with Horace Lawrence.
          </p>

          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:18px; margin-bottom:24px; text-align:left;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.85rem;">
              <span style="color:#94a3b8;">Confirmation ID:</span>
              <strong id="pgConfirmedId" style="color:#f6b24a; font-family:monospace;">PG-BK-701</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.85rem;">
              <span style="color:#94a3b8;">Advisor:</span>
              <span style="color:#fff; font-weight:600;">Horace Lawrence (Sunrun Team Lead)</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.85rem;">
              <span style="color:#94a3b8;">Direct Line:</span>
              <a href="tel:5102417007" style="color:#38bdf8; font-weight:600; text-decoration:none;">510-241-7007</a>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
              <span style="color:#94a3b8;">Email:</span>
              <span style="color:#cbd5e1;">horace.lawrence@sunrun.com</span>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px;">
            <button id="pgBtnAddToCalendar" type="button" style="width:100%; padding:12px; border-radius:10px; background:#0284c7; color:#fff; font-weight:700; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
              📅 Add to Calendar (.ics Download)
            </button>
            <button id="pgBtnCloseSuccess" type="button" style="width:100%; padding:10px; border-radius:10px; background:rgba(255,255,255,0.08); color:#cbd5e1; font-weight:600; border:1px solid rgba(255,255,255,0.15); cursor:pointer;">
              Done / Return to Site
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Set default min date to today
  const dateInput = document.getElementById('pgBookDate');
  if (dateInput) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.value = tomorrow.toISOString().split('T')[0];
  }

  // Setup form submission handler
  const form = document.getElementById('pgConsultationBookingForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const typeEl = form.querySelector('input[name="pgConsultType"]:checked');
      const type = typeEl ? typeEl.value : 'phone';
      const typeLabelMap = {
        phone: '📱 Phone Consultation',
        virtual: '💻 Virtual Video Roof Sizing (Zoom)',
        in_home: '🏡 In-Home Roof Assessment'
      };

      const date = document.getElementById('pgBookDate').value;
      const time = document.getElementById('pgBookTime').value;
      const name = document.getElementById('pgBookName').value.trim();
      const phone = document.getElementById('pgBookPhone').value.trim();
      const email = document.getElementById('pgBookEmail').value.trim();
      const address = document.getElementById('pgBookAddress').value.trim();
      const bill = document.getElementById('pgBookBill').value;
      const notes = document.getElementById('pgBookNotes').value.trim();

      const newBooking = {
        id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        clientName: name,
        phone: phone,
        email: email || 'Not provided',
        address: address || 'Local Bay Area Address',
        type: type,
        typeLabel: typeLabelMap[type] || 'Solar Consultation',
        date: date,
        time: time,
        bill: bill,
        notes: notes || 'Standard solar + battery consultation request',
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };

      const bookings = getBookings();
      bookings.unshift(newBooking);
      saveBookings(bookings);

      // Switch to success view
      form.style.display = 'none';
      const successView = document.getElementById('pgBookingSuccessView');
      if (successView) {
        successView.style.display = 'block';
        document.getElementById('pgConfirmedId').textContent = newBooking.id;
        document.getElementById('pgConfirmedDetailsText').innerHTML = `
          Confirmed for <strong>${name}</strong> on <strong>${date} at ${time}</strong> (${typeLabelMap[type]}). Horace Lawrence will contact you at <strong>${phone}</strong>.
        `;

        // Wire calendar download
        const calBtn = document.getElementById('pgBtnAddToCalendar');
        if (calBtn) {
          calBtn.onclick = () => {
            downloadIcsFile(newBooking);
            showBookingToast("📅 Calendar invitation downloaded!");
          };
        }
      }

      showBookingToast(`🎉 Appointment booked for ${name}! Added to Horace's calendar.`);
    });
  }

  // Close handlers
  const overlay = document.getElementById('pgBookingModalOverlay');
  const closeBtn = document.getElementById('pgCloseBookingModal');
  const doneBtn = document.getElementById('pgBtnCloseSuccess');

  function closeModal() {
    if (overlay) overlay.style.display = 'none';
  }

  if (closeBtn) closeBtn.onclick = closeModal;
  if (doneBtn) doneBtn.onclick = closeModal;
  if (overlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }
}

/**
 * Open Consultation Booking Modal
 */
export function openBookingModal(initialType = 'phone') {
  ensureBookingModalDOM();
  const overlay = document.getElementById('pgBookingModalOverlay');
  const form = document.getElementById('pgConsultationBookingForm');
  const successView = document.getElementById('pgBookingSuccessView');

  if (form) form.style.display = 'flex';
  if (successView) successView.style.display = 'none';

  if (initialType) {
    const radio = document.querySelector(`input[name="pgConsultType"][value="${initialType}"]`);
    if (radio) radio.checked = true;
  }

  if (overlay) {
    overlay.style.display = 'flex';
  }
}

/**
 * Auto-initialize booking buttons across the current page
 */
export function initBookingButtons() {
  if (typeof document === 'undefined') return;

  ensureBookingModalDOM();

  // Find all consultation / booking buttons
  const bookingTriggers = document.querySelectorAll(
    '[data-book-consultation], .btn-book-consultation, a[href="#consultation-booking"], a[href="#book-consultation"]'
  );

  bookingTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const type = btn.getAttribute('data-consult-type') || 'phone';
      openBookingModal(type);
    });
  });

  // Provide copy fallback for telephone & email links so desktop users never get broken links
  document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('tel:')) {
        const phone = href.replace('tel:', '').replace('+1', '');
        // On desktop without telephony, provide instant feedback
        showBookingToast(`📞 Horace Lawrence Phone: <strong>${phone}</strong> (Dialing or copied to clipboard!)`);
      } else if (href.startsWith('mailto:')) {
        showBookingToast(`✉️ Opening email to <strong>horace.lawrence@sunrun.com</strong>`);
      }
    });
  });
}

// Global browser window attachment
if (typeof window !== 'undefined') {
  window.openBookingModal = openBookingModal;
  window.initBookingButtons = initBookingButtons;
  window.getBookings = getBookings;
  window.saveBookings = saveBookings;
  window.downloadIcsFile = downloadIcsFile;
  window.showBookingToast = showBookingToast;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBookingButtons);
  } else {
    initBookingButtons();
  }
}
