/* YOHJ — « Séquence de démarrage »
   Au premier chargement du site, un écran de boot façon terminal s'affiche :
   le système YOHJ s'initialise ligne par ligne, puis laisse place au site.
   - S'affiche une seule fois par session (pas à chaque page / retour)
   - Toucher l'écran passe la séquence
   - Respecte prefers-reduced-motion (aucun écran)

   Installation :
   1. Charger boot.css dans le <head>
   2. Charger <script src="boot.js"></script> (SANS defer) juste après <body> */

(function () {
  'use strict';

  if (window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try {
    if (sessionStorage.getItem('yohj-boot')) return;
    sessionStorage.setItem('yohj-boot', '1');
  } catch (e) { /* stockage indisponible : on affiche quand même */ }

  var LINES = [
    ['Initialisation du noyau', 'OK'],
    ['Réseau', 'OK'],
    ['Pare-feu', 'ACTIF'],
    ['Sauvegardes', 'À JOUR'],
    ['Services', '6/6'],
    ["Lancement de l'interface", '']
  ];

  var overlay = document.createElement('div');
  overlay.className = 'yohj-boot';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML =
    '<div class="yohj-boot-inner">' +
      '<div class="yohj-boot-logo"><img src="assets/logo-boot.webp" alt="YOHJ"></div>' +
      '<div class="yohj-boot-log"></div>' +
      '<div class="yohj-boot-bar"><span></span></div>' +
      '<p class="yohj-boot-skip">Toucher pour passer</p>' +
    '</div>';
  (document.body || document.documentElement).appendChild(overlay);

  /* Si le logo n'est pas trouvé dans assets/, on essaie les autres
     emplacements possibles ; en dernier recours, on le masque. */
  var img = overlay.querySelector('.yohj-boot-logo img');
  var altSrcs = ['logo-boot.webp', 'assets/logo-concept-a.png'];
  img.onerror = function () {
    var next = altSrcs.shift();
    if (next) { img.src = next; }
    else { img.onerror = null; img.parentNode.style.display = 'none'; }
  };

  var log = overlay.querySelector('.yohj-boot-log');
  var bar = overlay.querySelector('.yohj-boot-bar span');
  var done = false;
  var timers = [];

  function pad(label) {
    var dots = Math.max(3, 28 - label.length);
    return label + ' ' + new Array(dots + 1).join('.') + ' ';
  }

  function addLine(i) {
    if (i >= LINES.length) { finish(); return; }
    var row = document.createElement('p');
    row.innerHTML =
      '<span class="p">&gt;</span> ' + pad(LINES[i][0]) +
      (LINES[i][1] ? '<b>' + LINES[i][1] + '</b>' : '<i class="c"></i>');
    log.appendChild(row);
    bar.style.width = Math.round(((i + 1) / LINES.length) * 100) + '%';
    timers.push(setTimeout(function () { addLine(i + 1); },
      i === LINES.length - 1 ? 480 : 235));
  }

  function finish() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    bar.style.width = '100%';
    overlay.classList.add('yohj-boot-out');
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 600);
  }

  overlay.addEventListener('pointerdown', finish);
  timers.push(setTimeout(function () { addLine(0); }, 120));
  timers.push(setTimeout(finish, 4500)); // garde-fou : jamais bloquant
})();
