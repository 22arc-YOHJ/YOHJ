/* ============================================================
   YOHJ — Estimateur de tarif
   Fichier unique et autonome. Injecte son style, construit sa
   section, se place avant le contact et reporte l'estimation
   dans le formulaire.

   Une seule ligne à ajouter dans index.html, avant </body> :
   <script src="tarifs.js" defer></script>

   ------------------------------------------------------------
   TOUS LES PRIX SONT DANS LE BLOC CONFIG CI-DESSOUS.
   Les valeurs livrées sont des repères de marché Île-de-France
   2026, pas vos tarifs. Relisez-les ligne par ligne avant de
   publier : un prix affiché vous engage.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- CONFIG ---------- */

  var CONFIG = {
    numeroSection: '05',

    tauxSurPlace: 55,      // € / heure sur site
    tauxADistance: 45,     // € / heure en télémaintenance

    /* Déplacement selon la distance. Le dernier palier vaut au-delà. */
    deplacement: [
      { label: 'Moins de 15 km', prix: 0 },
      { label: '15 à 30 km', prix: 15 },
      { label: 'Plus de 30 km', prix: 25 }
    ],

    delais: [
      { label: 'Dans la semaine', coef: 1 },
      { label: 'Sous 48 heures', coef: 1.15 },
      { label: "Aujourd'hui", coef: 1.35 }
    ],

    postes: [
      { label: '1 poste', coef: 1 },
      { label: '2 à 3 postes', coef: 1.7 },
      { label: '4 postes ou plus', coef: 2.6 }
    ],

    /* Durées estimées en heures [min, max], ou forfait [min, max] en €. */
    prestations: [
      { nom: 'Dépannage & maintenance', glyphe: '⌘', heures: [1, 2] },
      { nom: 'Cybersécurité', glyphe: '⬡', heures: [1.5, 3] },
      { nom: 'Cloud & collaboration', glyphe: '☁', heures: [2, 4] },
      { nom: 'Réseaux & Wi-Fi', glyphe: '◎', heures: [1.5, 3] },
      { nom: 'Création de site web', glyphe: '◈', forfait: [700, 1500] },
      { nom: 'Conseil informatique', glyphe: '✦', heures: [1, 2] }
    ],

    /* Micro-entreprise en franchise de TVA : laissez false. */
    tvaApplicable: false,

    /* Passez à true seulement si vous êtes déclaré service à la
       personne : les particuliers ont alors droit au crédit d'impôt
       de 50 % (art. 199 sexdecies du CGI). Ne l'affichez pas sans
       la déclaration, ce serait une allégation trompeuse. */
    agreeSAP: false
  };

  /* ---------- Style ---------- */

  var CSS = [
    '.tarif{--tf-bg:#050d1e;--tf-panel:#0b1730;--tf-line:rgba(120,165,235,.16);',
    '--tf-text:#e9f0ff;--tf-muted:#8ea2c6;--tf-accent:#4da3ff;--tf-ok:#3ddc97;',
    '--tf-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;',
    'padding:clamp(3.5rem,9vw,6.5rem) 1.25rem;background:var(--tf-bg);color:var(--tf-text)}',
    '.tarif__inner{max-width:900px;margin:0 auto}',
    '.tarif__eyebrow{margin:0 0 .9rem;font-family:var(--tf-mono);font-size:.72rem;',
    'letter-spacing:.22em;text-transform:uppercase;color:var(--tf-accent)}',
    '.tarif__title{margin:0 0 .85rem;font-size:clamp(1.7rem,4.6vw,2.6rem);line-height:1.15;',
    'letter-spacing:-.02em;font-weight:700}',
    '.tarif__lead{margin:0 0 2rem;max-width:56ch;color:var(--tf-muted);line-height:1.65}',
    '.tarif__panel{border:1px solid var(--tf-line);border-radius:16px;background:var(--tf-panel);overflow:hidden}',
    '.tarif__step{padding:1.1rem;border-bottom:1px solid var(--tf-line)}',
    '.tarif__q{margin:0 0 .8rem;font-size:.82rem;font-family:var(--tf-mono);',
    'letter-spacing:.12em;text-transform:uppercase;color:var(--tf-muted)}',
    '.tarif__opts{display:flex;flex-wrap:wrap;gap:.5rem}',
    '.tarif__opt{font:inherit;font-size:.87rem;color:var(--tf-text);background:rgba(77,163,255,.07);',
    'border:1px solid var(--tf-line);border-radius:999px;padding:.5rem .95rem;cursor:pointer;',
    'transition:border-color .2s,background .2s,transform .15s}',
    '.tarif__opt:hover{border-color:var(--tf-accent);transform:translateY(-1px)}',
    '.tarif__opt[aria-pressed="true"]{border-color:var(--tf-accent);background:rgba(77,163,255,.2);font-weight:600}',
    '.tarif__opt .g{color:var(--tf-accent);margin-right:.4rem}',
    '.tarif__step[hidden]{display:none}',
    '.tarif__out{padding:1.5rem 1.1rem;background:rgba(4,10,24,.45)}',
    '.tarif__range{margin:0;font-size:clamp(1.6rem,5vw,2.2rem);font-weight:700;letter-spacing:-.02em}',
    '.tarif__range.is-idle{font-size:1rem;font-weight:400;color:var(--tf-muted)}',
    '.tarif__break{margin:.7rem 0 0;font-family:var(--tf-mono);font-size:.76rem;line-height:1.8;color:var(--tf-muted)}',
    '.tarif__break span{display:block}',
    '.tarif__legal{margin:1rem 0 0;font-size:.78rem;line-height:1.6;color:var(--tf-muted)}',
    '.tarif__cta{margin:1.2rem 0 0;font:inherit;font-weight:600;font-size:.95rem;color:#041022;',
    'background:linear-gradient(135deg,#6fc0ff,var(--tf-accent));border:0;border-radius:10px;',
    'padding:.8rem 1.3rem;cursor:pointer;transition:transform .15s,box-shadow .2s}',
    '.tarif__cta:hover{transform:translateY(-2px);box-shadow:0 12px 28px -12px rgba(77,163,255,.75)}',
    '.tarif__cta[hidden]{display:none}',
    '.tarif :focus-visible{outline:2px solid var(--tf-accent);outline-offset:3px}',
    '@media (prefers-reduced-motion:reduce){.tarif__opt:hover,.tarif__cta:hover{transform:none}}'
  ].join('');

  /* ---------- État ---------- */

  var state = { presta: null, mode: null, poste: 0, delai: 0, dist: 0 };
  var root, outEl, breakEl, ctaEl, distStep;

  /* ---------- Utilitaires ---------- */

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function arrondi(n) { return Math.round(n / 5) * 5; }

  function euros(n) { return arrondi(n).toLocaleString('fr-FR') + ' €'; }

  function heures(h) {
    var ent = Math.floor(h);
    var min = Math.round((h - ent) * 60);
    if (!ent) return min + ' min';
    return ent + ' h' + (min ? ' ' + min : '');
  }

  /* ---------- Construction ---------- */

  function injectStyle() {
    if (document.getElementById('tarif-style')) return;
    var st = document.createElement('style');
    st.id = 'tarif-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function step(id, question, options, onPick, hidden) {
    var box = el('div', 'tarif__step');
    box.id = id;
    if (hidden) box.hidden = true;
    box.appendChild(el('p', 'tarif__q', question));

    var row = el('div', 'tarif__opts');
    options.forEach(function (o, i) {
      var b = el('button', 'tarif__opt');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = (o.glyphe ? '<span class="g">' + o.glyphe + '</span>' : '') + esc(o.label);
      b.addEventListener('click', function () {
        row.querySelectorAll('.tarif__opt').forEach(function (x) {
          x.setAttribute('aria-pressed', 'false');
        });
        b.setAttribute('aria-pressed', 'true');
        onPick(i);
        compute();
      });
      row.appendChild(b);
    });
    box.appendChild(row);
    return box;
  }

  function build() {
    var section = el('section', 'tarif');
    section.id = 'tarifs';
    section.setAttribute('aria-labelledby', 'tarif-title');

    var inner = el('div', 'tarif__inner');
    inner.appendChild(el('p', 'tarif__eyebrow', CONFIG.numeroSection + ' — Estimation'));

    var h2 = el('h2', 'tarif__title', 'Combien ça va coûter ?');
    h2.id = 'tarif-title';
    inner.appendChild(h2);

    inner.appendChild(el('p', 'tarif__lead',
      "La question que personne n'ose poser en premier. Quatre réponses et vous " +
      "avez une fourchette — avant même de décrocher le téléphone."));

    var panel = el('div', 'tarif__panel');

    panel.appendChild(step('tarifPresta', 'De quoi avez-vous besoin ?',
      CONFIG.prestations.map(function (p) { return { label: p.nom, glyphe: p.glyphe }; }),
      function (i) { state.presta = i; toggleMode(); }));

    panel.appendChild(step('tarifMode', 'Où se passe l\'intervention ?',
      [{ label: 'Sur place' }, { label: 'À distance' }],
      function (i) { state.mode = i; toggleDist(); }));

    distStep = step('tarifDist', 'À quelle distance de Meaux ?',
      CONFIG.deplacement.map(function (d) { return { label: d.label }; }),
      function (i) { state.dist = i; }, true);
    panel.appendChild(distStep);

    panel.appendChild(step('tarifPostes', 'Combien de postes concernés ?',
      CONFIG.postes.map(function (p) { return { label: p.label }; }),
      function (i) { state.poste = i; }));

    panel.appendChild(step('tarifDelai', 'Dans quel délai ?',
      CONFIG.delais.map(function (d) { return { label: d.label }; }),
      function (i) { state.delai = i; }));

    var out = el('div', 'tarif__out');
    outEl = el('p', 'tarif__range is-idle', 'Répondez ci-dessus pour voir la fourchette.');
    breakEl = el('p', 'tarif__break');
    ctaEl = el('button', 'tarif__cta', 'Demander le devis exact ↗');
    ctaEl.type = 'button';
    ctaEl.hidden = true;
    ctaEl.addEventListener('click', transmit);

    out.appendChild(outEl);
    out.appendChild(breakEl);
    out.appendChild(ctaEl);

    var legal = el('p', 'tarif__legal',
      'Estimation indicative et non contractuelle, donnée à titre informatif. ' +
      'Seul le devis écrit, gratuit et sans engagement, fait foi.' +
      (CONFIG.tvaApplicable ? ' Prix TTC.' : ' TVA non applicable, art. 293 B du CGI.') +
      (CONFIG.agreeSAP ? ' Prestation éligible au crédit d\'impôt de 50 % au titre des ' +
        'services à la personne (art. 199 sexdecies du CGI).' : ''));
    out.appendChild(legal);

    panel.appendChild(out);
    inner.appendChild(panel);
    section.appendChild(inner);
    return section;
  }

  function toggleMode() {
    var p = CONFIG.prestations[state.presta];
    var modeStep = root.querySelector('#tarifMode');
    var postesStep = root.querySelector('#tarifPostes');
    var forfait = p && p.forfait;
    if (modeStep) modeStep.hidden = !!forfait;
    if (postesStep) postesStep.hidden = !!forfait;
    if (forfait) { distStep.hidden = true; }
    else { toggleDist(); }
  }

  function toggleDist() {
    distStep.hidden = !(state.mode === 0);
  }

  /* ---------- Calcul ---------- */

  function compute() {
    var p = CONFIG.prestations[state.presta];
    if (!p) return;

    var min, max, detail = [];

    if (p.forfait) {
      min = p.forfait[0];
      max = p.forfait[1];
      detail.push('Forfait projet · ' + euros(min) + ' à ' + euros(max));
      detail.push('Devis détaillé après un échange sur vos besoins');
    } else {
      if (state.mode === null) { render(null); return; }

      var taux = state.mode === 0 ? CONFIG.tauxSurPlace : CONFIG.tauxADistance;
      var cp = CONFIG.postes[state.poste].coef;
      var cd = CONFIG.delais[state.delai].coef;

      var hMin = p.heures[0] * cp;
      var hMax = p.heures[1] * cp;

      min = taux * hMin * cd;
      max = taux * hMax * cd;

      detail.push(heures(hMin) + ' à ' + heures(hMax) + ' · ' + taux + ' €/h ' +
        (state.mode === 0 ? 'sur place' : 'à distance'));

      if (state.mode === 0) {
        var dep = CONFIG.deplacement[state.dist].prix;
        min += dep;
        max += dep;
        detail.push('Déplacement ' + CONFIG.deplacement[state.dist].label.toLowerCase() +
          ' · ' + (dep ? euros(dep) : 'offert'));
      }

      if (cd > 1) detail.push('Majoration délai · +' + Math.round((cd - 1) * 100) + ' %');
      if (cp > 1) detail.push(CONFIG.postes[state.poste].label);
    }

    render({ min: min, max: max, detail: detail });
  }

  function render(r) {
    breakEl.innerHTML = '';
    if (!r) {
      outEl.className = 'tarif__range is-idle';
      outEl.textContent = 'Répondez ci-dessus pour voir la fourchette.';
      ctaEl.hidden = true;
      return;
    }
    outEl.className = 'tarif__range';
    outEl.textContent = 'Entre ' + euros(r.min) + ' et ' + euros(r.max);
    r.detail.forEach(function (d) { breakEl.appendChild(el('span', null, d)); });
    ctaEl.hidden = false;
  }

  /* ---------- Transmission ---------- */

  function transmit() {
    var p = CONFIG.prestations[state.presta];
    var lignes = ['Bonjour,', '', 'J\'ai utilisé l\'estimateur du site :', ''];
    lignes.push('- Besoin : ' + p.nom);
    if (!p.forfait) {
      lignes.push('- Intervention : ' + (state.mode === 0 ? 'sur place' : 'à distance'));
      if (state.mode === 0) lignes.push('- Distance : ' + CONFIG.deplacement[state.dist].label);
      lignes.push('- Postes : ' + CONFIG.postes[state.poste].label);
      lignes.push('- Délai souhaité : ' + CONFIG.delais[state.delai].label);
    }
    lignes.push('- Fourchette affichée : ' + outEl.textContent.replace('Entre ', ''));
    lignes.push('', 'Je souhaite un devis exact.', '');
    var msg = lignes.join('\n');

    var form = document.querySelector('#contact form') || document.querySelector('form');
    var area = form && form.querySelector('textarea');

    if (area) {
      area.value = msg;
      area.dispatchEvent(new Event('input', { bubbles: true }));
      var select = form.querySelector('select');
      if (select) {
        for (var i = 0; i < select.options.length; i++) {
          if (select.options[i].text.trim().toLowerCase() === p.nom.toLowerCase()) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      }
      (document.getElementById('contact') || form)
        .scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    var mail = document.querySelector('a[href^="mailto:"]');
    var to = mail ? mail.getAttribute('href').replace('mailto:', '').split('?')[0] : '';
    window.location.href = 'mailto:' + to +
      '?subject=' + encodeURIComponent('Demande de devis') +
      '&body=' + encodeURIComponent(msg);
  }

  /* ---------- Renumérotation du contact ---------- */

  function contactSection() {
    var c = document.getElementById('contact');
    if (!c) return null;
    return (c.closest && c.closest('section')) || c;
  }

  function renumberContact() {
    var scope = contactSection();
    if (!scope || !document.createTreeWalker) return;
    var w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = w.nextNode())) {
      if (/^\s*0?[45]\s*[—–-]\s*Contact\s*$/i.test(n.nodeValue)) {
        n.nodeValue = n.nodeValue.replace(/0?[45]/, '06');
        return;
      }
    }
  }

  /* ---------- Démarrage ---------- */

  if (document.getElementById('tarifs')) return;

  injectStyle();
  root = build();

  var anchor = contactSection() || document.querySelector('footer');
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(root, anchor);
  else document.body.appendChild(root);

  renumberContact();
})();
