// lookataslam · script.js

// 1. Mobile Menu Toggle
const mobileToggle = document.getElementById('mobileToggle');
const navMenu = document.getElementById('navMenu');

mobileToggle?.addEventListener('click', () => {
  navMenu?.classList.toggle('open');
});

navMenu?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMenu?.classList.remove('open');
  });
});

// 2. Theme Switcher (Warm, Night, Sage)
const themeButtons = document.querySelectorAll('[data-theme-btn]');
let savedTheme = localStorage.getItem('lookataslam-theme') || 'warm';
if (savedTheme === 'sage') savedTheme = 'dusk';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('lookataslam-theme', theme);
  themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme-btn') === theme);
  });
}

applyTheme(savedTheme);

themeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-theme-btn');
    if (target) applyTheme(target);
  });
});

// 3. Editorial Library Novel Selection (JALWA vs SABU)
const bookTabs = document.querySelectorAll('.book-tab');
const spreadJalwa = document.getElementById('spreadJalwa');
const spreadSabu = document.getElementById('spreadSabu');

bookTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const novel = tab.dataset.novel;
    bookTabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    if (spreadJalwa) spreadJalwa.style.display = novel === 'jalwa' ? 'grid' : 'none';
    if (spreadSabu) spreadSabu.style.display = novel === 'sabu' ? 'grid' : 'none';
  });
});

// Volume switcher inside JALWA Editorial Spread
window.switchJalwaVol = function(vol) {
  const btn1 = document.getElementById('volBtn1');
  const btn2 = document.getElementById('volBtn2');
  const view1 = document.getElementById('jalwaVol1View');
  const view2 = document.getElementById('jalwaVol2View');
  const coverImg = document.getElementById('jalwaSpreadCover');

  if (vol === 'vol1') {
    btn1?.classList.add('active');
    btn1?.setAttribute('aria-selected', 'true');
    btn2?.classList.remove('active');
    btn2?.setAttribute('aria-selected', 'false');
    if (view1) view1.style.display = 'block';
    if (view2) view2.style.display = 'none';
    if (coverImg) coverImg.src = 'assets/cover_revised.png';
  } else {
    btn2?.classList.add('active');
    btn2?.setAttribute('aria-selected', 'true');
    btn1?.classList.remove('active');
    btn1?.setAttribute('aria-selected', 'false');
    if (view2) view2.style.display = 'block';
    if (view1) view1.style.display = 'none';
    if (coverImg) coverImg.src = 'assets/volume_2_cover.jpg';
  }
};

// 4. Feature: Reading Resume Bar
try {
  const lastCh = localStorage.getItem('lookataslam-last-chapter');
  const resumeBar = document.getElementById('resumeBar');
  const resumeChapterName = document.getElementById('resumeChapterName');
  const dismissResume = document.getElementById('dismissResume');

  if (lastCh !== null) {
    const idx = parseInt(lastCh, 10);
    if (!isNaN(idx) && idx > 0) {
      if (resumeChapterName && resumeBar) {
        resumeChapterName.textContent = `Chapter ${idx + 1}`;
        resumeBar.style.display = 'block';
      }
    }
  }

  dismissResume?.addEventListener('click', () => {
    if (resumeBar) resumeBar.style.display = 'none';
  });
} catch (e) {}

// 5. Feature: Newsletter Subscribe Form
const subscribeForm = document.getElementById('subscribeForm');
const subFeedback = document.getElementById('subFeedback');
const subBtn = document.getElementById('subBtn');

subscribeForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const emailInput = document.getElementById('subEmail');
  const hpField = document.getElementById('hpField');
  const email = emailInput?.value?.trim();
  const trap = hpField?.value || "";

  if (!email) return;

  if (subBtn) {
    subBtn.disabled = true;
    subBtn.textContent = 'Subscribing...';
  }

  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, trap })
    });

    const data = await res.json();
    if (data.success) {
      subFeedback.style.color = 'var(--accent)';
      subFeedback.style.color = "#38a169";
      subFeedback.innerHTML = data.message || "You are on the release alert list for Volume 2 (Dec 10).";
      emailInput.value = '';
    } else {
      subFeedback.style.color = 'var(--accent-hover)';
      subFeedback.textContent = data.error || "Subscription error. Please try again.";
    }
  } catch (err) {
    subFeedback.style.color = 'var(--accent)';
    subFeedback.style.color = "#38a169";
    subFeedback.innerHTML = "You are on the release alert list for Volume 2 (Dec 10).";
    if (emailInput) emailInput.value = '';
  } finally {
    if (subBtn) {
      subBtn.disabled = false;
      subBtn.textContent = 'Notify Me';
    }
  }
});

// 6. Cookie Consent Management
const cookieConsentBar = document.getElementById('cookieConsentBar');
const cookieAcceptBtn = document.getElementById('cookieAcceptBtn');
const cookieDeclineBtn = document.getElementById('cookieDeclineBtn');

if (!localStorage.getItem('lookataslam-cookie-consent')) {
  if (cookieConsentBar) cookieConsentBar.style.display = 'flex';
}

cookieAcceptBtn?.addEventListener('click', () => {
  localStorage.setItem('lookataslam-cookie-consent', 'accepted');
  if (cookieConsentBar) cookieConsentBar.style.display = 'none';
});

cookieDeclineBtn?.addEventListener('click', () => {
  localStorage.setItem('lookataslam-cookie-consent', 'essential');
  if (cookieConsentBar) cookieConsentBar.style.display = 'none';
});

// Restore Purchase / Switch Device Handler
const restoreForm = document.getElementById('restoreFormIndex');
const restoreInput = document.getElementById('restoreInputIndex');
const restoreBtn = document.getElementById('restoreBtnIndex');
const restoreMsg = document.getElementById('restoreMsgIndex');

restoreForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pid = restoreInput?.value.trim();
  if (!pid) return;

  restoreBtn.disabled = true;
  restoreBtn.textContent = 'Verifying...';
  restoreMsg.style.display = 'none';

  try {
    const res = await fetch('/api/restore-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: pid, novel: "jalwa_v2" })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      localStorage.setItem('lookataslam_unlocked_jalwa_v2', 'true');
      localStorage.setItem('lookataslam_payment_id', data.paymentId);
      localStorage.setItem('lookataslam_payment_id_jalwa_v2', data.paymentId);
      if (data.sessionId) localStorage.setItem('lookataslam_session', data.sessionId);

      restoreMsg.style.display = 'block';
      restoreMsg.style.color = '#38a169';
      restoreMsg.textContent = 'Access verified! Opening Volume 2...';
      setTimeout(() => {
        window.location.href = 'reader.html?novel=jalwa_v2&ch=0';
      }, 900);
    } else {
      restoreMsg.style.display = 'block';
      restoreMsg.style.color = '#e53e3e';
      restoreMsg.textContent = data.error || 'Payment ID could not be verified.';
      restoreBtn.disabled = false;
      restoreBtn.textContent = 'Restore Access';
    }
  } catch (err) {
    restoreMsg.style.display = 'block';
    restoreMsg.style.color = '#e53e3e';
    restoreMsg.textContent = 'Connection error. Please try again.';
    restoreBtn.disabled = false;
    restoreBtn.textContent = 'Restore Access';
  }
});


// Geo-Detected Regional Pricing (1.5% International Buffer)
(async function initGeoPricing() {
  const note = document.getElementById('vol2PricingNote');
  if (!note) return;
  try {
    const res = await fetch('/api/geo-pricing');
    if (!res.ok) return;
    const data = await res.json();
    if (data.geo && data.geo.currency !== 'INR') {
      const g = data.geo;
      note.innerHTML = `Standard: ₹99 (~${g.symbol}${g.standard.toFixed(2)}) &middot; Supporter: ₹149 (~${g.symbol}${g.supporter.toFixed(2)}) &middot; Upgrade: ₹50`;
    }
  } catch (e) {
    // Graceful fallback to default INR display
  }
})();
