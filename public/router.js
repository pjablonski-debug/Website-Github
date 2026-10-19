/* ==========================================================================
   Opticent | Mode router
   Keeps the Health / Metrology mode in the URL path:
     /health, /health/products, /health/technology ...
     /metrology, /metrology/products, /metrology/technology ...
   Load this synchronously in <head> on every page, before anything that
   reads the mode.
========================================================================== */
(function () {
  var SLUG = { health: 'health', metro: 'metrology' };   // mode -> URL segment
  var MODE = { health: 'health', metrology: 'metro' };   // URL segment -> mode
  var PAGES = ['index', 'technology', 'products', 'research', 'contact'];

  // Internal page links, with or without a mode prefix / .html suffix
  var LINK_RE = /^(?:\/(?:health|metrology))?\/?(index|technology|products|research|contact)?(?:\.html)?(#.*)?$/;

  function parsePath(path) {
    var parts = path.split('/').filter(Boolean);
    var mode = null;
    if (parts.length && MODE[parts[0]]) mode = MODE[parts.shift()];
    var page = (parts[0] || 'index').replace(/\.html$/, '');
    return { mode: mode, page: page };
  }

  function buildUrl(mode, page) {
    var base = '/' + SLUG[mode];
    return (!page || page === 'index') ? base : base + '/' + page;
  }

  function readStored() {
    try { return localStorage.getItem('opticent_mode'); } catch (e) { return null; }
  }
  function store(m) {
    try { localStorage.setItem('opticent_mode', m); } catch (e) {}
  }

  // Tab title follows the mode (internal values are 'health' / 'metro')
  function setTitle() {
    document.title = mode === 'metro' ? 'Opticent | Metrology' : 'Opticent | Health';
  }

  // --- Work out the mode for this page load ---
  // Priority: URL prefix > bare domain is always Health > last saved choice > Health
  var here = parsePath(location.pathname);
  var isRoot = /^\/(index(\.html)?)?$/.test(location.pathname);
  var mode = here.mode || (isRoot ? 'health' : (readStored() === 'metro' ? 'metro' : 'health'));
  var page = here.page;
  var known = PAGES.indexOf(page) !== -1;
  store(mode);
  setTitle();

  // Old/unprefixed URLs (/, /products, /products.html) get the mode added
  if (known) {
    var canonical = buildUrl(mode, page);
    if (location.pathname !== canonical) {
      history.replaceState({ mode: mode }, '', canonical + location.search + location.hash);
    }
  }

  // Point every internal link at the current mode's version of that page
  function rewriteLinks() {
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.dataset.page === undefined) {
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#') continue;   // same-page anchors stay as-is
        var match = href.match(LINK_RE);
        if (!match) continue;                            // external, mailto:, javascript:
        a.dataset.page = match[1] || 'index';
        a.dataset.hash = match[2] || '';
      }
      a.setAttribute('href', buildUrl(mode, a.dataset.page) + a.dataset.hash);
    }
  }

  // Called by each page's go() when the switcher is clicked
  function setMode(m) {
    if (!SLUG[m]) return;
    mode = m;
    store(m);
    if (known) {
      var target = buildUrl(mode, page);
      if (location.pathname !== target) {
        history.pushState({ mode: m }, '', target + location.search + location.hash);
      }
    }
    rewriteLinks();
    setTitle();
  }

  // Back/forward between /health/x and /metrology/x flips the mode
  window.addEventListener('popstate', function () {
    var p = parsePath(location.pathname);
    if (p.mode && p.mode !== mode && typeof window.go === 'function') window.go(p.mode);
  });

  // Re-apply after parsing, in case a <title> tag after this script overwrote it
  document.addEventListener('DOMContentLoaded', function () {
    rewriteLinks();
    setTitle();
  });

  window.OpticentRouter = {
    get mode() { return mode; },
    page: page,
    url: function (p, m) { return buildUrl(m || mode, p); },
    setMode: setMode,
    rewriteLinks: rewriteLinks
  };
})();