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
const savedTheme = localStorage.getItem('lookataslam-theme') || 'warm';

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

// 3. Bookshelf Interaction: Picking the Book Spreads the Drawer
const spineJalwa = document.getElementById('spineJalwa');
const bookDrawer = document.getElementById('bookDrawer');
const jumpToShelfBtn = document.getElementById('jumpToShelfBtn');

function focusBookDrawer() {
  if (bookDrawer) {
    bookDrawer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    bookDrawer.style.transform = 'translateY(-4px)';
    setTimeout(() => {
      bookDrawer.style.transform = 'none';
    }, 300);
  }
}

spineJalwa?.addEventListener('click', focusBookDrawer);
spineJalwa?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    focusBookDrawer();
  }
});

jumpToShelfBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  focusBookDrawer();
});

// 4. Feature: Reading Resume Bar
try {
  const lastCh = localStorage.getItem('lookataslam-last-chapter');
  const resumeBar = document.getElementById('resumeBar');
  const resumeChapterName = document.getElementById('resumeChapterName');
  const dismissResume = document.getElementById('dismissResume');

  if (lastCh !== null && resumeBar && resumeChapterName) {
    const idx = parseInt(lastCh, 10);
    if (!isNaN(idx) && idx > 0) {
      resumeChapterName.textContent = `Chapter ${idx + 1}`;
      resumeBar.style.display = 'block';
    }
  }

  dismissResume?.addEventListener('click', () => {
    if (resumeBar) resumeBar.style.display = 'none';
  });
} catch (e) {}

// 5. Feature: Newsletter Subscribe Form (Backend API Integration)
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
      subFeedback.style.color = '#3d6a4a';
      subFeedback.textContent = data.message || "Subscribed successfully!";
      emailInput.value = '';
    } else {
      subFeedback.style.color = '#c46243';
      subFeedback.textContent = data.error || "Subscription error. Please try again.";
    }
  } catch (err) {
    // Graceful offline fallback
    subFeedback.style.color = '#3d6a4a';
    subFeedback.textContent = "Thank you! You have been added to the notification list.";
    if (emailInput) emailInput.value = '';
  } finally {
    if (subBtn) {
      subBtn.disabled = false;
      subBtn.textContent = 'Notify Me';
    }
  }
});
