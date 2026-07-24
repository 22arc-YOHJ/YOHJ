/* logo-holo.js — v2, géométrie reprise sur le logo d'origine.
   Hexagone à deux contours avec anneau dégradé, Y bicolore facetté
   (branche gauche et fût argentés, branche droite bleue, arête de pliage),
   quatre pistes à nœuds, bloc nom avec ses filets à pastilles.
   Tout est en coordonnées : aucune image à charger. */
(function () {
  'use strict';

  var CONFIG = {
    // Placement : tout en bas de la page, juste avant les mentions légales.
    // Premier sélecteur trouvé ; à défaut, le bloc contenant le lien
    // « mentions légales » ; à défaut, la fin du <body>.
    avant: ['footer', '#mentions', '#mentions-legales', '.mentions-legales', '.pied', '.footer'],
    longueur: 2.2,        // hauteurs d'écran occupées par la séquence
    rayon: 100,           // rayon de l'hexagone extérieur
    profondeur: 24,       // épaisseur du prisme
    mot: 'YOHJ',
    sous: 'Services informatiques',
    ligne: 'La technologie au service de votre réussite',
    etats: ['Trame', 'Volume', 'Assemblage', 'Verrouillé']
  };

  var doc = document;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Palette relevée sur le logo.
  var CYAN = '#4fd4ff',
      BLEU = '#2f8fff',
      BLEU_SOMBRE = '#0e3f9e',
      BLEU_CLAIR = '#8fd0ff',
      ARGENT = '#e8eef7',
      NUIT = '#050d1c',
      SANS = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif';

  var hMemo = 0;
  function calage() {
    var h = window.innerHeight;
    if (Math.abs(h - hMemo) < 90) return;
    hMemo = h;
    doc.documentElement.style.setProperty('--lh-vh', (h / 100) + 'px');
  }
  calage();

  function borne(v, a, b) { return v < a ? a : v > b ? b : v; }
  function adouci(v) { return v * v * (3 - 2 * v); }
  function palier(p, a, b) { return adouci(borne((p - a) / (b - a), 0, 1)); }
  function melange(a, b, k) { return a + (b - a) * k; }

  /* ---------- géométrie ---------- */

  function hexagone(R) {
    var v = [];
    for (var k = 0; k < 6; k++) {
      var a = (-90 + k * 60) * Math.PI / 180;
      v.push([R * Math.cos(a), R * Math.sin(a)]);
    }
    return v;
  }

  var R = CONFIG.rayon;
  var HEX = hexagone(R);              // arête extérieure claire
  var HEX_INT = hexagone(R * 0.865);  // intérieur de l'anneau bleu
  var HEX_LIGNE = hexagone(R * 0.80); // filet clair dans la nuit
  var HEX_FOND = hexagone(R * 0.845); // aplat sombre

  // Le Y : deux branches et un fût, chacun un quadrilatère.
  function branche(x1, y1, x2, y2, e) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    var nx = -dy / L * e / 2, ny = dx / L * e / 2;
    return [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]];
  }

  var J = [0, 4];        // jonction des branches
  var PIED = [0, 76];    // pointe du fût

  var PIECES = [
    { q: branche(-52, -58, J[0] + 4, J[1], 27), teinte: ARGENT, vol: [-1.7, -1.1] },
    { q: branche(52, -58, J[0] - 4, J[1], 27), teinte: BLEU, vol: [1.7, -1.1] },
    // Fût fuselé, fendu en deux facettes par l'arête de pliage.
    { q: [[-15, -8], [0, -8], [0, PIED[1]], [-9, PIED[1]]], teinte: ARGENT, vol: [0, 1.8] },
    { q: [[0, -8], [15, -8], [9, PIED[1]], [0, PIED[1]]], teinte: '#9fb4cc', vol: [0, 1.8] }
  ];

  // Pistes de circuit : un nœud à l'extérieur, un coude, une descente.
  var PISTES = [
    [[-74, -12], [-52, -12], [-42, -2], [-42, 24]],
    [[-66, 34], [-46, 34], [-38, 44]],
    [[74, -12], [52, -12], [42, -2], [42, 24]],
    [[66, 34], [46, 34], [38, 44]]
  ];

  /* ---------- projection ---------- */

  var vue = { rY: 0, rX: 0, w: 0, h: 0, ech: 1, ancre: 0.42 };

  function P(x, y, z) {
    var cy = Math.cos(vue.rY), sy = Math.sin(vue.rY);
    var X = x * cy - z * sy, Zr = x * sy + z * cy;
    var cx = Math.cos(vue.rX), sx = Math.sin(vue.rX);
    var Y2 = y * cx - Zr * sx; Zr = y * sx + Zr * cx;
    var d = 620;
    var f = (d * vue.ech) / (d + Zr);
    return { x: vue.w / 2 + X * f, y: vue.h * vue.ancre + Y2 * f, f: f };
  }

  function chemin(ctx, pts, z, ferme, dx, dy) {
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var q = P(pts[i][0] + (dx || 0), pts[i][1] + (dy || 0), z);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    }
    if (ferme) ctx.closePath();
  }

  // Anneau : contour extérieur, puis contour intérieur en sens inverse.
  function anneau(ctx, ext, int, z) {
    var i, q;
    ctx.beginPath();
    for (i = 0; i < ext.length; i++) {
      q = P(ext[i][0], ext[i][1], z);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    }
    ctx.closePath();
    for (i = int.length - 1; i >= 0; i--) {
      q = P(int[i][0], int[i][1], z);
      i === int.length - 1 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
    ctx.fill('evenodd');
  }

  function perimetre(pts, z) {
    var L = 0, a = P(pts[0][0], pts[0][1], z), b;
    for (var i = 1; i <= pts.length; i++) {
      var q = pts[i % pts.length];
      b = P(q[0], q[1], z);
      L += Math.hypot(b.x - a.x, b.y - a.y);
      a = b;
    }
    return L;
  }

  function relie(ctx, pts, z1, z2, dx, dy) {
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var a = P(pts[i][0] + (dx || 0), pts[i][1] + (dy || 0), z1);
      var b = P(pts[i][0] + (dx || 0), pts[i][1] + (dy || 0), z2);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }

  function motEspace(ctx, txt, cx, cy, px, esp, poids, police) {
    ctx.font = poids + ' ' + px + 'px ' + (police || SANS);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var i, L = 0;
    for (i = 0; i < txt.length; i++) L += ctx.measureText(txt[i]).width + esp;
    L -= esp;
    var x = cx - L / 2;
    for (i = 0; i < txt.length; i++) {
      ctx.fillText(txt[i], x, cy);
      x += ctx.measureText(txt[i]).width + esp;
    }
    return L;
  }

  /* ---------- rendu ---------- */

  function rendu(ctx, w, h, p, t) {
    var etroit = w < 520 || h < 720;
    var trame = palier(p, 0.02, 0.24);
    var volume = palier(p, 0.24, 0.46);
    var circ = palier(p, 0.62, 0.82);
    var verrou = palier(p, 0.84, 0.99);
    var eclat = Math.exp(-Math.pow((verrou - 0.18) * 7, 2));

    vue.w = w; vue.h = h;
    vue.ancre = etroit ? 0.40 : 0.43;
    vue.ech = Math.min(w / (etroit ? 300 : 330), h / (etroit ? 430 : 400));
    vue.rY = melange(-1.75, 0, palier(p, 0.04, 0.94)) + Math.sin(t * 0.4) * 0.07 * (1 - verrou);
    vue.rX = melange(0.42, 0, palier(p, 0.08, 0.94));

    var D = CONFIG.profondeur * volume;
    var zAv = -D, zAr = D;

    ctx.fillStyle = '#04070d';
    ctx.fillRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Anneau de balayage pendant la construction.
    if (verrou < 0.9) {
      var ring = [], a;
      for (a = 0; a < 64; a++) {
        var an = a / 64 * Math.PI * 2;
        ring.push([Math.cos(an) * 132, Math.sin(an) * 132]);
      }
      ctx.globalAlpha = 0.2 * (1 - verrou) * trame;
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 1;
      var perR = perimetre(ring, 0);
      ctx.setLineDash([perR / 24, perR / 24]);
      ctx.lineDashOffset = -t * 40;
      chemin(ctx, ring, 0, true);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Face arrière et arêtes du prisme.
    if (volume > 0.01) {
      ctx.globalAlpha = 0.28 * volume;
      ctx.strokeStyle = BLEU_SOMBRE;
      ctx.lineWidth = 1;
      chemin(ctx, HEX, zAr, true); ctx.stroke();
      ctx.globalAlpha = 0.4 * volume;
      relie(ctx, HEX, zAv, zAr);
    }

    // Aplat sombre du logo.
    ctx.globalAlpha = 0.85 * trame;
    ctx.fillStyle = NUIT;
    chemin(ctx, HEX_FOND, zAv, true); ctx.fill();

    // Anneau bleu dégradé, clair en haut à gauche, profond en bas à droite.
    var hg = P(-R, -R, zAv), bd = P(R, R, zAv);
    var deg = ctx.createLinearGradient(hg.x, hg.y, bd.x, bd.y);
    deg.addColorStop(0, BLEU_CLAIR);
    deg.addColorStop(0.45, BLEU);
    deg.addColorStop(1, BLEU_SOMBRE);
    ctx.globalAlpha = 0.78 * trame;
    ctx.fillStyle = deg;
    ctx.shadowBlur = 14 + verrou * 14 + eclat * 26;
    ctx.shadowColor = BLEU;
    anneau(ctx, HEX, HEX_INT, zAv);
    ctx.shadowBlur = 0;

    // Arête extérieure claire, tracée segment par segment.
    var per2 = perimetre(HEX, zAv);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#dcecff';
    ctx.lineWidth = 1.6 + verrou * 0.6;
    ctx.shadowBlur = 10 + verrou * 12;
    ctx.shadowColor = CYAN;
    ctx.setLineDash([per2 * trame, per2]);
    chemin(ctx, HEX, zAv, true); ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Filet clair à l'intérieur de la nuit.
    ctx.globalAlpha = 0.55 * volume;
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1;
    chemin(ctx, HEX_LIGNE, zAv, true); ctx.stroke();

    // Pistes de circuit et leurs nœuds.
    if (circ > 0.01) {
      for (var i = 0; i < PISTES.length; i++) {
        var pi = PISTES[i];
        ctx.globalAlpha = circ * 0.7;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 1.5;
        chemin(ctx, pi, zAv - 2, false); ctx.stroke();

        var pl = perimetre(pi.concat([pi[pi.length - 1]]), zAv - 2);
        ctx.globalAlpha = circ;
        ctx.strokeStyle = '#eaf7ff';
        ctx.lineWidth = 2.2;
        ctx.shadowBlur = 10; ctx.shadowColor = CYAN;
        ctx.setLineDash([9, pl]);
        ctx.lineDashOffset = -((t * 70 + i * 40) % (pl + 9));
        chemin(ctx, pi, zAv - 2, false); ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        var n = P(pi[0][0], pi[0][1], zAv - 2);
        ctx.globalAlpha = circ;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(n.x, n.y, 5 * n.f, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = CYAN;
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.6 * n.f, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Le Y : quatre facettes qui viennent se verrouiller.
    var zy = zAv - 10 * volume;
    for (var k = 0; k < PIECES.length; k++) {
      var ordre = k > 2 ? 2 : k;                       // les deux facettes du fût arrivent ensemble
      var pose = palier(p, 0.46 + ordre * 0.05, 0.66 + ordre * 0.05);
      if (pose < 0.01) continue;
      var ec = (1 - pose) * 200;
      var dx = PIECES[k].vol[0] * ec, dy = PIECES[k].vol[1] * ec;

      ctx.globalAlpha = pose * (0.20 + verrou * 0.30);
      ctx.fillStyle = PIECES[k].teinte;
      chemin(ctx, PIECES[k].q, zy, true, dx, dy); ctx.fill();

      ctx.globalAlpha = pose;
      ctx.strokeStyle = PIECES[k].teinte;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8 + verrou * 14 + eclat * 24;
      ctx.shadowColor = PIECES[k].teinte === BLEU ? BLEU : CYAN;
      chemin(ctx, PIECES[k].q, zy, true, dx, dy); ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.globalAlpha = pose * 0.32 * volume;
      ctx.strokeStyle = BLEU_SOMBRE;
      ctx.lineWidth = 1;
      relie(ctx, PIECES[k].q, zy, zAv, dx, dy);
    }

    // Flash de verrouillage.
    if (eclat > 0.01) {
      var c = P(0, 0, 0);
      var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 280 * vue.ech);
      g.addColorStop(0, 'rgba(223,243,255,' + (0.45 * eclat) + ')');
      g.addColorStop(1, 'rgba(223,243,255,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Bloc nom, repris de la composition du logo.
    if (verrou > 0.02) {
      var base = P(0, 168, 0);
      var s = base.f;

      ctx.globalAlpha = verrou;
      ctx.fillStyle = '#eef4fb';
      motEspace(ctx, CONFIG.mot, base.x, base.y, Math.max(22, 40 * s), 14 * s, '700');

      // Sous-titre encadré de deux filets à pastille.
      var ySous = base.y + 34 * s;
      ctx.globalAlpha = verrou * 0.9;
      ctx.fillStyle = '#cfe0f2';
      var lSous = motEspace(ctx, CONFIG.sous.toUpperCase(), base.x, ySous, Math.max(8, 10.5 * s), 4.2 * s, '500');
      ctx.globalAlpha = verrou * 0.7;
      ctx.strokeStyle = BLEU;
      ctx.fillStyle = BLEU;
      ctx.lineWidth = 1;
      [-1, 1].forEach(function (sens) {
        var x1 = base.x + sens * (lSous / 2 + 12 * s);
        var x2 = base.x + sens * (lSous / 2 + 46 * s);
        ctx.beginPath(); ctx.moveTo(x1, ySous); ctx.lineTo(x2, ySous); ctx.stroke();
        ctx.beginPath(); ctx.arc(x2 + sens * 4 * s, ySous, 2.2 * s, 0, Math.PI * 2); ctx.stroke();
      });

      ctx.globalAlpha = verrou * 0.45;
      ctx.fillStyle = '#8fb2c8';
      motEspace(ctx, CONFIG.ligne.toUpperCase(), base.x, base.y + 56 * s, Math.max(7, 8.5 * s), 1.6 * s, '400');
    }

    ctx.globalAlpha = 1;
    return { trame: trame, volume: volume, circ: circ, verrou: verrou };
  }

  /* ---------- montage ---------- */

  function demarre() {
    if (doc.getElementById('logo-holo')) return;

    var section = doc.createElement('section');
    section.className = 'lh';
    section.id = 'logo-holo';
    section.setAttribute('aria-label', CONFIG.mot + ' — ' + CONFIG.sous);

    section.innerHTML =
      '<div class="lh__rail"><div class="lh__ecran">' +
        '<canvas class="lh__canvas" aria-hidden="true"></canvas>' +
        '<div class="lh__scan" aria-hidden="true"></div>' +
        '<div class="lh__lueur" aria-hidden="true"></div>' +
        '<h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">' +
          CONFIG.mot + ' — ' + CONFIG.sous + '. ' + CONFIG.ligne + '.' +
        '</h2>' +
        '<div class="lh__hud" aria-hidden="true">' +
          '<span class="lh__etat">Trame</span>' +
          '<div class="lh__barre"><i class="lh__remplissage"></i></div>' +
        '</div>' +
      '</div></div>';

    // On cherche le pied de page. S'il n'est pas balisé <footer>, on repère
    // le lien vers les mentions légales et on remonte jusqu'au bloc qui le
    // contient, pour se glisser juste avant.
    var cible = null;
    for (var i = 0; i < CONFIG.avant.length && !cible; i++) cible = doc.querySelector(CONFIG.avant[i]);
    if (!cible) {
      var liens = doc.querySelectorAll('a[href*="mention"], a[href*="legal"]');
      if (liens.length) {
        cible = liens[liens.length - 1];
        while (cible.parentNode && cible.parentNode !== doc.body) cible = cible.parentNode;
      }
    }
    if (cible && cible.parentNode) cible.parentNode.insertBefore(section, cible);
    else doc.body.appendChild(section);

    var rail = section.querySelector('.lh__rail');
    var canvas = section.querySelector('.lh__canvas');
    var remplissage = section.querySelector('.lh__remplissage');
    var etat = section.querySelector('.lh__etat');
    var ctx = canvas.getContext('2d', { alpha: false });
    var W = 0, H = 0, visible = false, boucle = 0;

    function taille() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (reduit) {
      section.classList.add('lh--statique');
      taille();
      rendu(ctx, W, H, 1, 0);
      return;
    }

    rail.style.height = (CONFIG.longueur * 100) + 'vh';

    function image(ms) {
      var t = ms / 1000;
      var r = rail.getBoundingClientRect();
      var course = rail.offsetHeight - window.innerHeight;
      var p = course <= 0 ? 0 : borne(-r.top / course, 0, 1);
      var e = rendu(ctx, W, H, p, t);

      remplissage.style.width = (p * 100).toFixed(2) + '%';
      etat.textContent = e.verrou > 0.4 ? CONFIG.etats[3]
        : e.circ > 0.2 ? CONFIG.etats[2]
        : e.volume > 0.2 ? CONFIG.etats[1] : CONFIG.etats[0];

      if (visible) boucle = requestAnimationFrame(image);
    }

    var oeil = new IntersectionObserver(function (ev) {
      visible = ev[0].isIntersecting;
      doc.dispatchEvent(new CustomEvent('yohj:logo-holo', { detail: { visible: visible } }));
      cancelAnimationFrame(boucle);
      if (visible) boucle = requestAnimationFrame(image);
    }, { rootMargin: '120px' });

    taille();
    oeil.observe(section);

    var minuteur;
    function relance() {
      clearTimeout(minuteur);
      minuteur = setTimeout(function () { calage(); taille(); }, 180);
    }
    window.addEventListener('resize', relance);
    window.addEventListener('orientationchange', relance);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', demarre);
  else demarre();
})();
