/* ============================================================
   YOHJ — Bilan express
   Lit ce que le navigateur du visiteur expose publiquement,
   pose deux questions que la machine ne peut pas répondre,
   puis prépare une demande de devis contextualisée.

   Rien n'est envoyé, rien n'est stocké : tout reste dans l'onglet.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Auto-installation ---------- */
  /* Le module construit lui-même sa section et la place avant le
     formulaire de contact. Aucun bloc HTML à coller dans index.html. */

  var MARKUP =
    '<div class="audit__inner">' +
      '<p class="audit__eyebrow">04 — Bilan express</p>' +
      '<h2 class="audit__title" id="audit-title">' +
        'Votre poste, examiné pendant que vous lisez cette page.' +
      '</h2>' +
      '<p class="audit__lead">' +
        'La plupart des sites informatiques promettent un audit. Celui-ci ' +
        'commence tout de suite : quatre mesures prises sur votre propre ' +
        'appareil, deux questions que seule une machine ne peut pas trancher, ' +
        'et un constat honnête.' +
      '</p>' +
      '<div class="audit__panel">' +
        '<div class="audit__head">' +
          '<span class="audit__dot" aria-hidden="true"></span>' +
          '<span>YOHJ · Bilan express</span>' +
          '<em class="audit__state" id="auditState">En attente</em>' +
        '</div>' +
        '<ol class="audit__list" id="auditList"></ol>' +
        '<div class="audit__questions" id="auditQuestions" hidden></div>' +
        '<div class="audit__verdict" id="auditVerdict" hidden></div>' +
      '</div>' +
      '<p class="audit__privacy">' +
        '<strong>Analyse locale.</strong> Ce bilan lit uniquement ce que votre ' +
        'navigateur expose publiquement à tout site web. Rien n\'est envoyé, ' +
        'rien n\'est enregistré, aucun cookie n\'est déposé. Vous seul décidez ' +
        'de transmettre le résultat.' +
      '</p>' +
    '</div>';

  function mount() {
    var existing = document.getElementById('audit');
    if (existing) return existing;

    var section = document.createElement('section');
    section.className = 'audit';
    section.id = 'audit';
    section.setAttribute('aria-labelledby', 'audit-title');
    section.innerHTML = MARKUP;

    /* Cible : juste avant la section de contact. */
    var contact = document.getElementById('contact');
    var anchor = contact && contact.closest ? (contact.closest('section') || contact) : contact;
    if (!anchor) anchor = document.querySelector('footer');

    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(section, anchor);
    } else {
      document.body.appendChild(section);
    }
    return section;
  }

  var root = mount();
  if (!root) return;

  var listEl = root.querySelector('#auditList');
  var askEl = root.querySelector('#auditQuestions');
  var verdictEl = root.querySelector('#auditVerdict');
  var stateEl = root.querySelector('#auditState');

  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var findings = [];
  var started = false;

  /* ---------- Utilitaires ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function wait(ms) {
    return new Promise(function (r) { setTimeout(r, REDUCED ? 0 : ms); });
  }

  var PILL = { ok: 'Conforme', warn: 'À surveiller', alert: 'À traiter', info: 'Non mesurable' };

  /* Effet « valeur qui se stabilise », façon terminal. */
  function settle(node, finalText) {
    if (REDUCED) { node.textContent = finalText; return; }
    var chars = '#$%&*+<>?@0123456789ABCDEF';
    var frames = 8;
    var i = 0;
    var timer = setInterval(function () {
      i++;
      if (i >= frames) {
        clearInterval(timer);
        node.textContent = finalText;
        return;
      }
      var out = '';
      for (var k = 0; k < finalText.length; k++) {
        out += finalText[k] === ' '
          ? ' '
          : chars[Math.floor(Math.random() * chars.length)];
      }
      node.textContent = out;
    }, 45);
  }

  /* ---------- Collecte des données navigateur ---------- */

  function highEntropy() {
    var uad = navigator.userAgentData;
    if (!uad || typeof uad.getHighEntropyValues !== 'function') {
      return Promise.resolve(null);
    }
    return uad.getHighEntropyValues(
      ['platform', 'platformVersion', 'architecture', 'bitness', 'fullVersionList']
    ).catch(function () { return null; });
  }

  /* ---------- Mesure 1 : système d'exploitation ---------- */

  function checkSystem(hev) {
    var f = {
      glyph: '⌘',
      label: "Système d'exploitation",
      service: 'Dépannage & maintenance',
      status: 'info',
      value: 'Non communiqué',
      note: ''
    };

    if (hev && hev.platform) {
      var major = parseInt(String(hev.platformVersion || '0').split('.')[0], 10) || 0;
      var bits = hev.bitness ? ' · ' + hev.bitness + ' bits' : '';

      if (hev.platform === 'Windows') {
        if (major >= 13) {
          f.value = 'Windows 11' + bits;
          f.status = 'ok';
        } else if (major >= 1) {
          f.value = 'Windows 10' + bits;
          f.status = 'alert';
          f.note = "Le support standard s'est arrêté le 14 octobre 2025. " +
            "Le programme de mises à jour de sécurité étendues ne repousse " +
            "l'échéance que jusqu'en octobre 2027, et ne couvre que les failles " +
            "critiques. Une migration se prépare avant, pas après.";
        } else {
          f.value = 'Windows 8.1 ou antérieur';
          f.status = 'alert';
          f.note = "Ce système ne reçoit plus aucun correctif de sécurité depuis " +
            "plusieurs années. Chaque faille découverte depuis reste ouverte.";
        }
      } else if (hev.platform === 'macOS') {
        f.value = 'macOS ' + (hev.platformVersion || '').split('.')[0];
        f.status = major >= 15 ? 'ok' : (major >= 13 ? 'warn' : 'alert');
        if (f.status !== 'ok') {
          f.note = "Apple ne maintient que les trois versions les plus récentes. " +
            "Au-delà, les correctifs de sécurité cessent silencieusement.";
        }
      } else if (hev.platform === 'Android') {
        f.value = 'Android ' + major;
        f.status = major >= 13 ? 'ok' : 'warn';
        if (f.status === 'warn') f.note = "Version ancienne : les correctifs mensuels ne sont plus garantis.";
      } else {
        f.value = hev.platform + ' ' + (hev.platformVersion || '').split('.')[0];
        f.status = 'ok';
      }
      return f;
    }

    /* Repli sur la chaîne User-Agent (Firefox, Safari). */
    var ua = navigator.userAgent;
    if (/Windows NT 10/.test(ua)) {
      f.value = 'Windows 10 ou 11';
      f.status = 'warn';
      f.note = "Ce navigateur ne distingue pas les deux versions. Tapez « winver » " +
        "dans le menu Démarrer pour le savoir : si c'est Windows 10, le support " +
        "standard est terminé depuis le 14 octobre 2025.";
    } else if (/Windows NT 6/.test(ua)) {
      f.value = 'Windows 7 / 8 / 8.1';
      f.status = 'alert';
      f.note = "Système hors support. Plus aucun correctif de sécurité.";
    } else if (/iPhone|iPad/.test(ua)) {
      f.value = 'iOS / iPadOS';
      f.status = 'ok';
    } else if (/Android/.test(ua)) {
      f.value = (ua.match(/Android \d+/) || ['Android'])[0];
      f.status = 'ok';
    } else if (/Mac OS X/.test(ua)) {
      f.value = 'macOS (version masquée par le navigateur)';
      f.status = 'info';
    } else if (/Linux/.test(ua)) {
      f.value = 'Linux';
      f.status = 'ok';
    }
    return f;
  }

  /* ---------- Mesure 2 : ancienneté du navigateur ---------- */

  function checkBrowser(hev) {
    var f = {
      glyph: '◈',
      label: 'Navigateur',
      service: 'Cybersécurité',
      status: 'ok',
      value: '',
      note: ''
    };

    /* Nom + version */
    var name = 'Navigateur';
    var version = '';
    var list = (hev && hev.fullVersionList) || (navigator.userAgentData && navigator.userAgentData.brands);
    if (list && list.length) {
      for (var i = 0; i < list.length; i++) {
        var b = list[i].brand || '';
        if (!/Not[^a-zA-Z]|Brand|Chromium/i.test(b)) {
          name = b;
          version = String(list[i].version || list[i].fullVersion || '').split('.')[0];
          break;
        }
      }
    } else {
      var ua = navigator.userAgent;
      var m = ua.match(/(Firefox|Edg|OPR|Chrome|Safari)\/(\d+)/);
      if (m) {
        name = { Edg: 'Edge', OPR: 'Opera' }[m[1]] || m[1];
        version = m[2];
        if (name === 'Safari') {
          var sv = ua.match(/Version\/(\d+)/);
          if (sv) version = sv[1];
        }
      }
    }

    /* Datation par capacités plutôt que par numéro de version :
       le test reste juste sans maintenance. */
    var feats = [
      function () { return !!(window.CSS && CSS.supports && CSS.supports('selector(:has(*))')); },
      function () { return typeof window.structuredClone === 'function'; },
      function () { return typeof Array.prototype.findLast === 'function'; },
      function () { return 'popover' in HTMLElement.prototype; },
      function () { return typeof Object.groupBy === 'function'; }
    ];
    var score = 0;
    for (var j = 0; j < feats.length; j++) {
      try { if (feats[j]()) score++; } catch (e) { /* ignoré */ }
    }

    f.value = name + (version ? ' ' + version : '') + ' · ' + score + '/5 standards récents';

    if (score === 5) {
      f.status = 'ok';
    } else if (score >= 3) {
      f.status = 'warn';
      f.note = "Quelques standards récents manquent à l'appel : ce navigateur a " +
        "environ deux ans de retard. Les failles corrigées entre-temps ne le sont pas ici.";
    } else {
      f.status = 'alert';
      f.note = "Ce navigateur est nettement dépassé. C'est la première porte d'entrée " +
        "utilisée par les attaques web, et la plus simple à refermer.";
    }
    return f;
  }

  /* ---------- Mesure 3 : puissance du poste ---------- */

  function checkPower() {
    var f = {
      glyph: '✦',
      label: 'Poste de travail',
      service: 'Conseil informatique',
      status: 'info',
      value: 'Non communiqué par ce navigateur',
      note: ''
    };

    var ram = navigator.deviceMemory;
    var cores = navigator.hardwareConcurrency;
    if (!ram && !cores) return f;

    var parts = [];
    if (ram) parts.push(ram >= 8 ? '8 Go de RAM ou plus' : ram + ' Go de RAM');
    if (cores) parts.push(cores + (cores > 1 ? ' cœurs' : ' cœur'));
    f.value = parts.join(' · ');

    if ((ram && ram <= 4) || (cores && cores <= 2)) {
      f.status = 'warn';
      f.note = "Configuration juste pour un usage professionnel courant. Avant de " +
        "remplacer la machine, un SSD ou une remise à plat logicielle suffit souvent.";
    } else {
      f.status = 'ok';
    }
    return f;
  }

  /* ---------- Mesure 4 : qualité de la connexion ---------- */

  function checkNetwork() {
    var f = {
      glyph: '◎',
      label: 'Connexion réseau',
      service: 'Réseaux & Wi-Fi',
      status: 'info',
      value: 'Non communiquée par ce navigateur',
      note: ''
    };

    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c || !c.effectiveType) return f;

    var label = { 'slow-2g': 'très lente', '2g': 'lente', '3g': 'moyenne', '4g': 'rapide' }[c.effectiveType] || c.effectiveType;
    var bits = ['Qualité ' + label];
    if (c.downlink) bits.push('~' + c.downlink + ' Mb/s estimés');
    if (c.rtt) bits.push(c.rtt + ' ms de latence');
    f.value = bits.join(' · ');

    if (c.effectiveType === '4g' && (!c.rtt || c.rtt < 300)) {
      f.status = 'ok';
    } else {
      f.status = 'warn';
      f.note = "Une connexion irrégulière vient plus souvent du Wi-Fi et de son " +
        "placement que de l'abonnement lui-même. Cela se mesure et se corrige.";
    }
    return f;
  }

  /* ---------- Questions ---------- */

  var QUESTIONS = [
    {
      glyph: '☁',
      label: 'Sauvegarde des données',
      service: 'Cloud & collaboration',
      text: 'À quand remonte votre dernière sauvegarde vérifiée ?',
      choices: [
        { txt: 'Moins d\'une semaine', status: 'ok', value: 'Sauvegarde de moins d\'une semaine' },
        { txt: 'Plus d\'un mois', status: 'warn', value: 'Sauvegarde vieille de plus d\'un mois',
          note: "Une sauvegarde d'un mois, c'est un mois de travail que personne ne rattrapera." },
        { txt: 'Jamais / je ne sais pas', status: 'alert', value: 'Aucune sauvegarde vérifiée',
          note: "C'est le point le plus coûteux de cette liste, et le moins cher à corriger." }
      ]
    },
    {
      glyph: '⬡',
      label: 'Protection des accès',
      service: 'Cybersécurité',
      text: 'Vos accès importants sont-ils protégés par une double authentification ?',
      choices: [
        { txt: 'Oui, partout', status: 'ok', value: 'Double authentification en place' },
        { txt: 'Sur certains', status: 'warn', value: 'Double authentification partielle',
          note: "Une seule porte laissée ouverte suffit : messagerie, banque, hébergeur." },
        { txt: 'Non / je ne sais pas', status: 'alert', value: 'Pas de double authentification',
          note: "Un mot de passe volé donne alors un accès complet, sans alerte." }
      ]
    }
  ];

  /* ---------- Rendu ---------- */

  function renderRow(f) {
    var li = el('li', 'audit__row' + (f.status === 'alert' ? ' is-alert' : ''));
    li.appendChild(el('span', 'audit__glyph', f.glyph));
    li.appendChild(el('span', 'audit__label', f.label));

    var pill = el('span', 'audit__pill is-' + f.status, PILL[f.status]);
    li.appendChild(pill);

    var val = el('span', 'audit__value', '');
    li.appendChild(val);

    if (f.note) li.appendChild(el('p', 'audit__note', f.note));

    listEl.appendChild(li);
    settle(val, f.value);
  }

  function renderQuestion(q) {
    var box = el('div', 'audit__ask');
    var head = el('p', 'audit__ask-q');
    head.appendChild(el('span', null, q.glyph));
    head.appendChild(el('span', null, q.text));
    box.appendChild(head);

    var row = el('div', 'audit__choices');
    q.choices.forEach(function (c) {
      var btn = el('button', 'audit__choice', c.txt);
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () {
        row.querySelectorAll('.audit__choice').forEach(function (b) {
          b.setAttribute('aria-pressed', 'false');
        });
        btn.setAttribute('aria-pressed', 'true');

        findings = findings.filter(function (f) { return f.label !== q.label; });
        findings.push({
          glyph: q.glyph, label: q.label, service: q.service,
          status: c.status, value: c.value, note: c.note || ''
        });

        var old = box.querySelector('.audit__note');
        if (old) old.remove();
        if (c.note) box.appendChild(el('p', 'audit__note', c.note));

        renderVerdict();
      });
      row.appendChild(btn);
    });

    box.appendChild(row);
    askEl.appendChild(box);
  }

  /* ---------- Verdict et transmission ---------- */

  function renderVerdict() {
    var alerts = findings.filter(function (f) { return f.status === 'alert'; });
    var warns = findings.filter(function (f) { return f.status === 'warn'; });
    var todo = alerts.length + warns.length;

    verdictEl.hidden = false;
    verdictEl.innerHTML = '';

    var title, summary;
    if (todo === 0) {
      title = 'Rien d\'urgent de ce côté.';
      summary = "Votre environnement tient la route sur les points mesurables ici. " +
        "Un vrai audit va plus loin : postes, comptes, sauvegardes réelles, réseau.";
    } else {
      title = todo + (todo > 1 ? ' points à reprendre' : ' point à reprendre') +
        (alerts.length ? ', dont ' + alerts.length + ' prioritaire' + (alerts.length > 1 ? 's' : '') : '') + '.';
      summary = "Ce bilan ne voit que ce que votre navigateur accepte de dire. " +
        "Il suffit pourtant à repérer l'essentiel : le reste se règle en une intervention.";
    }

    verdictEl.appendChild(el('p', 'audit__score', title));
    verdictEl.appendChild(el('p', 'audit__summary', summary));

    var cta = el('button', 'audit__cta', 'Joindre ce bilan à ma demande ↗');
    cta.type = 'button';
    cta.addEventListener('click', transmit);
    verdictEl.appendChild(cta);

    verdictEl.appendChild(el('p', 'audit__feedback', ''));
  }

  function buildMessage() {
    var lines = ['Bonjour,', '', 'Voici le bilan express réalisé depuis votre site le ' +
      new Date().toLocaleDateString('fr-FR') + ' :', ''];

    findings.forEach(function (f) {
      lines.push('- ' + f.label + ' : ' + f.value + ' [' + PILL[f.status] + ']');
    });

    var todo = findings.filter(function (f) { return f.status === 'alert' || f.status === 'warn'; });
    lines.push('');
    lines.push(todo.length
      ? 'Je souhaite être rappelé(e) au sujet de ' + todo.length +
        (todo.length > 1 ? ' points' : ' point') + ' identifié' + (todo.length > 1 ? 's' : '') + '.'
      : 'Je souhaite un avis sur mon installation.');
    lines.push('');
    return lines.join('\n');
  }

  function priorityService() {
    var order = ['alert', 'warn'];
    for (var i = 0; i < order.length; i++) {
      for (var j = 0; j < findings.length; j++) {
        if (findings[j].status === order[i]) return findings[j].service;
      }
    }
    return null;
  }

  function transmit() {
    var msg = buildMessage();
    var feedback = verdictEl.querySelector('.audit__feedback');
    var form = document.querySelector('#contact form') || document.querySelector('form');
    var area = form && form.querySelector('textarea');

    if (area) {
      area.value = msg;
      area.dispatchEvent(new Event('input', { bubbles: true }));
      area.classList.add('audit-highlight');
      setTimeout(function () { area.classList.remove('audit-highlight'); }, 1700);

      /* Présélection du service le plus pertinent. */
      var svc = priorityService();
      var select = form.querySelector('select');
      if (svc && select) {
        for (var i = 0; i < select.options.length; i++) {
          if (select.options[i].text.trim().toLowerCase() === svc.toLowerCase()) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      }

      var target = document.getElementById('contact') || form;
      target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () {
        var first = form.querySelector('input');
        if (first) first.focus({ preventScroll: true });
      }, REDUCED ? 0 : 700);

      if (feedback) feedback.textContent = 'Bilan reporté dans le formulaire ci-dessous.';
      return;
    }

    /* Repli : ouverture de la messagerie avec l'adresse déjà présente sur la page. */
    var mail = document.querySelector('a[href^="mailto:"]');
    var to = mail ? mail.getAttribute('href').replace('mailto:', '').split('?')[0] : '';
    window.location.href = 'mailto:' + to +
      '?subject=' + encodeURIComponent('Bilan express — demande de rappel') +
      '&body=' + encodeURIComponent(msg);
  }

  /* ---------- Séquence ---------- */

  async function run() {
    if (started) return;
    started = true;
    root.classList.add('is-running');
    if (stateEl) stateEl.textContent = 'Analyse en cours';

    var hev = await highEntropy();
    var checks = [checkSystem(hev), checkBrowser(hev), checkPower(), checkNetwork()];

    for (var i = 0; i < checks.length; i++) {
      await wait(i === 0 ? 250 : 420);
      findings.push(checks[i]);
      renderRow(checks[i]);
    }

    await wait(500);
    root.classList.remove('is-running');
    root.classList.add('is-done');
    if (stateEl) stateEl.textContent = 'Mesures terminées';

    askEl.hidden = false;
    QUESTIONS.forEach(renderQuestion);

    await wait(300);
    renderVerdict();
  }

  /* Démarre quand la section entre dans l'écran, une seule fois. */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.disconnect(); run(); }
      });
    }, { threshold: 0.25 });
    io.observe(root);
  } else {
    run();
  }
})();
