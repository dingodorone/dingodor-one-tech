const API = 'https://public-api.wordpress.com/rest/v1.1/sites/dingodoronetech.wordpress.com';
const WP_ROOT = 'https://dingodoronetech.wordpress.com/';

function esc(value = '') {
  const node = document.createElement('div');
  node.textContent = value;
  return node.innerHTML;
}

function textOnly(html = '') {
  const node = document.createElement('div');
  node.innerHTML = html;
  return node.textContent.trim();
}

function localizeWordPressLinks(container) {
  container.querySelectorAll('a[href]').forEach(link => {
    try {
      const url = new URL(link.href);
      if (url.hostname === 'dingodorone.github.io' && url.pathname.startsWith('/dingodor-app')) {
        link.href = 'guide-camera.html';
        link.removeAttribute('target');
        link.removeAttribute('rel');
        return;
      }
      if (url.hostname !== 'dingodoronetech.wordpress.com') return;
      if (url.pathname.startsWith('/wp-content/')) return;
      const parts = url.pathname.split('/').filter(Boolean);
      const slug = parts.at(-1);
      if (!slug) { link.href = 'index.html'; return; }
      const isArticle = /^\d{4}$/.test(parts[0] || '') && /^\d{2}$/.test(parts[1] || '');
      link.href = `${isArticle ? 'article' : 'page'}.html?slug=${encodeURIComponent(slug)}`;
      link.removeAttribute('target');
      link.removeAttribute('rel');
    } catch (_) {}
  });
}

function menu() {
  const button = document.querySelector('.menu-button');
  const nav = document.querySelector('#navigation');
  if (!button || !nav) return;
  button.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  });
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur ${response.status}`);
  return response.json();
}

async function showSingle(kind) {
  const slug = new URLSearchParams(location.search).get('slug');
  const status = document.querySelector('#status');
  if (!slug) { status.textContent = 'Contenu introuvable : adresse incomplète.'; return; }
  if (kind === 'page' && slug === 'quelle-camera-de-surveillance-choisir-le-guide-interactif-gratuit') {
    location.replace('guide-camera.html');
    return;
  }
  try {
    const post = await getJson(`${API}/posts/slug:${encodeURIComponent(slug)}`);
    if (kind === 'post' && post.type !== 'post') throw new Error('Cet article est introuvable.');
    const pageNames = {
      'code-promo-2': 'Codes promo',
      'site-partenaires': 'Boutiques partenaires',
      'quelle-camera-de-surveillance-choisir-le-guide-interactif-gratuit': 'Guide caméra',
      'occasion-dingo2': 'Occasions Dingodor'
    };
    const pageTitle = pageNames[slug] || textOnly(post.title) || 'Dingodor One Tech';
    document.title = `${pageTitle} — Dingodor One Tech`;
    document.querySelector('#content-title').textContent = pageTitle;
    document.body.dataset.slug = slug;
    if (pageNames[slug]) document.body.classList.add('custom-landing');
    const meta = document.querySelector('#content-meta');
    if (post.type === 'post') meta.textContent = new Intl.DateTimeFormat('fr-FR', {dateStyle:'long'}).format(new Date(post.date));
    else meta.remove();
    const content = document.querySelector('#wp-content');
    content.innerHTML = post.content || '<p>Cette page ne contient pas encore de texte.</p>';
    localizeWordPressLinks(content);
    status.remove();
    content.hidden = false;
  } catch (error) {
    status.innerHTML = `<strong>Impossible de charger ce contenu.</strong><br>${esc(error.message)}<br><a href="articles.html">Voir tous les articles</a>`;
  }
}

let offset = 0;
const batch = 12;
async function loadPosts() {
  const status = document.querySelector('#status');
  const more = document.querySelector('#more');
  more.disabled = true;
  more.textContent = 'Chargement…';
  try {
    const data = await getJson(`${API}/posts/?number=${batch}&offset=${offset}`);
    const grid = document.querySelector('#post-grid');
    data.posts.forEach(post => {
      const image = post.featured_image || Object.values(post.attachments || {})[0]?.thumbnails?.large || '';
      const excerpt = textOnly(post.excerpt || post.content).slice(0, 150);
      const card = document.createElement('a');
      card.className = 'post-card';
      card.href = `article.html?slug=${encodeURIComponent(post.slug)}`;
      card.innerHTML = `${image ? `<img src="${esc(image)}" alt="" loading="lazy">` : ''}<div class="post-card-body"><time>${new Intl.DateTimeFormat('fr-FR',{dateStyle:'long'}).format(new Date(post.date))}</time><h2>${esc(textOnly(post.title))}</h2><p>${esc(excerpt)}${excerpt.length >= 150 ? '…' : ''}</p></div>`;
      grid.appendChild(card);
    });
    offset += data.posts.length;
    status?.remove();
    more.disabled = !data.meta?.next_page;
    more.textContent = more.disabled ? 'Tous les articles sont affichés' : 'Afficher plus d’articles';
  } catch (error) {
    status.innerHTML = `<strong>Impossible de charger les articles.</strong><br>${esc(error.message)}`;
    more.textContent = 'Réessayer';
    more.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  menu();
  const type = document.body.dataset.view;
  if (type === 'articles') { document.querySelector('#more').addEventListener('click', loadPosts); loadPosts(); }
  if (type === 'post' || type === 'page') showSingle(type);
});
