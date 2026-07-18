/* =========================================================
   YOHJ — Séquence de diagnostic du hero
   Autonome : ne touche à rien d'autre sur la page.
   ========================================================= */
(function () {
  var panel = document.getElementById('diag-panel');
  if (!panel) return;

  var rows      = Array.prototype.slice.call(panel.querySelectorAll('.diag-check'));
  var stateText = document.getElementById('diag-state-text');
  var replay    = document.getElementById('diag-replay');
  var reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers    = [];

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    panel.classList.remove('is-running', 'is-done');
    rows.forEach(function (row) {
      row.dataset.state = 'idle';
      row.querySelector('.diag-txt').textContent = '';
    });
    stateText.textContent = 'En attente';
  }

  function finish() {
    panel.classList.remove('is-running');
    panel.classList.add('is-done');
    stateText.textContent = 'Terminé';
  }

  function run() {
    reset();

    // Mouvement réduit : on affiche directement l'état final.
    if (reduced) {
      rows.forEach(function (row) {
        row.dataset.state = 'ok';
        row.querySelector('.diag-txt').textContent = row.dataset.value;
      });
      finish();
      return;
    }

    panel.classList.add('is-running');
    stateText.textContent = 'Analyse…';

    rows.forEach(function (row, i) {
      var start = 380 + i * 560;

      timers.push(setTimeout(function () {
        row.dataset.state = 'scan';
        row.querySelector('.diag-txt').textContent = 'analyse';
      }, start));

      timers.push(setTimeout(function () {
        row.dataset.state = 'ok';
        row.querySelector('.diag-txt').textContent = row.dataset.value;
      }, start + 520));
    });

    timers.push(setTimeout(finish, 380 + rows.length * 560 + 300));
  }

  // Démarre au premier passage du panneau dans le champ de vision.
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        run();
        io.disconnect();
      }
    }, { threshold: 0.45 });
    io.observe(panel);
  } else {
    run();
  }

  if (replay) replay.addEventListener('click', run);
})();
