// lookataslam · script.js

// 1. Mobile Menu
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger?.addEventListener('click', () => {
  navLinks?.classList.toggle('open');
});

navLinks?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// 2. Theme Switching
const themeButtons = document.querySelectorAll('[data-theme-btn]');
const currentTheme = localStorage.getItem('lookataslam-theme') || 'blush';
setTheme(currentTheme);

themeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.getAttribute('data-theme-btn');
    if (t) setTheme(t);
  });
});

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('lookataslam-theme', theme);
  themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme-btn') === theme);
  });
}

// 3. Bookshelf Interaction & Modal
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalJalwa = document.getElementById('modalJalwa');
const modalLocked = document.getElementById('modalLocked');
const books = document.querySelectorAll('.book[data-book]');

books.forEach(book => {
  const handler = () => {
    const type = book.getAttribute('data-book');
    if (type === 'jalwa') {
      if (modalJalwa) modalJalwa.style.display = 'flex';
      if (modalLocked) modalLocked.style.display = 'none';
    } else {
      if (modalJalwa) modalJalwa.style.display = 'none';
      if (modalLocked) modalLocked.style.display = 'flex';
    }
    modalOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  book.addEventListener('click', handler);
  book.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  });
});

function closeModal() {
  modalOverlay?.classList.remove('open');
  document.body.style.overflow = '';
}

modalClose?.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay?.classList.contains('open')) {
    closeModal();
  }
});

// 4. Scroll Reveal
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

revealEls.forEach(el => observer.observe(el));

// 5. Cookie Eye Tracking Cursor
const pupilL = document.getElementById('pupilL');
const pupilR = document.getElementById('pupilR');
const cookieWrap = document.getElementById('cookieWrap');

window.addEventListener('mousemove', (e) => {
  if (!cookieWrap || !pupilL || !pupilR) return;
  const rect = cookieWrap.getBoundingClientRect();
  const eyeCenterX = rect.left + rect.width / 2;
  const eyeCenterY = rect.top + 50;

  const dx = e.clientX - eyeCenterX;
  const dy = e.clientY - eyeCenterY;
  const angle = Math.atan2(dy, dx);
  const maxOffset = 2.8;

  const offsetX = Math.cos(angle) * maxOffset;
  const offsetY = Math.sin(angle) * maxOffset;

  pupilL.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);
  pupilR.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);
});

// Cookie jump on click
cookieWrap?.addEventListener('click', () => {
  cookieWrap.classList.remove('jump');
  void cookieWrap.offsetWidth; // trigger reflow
  cookieWrap.classList.add('jump');
});
