/* conception.js — hologramme de conception d'un site web, scrubbé au scroll.
   Une page se décompose en quatre couches, chacune passée en revue,
   puis tout se referme sur le site publié. Moteur 3D maison, aucun asset. */
(function () {
  'use strict';

  var CONFIG = {
    // Placement : juste avant la section des tarifs. Premier sélecteur trouvé ;
    // à défaut, la section dont le titre parle de tarifs.
    avant: ['#tarifs', '#tarif', '#estimation', '.tarifs', '[data-tarifs]'],
    // Numéro affiché dans la première étape, si tu numérotes tes sections.
    // Mets '05' et renumérote tarifs en 06, contact en 07. Vide = pas de numéro.
    numero: '',
    longueur: 3.6,          // hauteurs d'écran occupées par la séquence
    duree: 14,              // compteur affiché, en secondes
    ecarte: 112,            // écartement des couches
    domaine: 'votre-entreprise.fr',
    couches: ['Grille', 'Structure', 'Habillage', 'Contenu'],
    etapes: [
      {
        code: 'Cadrage',
        titre: 'À quoi sert la page ?',
        texte: 'Confirmer une recommandation, décrocher un appel, prendre un rendez-vous : ce ne sont pas les mêmes pages. On part de là.'
      },
      {
        code: 'Structure',
        titre: 'L’ossature avant la décoration.',
        texte: 'Ce qu’on lit en premier, ce qu’on trouve en trois secondes, et où se trouve le bouton pour vous joindre.'
      },
      {
        code: 'Habillage et contenu',
        titre: 'Vos mots, vos images, vos couleurs.',
        texte: 'Rien de générique, rien acheté sur étagère. Écrit et dessiné pour votre activité, lisible d’abord sur téléphone.'
      },
      {
        code: 'Mise en ligne',
        titre: 'Publié, sécurisé, et à vous.',
        texte: 'Nom de domaine, certificat, sauvegarde. Vous restez propriétaire de tout, et vous savez le modifier vous-même.'
      }
    ]
  };

  var doc = document;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Hauteur réelle de la fenêtre. Sur mobile, 100vh vaut la hauteur barre
     d'adresse rétractée : le bas de la section — donc le texte — sort de
     l'écran. On mesure innerHeight, en ignorant les variations de la barre
     pour ne pas faire sauter la mise en page pendant le défilement. */
  var hMemo = 0;
  function calage() {
    var h = window.innerHeight;
    if (Math.abs(h - hMemo) < 90) return;
    hMemo = h;
    doc.documentElement.style.setProperty('--cq-vh', (h / 100) + 'px');
  }
  calage();

  var CYAN = '#35e8ff', BLEU = '#4f8dff', ACCENT = '#b58cff', BLANC = '#dff3ff';
  var Z = [-1, -0.34, 0.34, 1];    // position relative des quatre couches

  function borne(v, a, b) { return v < a ? a : v > b ? b : v; }
  function adouci(v) { return v * v * (3 - 2 * v); }
  function palier(p, a, b) { return adouci(borne((p - a) / (b - a), 0, 1)); }
  function melange(a, b, k) { return a + (b - a) * k; }

  function fenetre(p, debut, fin, fondu) {
    if (p < debut - fondu || p > fin + fondu) return 0;
    if (p < debut) return adouci((p - debut + fondu) / fondu);
    if (p > fin) return adouci((fin + fondu - p) / fondu);
    return 1;
  }

  function mmss(s) {
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ---------- la page, en coordonnées locales (x -160..160, y -105..105) ---------- */

  var ENTETE = [-160, -105, 320, 24];
  var HERO = [-160, -81, 320, 88];
  var IMAGE = [44, -66, 104, 62];
  var CTA = [-142, -22, 66, 18];
  var PIED = [-160, 81, 320, 24];
  var CARTES = [[-152, 19, 96, 60], [-48, 19, 96, 60], [56, 19, 96, 60]];
  var TITRES = [[-142, -60, 148, 10], [-142, -44, 104, 10]];
  var NAV = [[72, -97, 24, 6], [102, -97, 24, 6], [132, -97, 24, 6]];

  /* ---------- projection ---------- */

  var vue = { rY: 0, rX: 0, w: 0, h: 0, ech: 1, ancre: 0.42 };

  function P(x, y, z) {
    var cy = Math.cos(vue.rY), sy = Math.sin(vue.rY);
    var X = x * cy - z * sy, Zr = x * sy + z * cy;
    var cx = Math.cos(vue.rX), sx = Math.sin(vue.rX);
    var Y = y * cx - Zr * sx; Zr = y * sx + Zr * cx;
    var d = 660;
    var f = (d * vue.ech) / (d + Zr);
    return { x: vue.w / 2 + X * f, y: vue.h * vue.ancre + Y * f, f: f };
  }

  function quad(ctx, x, y, w, h, z, plein) {
    var a = P(x, y, z), b = P(x + w, y, z), c = P(x + w, y + h, z), d = P(x, y + h, z);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
    plein ? ctx.fill() : ctx.stroke();
  }

  function ligne(ctx, x1, y1, x2, y2, z) {
    var a = P(x1, y1, z), b = P(x2, y2, z);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  /* ---------- les quatre couches ---------- */

  function coucheGrille(ctx, z) {
    ctx.lineWidth = 1;
    for (var i = 0; i <= 12; i++) {
      var x = -160 + i * (320 / 12);
      ligne(ctx, x, -105, x, 105, z);
    }
    for (var y = -105; y <= 105; y += 15) ligne(ctx, -160, y, 160, y, z);
    ctx.lineWidth = 1.4;
    quad(ctx, -160, -105, 320, 210, z, false);
  }

  function coucheStructure(ctx, z) {
    ctx.lineWidth = 1.2;
    quad(ctx, ENTETE[0], ENTETE[1], ENTETE[2], ENTETE[3], z, false);
    quad(ctx, HERO[0], HERO[1], HERO[2], HERO[3], z, false);
    quad(ctx, PIED[0], PIED[1], PIED[2], PIED[3], z, false);
    CARTES.forEach(function (c) { quad(ctx, c[0], c[1], c[2], c[3], z, false); });
    // Emplacement d'image : la croix, comme sur une maquette papier.
    quad(ctx, IMAGE[0], IMAGE[1], IMAGE[2], IMAGE[3], z, false);
    ligne(ctx, IMAGE[0], IMAGE[1], IMAGE[0] + IMAGE[2], IMAGE[1] + IMAGE[3], z);
    ligne(ctx, IMAGE[0] + IMAGE[2], IMAGE[1], IMAGE[0], IMAGE[1] + IMAGE[3], z);
    ctx.lineWidth = 1;
    quad(ctx, CTA[0], CTA[1], CTA[2], CTA[3], z, false);
  }

  function coucheHabillage(ctx, z, alpha) {
    var a = ctx.globalAlpha;
    ctx.globalAlpha = a * 0.22;
    quad(ctx, HERO[0], HERO[1], HERO[2], HERO[3], z, true);
    ctx.globalAlpha = a * 0.16;
    quad(ctx, ENTETE[0], ENTETE[1], ENTETE[2], ENTETE[3], z, true);
    quad(ctx, PIED[0], PIED[1], PIED[2], PIED[3], z, true);
    ctx.globalAlpha = a * 0.2;
    CARTES.forEach(function (c) { quad(ctx, c[0], c[1], c[2], c[3], z, true); });
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = ACCENT;
    quad(ctx, CTA[0], CTA[1], CTA[2], CTA[3], z, true);
    ctx.globalAlpha = a;
  }

  function coucheContenu(ctx, z) {
    var a = ctx.globalAlpha;
    ctx.globalAlpha = a * 0.9;
    TITRES.forEach(function (t) { quad(ctx, t[0], t[1], t[2], t[3], z, true); });
    ctx.globalAlpha = a * 0.6;
    NAV.forEach(function (n) { quad(ctx, n[0], n[1], n[2], n[3], z, true); });
    quad(ctx, -152, -99, 30, 12, z, true);                       // marque
    quad(ctx, IMAGE[0], IMAGE[1], IMAGE[2], IMAGE[3], z, true);  // photo
    CARTES.forEach(function (c) {
      ctx.globalAlpha = a * 0.75;
      quad(ctx, c[0] + 8, c[1] + 8, c[2] - 16, 5, z, true);
      ctx.globalAlpha = a * 0.45;
      quad(ctx, c[0] + 8, c[1] + 20, c[2] - 16, 4, z, true);
      quad(ctx, c[0] + 8, c[1] + 29, c[2] - 30, 4, z, true);
      quad(ctx, c[0] + 8, c[1] + 38, c[2] - 22, 4, z, true);
    });
    ctx.globalAlpha = a * 0.5;
    quad(ctx, -150, 90, 60, 5, z, true);
    quad(ctx, 90, 90, 60, 5, z, true);
    ctx.globalAlpha = a;
  }

  var COUCHES = [coucheGrille, coucheStructure, coucheHabillage, coucheContenu];

  /* ---------- chrome du navigateur, à la toute fin ---------- */

  function navigateur(ctx, k, t) {
    ctx.globalAlpha = k;
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1.4;
    ctx.shadowBlur = 12; ctx.shadowColor = CYAN;
    quad(ctx, -176, -136, 352, 262, 0, false);
    ctx.shadowBlur = 0;
    ligne(ctx, -176, -112, 176, -112, 0);

    ctx.fillStyle = CYAN;
    ctx.globalAlpha = k * 0.6;
    [-166, -158, -150].forEach(function (x) { quad(ctx, x, -127, 5, 5, 0, true); });

    ctx.globalAlpha = k * 0.3;
    quad(ctx, -132, -130, 214, 12, 0, true);

    // Cadenas.
    ctx.globalAlpha = k * 0.9;
    quad(ctx, -126, -125, 5, 5, 0, true);
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1;
    ligne(ctx, -125.5, -125, -125.5, -127, 0);
    ligne(ctx, -122, -125, -122, -127, 0);

    // Adresse, en projection.
    var an = P(-114, -121.5, 0);
    ctx.globalAlpha = k;
    ctx.fillStyle = BLANC;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '500 ' + Math.max(8, Math.round(9 * an.f)) + 'px ui-monospace, Menlo, monospace';
    ctx.fillText(CONFIG.domaine, an.x, an.y);

    // Curseur qui vient se poser sur le bouton.
    var cur = P(CTA[0] + CTA[2] - 12, CTA[1] + CTA[3] - 3, 0);
    var pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.globalAlpha = k;
    ctx.fillStyle = BLANC;
    ctx.beginPath();
    ctx.moveTo(cur.x, cur.y);
    ctx.lineTo(cur.x, cur.y + 15);
    ctx.lineTo(cur.x + 4, cur.y + 11);
    ctx.lineTo(cur.x + 10, cur.y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = k * (1 - pulse) * 0.7;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cur.x, cur.y, 6 + pulse * 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ---------- rendu ---------- */

  function rendu(ctx, w, h, p, t) {
    var acq = palier(p, 0.00, 0.12);
    var ecl = palier(p, 0.14, 0.42);
    var repli = palier(p, 0.72, 0.92);
    var fini = palier(p, 0.86, 0.99);
    var ouvert = ecl * (1 - repli);
    var revue = borne((p - 0.44) / 0.26, 0, 1);      // passage en revue des couches
    var actif = p > 0.44 && p < 0.72 ? Math.min(3, Math.floor(revue * 4)) : -1;

    // Le texte occupe le bas : l'objet ne tient compte que de la zone haute.
    var etroit = w < 520 || h < 720;
    var zone = h * (etroit ? 0.50 : 0.72);
    vue.w = w; vue.h = h;
    vue.ancre = etroit ? 0.27 : 0.40;
    vue.ech = Math.min(w / (etroit ? 400 : 420), zone / 300);
    vue.rY = melange(-0.92, 0.03, palier(p, 0.04, 0.94)) + Math.sin(t * 0.35) * 0.05 * (1 - fini);
    vue.rX = melange(0.44, 0.05, palier(p, 0.10, 0.94));

    ctx.fillStyle = '#04070d';
    ctx.fillRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    var ecarte = CONFIG.ecarte * (etroit ? 0.68 : 1);

    // Couches, de l'arrière vers l'avant.
    for (var i = 0; i < 4; i++) {
      var z = Z[i] * ecarte * ouvert;
      var att = actif === -1 ? 1 : (actif === i ? 1 : 0.22);
      var vis = acq * melange(1, att, borne(revue * 3, 0, 1) * (1 - repli));
      var col = i === 3 ? BLANC : (i === 0 ? '#2f6d86' : CYAN);

      ctx.globalAlpha = vis * (i === 0 ? 0.5 : 0.85);
      ctx.strokeStyle = col;
      ctx.fillStyle = i === 3 ? BLEU : CYAN;
      ctx.shadowBlur = actif === i ? 10 : 0;
      ctx.shadowColor = CYAN;
      COUCHES[i](ctx, z, vis);
      ctx.shadowBlur = 0;
    }

    // Étiquettes des couches, pendant l'éclatement.
    // Étiquettes : colonne calée sur le bord droit du cadre, au-dessus de la
    // zone de texte. La largeur du mot est mesurée avant de tracer, donc
    // aucune ne peut sortir de l'écran, même en 360 px de large.
    var etiq = fenetre(p, 0.30, 0.70, 0.09);
    if (etiq > 0.01) {
      ctx.font = '500 ' + (etroit ? 10 : 11) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.lineWidth = 1;
      var xEt = w - (etroit ? 10 : 18);
      var pas = etroit ? 17 : 21;
      var yEt = h * (etroit ? 0.10 : 0.13);
      for (var j = 0; j < 4; j++) {
        var zj = Z[j] * ecarte * ouvert;
        var an = P(160, -105, zj);                       // coin haut-droit du plan
        var ax = borne(an.x, 8, w - 8), ay = borne(an.y, 8, h * 0.70);
        var y = yEt + j * pas;
        var mot = CONFIG.couches[j].toUpperCase();
        var larg = ctx.measureText(mot).width;
        var vif = actif === -1 || actif === j;
        ctx.globalAlpha = etiq * (vif ? 1 : 0.28);
        ctx.strokeStyle = vif ? CYAN : '#3d6a80';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(xEt - larg - 16, y);
        ctx.lineTo(xEt - larg - 6, y);
        ctx.stroke();
        ctx.fillStyle = vif ? CYAN : '#5f8ba0';
        ctx.beginPath(); ctx.arc(ax, ay, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillText(mot, xEt, y);
      }
    }

    // Balayage pendant la revue.
    if (revue > 0 && revue < 1) {
      var y = ((t * 110) % (h + 200)) - 100;
      var g = ctx.createLinearGradient(0, y - 60, 0, y + 60);
      g.addColorStop(0, 'rgba(53,232,255,0)');
      g.addColorStop(0.5, 'rgba(53,232,255,0.10)');
      g.addColorStop(1, 'rgba(53,232,255,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 60, w, 120);
    }

    if (fini > 0.01) navigateur(ctx, fini, t);

    ctx.globalAlpha = 1;
    return { ecl: ecl, actif: actif, fini: fini, rY: vue.rY };
  }

  /* ---------- montage ---------- */

  function demarre() {
    if (doc.getElementById('conception')) return;

    var section = doc.createElement('section');
    section.className = 'cq';
    section.id = 'conception';
    section.setAttribute('aria-label', 'Comment je conçois un site');

    var etapes = CONFIG.etapes.map(function (e, i) {
      var code = (i === 0 && CONFIG.numero ? CONFIG.numero + ' — ' : '') + e.code;
      return '<div class="cq__etape">' +
        '<p class="cq__code">' + code + '</p>' +
        '<h2 class="cq__titre">' + e.titre + '</h2>' +
        '<p class="cq__texte">' + e.texte + '</p>' +
        '</div>';
    }).join('');

    section.innerHTML =
      '<div class="cq__rail"><div class="cq__ecran">' +
        '<canvas class="cq__canvas" aria-hidden="true"></canvas>' +
        '<div class="cq__scan" aria-hidden="true"></div>' +
        '<div class="cq__lueur" aria-hidden="true"></div>' +
        '<div class="cq__voile" aria-hidden="true"></div>' +
        '<div class="cq__cadre" aria-hidden="true">' +
          '<i class="cq__coin cq__coin--hg"></i><i class="cq__coin cq__coin--hd"></i>' +
          '<i class="cq__coin cq__coin--bg"></i><i class="cq__coin cq__coin--bd"></i>' +
        '</div>' +
        '<div class="cq__tele" aria-hidden="true">' +
          '<div><span>Couches</span> <b class="cq__t1">0 / 4</b></div>' +
          '<div><span>Vue</span> <b class="cq__t2">000°</b></div>' +
          '<div><span>État</span> <b class="cq__t3">—</b></div>' +
        '</div>' +
        '<div class="cq__textes">' + etapes + '</div>' +
        '<div class="cq__hud" aria-hidden="true">' +
          '<span class="cq__tc cq__pos">00:00</span>' +
          '<div class="cq__barre"><i class="cq__remplissage"></i></div>' +
          '<span class="cq__tc">' + mmss(CONFIG.duree) + '</span>' +
        '</div>' +
      '</div></div>';

    // tarifs.js construit sa propre section : si elle n'est pas encore dans le
    // DOM au moment où ce script démarre, on réessaie brièvement avant de se
    // rabattre sur la section contact.
    var essais = 0;
    (function poser() {
      var but = null, i;
      for (i = 0; i < CONFIG.avant.length && !but; i++) but = doc.querySelector(CONFIG.avant[i]);
      if (!but) {
        var titres = doc.querySelectorAll('h1, h2, h3');
        for (i = 0; i < titres.length && !but; i++) {
          if (/tarif|prix|devis/i.test(titres[i].textContent || '')) {
            but = titres[i];
            while (but.parentNode && but.parentNode !== doc.body) but = but.parentNode;
          }
        }
      }
      if (!but && ++essais < 12) { setTimeout(poser, 150); return; }
      if (!but) but = doc.querySelector('#contact');
      if (but && but.parentNode) but.parentNode.insertBefore(section, but);
      else doc.body.appendChild(section);
      active();
    })();

    function active() {
    var rail = section.querySelector('.cq__rail');
    var canvas = section.querySelector('.cq__canvas');
    var blocs = section.querySelectorAll('.cq__etape');
    var remplissage = section.querySelector('.cq__remplissage');
    var pos = section.querySelector('.cq__pos');
    var t1 = section.querySelector('.cq__t1');
    var t2 = section.querySelector('.cq__t2');
    var t3 = section.querySelector('.cq__t3');
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
      section.classList.add('cq--statique');
      taille();
      rendu(ctx, W, H, 0.95, 0);
      return;
    }

    rail.style.height = (CONFIG.longueur * 100) + 'vh';
    var FEN = [[0.00, 0.10], [0.24, 0.40], [0.50, 0.68], [0.84, 1.00]];

    function image(ms) {
      var t = ms / 1000;
      var r = rail.getBoundingClientRect();
      var course = rail.offsetHeight - window.innerHeight;
      var p = course <= 0 ? 0 : borne(-r.top / course, 0, 1);
      var etat = rendu(ctx, W, H, p, t);

      for (var i = 0; i < blocs.length; i++) {
        var o = fenetre(p, FEN[i][0], FEN[i][1], 0.07);
        blocs[i].style.opacity = o;
        blocs[i].style.transform = 'translateY(' + ((1 - o) * 14) + 'px)';
      }

      remplissage.style.width = (p * 100).toFixed(2) + '%';
      pos.textContent = mmss(p * CONFIG.duree);
      t1.textContent = Math.round(etat.ecl * 4) + ' / 4';
      t2.textContent = ('00' + Math.round((etat.rY * 180 / Math.PI + 720) % 360)).slice(-3) + '°';
      t3.textContent = etat.fini > 0.5 ? 'En ligne'
        : etat.actif >= 0 ? CONFIG.couches[etat.actif]
        : etat.ecl > 0.1 ? 'Décomposition' : 'Cadrage';

      if (visible) boucle = requestAnimationFrame(image);
    }

    var oeil = new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      doc.dispatchEvent(new CustomEvent('yohj:conception', { detail: { visible: visible } }));
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
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', demarre);
  else demarre();
})();
