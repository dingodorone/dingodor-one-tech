(() => {
  'use strict';
  const start = new Date('2026-11-01T00:00:00+01:00');
  const end = new Date('2026-11-19T00:00:00+01:00');
  if (Date.now() < start || Date.now() >= end) return;

  const main = document.querySelector('main');
  if (!main || document.querySelector('.current-deals-alert')) return;

  fetch('/data/bons-plans.json', {cache:'no-store'})
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(data => {
      const deals = (data.deals || []).filter(deal =>
        /^(ssd-netac-|nintendo-switch-)/.test(deal.id || '')
      );
      if (!deals.length) return;

      const alert = document.createElement('aside');
      alert.className = 'current-deals-alert';
      alert.setAttribute('aria-label', 'Nouveaux bons plans composants et consoles');
      alert.innerHTML = '<div><strong>🔥 Nouveaux bons plans SSD et Nintendo Switch</strong><p>Offres AliExpress avec codes promo pour la France et la Belgique, jusqu’au 18 novembre selon disponibilité.</p></div><a href="/bons-plans.html">Voir les ' + deals.length + ' offres →</a>';

      const style = document.createElement('style');
      style.textContent = '.current-deals-alert{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:18px auto 24px;padding:18px 20px;max-width:1120px;border:1px solid #ffd19b;border-radius:16px;background:linear-gradient(110deg,#fff6e8,#fff);box-shadow:0 10px 28px #69350012;color:#172033}.current-deals-alert strong{font-size:1.02rem}.current-deals-alert p{margin:5px 0 0;color:#566274;font-size:.9rem}.current-deals-alert a{flex-shrink:0;color:#a74600;font-weight:800;text-decoration:none}.current-deals-alert a:hover{text-decoration:underline}@media(max-width:650px){.current-deals-alert{display:block;margin:14px 12px 20px}.current-deals-alert a{display:inline-block;margin-top:12px}}';
      document.head.append(style);

      const articleHeader = main.querySelector('.article-head');
      const quickGrid = main.querySelector('.quick-grid');
      if (articleHeader) articleHeader.after(alert);
      else if (quickGrid) quickGrid.before(alert);
      else main.prepend(alert);
    })
    .catch(() => {});
})();
