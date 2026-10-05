(() => {
  'use strict';
  const feed = document.querySelector('#deals-feed');
  const status = document.querySelector('#deals-status');
  const safeUrl = value => {
    try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch (_) { return ''; }
  };
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function linkText(message) {
    const p = el('p', 'deal-text');
    const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>\[\]"\)]+)/g;
    let start = 0;
    for (const match of message.matchAll(pattern)) {
      p.append(document.createTextNode(message.slice(start, match.index)));
      const raw = (match[2] || match[3]).replace(/[.,;!]+$/, '');
      const url = safeUrl(raw);
      if (url) {
        const a = el('a', '', match[1] || raw); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer sponsored'; p.append(a);
        if (!match[2]) p.append(document.createTextNode(match[3].slice(raw.length)));
      } else p.append(document.createTextNode(match[0]));
      start = match.index + match[0].length;
    }
    p.append(document.createTextNode(message.slice(start)));
    return p;
  }
  function productContext(message, product, index) {
    // Text between two URLs belongs to the following product, as in a tweet.
    const plain = message.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 $2');
    const urls = [...plain.matchAll(/https?:\/\/[^\s<>\[\]"\)]+/g)];
    const match = urls.find(m => m[0].replace(/[.,;!]+$/, '') === product.url);
    if (!match) return {title: product.title || `Offre ${index + 1}`, price: ''};
    const before = urls.filter(m => m.index < match.index).at(-1);
    const segment = plain.slice(before ? before.index + before[0].length : 0, match.index).trim();
    const price = segment.match(/\d+(?:[.,]\d{1,2})?\s*(?:€|EUR)/i);
    const promo = segment.match(/\b(?:code(?:\s+promo(?:tionnel)?)?|coupon)\s*(?:[:=]\s*)?["'«]?([A-Z0-9][A-Z0-9_-]{2,39})\b/i);
    const promoCode = promo && /\d|^[A-Z0-9_-]+$/.test(promo[1]) ? promo[1] : '';
    const title = segment.replace(/\d+(?:[.,]\d{1,2})?\s*(?:€|EUR)/gi, '').replace(/^\s*(?:et\s+)?(?:une?\s+)?/i, '').replace(/\b(?:link\.amazon|amzn\.to)\/\S+/g, '').trim();
    return {title: product.title || title || `Offre ${index + 1}`, price: price ? price[0].replace('.', ',') : '', promoCode};
  }
  function productCard(product, message, index) {
    const url = safeUrl(product.url);
    if (!url) return null;
    const context = productContext(message, product, index);
    const card = el('a', 'deal-product'); card.href = url; card.target = '_blank'; card.rel = 'noopener noreferrer sponsored';
    const box = el('div', 'deal-image');
    if (/^\/bon-plan-media\/[a-f0-9]{64}\.(jpg|jpeg|png|webp|gif)$/.test(product.image || '')) {
      const img = el('img'); img.src = product.image; img.alt = context.title; img.loading = 'lazy'; img.decoding = 'async';
      img.addEventListener('error', () => {box.replaceChildren(document.createTextNode('Voir le produit chez le marchand')); box.classList.add('empty');}, {once: true}); box.append(img);
    } else { box.classList.add('empty'); box.textContent = 'Voir le produit chez le marchand'; }
    const info = el('div', 'deal-info'); info.append(el('small', '', new URL(url).hostname), el('strong', '', context.title));
    if (context.price) info.append(el('span', 'deal-price', context.price));
    if (context.promoCode) info.append(el('strong', 'deal-promo', `Code promo : ${context.promoCode}`));
    info.append(el('span', 'deal-cta', 'Voir l’offre ↗')); card.append(box, info); return card;
  }
  async function load() {
    status.textContent = 'Chargement des bons plans…';
    try {
      const response = await fetch('../data/bons-plans.json', {cache:'no-store'});
      if (!response.ok) throw new Error('feed');
      const data = await response.json();
      if (!Array.isArray(data.deals)) throw new Error('format');
      const deals = data.deals.filter(d => typeof d.message === 'string' && Array.isArray(d.products) && !Number.isNaN(Date.parse(d.date))).sort((a,b) => Date.parse(b.date)-Date.parse(a.date));
      feed.replaceChildren();
      if (!deals.length) {
        const empty = el('section', 'deal-empty'); empty.append(el('h2', '', 'Les prochains bons plans arrivent ici.'), el('p', '', 'En attendant, retrouve les codes promo disponibles.'));
        const a = el('a', 'text-link', 'Voir les codes promo →'); a.href = '#promos'; a.addEventListener('click', () => switchSection('promos')); empty.append(a); feed.append(empty);
      }
      let lastDay = '';
      const dateFormat = new Intl.DateTimeFormat('fr-FR', {dateStyle:'long', timeZone:'Europe/Paris'});
      const timeFormat = new Intl.DateTimeFormat('fr-FR', {hour:'2-digit', minute:'2-digit', timeZone:'Europe/Paris'});
      const today = dateFormat.format(new Date());
      for (const deal of deals) {
        const date = new Date(deal.date); const day = dateFormat.format(date);
        if (day !== lastDay) {feed.append(el('h2', 'deal-day', day === today ? `Aujourd’hui · ${day}` : day)); lastDay = day;}
        const article = el('article', 'deal-post'); article.id = /^[a-z0-9-]+$/.test(deal.id) ? deal.id : '';
        const author = el('header', 'deal-author'); const avatar = el('span', 'deal-avatar'); avatar.setAttribute('aria-hidden', 'true');
        const label = el('div'); const time = el('time', '', `${day} à ${timeFormat.format(date)}`); time.dateTime = deal.date;
        label.append(el('strong', '', 'Dingodor One Tech'), time); author.append(avatar, label);
        const cards = el('div', 'deal-products'); deal.products.forEach((p,i) => {const card = productCard(p, deal.message, i); if (card) cards.append(card);});
        article.append(author, linkText(deal.message), cards); feed.append(article);
      }
      status.textContent = ''; status.hidden = true;
    } catch (_) {
      status.hidden = false; status.replaceChildren(document.createTextNode('Les bons plans n’ont pas pu être chargés. '));
      const retry = el('button', 'button button-small', 'Réessayer'); retry.type = 'button'; retry.onclick = load; status.append(retry);
    }
  }
  load();
})();
