/* ============================================================
   YOHJ — logo-zoom.js  (variante ONDE DE CHOC)
   Le logo tombe de l'en-tête vers le centre en accélérant,
   frappe, puis tout s'immobilise. Le script bâtit son HTML.
   ============================================================ */

(function () {
  'use strict';

  var CONFIG = {
    selectors: [
      'img[data-logo-zoom]',
      'header .logo img',
      'header .brand img',
      '.site-header img',
      'header a img',
      'header img'
    ],
    largeSrc: 'assets/logo-boot.webp',
    caption: 'la technologie au service de votre réussite',
    shards: 12          /* éclats radiaux à l'impact */
  };

  function find() {
    for (var i = 0; i < CONFIG.selectors.length; i++) {
      var el = document.querySelector(CONFIG.selectors[i]);
      if (el) return el;
    }
    return null;
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var source = find();
  if (!source) return;

  source.setAttribute('data-logo-zoom-target', '');

  var shards = '';
  for (var i = 0; i < CONFIG.shards; i++) {
    shards += '<span class="lz-shard" style="--a:' +
      Math.round(i * 360 / CONFIG.shards) + 'deg"></span>';
  }

  var overlay = document.createElement('div');
  overlay.className = 'lz-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Logo YOHJ en grand');
  overlay.hidden = true;

  overlay.innerHTML =
    '<div class="lz-scrim"></div>' +
    '<div class="lz-shake">' +
      '<span class="lz-ring lz-ring--1" aria-hidden="true"></span>' +
      '<span class="lz-ring lz-ring--2" aria-hidden="true"></span>' +
      '<span class="lz-shards" aria-hidden="true">' + shards + '</span>' +
      '<figure class="lz-frame">' +
        '<div class="lz-punch"><img class="lz-img" alt="Logo YOHJ"></div>' +
        '<p class="lz-caption"></p>' +
      '</figure>' +
    '</div>' +
    '<div class="lz-flash" aria-hidden="true"></div>' +
    '<button class="lz-close" type="button" aria-label="Fermer">esc<span>fermer</span></button>';

  document.body.appendChild(overlay);

  var frame = overlay.querySelector('.lz-frame');
  var image = overlay.querySelector('.lz-img');
  var closeBtn = overlay.querySelector('.lz-close');

  overlay.querySelector('.lz-caption').textContent = CONFIG.caption;
  image.src = CONFIG.largeSrc || source.currentSrc || source.src;
  if (source.alt) image.alt = source.alt;

  var open = false;
  var scrollY = 0;
  var timer = null;

  function flip(back) {
    var from = source.getBoundingClientRect();
    var to = frame.getBoundingClientRect();
    if (!to.width) return;

    var scale = from.width / to.width;
    var start = 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + scale + ')';

    frame.style.transformOrigin = 'top left';

    if (back) {
      /* retour : rapide et net, sans rebond */
      frame.style.transition = 'transform 240ms cubic-bezier(.55,0,1,.45)';
      frame.style.transform = start;
      return;
    }

    frame.style.transition = 'none';
    frame.style.transform = start;
    void frame.offsetWidth;
    /* chute qui accélère : l'impact tombe pile à la fin */
    frame.style.transition = 'transform var(--lz-open) cubic-bezier(.75,0,.85,.15)';
    frame.style.transform = 'translate(0,0) scale(1)';
  }

  function show(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (open) return;
    open = true;

    scrollY = window.scrollY;
    document.documentElement.style.overflow = 'hidden';

    overlay.hidden = false;
    overlay.classList.remove('is-hit');
    void overlay.offsetWidth;
    overlay.classList.add('is-open');

    if (reduced) {
      overlay.classList.add('is-hit');
    } else {
      flip(false);
      source.style.visibility = 'hidden';
      timer = window.setTimeout(function () {
        if (open) overlay.classList.add('is-hit');
      }, 250);
    }

    closeBtn.focus({ preventScroll: true });
  }

  function hide() {
    if (!open) return;
    open = false;
    window.clearTimeout(timer);
    overlay.classList.remove('is-hit');

    var done = function () {
      overlay.hidden = true;
      overlay.classList.remove('is-open');
      frame.style.transition = 'none';
      frame.style.transform = '';
      source.style.visibility = '';
      document.documentElement.style.overflow = '';
      window.scrollTo(0, scrollY);
      if (trigger && trigger.focus) trigger.focus({ preventScroll: true });
    };

    if (reduced) {
      overlay.classList.remove('is-open');
      window.setTimeout(done, 160);
      return;
    }

    flip(true);
    overlay.classList.remove('is-open');
    window.setTimeout(done, 250);
  }

  var trigger = source.closest('a') || source;
  trigger.addEventListener('click', show);

  if (trigger.tagName === 'IMG') {
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('role', 'button');
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') show(e);
    });
  }

  closeBtn.addEventListener('click', hide);

  overlay.addEventListener('click', function (e) {
    if (!frame.contains(e.target)) hide();
  });

  document.addEventListener('keydown', function (e) {
    if (open && e.key === 'Escape') hide();
  });

  window.addEventListener('resize', function () {
    if (open) hide();
  });
})();
