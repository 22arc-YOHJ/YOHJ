document.addEventListener('DOMContentLoaded', function () {
  var menuButton = document.querySelector('.menu-button');
  var navigation = document.querySelector('.nav');

  if (!menuButton || !navigation) return;

  function closeMenu() {
    navigation.classList.remove('open');
    menuButton.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir le menu');
  }

  menuButton.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    var isOpen = navigation.classList.toggle('open');

    menuButton.classList.toggle('is-open', isOpen);
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute(
      'aria-label',
      isOpen ? 'Fermer le menu' : 'Ouvrir le menu'
    );
  });

  navigation.addEventListener('click', function (event) {
    event.stopPropagation();
  });

  navigation.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', closeMenu);

  window.addEventListener('resize', function () {
    if (window.innerWidth > 980) closeMenu();
  });
});
