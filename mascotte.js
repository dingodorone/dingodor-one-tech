(() => {
  const assetBase = new URL('.', document.currentScript.src);
  const isApp = location.pathname.includes('/app/');
  if (isApp) document.body.classList.add('dingo-app');
  const profiles = {
    home: ['bricole', 'Bienvenue ! La chaîne et le blog ont été créés pour aider.'],
    articles: ['pensif', 'Des tests et des conseils pour t’aider à choisir !'],
    deals: ['bricole', 'Mes bons plans sont ici ! Pense à vérifier le prix chez le marchand.'],
    promos: ['surpris', 'Pense aux codes promo avant de commander !'],
    camera: ['camera', 'Besoin d’aide ? Trouve la caméra adaptée à tes besoins.']
  };
  const style = document.createElement('style');
  style.textContent = '\n    .dingodor-mascotte{position:fixed;right:clamp(8px,2vw,26px);bottom:8px;z-index:50;width:150px;filter:drop-shadow(0 16px 22px #0008);transform:translateY(115%);animation:dingodor-peek .75s cubic-bezier(.2,.85,.3,1.2) 1.1s forwards;pointer-events:none}\n    .dingodor-mascotte__personnage{display:block;width:100%;height:auto;transform-origin:50% 100%;animation:dingodor-salut .9s ease-in-out 2s 2, dingodor-flotte 2.8s ease-in-out 3.8s infinite;pointer-events:auto;cursor:pointer}\n    .dingodor-mascotte__bulle{position:absolute;right:70%;bottom:68%;width:min(260px,55vw);margin:0;padding:12px 15px;border:1px solid #39dfe9;border-radius:16px 16px 3px 16px;background:#fff;color:#102030;font:800 .86rem/1.4 Manrope,system-ui,sans-serif;box-shadow:0 12px 35px #0005;opacity:0;transform:translate(12px,8px) scale(.92);animation:dingodor-bulle .35s ease 1.65s forwards;pointer-events:auto}\n    .dingodor-mascotte__fermer{position:absolute;right:-8px;top:-10px;width:26px;height:26px;border:0;border-radius:50%;background:#0b2030;color:#fff;font:900 16px/26px system-ui;cursor:pointer;box-shadow:0 4px 12px #0005}\n    .dingodor-mascotte.is-leaving{animation:dingodor-sortie .45s ease-in forwards}\n    @keyframes dingodor-peek{to{transform:translateY(0)}}\n    @keyframes dingodor-bulle{to{opacity:1;transform:translate(0) scale(1)}}\n    @keyframes dingodor-salut{0%,100%{transform:rotate(0)}35%{transform:rotate(-3deg) translateY(-5px)}70%{transform:rotate(3deg)}}\n    @keyframes dingodor-flotte{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}\n    @keyframes dingodor-sortie{to{transform:translateY(120%);opacity:0}}\n    @media(max-width:700px){.dingodor-mascotte{width:92px;right:6px}.dingodor-mascotte__bulle{right:78%;bottom:62%;width:min(220px,66vw);padding:10px 12px;font-size:.74rem}.dingodor-mascotte__fermer{width:24px;height:24px;line-height:24px}}\n    @media(prefers-reduced-motion:reduce){.dingodor-mascotte{animation:none;transform:translateY(0)}.dingodor-mascotte__personnage,.dingodor-mascotte__bulle{animation:none}.dingodor-mascotte__bulle{opacity:1;transform:none}}\n  \nbody.dingo-app .dingodor-mascotte{bottom:90px}\n@media(max-width:700px){body.dingo-app .dingodor-mascotte{bottom:85px}}\n';
  document.head.appendChild(style);
  let mascot, timer;
  const seen = new Set();
  function currentProfile() {
    if (isApp) {
      const active = document.querySelector('.section.active');
      return ({'sec-accueil':'home','sec-articles':'articles','sec-bons-plans':'deals','sec-promos':'promos','sec-camera':'camera'})[active?.id];
    }
    if (/guide-camera\.html$/.test(location.pathname)) return 'camera';
    if (/bons-plans\.html$/.test(location.pathname)) return 'deals';
    if (document.body.dataset.view === 'articles') return 'articles';
    if (new URLSearchParams(location.search).get('slug') === 'code-promo-2') return 'promos';
    if (/(^|\/)index\.html$/.test(location.pathname) || location.pathname.endsWith('/')) return 'home';
  }
  function show() {
    const key = currentProfile();
    clearTimeout(timer);
    mascot?.remove(); mascot = null;
    if (!profiles[key] || seen.has(key)) return;
    const sessionKey = 'dingodor-mascotte-v3-' + key;
    try { if (sessionStorage.getItem(sessionKey)) return; sessionStorage.setItem(sessionKey,'1'); } catch (_) {}
    seen.add(key);
    const [pose,message] = profiles[key];
    mascot = document.createElement('aside');
    mascot.className = 'dingodor-mascotte'; mascot.setAttribute('aria-label','Conseil de Dingodor');
    mascot.innerHTML = '<p class="dingodor-mascotte__bulle"><button class="dingodor-mascotte__fermer" type="button" aria-label="Fermer la mascotte">×</button><span></span></p><img class="dingodor-mascotte__personnage" alt="" width="360" height="480">';
    mascot.querySelector('span').textContent = message;
    mascot.querySelector('img').src = new URL('assets/avatars/dingo-' + pose + '.webp',assetBase).href;
    document.body.appendChild(mascot);
    const instance = mascot;
    const hide = () => { instance.classList.add('is-leaving'); setTimeout(()=>instance.remove(),500); };
    instance.querySelector('button').addEventListener('click',hide);
    timer = setTimeout(hide,7500);
  }
  show();
  if (isApp) {
    const observer = new MutationObserver(show);
    document.querySelectorAll('.section').forEach(section=>observer.observe(section,{attributes:true,attributeFilter:['class']}));
  }
})();
