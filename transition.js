// transition.js — Cinematic Cloud & Page-Turn Transition for lookataslam
// Ultra-smooth, zero-bloat, anime/storybook style navigation for all pages

(function () {
  'use strict';

  var overlay = null;
  var isNavigating = false;

  function buildOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'nt-overlay';
    overlay.id = 'ntOverlay';
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML =
      '<div class="nt-page-leaf"><div class="nt-page-curl"></div></div>' +
      '<div class="nt-clouds-wrap">' +
        '<div class="nt-cloud-top">' +
          '<svg class="nt-cloud-svg-top" viewBox="0 0 1440 320" preserveAspectRatio="none">' +
            '<path d="M0,0 L1440,0 L1440,110 C1360,190 1240,140 1120,200 C980,260 860,160 720,220 C580,270 460,180 320,230 C180,270 80,190 0,170 Z" />' +
          '</svg>' +
        '</div>' +
        '<div class="nt-cloud-layer nt-cloud-deep">' +
          '<svg class="nt-cloud-svg" viewBox="0 0 1440 400" preserveAspectRatio="none">' +
            '<path d="M0,260 C140,210 240,290 380,230 C520,170 640,260 780,210 C920,160 1040,250 1200,200 C1340,150 1410,210 1440,190 L1440,400 L0,400 Z" />' +
          '</svg>' +
        '</div>' +
        '<div class="nt-cloud-layer nt-cloud-mid">' +
          '<svg class="nt-cloud-svg" viewBox="0 0 1440 500" preserveAspectRatio="none">' +
            '<path d="M0,200 C90,130 190,170 280,120 C380,60 500,150 630,100 C770,40 890,140 1030,80 C1170,30 1280,120 1370,70 C1410,50 1430,80 1440,100 L1440,500 L0,500 Z" />' +
          '</svg>' +
        '</div>' +
        '<div class="nt-cloud-layer nt-cloud-fore">' +
          '<svg class="nt-cloud-svg" viewBox="0 0 1440 600" preserveAspectRatio="none">' +
            '<path d="M0,240 C80,160 170,190 260,140 C360,70 480,160 610,100 C730,40 850,130 990,80 C1130,30 1240,120 1350,70 C1410,50 1430,90 1440,110 L1440,600 L0,600 Z" />' +
          '</svg>' +
        '</div>' +
      '</div>' +
      '<div class="nt-badge">' +
        '<div class="nt-book-icon">' +
          '<svg viewBox="0 0 48 36" width="48" height="36" fill="none">' +
            '<path class="nt-book-spine" d="M24,8 L24,32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
            '<path class="nt-book-page-l" d="M24,8 C18,5 8,6 2,9 L2,31 C8,28 18,27 24,30 Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8"/>' +
            '<path class="nt-book-page-r" d="M24,8 C30,5 40,6 46,9 L46,31 C40,28 30,27 24,30 Z" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8"/>' +
            '<path class="nt-book-leaf" d="M24,8 C27,4 36,4 43,7 L43,29 C36,26 27,26 24,29 Z" fill="currentColor" fill-opacity="0.32" stroke="currentColor" stroke-width="1.5"/>' +
          '</svg>' +
          '<span class="nt-sparkle nt-sp-1">&#10022;</span>' +
          '<span class="nt-sparkle nt-sp-2">&#10023;</span>' +
          '<span class="nt-sparkle nt-sp-3">&#8902;</span>' +
        '</div>' +
        '<div class="nt-author">lookataslam</div>' +
        '<div class="nt-cue">Turning the page...</div>' +
      '</div>';

    document.body.appendChild(overlay);
    return overlay;
  }

  function initEntrance() {
    if (sessionStorage.getItem('nt_transit') === '1') {
      sessionStorage.removeItem('nt_transit');
      var el = buildOverlay();
      el.className = 'nt-overlay nt-active is-entering';

      // Let DOM paint initial covered state, then animate out smoothly
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.className = 'nt-overlay nt-active is-clearing';
          setTimeout(function () {
            el.className = 'nt-overlay';
            isNavigating = false;
          }, 460);
        });
      });
    }
  }

  function handleLinkClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    var link = e.target.closest('a');
    if (!link) return;

    var href = link.getAttribute('href');
    if (!href) return;

    // Skip hash anchors, mailto, tel, javascript, or external links
    if (href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 || href.indexOf('javascript:') === 0) {
      return;
    }

    if (link.target === '_blank' || link.hasAttribute('download')) {
      return;
    }

    // Check host for full URLs
    if (href.indexOf('://') !== -1) {
      try {
        var parsed = new URL(href, window.location.href);
        if (parsed.origin !== window.location.origin) return;
      } catch (err) {
        return;
      }
    }

    // Check if target is just the same page with a different hash
    try {
      var targetUrl = new URL(href, window.location.href);
      if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search && targetUrl.hash) {
        return;
      }
    } catch (err) {
      // ignore
    }

    e.preventDefault();
    if (isNavigating) return;
    isNavigating = true;

    var el = buildOverlay();
    el.className = 'nt-overlay nt-active is-leaving';
    sessionStorage.setItem('nt_transit', '1');

    setTimeout(function () {
      window.location.href = href;
    }, 450);

    // Watchdog fallback in case navigation is interrupted
    setTimeout(function () {
      if (el) el.className = 'nt-overlay';
      isNavigating = false;
    }, 1800);
  }

  // Handle back-forward cache restore
  window.addEventListener('pageshow', function (evt) {
    if (evt.persisted && overlay) {
      overlay.className = 'nt-overlay';
      isNavigating = false;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      buildOverlay();
      initEntrance();
      document.addEventListener('click', handleLinkClick, false);
    });
  } else {
    buildOverlay();
    initEntrance();
    document.addEventListener('click', handleLinkClick, false);
  }
})();
