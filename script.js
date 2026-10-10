
(function(){if(document.getElementById('d1-translate-script'))return;const script=document.createElement('script');script.id='d1-translate-script';script.src='/translate.js?v=3-header-languages';script.defer=true;document.head.append(script);}());
// Statistiques partag?es : charg?es une seule fois, avec choix du visiteur.
(function () {
  if (document.getElementById('dingodor-analytics-loader')) return;
  var script = document.createElement('script');
  script.id = 'dingodor-analytics-loader';
  script.src = '/analytics.js?v=1';
  script.defer = true;
  document.head.appendChild(script);
}());

(function () { const nav = document.querySelector('#navigation'); if (nav && !nav.querySelector('a[href="/occasion-dingo.html"],a[href="occasion-dingo.html"]')) { const link = document.createElement('a'); link.href = '/occasion-dingo.html'; link.textContent = 'Occasion Dingo'; nav.append(link); } }());

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


(async () => {
  const grid = document.querySelector('#articles .article-grid');
  if (!grid) return;
  grid.classList.add('home-latest');
  const message = document.createElement('p');
  message.setAttribute('role', 'status');
  message.textContent = 'Chargement des derniers articles…';
  grid.replaceChildren(message);
  const text = value => {
    const parsed = new DOMParser().parseFromString(String(value || ''), 'text/html');
    return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
  };
  try {
    const response = await fetch('/data/published-posts.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('articles');
    const data = await response.json();
    if (!Array.isArray(data.posts)) throw new Error('format');
    const posts = data.posts.filter(post => typeof post.url === 'string' &&
      /^\/(?:posts\/|publications\/)[a-z0-9-]+\.html$|^\/alarme-pg107\.html$/.test(post.url) &&
      !Number.isNaN(Date.parse(post.date)))
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3);
    const cards = posts.map(post => {
      const card = document.createElement('a');
      card.className = 'article-card'; card.href = post.url;
      if (post.featured_image) {
        const url = new URL(post.featured_image, location.origin);
        if (url.protocol === 'https:' && !url.username && !url.password) {
          const image = document.createElement('img');
          image.className = 'home-article-image'; image.src = url.href;
          image.alt = text(post.title); image.loading = 'lazy'; image.decoding = 'async';
          image.addEventListener('error', () => image.remove(), {once: true});
          card.append(image);
        }
      }
      const body = document.createElement('div'); body.className = 'article-body';
      const date = document.createElement('small');
      date.textContent = new Intl.DateTimeFormat('fr-FR', {dateStyle: 'long', timeZone: 'Europe/Paris'}).format(new Date(post.date)).toUpperCase();
      const title = document.createElement('h3'); title.textContent = text(post.title);
      const excerpt = document.createElement('p'); excerpt.textContent = text(post.excerpt).slice(0, 170);
      const read = document.createElement('span'); read.className = 'read'; read.textContent = 'Lire l’article →';
      body.append(date, title, excerpt, read); card.append(body); return card;
    });
    grid.replaceChildren(...cards);
    if (!cards.length) {message.textContent = 'Les prochains articles arrivent ici.'; grid.append(message);}
  } catch (_) {
    message.textContent = 'Impossible de charger les derniers articles. ';
    const link = document.createElement('a'); link.href = 'articles.html'; link.textContent = 'Consulter tous les articles';
    message.append(link);
  }
})();
