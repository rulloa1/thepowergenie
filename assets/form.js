// --- Lead Form Logic & Validation ---
(() => {
  const form = document.getElementById('lead');
  const friendFirst = document.getElementById('friend-first');
  const meExtras = document.getElementById('me-extras');
  const alsoRef = document.getElementById('also-ref');
  const extra = document.getElementById('extra-friend');
  const consentMe = document.getElementById('consent-me');
  const consentRef = document.getElementById('consent-ref');
  const submit = document.getElementById('submit');
  document.getElementById('yr').textContent = new Date().getFullYear();

  const isRef = () => form.mode.value === 'ref';

  function syncMode() {
    const ref = isRef();
    friendFirst.hidden = !ref;
    meExtras.hidden = ref;
    consentMe.hidden = ref;
    consentRef.hidden = !ref;
    submit.textContent = ref ? 'Send my referral' : 'Get my free solar plan';
    form.querySelectorAll('[data-invalid]').forEach(f => f.removeAttribute('data-invalid'));
  }
  form.addEventListener('change', e => { if (e.target.name === 'mode') syncMode(); });
  alsoRef.addEventListener('change', () => extra.classList.toggle('open', alsoRef.checked));

  form.querySelectorAll('input[type=tel]').forEach(el => el.addEventListener('input', () => {
    const d = el.value.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10);
    el.value = d.length > 6 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0,3)}) ${d.slice(3)}` : d;
  }));
  form.zip.addEventListener('input', () => { form.zip.value = form.zip.value.replace(/\D/g, '').slice(0, 5); });

  function isActive(el) {
    if (el.closest('[hidden]')) return false;
    if (el.hasAttribute('data-cond')) return alsoRef.checked;
    return el.required;
  }
  function valid(el) {
    const v = el.value.trim();
    if (!v) return false;
    if (el.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    if (el.type === 'tel') return v.replace(/\D/g, '').length === 10;
    if (el.name === 'zip') return /^\d{5}$/.test(v);
    return true;
  }
  function check(el) {
    const ok = !isActive(el) || valid(el);
    const field = el.closest('.field');
    const err = field.querySelector('.err');
    if (!err.id) err.id = el.id + '-err';
    field.toggleAttribute('data-invalid', !ok);
    el.setAttribute('aria-invalid', String(!ok));
    ok ? el.removeAttribute('aria-describedby') : el.setAttribute('aria-describedby', err.id);
    return ok;
  }
  form.querySelectorAll('.field input').forEach(el => {
    el.addEventListener('blur', () => { if (el.value) check(el); });
    el.addEventListener('input', () => { if (el.closest('[data-invalid]')) check(el); });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = [...form.querySelectorAll('.field input')].filter(el => !check(el));
    if (bad.length) { bad[0].focus(); return; }
    submit.disabled = true;
    submit.textContent = 'Sending…';
    setTimeout(() => {
      document.getElementById('form-view').hidden = true;
      const s = document.getElementById('success');
      if (isRef()) {
        document.getElementById('success-title').textContent = 'Thanks for the referral';
        document.getElementById('success-msg').textContent = `Horace will reach out to ${form.f_first.value.trim()} soon. Thanks for sharing solar with someone you know.`;
      }
      s.hidden = false;
      s.focus();
    }, 700);
  });
})();
