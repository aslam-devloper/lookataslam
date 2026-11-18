// transition.js — Glitch-free, butter-smooth page transition
(function () {
  'use strict';

  var overlay = null;
  var isTransitioning = false;

  function createOverlayHtml() {
    return (
      '<div class="nt-page-leaf"><div class="nt-page-curl"></div></div>' +
      '<div class="nt-clouds-wrap">' +
        '<div class="nt-cloud-top">' +
          '<svg viewBox="0 0 1440 280" preserveAspectRatio="none">' +
            '<path d="M0,0 L1440,0 L1440,110 C1360,180 1240,130 1120,190 C980,240 860,150 720,200 C580,250 460,170 320,210 C180,250 80,180 0,160 Z" />' +
          '</svg>' +
        '</div>' +
        '<div class="nt-cloud-deep-bot">' +
          '<svg viewBox="0 0 1440 380" preserveAspectRatio="none">' +
            '<path d="M0,240 C140,190 240,270 380,210 C520,150 640,240 780,190 C920,140 1040,230 1200,180 C1340,130 1410,190 1440,170 L1440,380 L0,380 Z" />' +
          '</svg>' +
        '</div>' +
        '<div class="nt-cloud-bot">' +
          '<svg viewBox="0 0 1440 450" preserveAspectRatio="none">' +
            '<path d="M0,200 C80,130 170,160 260,120 C360,60 480,140 610,90 C730,40 850,120 990,70 C1130,30 1240,110 1350,60 C1410,40 1430,80 1440,100 L1440,450 L0,450 Z" />' +
          '</svg>' +
        '</div>' +
      '</div>' +
      '<div class="nt-badge">' +
        '<div class="nt-book-icon">' +
          '<svg viewBox="0 0 48 36" width="48" height="36" fill="none">' +
            '<path d="M24,8 L24,32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
            '<path d="M24,8 C18,5 8,6 2,9 L2,31 C8,28 18,27 24,30 Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8"/>' +
            '<path d="M24,8 C30,5 40,6 46,9 L46,31 C40,28 30,27 24,30 Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8"/>' +
            '<path d="M24,8 C27,4 36,4 43,7 L43,29 C36,26 27,26 24,29 Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5"/>' +
          '</svg>' +
          '<span class="nt-sparkle nt-sp-1">&#10022;</span>' +
          '<span class="nt-sparkle nt-sp-2">&#10023;</span>' +
          '<span class="nt-sparkle nt-sp-3">&#8902;</span>' +
        '</div>' +
        '<div class="nt-author">lookataslam</div>' +
        '<div class="nt-cue">Turning the page...</div>' +
      '</div>'
    );
  }

  function getOverlay() {
    if (overlay && overlay.parentNode) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'nt-overlay';
    overlay.id = 'ntOverlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = createOverlayHtml();
    (document.body || document.documentElement).appendChild(overlay);
    return overlay;
  }

  // Check if arriving via transition
  if (sessionStorage.getItem('nt_transit') === '1') {
    sessionStorage.removeItem('nt_transit');
    document.documentElement.classList.add('nt-transit-active');

    function runEntrance() {
      var ov = getOverlay();
      ov.className = 'nt-overlay nt-active is-entering';
      document.documentElement.classList.remove('nt-transit-active');

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          ov.className = 'nt-overlay nt-active is-clearing';
          setTimeout(function () {
            ov.className = 'nt-overlay';
            isTransitioning = false;
          }, 390);
        });
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runEntrance);
    } else {
      runEntrance();
    }
  }

  // Intercept navigation link clicks
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    var a = e.target.closest('a');
    if (!a) return;

    var href = a.getAttribute('href');
    if (!href) return;

    // Filter non-navigable
    if (href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 || href.indexOf('javascript:') === 0) {
      return;
    }
    if (a.target === '_blank' || a.hasAttribute('download')) {
      return;
    }

    // Verify same origin
    try {
      var targetUrl = new URL(href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;
      if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search && targetUrl.hash) {
        return;
      }
    } catch (err) {
      return;
    }

    e.preventDefault();
    if (isTransitioning) return;
    isTransitioning = true;

    var ov = getOverlay();
    ov.className = 'nt-overlay nt-active is-leaving';
    sessionStorage.setItem('nt_transit', '1');

    setTimeout(function () {
      window.location.href = href;
    }, 380);

    // Watchdog
    setTimeout(function () {
      if (ov) ov.className = 'nt-overlay';
      isTransitioning = false;
    }, 1500);
  });

  window.addEventListener('pageshow', function (evt) {
    if (evt.persisted && overlay) {
      overlay.className = 'nt-overlay';
      isTransitioning = false;
    }
  });
})();
