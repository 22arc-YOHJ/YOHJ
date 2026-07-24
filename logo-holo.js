/* logo-holo.js — v3. Le logo se construit au scroll, puis cesse d'être une
   animation : une fois verrouillé, il se tient. Il suit l'inclinaison du
   téléphone, tourne au doigt, garde son élan, laisse une rémanence quand on
   le lance — et se retourne pour montrer sa face arrière.
   Géométrie pure, aucune image, aucune bibliothèque. */
(function () {
  'use strict';

  var CONFIG = {
    // Placement : tout en bas de la page, juste avant les mentions légales.
    avant: ['footer', '#mentions', '#mentions-legales', '.mentions-legales', '.pied', '.footer'],
    longueur: 2.2,        // hauteurs d'écran occupées par la séquence
    rayon: 100,
    profondeur: 24,
    mot: 'YOHJ',
    sous: 'Services informatiques',
    ligne: 'La technologie au service de votre réussite',
    // Les deux faces portent le même logo : le verso est le miroir du recto,
    // pour qu'il se lise à l'endroit quand on retourne l'objet.
    copier: 'Copier le lien',
    copie: 'Lien copié',
    relief: 'Activer le relief',
    prise: 'Inclinez · faites tourner · touchez pour retourner',
    // true  : le bouton se pose sur la face tournée vers le visiteur, toujours atteignable.
    // false : il n'apparaît que sur la face arrière, après un retournement.
    boutonSurLesDeuxFaces: true,
    lien: '',             // vide = l'adresse de la page en cours
    etats: ['Trame', 'Volume', 'Assemblage', 'En main']
  };

  var doc = document;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CYAN = '#4fd4ff',
      BLEU = '#2f8fff',
      BLEU_SOMBRE = '#0e3f9e',
      BLEU_CLAIR = '#8fd0ff',
      ARGENT = '#e8eef7',
      NUIT = '#050d1c',
      SANS = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
      MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

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
  var HEX = hexagone(R);
  var HEX_INT = hexagone(R * 0.865);
  var HEX_LIGNE = hexagone(R * 0.80);
  var HEX_FOND = hexagone(R * 0.845);

  function branche(x1, y1, x2, y2, e) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    var nx = -dy / L * e / 2, ny = dx / L * e / 2;
    return [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]];
  }

  var PIECES = [
    { q: branche(-52, -58, 4, 4, 27), teinte: ARGENT, vol: [-1.7, -1.1] },
    { q: branche(52, -58, -4, 4, 27), teinte: BLEU, vol: [1.7, -1.1] },
    { q: [[-15, -8], [0, -8], [0, 76], [-9, 76]], teinte: ARGENT, vol: [0, 1.8] },
    { q: [[0, -8], [15, -8], [9, 76], [0, 76]], teinte: '#9fb4cc', vol: [0, 1.8] }
  ];

  var PISTES = [
    [[-74, -12], [-52, -12], [-42, -2], [-42, 24]],
    [[-66, 34], [-46, 34], [-38, 44]],
    [[74, -12], [52, -12], [42, -2], [42, 24]],
    [[66, 34], [46, 34], [38, 44]]
  ];

  // Miroir en x : dessiné au dos, le motif se lit à l'endroit pour qui regarde
  // de l'autre côté. C'est ce que fait une enseigne imprimée recto verso.
  function miroir(pts) {
    return pts.map(function (q) { return [-q[0], q[1]]; });
  }

  var PISTES_M = PISTES.map(miroir);
  var PIECES_M = PIECES.map(function (pc) {
    return { q: miroir(pc.q), teinte: pc.teinte, vol: [-pc.vol[0], pc.vol[1]] };
  });

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

  /* ---------- prise en main ---------- */

  var main = {
    rot: 0,        // rotation ajoutée au doigt
    inc: 0,        // inclinaison ajoutée au doigt
    vit: 0,        // élan restant
    retour: 0,     // 0 = recto, 1 = verso
    but: 0,        // cible du retournement
    gy: 0, gx: 0,  // gyroscope, lissé
    gyC: 0, gxC: 0,// gyroscope, cible
    touche: false,
    active: false  // le visiteur a pris la main au moins une fois
  };

  function physique() {
    if (!main.touche) {
      main.rot += main.vit;
      main.vit *= 0.94;
      if (Math.abs(main.vit) < 0.0004) main.vit = 0;
    }
    main.retour += (main.but - main.retour) * 0.12;
    main.gy += (main.gyC - main.gy) * 0.08;
    main.gx += (main.gxC - main.gx) * 0.08;
  }

  /* ---------- rendu ---------- */

  var sillage = [];

  function rendu(ctx, w, h, p, t) {
    var etroit = w < 520 || h < 720;
    var trame = palier(p, 0.02, 0.24);
    var volume = palier(p, 0.24, 0.46);
    var circ = palier(p, 0.62, 0.82);
    var verrou = palier(p, 0.84, 0.99);
    var eclat = Math.exp(-Math.pow((verrou - 0.18) * 7, 2));
    var libre = palier(p, 0.88, 0.98);        // à partir d'ici, l'objet se tient

    vue.w = w; vue.h = h;
    vue.ancre = etroit ? 0.40 : 0.43;
    vue.ech = Math.min(w / (etroit ? 300 : 330), h / (etroit ? 430 : 400));

    var auto = melange(-1.75, 0, palier(p, 0.04, 0.94)) + Math.sin(t * 0.4) * 0.07 * (1 - verrou);
    var rY = auto + (main.rot + main.gy + main.retour * Math.PI) * libre;
    var rX = melange(0.42, 0, palier(p, 0.08, 0.94)) + (main.inc + main.gx) * libre;
    vue.rY = rY;
    vue.rX = borne(rX, -0.6, 0.6);

    // Face vue : positif = recto, négatif = verso.
    var face = Math.cos(rY);
    var recto = melange(1, Math.max(0, face), libre);
    var verso = Math.max(0, -face) * libre;

    var D = CONFIG.profondeur * volume;
    var zAv = -D, zAr = D;

    ctx.fillStyle = '#04070d';
    ctx.fillRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Rémanence : les contours des instants précédents, quand ça tourne vite.
    sillage.push(rY);
    if (sillage.length > 8) sillage.shift();
    var elan = Math.abs(main.vit) + Math.abs(main.but - main.retour) * 0.4;
    if (libre > 0.5 && elan > 0.006) {
      var memo = vue.rY;
      for (var s = 0; s < sillage.length - 1; s += 2) {
        vue.rY = sillage[s];
        ctx.globalAlpha = borne(elan * 8, 0, 1) * 0.10 * (s / sillage.length);
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 1;
        chemin(ctx, HEX, zAv, true); ctx.stroke();
      }
      vue.rY = memo;
    }

    // Anneau de balayage, pendant la construction seulement.
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

    // Prisme : face opposée et arêtes de liaison.
    if (volume > 0.01) {
      ctx.globalAlpha = 0.28 * volume;
      ctx.strokeStyle = BLEU_SOMBRE;
      ctx.lineWidth = 1;
      chemin(ctx, HEX, zAr, true); ctx.stroke();
      ctx.globalAlpha = 0.4 * volume;
      relie(ctx, HEX, zAv, zAr);
    }

    // Aplat sombre, des deux côtés.
    ctx.globalAlpha = 0.85 * trame;
    ctx.fillStyle = NUIT;
    chemin(ctx, HEX_FOND, verso > 0.5 ? zAr : zAv, true); ctx.fill();

    // Anneau bleu dégradé.
    var zF = verso > 0.5 ? zAr : zAv;
    var hg = P(-R, -R, zF), bd = P(R, R, zF);
    var deg = ctx.createLinearGradient(hg.x, hg.y, bd.x, bd.y);
    deg.addColorStop(0, BLEU_CLAIR);
    deg.addColorStop(0.45, BLEU);
    deg.addColorStop(1, BLEU_SOMBRE);
    ctx.globalAlpha = 0.78 * trame;
    ctx.fillStyle = deg;
    ctx.shadowBlur = 14 + verrou * 14 + eclat * 26;
    ctx.shadowColor = BLEU;
    anneau(ctx, HEX, HEX_INT, zF);
    ctx.shadowBlur = 0;

    // Arête extérieure claire, tracée segment par segment.
    var per2 = perimetre(HEX, zF);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#dcecff';
    ctx.lineWidth = 1.6 + verrou * 0.6;
    ctx.shadowBlur = 10 + verrou * 12;
    ctx.shadowColor = CYAN;
    ctx.setLineDash([per2 * trame, per2]);
    chemin(ctx, HEX, zF, true); ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 0.55 * volume;
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1;
    chemin(ctx, HEX_LIGNE, zF, true); ctx.stroke();

    /* ----- recto : pistes et Y ----- */

    // Le motif du logo — pistes et Y — dessiné sur une face donnée.
    // sens = -1 pour le recto, +1 pour le verso ; les deux faces sont
    // identiques, le verso utilise simplement la géométrie en miroir.
    function motif(pistes, pieces, zFace, sens, att) {
      var i, k;
      if (circ > 0.01) {
        for (i = 0; i < pistes.length; i++) {
          var pi = pistes[i];
          var zp = zFace + sens * 2;
          ctx.globalAlpha = circ * att * 0.7;
          ctx.strokeStyle = CYAN;
          ctx.lineWidth = 1.5;
          chemin(ctx, pi, zp, false); ctx.stroke();

          var pl = perimetre(pi.concat([pi[pi.length - 1]]), zp);
          ctx.globalAlpha = circ * att;
          ctx.strokeStyle = '#eaf7ff';
          ctx.lineWidth = 2.2;
          ctx.shadowBlur = 10; ctx.shadowColor = CYAN;
          ctx.setLineDash([9, pl]);
          ctx.lineDashOffset = -((t * 70 + i * 40) % (pl + 9));
          chemin(ctx, pi, zp, false); ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;

          var n = P(pi[0][0], pi[0][1], zp);
          ctx.strokeStyle = CYAN;
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(n.x, n.y, 5 * n.f, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = CYAN;
          ctx.beginPath(); ctx.arc(n.x, n.y, 1.6 * n.f, 0, Math.PI * 2); ctx.fill();
        }
      }

      var zy = zFace + sens * 10 * volume;
      for (k = 0; k < pieces.length; k++) {
        var ordre = k > 2 ? 2 : k;
        var pose = palier(p, 0.46 + ordre * 0.05, 0.66 + ordre * 0.05);
        if (pose < 0.01) continue;
        var ec = (1 - pose) * 200;
        var dx = pieces[k].vol[0] * ec, dy = pieces[k].vol[1] * ec;

        ctx.globalAlpha = pose * att * (0.20 + verrou * 0.30);
        ctx.fillStyle = pieces[k].teinte;
        chemin(ctx, pieces[k].q, zy, true, dx, dy); ctx.fill();

        ctx.globalAlpha = pose * att;
        ctx.strokeStyle = pieces[k].teinte;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8 + verrou * 14 + eclat * 24;
        ctx.shadowColor = pieces[k].teinte === BLEU ? BLEU : CYAN;
        chemin(ctx, pieces[k].q, zy, true, dx, dy); ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.globalAlpha = pose * att * 0.32 * volume;
        ctx.strokeStyle = BLEU_SOMBRE;
        ctx.lineWidth = 1;
        relie(ctx, pieces[k].q, zy, zFace, dx, dy);
      }
    }

    if (recto > 0.02) motif(PISTES, PIECES, zAv, -1, recto);
    if (verso > 0.02) motif(PISTES_M, PIECES_M, zAr, 1, verso);

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

    // Bloc nom, sous le logo, visible depuis les deux faces.
    var vis = Math.max(recto, verso);
    if (verrou > 0.02 && vis > 0.05) {
      var base = P(0, 168, 0);
      var e = base.f;

      ctx.globalAlpha = verrou * vis;
      ctx.fillStyle = '#eef4fb';
      motEspace(ctx, CONFIG.mot, base.x, base.y, Math.max(22, 40 * e), 14 * e, '700');

      var ySous = base.y + 34 * e;
      ctx.globalAlpha = verrou * vis * 0.9;
      ctx.fillStyle = '#cfe0f2';
      var lSous = motEspace(ctx, CONFIG.sous.toUpperCase(), base.x, ySous, Math.max(8, 10.5 * e), 4.2 * e, '500');
      ctx.globalAlpha = verrou * vis * 0.7;
      ctx.strokeStyle = BLEU;
      ctx.fillStyle = BLEU;
      ctx.lineWidth = 1;
      [-1, 1].forEach(function (sens) {
        var x1 = base.x + sens * (lSous / 2 + 12 * e);
        var x2 = base.x + sens * (lSous / 2 + 46 * e);
        ctx.beginPath(); ctx.moveTo(x1, ySous); ctx.lineTo(x2, ySous); ctx.stroke();
        ctx.beginPath(); ctx.arc(x2 + sens * 4 * e, ySous, 2.2 * e, 0, Math.PI * 2); ctx.stroke();
      });

      ctx.globalAlpha = verrou * vis * 0.45;
      ctx.fillStyle = '#8fb2c8';
      motEspace(ctx, CONFIG.ligne.toUpperCase(), base.x, base.y + 56 * e, Math.max(7, 8.5 * e), 1.6 * e, '400');
    }

    ctx.globalAlpha = 1;
    // Point de la carte où se pose le bouton, et assiette de la face visible :
    // le script s'en sert pour placer le vrai <button> par-dessus le canvas.
    return {
      trame: trame, volume: volume, circ: circ, verrou: verrou,
      libre: libre, verso: verso,
      // Ancrage du bouton : sur la face visible, et son assiette pour le
      // basculer comme la carte.
      ancre: P(0, 58, verso > recto ? zAr + 2 : zAv - 2),
      angle: verso > recto ? Math.PI - rY : -rY,
      rX: vue.rX,
      visible: CONFIG.boutonSurLesDeuxFaces ? vis : verso
    };
  }

  /* ---------- copie du lien ---------- */

  function secours(txt, fini) {
    var z = doc.createElement('textarea');
    z.value = txt;
    z.setAttribute('readonly', '');
    z.style.position = 'fixed';
    z.style.opacity = '0';
    doc.body.appendChild(z);
    z.select();
    try { doc.execCommand('copy'); fini(); } catch (e) { /* rien à faire */ }
    doc.body.removeChild(z);
  }

  function copier(btn) {
    var url = CONFIG.lien || location.href;
    function fini() {
      btn.textContent = CONFIG.copie;
      btn.setAttribute('data-fait', '1');
      setTimeout(function () {
        btn.textContent = CONFIG.copier;
        btn.removeAttribute('data-fait');
      }, 2200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(fini, function () { secours(url, fini); });
    } else {
      secours(url, fini);
    }
  }

  /* ---------- montage ---------- */

  function demarre() {
    if (doc.getElementById('logo-holo')) return;

    var section = doc.createElement('section');
    section.className = 'lh';
    section.id = 'logo-holo';
    section.setAttribute('aria-label', CONFIG.mot + ' — ' + CONFIG.sous);

    var gyroSurDemande = typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function';

    section.innerHTML =
      '<div class="lh__rail"><div class="lh__ecran">' +
        '<canvas class="lh__canvas"></canvas>' +
        '<div class="lh__scan" aria-hidden="true"></div>' +
        '<div class="lh__lueur" aria-hidden="true"></div>' +
        '<h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">' +
          CONFIG.mot + ' — ' + CONFIG.sous + '. ' + CONFIG.ligne + '.' +
        '</h2>' +
        '<p class="lh__prise">' + CONFIG.prise + '</p>' +
        '<button type="button" class="lh__bouton lh__copier">' + CONFIG.copier + '</button>' +
        '<div class="lh__actions">' +
          (gyroSurDemande ? '<button type="button" class="lh__bouton lh__relief">' + CONFIG.relief + '</button>' : '') +
        '</div>' +
        '<div class="lh__hud" aria-hidden="true">' +
          '<span class="lh__etat">Trame</span>' +
          '<div class="lh__barre"><i class="lh__remplissage"></i></div>' +
        '</div>' +
      '</div></div>';

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
    var prise = section.querySelector('.lh__prise');
    var actions = section.querySelector('.lh__actions');
    var btnCopier = section.querySelector('.lh__copier');
    var btnRelief = section.querySelector('.lh__relief');
    var ctx = canvas.getContext('2d', { alpha: false });
    var W = 0, H = 0, visible = false, boucle = 0;

    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', CONFIG.mot + ', ' + CONFIG.sous);

    function taille() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    btnCopier.addEventListener('click', function () { copier(btnCopier); });

    if (reduit) {
      section.classList.add('lh--statique');
      taille();
      rendu(ctx, W, H, 1, 0);
      actions.classList.add('est-visible');
      return;
    }

    rail.style.height = (CONFIG.longueur * 100) + 'vh';

    /* --- doigt --- */
    var depart = null, dernier = 0, tDepart = 0, bouge = 0;

    canvas.addEventListener('pointerdown', function (e) {
      depart = { x: e.clientX, y: e.clientY };
      dernier = e.clientX;
      tDepart = Date.now();
      bouge = 0;
      main.touche = true;
      main.vit = 0;
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!depart) return;
      var d = (e.clientX - dernier) * 0.006;
      main.rot += d;
      main.vit = d;
      bouge += Math.abs(e.clientX - dernier);
      main.inc = borne(main.inc + (e.clientY - depart.y) * 0.00004, -0.4, 0.4);
      dernier = e.clientX;
      pris();
    });

    function relache(e) {
      if (!depart) return;
      // Geste court et immobile : c'est une touche, on retourne l'objet.
      if (bouge < 12 && Date.now() - tDepart < 400) {
        main.but = main.but ? 0 : 1;
        main.vit = 0;
      }
      depart = null;
      main.touche = false;
      pris();
      if (canvas.releasePointerCapture && e && e.pointerId != null) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
      }
    }

    canvas.addEventListener('pointerup', relache);
    canvas.addEventListener('pointercancel', relache);

    function pris() {
      if (main.active) return;
      main.active = true;
      prise.classList.remove('est-visible');
    }

    /* --- gyroscope --- */
    function brancheGyro() {
      window.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null) return;
        main.gyC = borne(e.gamma / 60, -1, 1) * 0.45;
        main.gxC = borne((e.beta - 50) / 70, -1, 1) * 0.18;
      });
    }

    if (btnRelief) {
      btnRelief.addEventListener('click', function () {
        DeviceOrientationEvent.requestPermission().then(function (rep) {
          if (rep === 'granted') brancheGyro();
          btnRelief.parentNode.removeChild(btnRelief);
        }).catch(function () { /* refusé : le doigt suffit */ });
      });
    } else {
      brancheGyro();
    }

    function image(ms) {
      var t = ms / 1000;
      var r = rail.getBoundingClientRect();
      var course = rail.offsetHeight - window.innerHeight;
      var p = course <= 0 ? 0 : borne(-r.top / course, 0, 1);

      physique();
      var e = rendu(ctx, W, H, p, t);

      remplissage.style.width = (p * 100).toFixed(2) + '%';
      etat.textContent = e.libre > 0.5 ? CONFIG.etats[3]
        : e.circ > 0.2 ? CONFIG.etats[2]
        : e.volume > 0.2 ? CONFIG.etats[1] : CONFIG.etats[0];

      prise.classList.toggle('est-visible', e.libre > 0.6 && !main.active);
      actions.classList.toggle('est-visible', e.libre > 0.6);

      // Le bouton suit la face arrière : même position, même inclinaison.
      if (e.libre > 0.4 && e.visible > 0.04) {
        var deg = 180 / Math.PI;
        btnCopier.style.opacity = Math.min(1, e.visible * 1.7).toFixed(2);
        btnCopier.style.transform =
          'translate(-50%,-50%) translate(' + e.ancre.x.toFixed(1) + 'px,' + e.ancre.y.toFixed(1) + 'px)' +
          ' perspective(620px)' +
          ' rotateY(' + (e.angle * deg).toFixed(2) + 'deg)' +
          ' rotateX(' + (-e.rX * deg).toFixed(2) + 'deg)' +
          ' scale(' + borne(e.ancre.f, 0.55, 1.7).toFixed(3) + ')';
        btnCopier.style.pointerEvents = e.visible > 0.55 ? 'auto' : 'none';
      } else if (btnCopier.style.opacity !== '0') {
        btnCopier.style.opacity = '0';
        btnCopier.style.pointerEvents = 'none';
      }

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
