(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var menu = document.querySelector('.menu-button');
  var nav = document.querySelector('.nav');
  var header = document.querySelector('.header');
  var progress = document.querySelector('.scroll-progress span');

  function closeMenu() {
    if (!menu || !nav) return;
    nav.classList.remove('open');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Ouvrir le menu');
  }

  if (menu && nav) {
    menu.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });

    document.addEventListener('click', function (event) {
      if (!nav.classList.contains('open')) return;
      if (!nav.contains(event.target) && !menu.contains(event.target)) closeMenu();
    });
  }

  document.querySelectorAll('.nav a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.13, rootMargin: '0px 0px -5% 0px' });

  document.querySelectorAll('.reveal').forEach(function (element) {
    revealObserver.observe(element);
  });

  var sections = Array.from(document.querySelectorAll('main section[id]'));
  var navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      navLinks.forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
      });
    });
  }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
  sections.forEach(function (section) { sectionObserver.observe(section); });

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(event.target);
      var subject = encodeURIComponent('Demande de devis YOHJ — ' + data.get('service'));
      var body = encodeURIComponent(
        'Nom : ' + data.get('name') + '\n' +
        'E-mail : ' + data.get('email') + '\n' +
        'Service : ' + data.get('service') + '\n\n' +
        'Message :\n' + data.get('message')
      );
      window.location.href = 'mailto:22arc.yohj@gmail.com?subject=' + subject + '&body=' + body;
    });
  }

  function updateScrollUI() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (maxScroll > 0 ? scrollTop / maxScroll : 0) + ')';
    if (header) header.classList.toggle('is-scrolled', scrollTop > 18);
  }
  addEventListener('scroll', updateScrollUI, { passive: true });
  updateScrollUI();

  if (header && !reducedMotion && matchMedia('(pointer:fine)').matches) {
    header.addEventListener('pointermove', function (event) {
      var rect = header.getBoundingClientRect();
      header.style.setProperty('--header-x', (event.clientX - rect.left) + 'px');
      header.style.setProperty('--header-y', (event.clientY - rect.top) + 'px');
    }, { passive: true });
  }

  var glow = document.querySelector('.cursor-glow');
  if (glow && !reducedMotion && matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', function (event) {
      glow.animate({ left: event.clientX + 'px', top: event.clientY + 'px' }, {
        duration: 500,
        fill: 'forwards',
        easing: 'ease-out'
      });
    }, { passive: true });
  }

  if (!reducedMotion && matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.service-card, .contact-card, .expertise-panel').forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        var rect = card.getBoundingClientRect();
        var x = (event.clientX - rect.left) / rect.width;
        var y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', (x * 100) + '%');
        card.style.setProperty('--my', (y * 100) + '%');
        card.style.setProperty('--rx', ((0.5 - y) * 3) + 'deg');
        card.style.setProperty('--ry', ((x - 0.5) * 4) + 'deg');
      });
      card.addEventListener('pointerleave', function () {
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
      });
    });
  }

  var canvas = document.getElementById('network');
  if (!canvas || reducedMotion) return;
  var context = canvas.getContext('2d');
  var points = [];
  var frameId;

  function resizeCanvas() {
    var ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    points = Array.from({ length: Math.min(58, Math.floor(innerWidth / 24)) }, function () {
      return {
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() * 1.2 + 0.35
      };
    });
  }

  function drawNetwork() {
    context.clearRect(0, 0, innerWidth, innerHeight);
    points.forEach(function (point, index) {
      point.x += point.vx;
      point.y += point.vy;
      if (point.x < 0 || point.x > innerWidth) point.vx *= -1;
      if (point.y < 0 || point.y > innerHeight) point.vy *= -1;

      context.beginPath();
      context.arc(point.x, point.y, point.r, 0, Math.PI * 2);
      context.fillStyle = 'rgba(78,160,255,.5)';
      context.fill();

      for (var j = index + 1; j < points.length; j += 1) {
        var other = points[j];
        var distance = Math.hypot(point.x - other.x, point.y - other.y);
        if (distance < 110) {
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(other.x, other.y);
          context.strokeStyle = 'rgba(32,119,235,' + ((1 - distance / 110) * 0.11) + ')';
          context.stroke();
        }
      }
    });
    frameId = requestAnimationFrame(drawNetwork);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) cancelAnimationFrame(frameId);
    else drawNetwork();
  });
  addEventListener('resize', resizeCanvas);
  resizeCanvas();
  drawNetwork();
}());
