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
