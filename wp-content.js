const API = 'https://public-api.wordpress.com/rest/v1.1/sites/dingodoronetech.wordpress.com';
const WP_ROOT = 'https://dingodoronetech.wordpress.com/';
const SHARED_DATA_URL = 'data/site-data.json';

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
        link.href = '/guide-camera.html';
        link.removeAttribute('target');
        link.removeAttribute('rel');
        return;
      }
      if (url.hostname !== 'dingodoronetech.wordpress.com') return;
      if (url.pathname.startsWith('/wp-content/')) return;
      const parts = url.pathname.split('/').filter(Boolean);
      const slug = parts.at(-1);
      if (!slug) { link.href = '/'; return; }
      const isArticle = /^\d{4}$/.test(parts[0] || '') && /^\d{2}$/.test(parts[1] || '');
      link.href = `/${isArticle ? 'article' : 'page'}.html?slug=${encodeURIComponent(slug)}`;
      link.removeAttribute('target');
      link.removeAttribute('rel');
    } catch (_) {}
  });
}

function showCopyToast(message) {
  let toast = document.querySelector('#copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copy-toast';
    toast.className = 'copy-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showCopyToast.timer);
  showCopyToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch (_) {
    const field = document.createElement('textarea');
    field.value = value;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
}

async function enhancePromoPage(container) {
  document.body.classList.add('promo-page');
  try {
    const response = await fetch(`https://raw.githubusercontent.com/dingodorone/dingodor-data/main/promos.json?v=${Date.now()}`, {cache: 'no-store'});
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    const promos = await response.json();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeCodes = promos.filter(p => p.type !== 'store' && (!p.expires || new Date(`${p.expires}T23:59:59`) >= today));
    const storesWithCodes = new Set(activeCodes.map(p => p.shop));
    const activeStores = promos.filter(p => p.type === 'store' && (!storesWithCodes.has(p.shop) || p.shop === 'AliExpress'));
    const activePromos = [...activeCodes, ...activeStores];
    const brands = [...new Set(activePromos.map(p => p.shop || p.brand.replace(/\s[🇫🇷🇧🇪].*$/, '')))];
    const countries = [...new Set(activePromos.flatMap(p => p.countries || []))];
    const formatDate = value => value ? new Intl.DateTimeFormat('fr-FR', {day:'numeric', month:'long', year:'numeric'}).format(new Date(`${value}T12:00:00`)) : '';
    const renderCard = p => {
      const expiry = p.expires ? `Valable jusqu’au ${formatDate(p.expires)}` : 'Durée non communiquée';
      const shop = p.shop || p.brand.replace(/\s[🇫🇷🇧🇪].*$/, '');
      const countriesText = (p.countries || []).join(' ');
      const hasCode = Boolean(p.code);
      return `<article class="promo-card${p.featured ? ' featured' : ''}${hasCode ? '' : ' store-card'}" data-shop="${esc(shop)}" data-country="${esc((p.countries || []).join(','))}" data-search="${esc(`${p.brand} ${p.desc} ${p.code || ''} ${shop}`.toLowerCase())}">
        <div class="promo-card-top"><span class="promo-shop">${esc(p.brand)}</span>${p.featured ? '<span class="promo-badge">À la une</span>' : ''}</div>
        <h2>${esc(p.desc)}</h2>
        <p class="promo-meta"><span>${esc(countriesText || 'Europe')}</span><span>${esc(expiry)}</span></p>
        ${p.note ? `<p class="promo-note">${esc(p.note)}</p>` : ''}
        ${p.highlightUrl ? `<div class="promo-highlight"><strong>${esc(p.highlightTitle)}</strong><p>${esc(p.highlightNote || '')}</p><a href="${esc(p.highlightUrl)}" target="_blank" rel="noopener sponsored">Découvrir la sélection →</a></div>` : ''}
        ${hasCode ? `<button class="promo-code" type="button" data-code="${esc(p.code)}" aria-label="Copier le code ${esc(p.code)}"><span>${esc(p.code)}</span><small>Copier</small></button>` : '<div class="promo-direct"><strong>Code promo via mon lien</strong><span>Les codes et promotions sont disponibles directement sur la boutique.</span></div>'}
        ${p.links?.length ? `<div class="promo-country-links">${p.links.map(link => `<a class="promo-link" data-link-country="${esc(link.country)}" href="${esc(link.url)}" target="_blank" rel="noopener sponsored">Voir les offres ${esc(link.label)} <span aria-hidden="true">→</span></a>`).join('')}</div>` : `<a class="promo-link" href="${esc(p.url)}" target="_blank" rel="noopener sponsored">${hasCode ? 'Voir l’offre' : 'Voir les codes et promotions'} <span aria-hidden="true">→</span></a>`}
      </article>`;
    };
    container.innerHTML = `<section class="promo-intro"><p class="promo-kicker">Codes promo et boutiques</p><h2>Trouvez votre code en quelques secondes</h2><p>Recherchez une boutique ou filtrez par pays. Les codes arrivés à expiration sont automatiquement retirés de la liste.</p></section>
      <section class="promo-tools" aria-label="Rechercher et filtrer les codes promo">
        <label class="promo-search"><span aria-hidden="true">⌕</span><input id="promo-search" type="search" placeholder="Rechercher une boutique ou un code…" autocomplete="off"></label>
        <div class="promo-filters" role="group" aria-label="Filtres par boutique"><button class="active" type="button" data-filter="all">Tous</button>${brands.map(brand => `<button type="button" data-filter="${esc(brand)}">${esc(brand)}</button>`).join('')}</div>
        ${countries.length ? `<div class="promo-countries" role="group" aria-label="Filtres par pays"><button class="active" type="button" data-country="all">Tous les pays</button>${countries.map(country => `<button type="button" data-country="${esc(country)}">${esc(country)}</button>`).join('')}</div>` : ''}
        <p id="promo-count" class="promo-count" aria-live="polite"></p>
      </section>
      <div class="promo-grid">${activePromos.map(renderCard).join('')}</div>
      <div id="promo-empty" class="promo-empty" hidden><strong>Aucun code ne correspond à votre recherche.</strong><span>Essayez une autre boutique ou réinitialisez les filtres.</span></div>
      <p class="promo-disclosure">Liens affiliés : Dingodor One Tech peut recevoir une commission sans augmentation du prix pour vous. Les conditions et stocks restent ceux de la boutique.</p>`;

    let selectedShop = 'all';
    let selectedCountry = 'all';
    const search = container.querySelector('#promo-search');
    const cards = [...container.querySelectorAll('.promo-card')];
    const count = container.querySelector('#promo-count');
    const empty = container.querySelector('#promo-empty');
    const applyFilters = () => {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const matchesSearch = !query || card.dataset.search.includes(query);
        const matchesShop = selectedShop === 'all' || card.dataset.shop === selectedShop;
        const matchesCountry = selectedCountry === 'all' || card.dataset.country.split(',').includes(selectedCountry);
        const show = matchesSearch && matchesShop && matchesCountry;
        card.hidden = !show;
        card.querySelectorAll('[data-link-country]').forEach(link => { link.hidden = selectedCountry !== 'all' && link.dataset.linkCountry !== selectedCountry; });
        if (show) visible += 1;
      });
      count.textContent = `${visible} offre${visible > 1 ? 's' : ''} partenaire${visible > 1 ? 's' : ''}`;
      empty.hidden = visible !== 0;
    };
    search.addEventListener('input', applyFilters);
    container.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      selectedShop = button.dataset.filter;
      container.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
      applyFilters();
    }));
    container.querySelectorAll('[data-country]').forEach(button => button.addEventListener('click', () => {
      selectedCountry = button.dataset.country;
      container.querySelectorAll('[data-country]').forEach(item => item.classList.toggle('active', item === button));
      applyFilters();
    }));
    applyFilters();
  } catch (_) {
    const warning = document.createElement('p');
    warning.className = 'promo-sync-warning';
    warning.textContent = 'La liste partagée n’a pas pu être chargée. Les codes ci-dessous proviennent de la dernière version enregistrée.';
    container.prepend(warning);
  }
  container.querySelectorAll('.promo-code').forEach(code => {
    const value = code.dataset.code;
    if (!value) return;
    const copy = async () => {
      await copyText(value);
      code.classList.add('copied');
      code.querySelector('small').textContent = 'Copié ✓';
      showCopyToast(`Code ${value} copié !`);
      setTimeout(() => { code.classList.remove('copied'); code.querySelector('small').textContent = 'Copier'; }, 1400);
    };
    code.addEventListener('click', copy);
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
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw new Error(`Erreur ${response.status}`);
  return response.json();
}

async function showPartners(container) {
  const data = await getJson(`${SHARED_DATA_URL}?v=${Date.now()}`);
  const partners = Array.isArray(data.partners) ? data.partners : [];
  container.innerHTML = `<section class="promo-intro"><p class="promo-kicker">Boutiques partenaires</p><h2>Soutenir Dingodor One Tech sans payer plus cher</h2><p>Choisissez votre boutique parmi nos partenaires.</p></section><div class="promo-grid">${partners.map(partner => `<article class="promo-card store-card"><div class="promo-card-top"><span class="promo-shop">${esc(partner.icon || '🛒')} ${esc(partner.name)}</span></div><h2>${esc(partner.description || '')}</h2><a class="promo-link" href="${esc(partner.url)}" target="_blank" rel="noopener sponsored">Accéder à la boutique <span aria-hidden="true">→</span></a></article>`).join('')}</div><p class="promo-disclosure">Liens affiliés : une commission peut soutenir Dingodor One Tech sans augmentation du prix pour vous.</p>`;
}

function enhanceArticleMedia(container) {
  const base = 'https://dingodoronetech.wordpress.com/';
  container.querySelectorAll('img').forEach((img, index) => {
    const lazySrc = img.getAttribute('data-lazy-src') || img.getAttribute('data-src') || img.getAttribute('data-original');
    const src = img.getAttribute('src') || '';
    if (lazySrc && (!src || src.startsWith('data:') || /placeholder|blank\.gif/i.test(src))) img.src = new URL(lazySrc, base).href;
    else if (src && !/^(?:https?:|data:|blob:)/i.test(src)) img.src = new URL(src, base).href;
    const lazySet = img.getAttribute('data-lazy-srcset') || img.getAttribute('data-srcset');
    if (lazySet && !img.getAttribute('srcset')) img.setAttribute('srcset', lazySet);
    img.loading = index === 0 ? 'eager' : 'lazy';
    img.decoding = 'async';
  });
  const videoId = value => {
    try {
      const url = new URL(value, base);
      if (['youtu.be', 'www.youtu.be'].includes(url.hostname)) return url.pathname.split('/')[1];
      if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
        if (url.pathname === '/watch') return url.searchParams.get('v');
        return url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
      }
    } catch (_) {}
    return null;
  };
  const addVideo = (element, value) => {
    const id = videoId(value);
    if (!id || !/^[\w-]{11}$/.test(id)) return false;
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + id;
    frame.title = 'Vidéo YouTube';
    frame.loading = 'lazy';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    const wrapper = document.createElement('div');
    wrapper.className = 'article-video';
    wrapper.append(frame);
    const fallback = document.createElement('a');
    fallback.href = value;
    fallback.target = '_blank';
    fallback.rel = 'noopener';
    fallback.textContent = 'Voir la vidéo sur YouTube si elle ne s’affiche pas';
    wrapper.append(fallback);
    element.replaceWith(wrapper);
    return true;
  };
  container.querySelectorAll('iframe').forEach(frame => {
    const lazySrc = frame.getAttribute('data-src') || frame.getAttribute('data-lazy-src');
    if (lazySrc && !frame.getAttribute('src')) frame.src = lazySrc;
    if (videoId(frame.src || '')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'article-video';
      frame.parentNode.insertBefore(wrapper, frame);
      wrapper.append(frame);
      const fallback = document.createElement('a');
      fallback.href = frame.src;
      fallback.target = '_blank';
      fallback.rel = 'noopener';
      fallback.textContent = 'Ouvrir la vidéo sur YouTube';
      wrapper.append(fallback);
    }
  });
  container.querySelectorAll('.wp-block-embed__wrapper').forEach(wrapper => {
    if (wrapper.querySelector('iframe')) return;
    const value = wrapper.textContent.trim();
    if (/^https?:\/\//i.test(value)) addVideo(wrapper, value);
  });
  container.querySelectorAll('p').forEach(paragraph => {
    if (paragraph.children.length && !(paragraph.children.length === 1 && paragraph.firstElementChild.tagName === 'A')) return;
    const link = paragraph.querySelector('a');
    const value = link?.href || paragraph.textContent.trim();
    if (/^https?:\/\//i.test(value) && paragraph.textContent.trim() === (link?.textContent.trim() || value)) addVideo(paragraph, value);
  });
}

async function showComments(post) {
  const section = document.querySelector('#comments');
  if (!section || !post?.ID) return;
  section.hidden = false;
  section.innerHTML = '<h2>Commentaires</h2><p class="comments-loading">Chargement des commentaires…</p>';
  let comments = [];
  try {
    const data = await getJson(`${API}/posts/${post.ID}/replies/?number=50`);
    comments = data.comments || [];
  } catch (_) {}
  const list = comments.length ? `<div class="comment-list">${comments.map(item => `<article class="comment"><header><strong>${esc(item.author?.name || item.author_name || 'Lecteur')}</strong><time>${new Intl.DateTimeFormat('fr-FR',{dateStyle:'long'}).format(new Date(item.date))}</time></header><div>${item.content || ''}</div></article>`).join('')}</div>` : '<p class="no-comments">Aucun commentaire pour le moment. Soyez le premier à participer.</p>';
  section.innerHTML = `<div class="comments-head"><div><p class="comments-kicker">La communauté</p><h2>Commentaires</h2></div><span>${comments.length}</span></div>${list}<div class="comment-form-card"><h3>Laisser un commentaire</h3><p>Votre adresse e-mail ne sera pas publiée. Le commentaire peut être modéré avant son affichage.</p><form action="${WP_ROOT}wp-comments-post.php" method="post" target="comment-result"><div class="form-grid"><label>Nom <input type="text" name="author" autocomplete="name" required></label><label>E-mail <input type="email" name="email" autocomplete="email" required></label></div><label>Commentaire <textarea name="comment" rows="6" required></textarea></label><input type="hidden" name="comment_post_ID" value="${post.ID}"><input type="hidden" name="comment_parent" value="0"><button type="submit">Publier mon commentaire</button></form><iframe name="comment-result" class="comment-result" title="Résultat de l’envoi du commentaire"></iframe></div>`;
}

async function showSingle(kind) {
  const slug = new URLSearchParams(location.search).get('slug');
  const status = document.querySelector('#status');
  if (!slug) { status.textContent = 'Contenu introuvable : adresse incomplète.'; return; }
  if (kind === 'page' && slug === 'quelle-camera-de-surveillance-choisir-le-guide-interactif-gratuit') {
    location.replace('guide-camera.html');
    return;
  }
  if (kind === 'page' && slug === 'site-partenaires') {
    document.title = 'Boutiques partenaires — Dingodor One Tech';
    document.querySelector('#content-title').textContent = 'Boutiques partenaires';
    document.querySelector('#content-meta')?.remove();
    document.body.dataset.slug = slug;
    document.body.classList.add('custom-landing');
    const content = document.querySelector('#wp-content');
    try {
      await showPartners(content);
    } catch (_) {
      content.innerHTML = '<p>Les boutiques sont momentanément indisponibles. <a href="page.html?slug=site-partenaires">Réessayer</a></p>';
    }
    status.remove();
    content.hidden = false;
    return;
  }
  if (kind === 'page' && slug === 'contact') {
    document.title = 'Contact — Dingodor One Tech';
    document.querySelector('#content-title').textContent = 'Contact';
    document.querySelector('#content-meta')?.remove();
    const content = document.querySelector('#wp-content');
    content.classList.add('contact-page');
    content.innerHTML = `<div class="contact-layout"><div class="contact-copy"><p class="contact-kicker">Échangeons</p><h2>Une question ou un projet ?</h2><p>Une question sur la domotique, une proposition de partenariat ou un produit à présenter ? Envoyez-moi directement votre message.</p><ul><li>Réponse directement par e-mail</li><li>Adresse de réception protégée</li><li>Formulaire sécurisé et protégé contre le spam</li></ul></div><form id="contact-form" class="contact-form"><input type="hidden" name="access_key" value="07a073f2-b629-4e3d-b00f-7389cfa083b5"><input type="hidden" name="subject" value="Nouveau message depuis Dingodor One Tech"><input type="checkbox" name="botcheck" class="botcheck" tabindex="-1" autocomplete="off"><div class="form-grid"><label>Nom <input type="text" name="name" autocomplete="name" required placeholder="Votre nom"></label><label>Adresse e-mail <input type="email" name="email" autocomplete="email" required placeholder="vous@exemple.com"></label></div><label>Sujet <input type="text" name="sujet" required placeholder="Objet de votre message"></label><label>Message <textarea name="message" rows="7" required placeholder="Écrivez votre message…"></textarea></label><label class="consent"><input type="checkbox" required> <span>J’accepte que mes informations soient utilisées uniquement pour répondre à ma demande.</span></label><button type="submit"><span>Envoyer mon message</span></button><p id="contact-result" class="contact-result" role="status" aria-live="polite"></p></form></div>`;
    const form = content.querySelector('#contact-form');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const result = form.querySelector('#contact-result');
      button.disabled = true;
      button.querySelector('span').textContent = 'Envoi en cours…';
      result.textContent = '';
      result.className = 'contact-result';
      try {
        const response = await fetch('https://api.web3forms.com/submit', {method:'POST', body:new FormData(form)});
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Envoi impossible');
        form.reset();
        result.textContent = '✓ Votre message a bien été envoyé. Merci !';
        result.classList.add('success');
      } catch (_) {
        result.textContent = 'Le message n’a pas pu être envoyé. Veuillez réessayer dans quelques instants.';
        result.classList.add('error');
      } finally {
        button.disabled = false;
        button.querySelector('span').textContent = 'Envoyer mon message';
      }
    });
    status.remove();
    content.hidden = false;
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
    if (kind === 'post') enhanceArticleMedia(content);
    localizeWordPressLinks(content);
    if (slug === 'code-promo-2') await enhancePromoPage(content);
    if (slug === 'site-partenaires') await showPartners(content);
    status.remove();
    content.hidden = false;
    if (kind === 'post') showComments(post);
  } catch (error) {
    status.innerHTML = `<strong>Impossible de charger ce contenu.</strong><br>${esc(error.message)}<br><a href="articles.html">Voir tous les articles</a>`;
  }
}

let offset = 0;
const batch = 12;
const POSTS_CACHE_KEY = 'dingodor-posts-cache-v1';
let currentSearch = '';
let postsRequest = 0;
let postsController = null;

function appendPostCards(posts, {replace = false} = {}) {
  const grid = document.querySelector('#post-grid');
  if (replace) grid.innerHTML = '';
  posts.forEach(post => {
    const image = post.featured_image || '';
    const excerpt = textOnly(post.excerpt || '').slice(0, 150);
    const card = document.createElement('a');
    card.className = 'post-card';
    card.href = post.slug === 'pg107' ? 'alarme-pg107.html' : `article.html?slug=${encodeURIComponent(post.slug)}`;
    card.innerHTML = `${image ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async">` : ''}<div class="post-card-body"><time>${new Intl.DateTimeFormat('fr-FR',{dateStyle:'long'}).format(new Date(post.date))}</time><h2>${esc(textOnly(post.title))}</h2><p>${esc(excerpt)}${excerpt.length >= 150 ? '…' : ''}</p></div>`;
    grid.appendChild(card);
  });
}

function showCachedPosts() {
  try {
    const cached = JSON.parse(localStorage.getItem(POSTS_CACHE_KEY) || 'null');
    if (!cached?.posts?.length) return false;
    appendPostCards(cached.posts, {replace: true});
    document.querySelector('#status')?.remove();
    return true;
  } catch (_) {
    return false;
  }
}

async function loadPosts({reset = false} = {}) {
  const status = document.querySelector('#status');
  const more = document.querySelector('#more');
  const count = document.querySelector('#post-count');
  const empty = document.querySelector('#post-empty');
  if (reset) {
    offset = 0;
    postsController?.abort();
    document.querySelector('#post-grid').innerHTML = '';
    count.textContent = '';
    more.hidden = false;
  } else if (more.disabled) return;
  const request = ++postsRequest;
  postsController = new AbortController();
  more.disabled = true;
  more.textContent = 'Chargement…';
  empty.hidden = true;
  try {
    const fields = 'ID,title,slug,date,excerpt,featured_image';
    const params = new URLSearchParams({number: String(batch), offset: String(offset), fields});
    if (currentSearch) params.set('search', currentSearch);
    const response = await fetch(`${API}/posts/?${params}`, {signal: postsController.signal});
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    const data = await response.json();
    if (request !== postsRequest) return;
    const firstPage = offset === 0;
    appendPostCards(data.posts, {replace: firstPage});
    if (firstPage && !currentSearch) {
      try { localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify({posts: data.posts, savedAt: Date.now()})); } catch (_) {}
    }
    offset += data.posts.length;
    const found = Number(data.found);
    const hasTotal = Number.isFinite(found);
    const hasMore = data.posts.length > 0 && (hasTotal ? offset < found : data.posts.length === batch);
    status?.remove();
    empty.hidden = offset !== 0;
    count.textContent = hasTotal
      ? `${offset} article${offset > 1 ? 's' : ''} affiché${offset > 1 ? 's' : ''} sur ${found}${currentSearch ? ' résultats' : ''}`
      : `${offset} article${offset > 1 ? 's' : ''} affiché${offset > 1 ? 's' : ''}`;
    more.disabled = !hasMore;
    more.hidden = !hasMore;
    more.textContent = 'Afficher plus d’articles';
  } catch (error) {
    if (error.name === 'AbortError' || request !== postsRequest) return;
    if (status) status.innerHTML = `<strong>Impossible de charger les articles.</strong><br>${esc(error.message)}`;
    else count.textContent = 'Le chargement a échoué. Réessayez.';
    more.hidden = false;
    more.textContent = 'Réessayer';
    more.disabled = false;
  }
}
document.addEventListener('DOMContentLoaded', () => {
  menu();
  const type = document.body.dataset.view;
  if (type === 'articles') {
    const search = document.querySelector('#article-query');
    const fromUrl = new URLSearchParams(location.search).get('q') || '';
    if (fromUrl) search.value = fromUrl;
    currentSearch = fromUrl.trim();
    document.querySelector('#more').addEventListener('click', () => loadPosts());
    document.querySelector('#article-search').addEventListener('submit', event => {
      event.preventDefault();
      clearTimeout(searchTimer);
      applySearch();
    });
    const applySearch = () => {
      const next = search.value.trim();
      if (next === currentSearch) return;
      currentSearch = next;
      const url = new URL(location.href);
      if (next) url.searchParams.set('q', next);
      else url.searchParams.delete('q');
      history.replaceState(null, '', url);
      loadPosts({reset: true});
    };
    let searchTimer;
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applySearch, 350);
    });
    if (!currentSearch) showCachedPosts();
    loadPosts({reset: Boolean(currentSearch)});
  }
  if (type === 'post' || type === 'page') showSingle(type);
  if (type === 'static-post') {
    const content = document.querySelector('#wp-content');
    enhanceArticleMedia(content);
    localizeWordPressLinks(content);
    showComments({ID: Number(document.body.dataset.postId)});
  }
});
