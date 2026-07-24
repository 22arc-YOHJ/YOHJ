/* ============================================================
   YOHJ — Fusée de retour en haut
   fusee.js  ·  s'injecte tout seul. index.html n'a besoin que de :
     <link rel="stylesheet" href="fusee.css">     dans le head
     <script src="fusee.js" defer><\/script>      avant la fin du body

   Au clic, la fusée quitte le pied de page et remonte réellement
   jusqu'au header, en tirant la page avec elle.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- CONFIG — les seules valeurs à ajuster ---------- */

  const CONFIG = {
    // Où poser la fusée. Premier sélecteur trouvé qui gagne.
    // Si aucun ne correspond, elle devient un bouton flottant en bas à gauche.
    cible: ['footer', '.footer', '#footer'],

    // Où elle doit arriver, en haut de page. Premier trouvé qui gagne.
    arrivee: ['header', '.header', '#header', '.hero', 'h1'],

    // Le logo du bas de page à remplacer. Laisse '' pour ne rien masquer.
    // Exemple : '.footer-logo' ou 'footer img'
    logoARemplacer: '.footer-brand',

    // Mot sous la fusée. Mets '' pour n'afficher que le dessin.
    legende: 'Retour en haut',

    // Durée du vol en millisecondes. La page remonte exactement au même rythme.
    duree: 1500,

    // En mode flottant seulement : hauteur de défilement à partir de laquelle
    // la fusée apparaît, en pixels.
    seuil: 500
  };

  /* ---------- Le dessin ---------- */

  const SVG = `
    <svg class="fusee__svg" viewBox="0 0 64 96" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fusee-coque" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#12233d"/>
          <stop offset="100%" stop-color="#081524"/>
        </linearGradient>
        <linearGradient id="fusee-feu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffd79a"/>
          <stop offset="45%" stop-color="#ffb454"/>
          <stop offset="100%" stop-color="#ff6a3d" stop-opacity="0"/>
        </linearGradient>
      </defs>

      <g class="fusee__flamme">
        <path d="M32 70 C26 79 24 86 32 94 C40 86 38 79 32 70 Z" fill="url(#fusee-feu)"/>
      </g>

      <path d="M22 50 C12 58 10 66 12 72 L22 66 Z" fill="#0d1c30" stroke="#2f7dff" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M42 50 C52 58 54 66 52 72 L42 66 Z" fill="#0d1c30" stroke="#2f7dff" stroke-width="1.6" stroke-linejoin="round"/>

      <path d="M32 2 C44 16 48 34 48 52 C48 62 44 68 32 72 C20 68 16 62 16 52 C16 34 20 16 32 2 Z"
            fill="url(#fusee-coque)" stroke="#35c6ff" stroke-width="2" stroke-linejoin="round"/>

      <circle cx="32" cy="32" r="8" fill="#04101f" stroke="#35c6ff" stroke-width="2"/>
      <circle cx="32" cy="32" r="3.4" fill="#35c6ff" opacity=".65"/>

      <path d="M25 70 L39 70 L36 76 L28 76 Z" fill="#0d1c30" stroke="#2f7dff" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M22 56 L42 56" stroke="#2f7dff" stroke-width="1.4" opacity=".65"/>
    </svg>`;

  /* ---------- Construction ---------- */

  const zone = document.createElement('div');
  zone.className = 'fusee-zone';
  zone.innerHTML = `
    <button class="fusee" type="button" aria-label="Remonter en haut de la page">
      ${SVG}
      <span class="fusee__fumee" aria-hidden="true">
        <span class="fusee__bouffee" style="--derive:-22px"></span>
        <span class="fusee__bouffee" style="--derive:18px"></span>
        <span class="fusee__bouffee" style="--derive:-12px"></span>
        <span class="fusee__bouffee" style="--derive:26px"></span>
      </span>
    </button>
    ${CONFIG.legende ? `<span class="fusee-legende">${CONFIG.legende}</span>` : ''}`;

  function trouver(liste) {
    for (const sel of liste) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // Le logo désigné cède sa place : la fusée s'insère exactement là où il était.
  const logo = CONFIG.logoARemplacer ? document.querySelector(CONFIG.logoARemplacer) : null;
  if (logo) logo.style.display = 'none';

  const hote = trouver(CONFIG.cible);
  if (logo && logo.parentNode) {
    logo.parentNode.insertBefore(zone, logo);
  } else if (hote) {
    hote.appendChild(zone);
  } else {
    zone.classList.add('fusee-zone--flottante');
    document.body.appendChild(zone);
    const surveiller = () => zone.classList.toggle('est-visible', window.scrollY > CONFIG.seuil);
    window.addEventListener('scroll', surveiller, { passive: true });
    surveiller();
  }

  /* ---------- Le vol ---------- */

  const fusee = zone.querySelector('.fusee');
  const sobre = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let enVol = false;

  function adoucir(p) {  // easeInOutCubic
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }

  function trainee(x, y) {
    const puff = document.createElement('span');
    puff.className = 'fusee-trainee';
    puff.style.left = x + 'px';
    puff.style.top = y + 'px';
    document.body.appendChild(puff);
    setTimeout(() => puff.remove(), 900);
  }

  function decoller() {
    if (enVol) return;
    if (sobre) { window.scrollTo({ top: 0, behavior: 'auto' }); return; }
    enVol = true;

    const depart = fusee.getBoundingClientRect();
    const scrollDepart = window.scrollY;

    // Point d'arrivée : le header, tel qu'il sera une fois la page en haut
    const arrivee = trouver(CONFIG.arrivee);
    let finX, finY;
    if (arrivee) {
      const r = arrivee.getBoundingClientRect();
      const fixe = ['fixed', 'sticky'].includes(getComputedStyle(arrivee).position);
      finX = r.left + (r.width - depart.width) / 2;
      finY = r.top + (fixe ? 0 : scrollDepart) + Math.max(0, (r.height - depart.height) / 2);
    } else {
      finX = (window.innerWidth - depart.width) / 2;
      finY = 16;
    }
    finY = Math.max(12, Math.min(finY, window.innerHeight - depart.height - 12));

    // Une copie en vol, pour que la fusée traverse la page sans être
    // découpée par le pied de page.
    const vaisseau = fusee.cloneNode(true);
    vaisseau.className = 'fusee fusee-vol';
    vaisseau.setAttribute('aria-hidden', 'true');
    vaisseau.setAttribute('tabindex', '-1');
    vaisseau.style.left = depart.left + 'px';
    vaisseau.style.top = depart.top + 'px';
    vaisseau.style.width = depart.width + 'px';
    vaisseau.style.height = depart.height + 'px';
    document.body.appendChild(vaisseau);

    fusee.style.visibility = 'hidden';
    fusee.classList.add('est-allumee');
    zone.classList.add('est-en-vol');

    const t0 = performance.now();
    let dernierePuff = 0;

    function pas(maintenant) {
      const p = Math.min(1, (maintenant - t0) / CONFIG.duree);
      const e = adoucir(p);

      // la page remonte au même rythme que la fusée
      window.scrollTo(0, scrollDepart * (1 - e));

      const dx = (finX - depart.left) * e;
      const dy = (finY - depart.top) * e;
      const balance = Math.sin(e * Math.PI * 2) * 2.5;   // léger roulis
      vaisseau.style.transform =
        'translate(' + dx + 'px,' + dy + 'px) rotate(' + balance + 'deg)';

      if (maintenant - dernierePuff > 55 && p < .92) {
        dernierePuff = maintenant;
        trainee(depart.left + dx + depart.width / 2, depart.top + dy + depart.height - 4);
      }

      if (p < 1) requestAnimationFrame(pas);
      else atterrir(vaisseau);
    }
    requestAnimationFrame(pas);
  }

  function atterrir(vaisseau) {
    vaisseau.classList.add('est-arrivee');
    setTimeout(() => {
      vaisseau.remove();
      fusee.style.visibility = '';
      fusee.classList.remove('est-allumee');
      zone.classList.remove('est-en-vol');
      fusee.classList.add('est-revenue');
      setTimeout(() => { fusee.classList.remove('est-revenue'); enVol = false; }, 560);
    }, 620);
  }

  fusee.addEventListener('click', decoller);
})();
