(() => {
  'use strict';
  const feed = document.querySelector('#deals-feed');
  const status = document.querySelector('#deals-status');
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
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
        const article = DealView.render(deal); feed.append(article);
      }
      status.textContent = ''; status.hidden = true;
    } catch (_) {
      status.hidden = false; status.replaceChildren(document.createTextNode('Les bons plans n’ont pas pu être chargés. '));
      const retry = el('button', 'button button-small', 'Réessayer'); retry.type = 'button'; retry.onclick = load; status.append(retry);
    }
  }
  load();
})();
