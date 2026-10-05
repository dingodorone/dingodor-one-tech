(() => {
  const script = document.currentScript;
  const base = new URL('.', script.src);
  const style = document.createElement('style');
  style.textContent = `
    .dingo-avatar-host{position:relative;padding-right:220px;min-height:235px}
    .dingo-avatar{display:block;object-fit:contain;width:170px;height:215px;pointer-events:none;filter:drop-shadow(0 8px 14px #0002)}
    .dingo-avatar-host>.dingo-avatar{position:absolute;right:24px;top:20px}
    .hero-visual>.dingo-avatar{position:absolute;right:0;bottom:0;z-index:3;width:150px;height:210px}
    .guide-visual>.dingo-avatar{width:100%;height:310px;max-width:330px;margin:auto}
    .guide-visual:has(>.dingo-avatar) .guide-camera-body{display:none}.guide-visual:has(>.dingo-avatar) .guide-visual-note{top:auto;bottom:0;right:0}
    .dingo-articles-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}
    .dingo-articles-heading>.dingo-avatar{width:78px;height:110px;flex:none}
    @media(max-width:700px){
      .dingo-avatar-host{padding-right:120px;min-height:180px}
      .dingo-avatar-host>.dingo-avatar{right:8px;top:28px;width:96px;height:145px}
      .hero-visual>.dingo-avatar{width:118px;height:174px;right:8px}
      .guide-visual>.dingo-avatar{height:225px;max-width:260px}
    }
    @media(max-width:380px){.dingo-avatar-host{padding-right:95px}.dingo-avatar-host>.dingo-avatar{right:4px;width:78px;height:125px}}
  `;
  document.head.appendChild(style);
  function image(pose) {
    const img = document.createElement('img');
    img.className = 'dingo-avatar';
    img.src = new URL('assets/avatars/dingo-' + pose + '.webp', base).href;
    img.alt = ''; img.setAttribute('aria-hidden', 'true');
    img.width = 360; img.height = 480; img.decoding = 'async';
    return img;
  }
  function add(selector, pose, reserve = true) {
    const host = document.querySelector(selector);
    if (!host || host.querySelector('.dingo-avatar')) return;
    if (reserve) host.classList.add('dingo-avatar-host');
    host.appendChild(image(pose));
  }
  add('.hero-visual', 'bricole', false);
  add('[data-view="articles"] .page-hero', 'pensif');
  add('.deals-intro', 'bricole');
  add('.camera-standalone #sec-camera .guide-visual', 'camera', false);
  if (new URLSearchParams(location.search).get('slug') === 'code-promo-2') add('.article-head', 'surpris');
  if (location.pathname.includes('/app/')) {
    add('#sec-accueil > .hero', 'bricole');
    add('#sec-bons-plans > .hero', 'bricole');
    add('#sec-promos > .hero', 'surpris');
    add('#sec-camera > .hero', 'camera');
    const heading = document.querySelector('#sec-articles > .section-title');
    if (heading) {
      const wrap = document.createElement('div'); wrap.className = 'dingo-articles-heading';
      heading.before(wrap); wrap.append(heading, image('pensif'));
    }
  }
})();

if (!document.querySelector('script[src="webpushr.js"],script[src="../webpushr.js"]')) {
  const webpushrScript = document.createElement('script');
  webpushrScript.src = new URL('webpushr.js', document.currentScript.src).href;
  document.head.appendChild(webpushrScript);
}

