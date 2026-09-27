(() => {
  const page = document.body.dataset.view || '';
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug') || '';
  const isHome = /(^|\/)index\.html$/.test(location.pathname) || location.pathname.endsWith('/');
  const messages = {
    home: 'Bienvenue chez Dingodor One Tech ! 👋',
    'code-promo-2': 'Je garde un œil sur les bons plans pour toi !',
    'site-partenaires': 'Ces liens soutiennent le site, sans coût supplémentaire.',
    'quelle-camera-de-surveillance-choisir-le-guide-interactif-gratuit': 'Besoin d’aide ? Je t’aide à choisir ta caméra.'
  };
  const isCameraGuide = /guide-camera\.html$/.test(location.pathname);
  const key = isHome ? 'home' : (isCameraGuide ? 'quelle-camera-de-surveillance-choisir-le-guide-interactif-gratuit' : slug);
  const message = messages[key];
  if (!message || page === 'post' || sessionStorage.getItem(`dingodor-mascotte-${key}`)) return;

  const style = document.createElement('style');
  style.textContent = `
    .dingodor-mascotte{position:fixed;right:clamp(8px,2vw,26px);bottom:-8px;z-index:50;width:min(175px,18vw);filter:drop-shadow(0 16px 22px #0008);transform:translateY(115%);animation:dingodor-peek .75s cubic-bezier(.2,.85,.3,1.2) 1.1s forwards;pointer-events:none}
    .dingodor-mascotte__personnage{display:block;width:100%;height:auto;transform-origin:50% 100%;animation:dingodor-salut .9s ease-in-out 2s 2, dingodor-flotte 2.8s ease-in-out 3.8s infinite;pointer-events:auto;cursor:pointer}
    .dingodor-mascotte__bulle{position:absolute;right:70%;bottom:68%;width:min(260px,55vw);margin:0;padding:12px 15px;border:1px solid #39dfe9;border-radius:16px 16px 3px 16px;background:#fff;color:#102030;font:800 .86rem/1.4 Manrope,system-ui,sans-serif;box-shadow:0 12px 35px #0005;opacity:0;transform:translate(12px,8px) scale(.92);animation:dingodor-bulle .35s ease 1.65s forwards;pointer-events:auto}
    .dingodor-mascotte__fermer{position:absolute;right:-8px;top:-10px;width:26px;height:26px;border:0;border-radius:50%;background:#0b2030;color:#fff;font:900 16px/26px system-ui;cursor:pointer;box-shadow:0 4px 12px #0005}
    .dingodor-mascotte.is-leaving{animation:dingodor-sortie .45s ease-in forwards}
    @keyframes dingodor-peek{to{transform:translateY(0)}}
    @keyframes dingodor-bulle{to{opacity:1;transform:translate(0) scale(1)}}
    @keyframes dingodor-salut{0%,100%{transform:rotate(0)}35%{transform:rotate(-3deg) translateY(-5px)}70%{transform:rotate(3deg)}}
    @keyframes dingodor-flotte{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
    @keyframes dingodor-sortie{to{transform:translateY(120%);opacity:0}}
    @media(max-width:700px){.dingodor-mascotte{width:92px;right:6px}.dingodor-mascotte__bulle{right:78%;bottom:62%;width:min(220px,66vw);padding:10px 12px;font-size:.74rem}.dingodor-mascotte__fermer{width:24px;height:24px;line-height:24px}}
    @media(prefers-reduced-motion:reduce){.dingodor-mascotte{animation:none;transform:translateY(0)}.dingodor-mascotte__personnage,.dingodor-mascotte__bulle{animation:none}.dingodor-mascotte__bulle{opacity:1;transform:none}}
  `;
  document.head.appendChild(style);

  const mascot = document.createElement('aside');
  mascot.className = 'dingodor-mascotte';
  mascot.setAttribute('aria-label', 'Mascotte Dingodor');
  mascot.innerHTML = `<p class="dingodor-mascotte__bulle"><button class="dingodor-mascotte__fermer" type="button" aria-label="Fermer la mascotte">×</button>${message}</p><img class="dingodor-mascotte__personnage" src="mascotte-dingodor.webp" alt="Mascotte Dingodor" width="360" height="540">`;
  document.body.appendChild(mascot);
  sessionStorage.setItem(`dingodor-mascotte-${key}`, '1');

  const hide = () => {
    if (mascot.classList.contains('is-leaving')) return;
    mascot.classList.add('is-leaving');
    setTimeout(() => mascot.remove(), 500);
  };
  mascot.querySelector('.dingodor-mascotte__fermer').addEventListener('click', hide);
  mascot.querySelector('.dingodor-mascotte__personnage').addEventListener('click', () => {
    const bubble = mascot.querySelector('.dingodor-mascotte__bulle');
    bubble.hidden = !bubble.hidden;
  });
  setTimeout(hide, 9500);
})();


if (!document.querySelector('script[src="webpushr.js"]')) {
  const webpushrScript = document.createElement('script');
  webpushrScript.src = 'webpushr.js';
  document.head.appendChild(webpushrScript);
}
