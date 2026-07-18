/* YOHJ — « Flux de données »
   Fond animé façon circuit imprimé : des pistes fines sont gravées dans le
   fond, et des impulsions lumineuses (paquets de données) y circulent.
   Un appui / clic sur la section déclenche une salve d'impulsions.

   Installation :
   1. Ajouter l'attribut data-circuit à la section hero :  <section class="hero" data-circuit>
   2. Charger circuit.css et circuit.js (avec defer) dans index.html.
   Respecte prefers-reduced-motion (pistes fixes, sans impulsions). */

(function () {
  'use strict';

  var COLORS = {
    trace: 'rgba(125, 183, 255, 0.11)',   // pistes gravées
    pad:   'rgba(125, 183, 255, 0.28)',   // pastilles aux extrémités
    trail: '56, 189, 248',                // traînée (rgb)
    core:  'rgba(232, 244, 255, 0.95)',   // cœur de l'impulsion
    flash: '96, 165, 250'                 // anneau d'arrivée (rgb)
  };

  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- utilitaires ---------- */

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---------- générateur de pistes ----------
     Une piste = polyligne à angles de 45°/90°, comme sur un PCB. */

  function makeTrace(w, h) {
    var side = Math.floor(Math.random() * 4);
    var x, y, ang;
    if (side === 0) { x = rand(0, w); y = -10;    ang = 90;  }
    if (side === 1) { x = w + 10;    y = rand(0, h); ang = 180; }
    if (side === 2) { x = rand(0, w); y = h + 10; ang = 270; }
    if (side === 3) { x = -10;       y = rand(0, h); ang = 0;   }

    var pts = [{ x: x, y: y }];
    var segs = 4 + Math.floor(Math.random() * 4);
    for (var i = 0; i < segs; i++) {
      var len = rand(50, 150);
      var rad = ang * Math.PI / 180;
      x += Math.cos(rad) * len;
      y += Math.sin(rad) * len;
      pts.push({ x: x, y: y });
      if (x < -40 || x > w + 40 || y < -40 || y > h + 40) break;
      ang += pick([-45, 0, 45]);            // virages de circuit imprimé
    }

    // longueurs cumulées, pour placer les impulsions par distance
    var cum = [0];
    for (var j = 1; j < pts.length; j++) {
      var dx = pts[j].x - pts[j - 1].x, dy = pts[j].y - pts[j - 1].y;
      cum.push(cum[j - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    return { pts: pts, cum: cum, total: cum[cum.length - 1] };
  }

  function pointAt(trace, d) {
    var cum = trace.cum, pts = trace.pts, i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    var t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return {
      x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
      y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t
    };
  }

  function distToTrace(trace, px, py) {
    var best = Infinity, bestD = 0, pts = trace.pts, cum = trace.cum;
    for (var i = 1; i < pts.length; i++) {
      var ax = pts[i - 1].x, ay = pts[i - 1].y;
      var bx = pts[i].x, by = pts[i].y;
      var vx = bx - ax, vy = by - ay;
      var L2 = vx * vx + vy * vy || 1;
      var t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L2));
      var qx = ax + vx * t, qy = ay + vy * t;
      var dd = (px - qx) * (px - qx) + (py - qy) * (py - qy);
      if (dd < best) { best = dd; bestD = cum[i - 1] + Math.sqrt(L2) * t; }
    }
    return { dist: Math.sqrt(best), offset: bestD };
  }

  /* ---------- moteur ---------- */

  function CircuitBG(host) {
    var canvas = document.createElement('canvas');
    canvas.className = 'yohj-circuit';
    canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(canvas, host.firstChild);

    var ctx = canvas.getContext('2d');
    var bg = document.createElement('canvas');   // couche statique (pistes)
    var bgx = bg.getContext('2d');

    var W = 0, H = 0, DPR = 1;
    var traces = [], pulses = [], flashes = [];
    var running = false, rafId = 0, lastT = 0, spawnIn = 400;
    var MAX = Math.min(10, Math.max(5, Math.round(window.innerWidth / 130)));

    function resize() {
      var r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = bg.width = W * DPR;
      canvas.height = bg.height = H * DPR;
      build();
      drawStatic();
      if (!running) frameOnce();
    }

    function build() {
      traces = [];
      var n = Math.round(Math.min(26, Math.max(10, (W * H) / 24000)));
      for (var i = 0; i < n; i++) traces.push(makeTrace(W, H));
    }

    function drawStatic() {
      bgx.setTransform(DPR, 0, 0, DPR, 0, 0);
      bgx.clearRect(0, 0, W, H);
      bgx.lineWidth = 1;
      bgx.lineJoin = 'round';
      bgx.strokeStyle = COLORS.trace;
      traces.forEach(function (t) {
        bgx.beginPath();
        t.pts.forEach(function (p, i) { i ? bgx.lineTo(p.x, p.y) : bgx.moveTo(p.x, p.y); });
        bgx.stroke();
        var e = t.pts[t.pts.length - 1];
        bgx.beginPath();                       // pastille d'extrémité
        bgx.arc(e.x, e.y, 3, 0, Math.PI * 2);
        bgx.strokeStyle = COLORS.pad;
        bgx.stroke();
        bgx.beginPath();
        bgx.arc(e.x, e.y, 1.2, 0, Math.PI * 2);
        bgx.fillStyle = COLORS.pad;
        bgx.fill();
        bgx.strokeStyle = COLORS.trace;
      });
    }

    function spawn(trace, offset) {
      if (pulses.length >= MAX * 2) return;
      pulses.push({
        t: trace || pick(traces),
        d: offset || 0,
        v: rand(120, 230)                      // px / s
      });
    }

    function frame(now) {
      var dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
      lastT = now;

      if (pulses.length < MAX) {
        spawnIn -= dt * 1000;
        if (spawnIn <= 0) { spawn(); spawnIn = rand(450, 1200); }
      }

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bg, 0, 0, W, H);

      // impulsions
      for (var i = pulses.length - 1; i >= 0; i--) {
        var p = pulses[i];
        p.d += p.v * dt;
        if (p.d >= p.t.total) {
          var end = p.t.pts[p.t.pts.length - 1];
          flashes.push({ x: end.x, y: end.y, r: 3, a: 0.8 });
          pulses.splice(i, 1);
          continue;
        }
        var head = pointAt(p.t, p.d);
        var tail = pointAt(p.t, Math.max(0, p.d - 90));
        var mid  = pointAt(p.t, Math.max(0, p.d - 30));

        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(' + COLORS.trail + ', 0.16)';
        segment(p.t, Math.max(0, p.d - 90), p.d);
        ctx.strokeStyle = 'rgba(' + COLORS.trail + ', 0.55)';
        segment(p.t, Math.max(0, p.d - 30), p.d);

        var g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 12);
        g.addColorStop(0, COLORS.core);
        g.addColorStop(0.35, 'rgba(' + COLORS.trail + ', 0.55)');
        g.addColorStop(1, 'rgba(' + COLORS.trail + ', 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // anneaux d'arrivée
      for (var f = flashes.length - 1; f >= 0; f--) {
        var fl = flashes[f];
        fl.r += 40 * dt; fl.a -= 1.6 * dt;
        if (fl.a <= 0) { flashes.splice(f, 1); continue; }
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(' + COLORS.flash + ',' + fl.a.toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (running) rafId = requestAnimationFrame(frame);
    }

    function segment(trace, d0, d1) {
      ctx.beginPath();
      var steps = 8;
      for (var s = 0; s <= steps; s++) {
        var q = pointAt(trace, d0 + (d1 - d0) * (s / steps));
        s ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      }
      ctx.stroke();
    }

    function frameOnce() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bg, 0, 0, W, H);
    }

    function start() {
      if (running || REDUCED) return;
      running = true;
      lastT = performance.now();
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    host.addEventListener('pointerdown', function (e) {
      if (REDUCED) return;
      var r = host.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      flashes.push({ x: x, y: y, r: 4, a: 0.6 });
      traces
        .map(function (t) { var d = distToTrace(t, x, y); return { t: t, d: d }; })
        .sort(function (a, b) { return a.d.dist - b.d.dist; })
        .slice(0, 3)
        .forEach(function (m) { if (m.d.dist < 120) spawn(m.t, m.d.offset); });
      if (!running) frameOnce();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0.05 }).observe(host);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(resize, 150);
    });

    resize();
    start();
  }

  function init() {
    var hosts = document.querySelectorAll('[data-circuit]');
    for (var i = 0; i < hosts.length; i++) new CircuitBG(hosts[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
