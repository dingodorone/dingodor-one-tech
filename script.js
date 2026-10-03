const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('#navigation');
if (navigation && !navigation.querySelector('a[href="bons-plans.html"]')) {
  const dealsLink = document.createElement('a');
  dealsLink.href = 'bons-plans.html';
  dealsLink.textContent = 'Bon plan du jour';
  navigation.querySelector('a[href="articles.html"]')?.after(dealsLink);
}

menuButton?.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

navigation?.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    navigation.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }
});

