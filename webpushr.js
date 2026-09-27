(function () {
  if (window.__dingodorPushReady) return;
  window.__dingodorPushReady = true;

  // The Webpushr prompt can be quiet or suppressed after a browser refusal.
  // Keep an explicit subscription path visible on small screens.
  const main = document.querySelector('main');
  if (main && (!('Notification' in window) || Notification.permission !== 'granted')) {
    const panel = document.createElement('section');
    panel.className = 'mobile-push';
    panel.setAttribute('aria-label', 'Notifications des nouveaux articles');
    const permission = 'Notification' in window ? Notification.permission : 'unsupported';
    let message = 'Recevez les nouveaux articles directement sur votre téléphone.';
    if (permission === 'denied') {
      message = 'Notifications bloquées dans ce navigateur. Dans Chrome, ouvrez les informations du site à gauche de l’adresse, puis Autorisations → Notifications → Autoriser.';
    } else if (permission === 'unsupported') {
      message = 'Pour recevoir les notifications, ouvrez le site dans un navigateur compatible avec les notifications web.';
    } else if (permission === 'granted') {
      message = 'Les notifications sont autorisées dans ce navigateur.';
    }
    panel.innerHTML = '<strong>Suivre les nouveaux articles</strong><p></p><div id="webpushr-subscription-button"></div>';
    panel.querySelector('p').textContent = message;
    if (permission === 'denied' || permission === 'unsupported') {
      panel.querySelector('#webpushr-subscription-button').hidden = true;
    }
    main.prepend(panel);

    const style = document.createElement('style');
    style.textContent = '.mobile-push{display:none}@media(max-width:720px){.mobile-push{display:block;margin:16px 18px 0;padding:16px;border:1px solid #b8d9ee;border-radius:14px;background:#edf8ff;color:#102b49;font:500 15px/1.5 Manrope,system-ui,sans-serif}.mobile-push strong{display:block;font-size:17px}.mobile-push p{margin:5px 0 10px}.mobile-push #webpushr-subscription-button:empty{display:none}}';
    document.head.appendChild(style);
  }

  if (typeof window.webpushr !== 'undefined') return;
  window.webpushr = function () {
    (window.webpushr.q = window.webpushr.q || []).push(arguments);
  };
  const script = document.createElement('script');
  script.id = 'webpushr-jssdk';
  script.async = true;
  script.src = 'https://cdn.webpushr.com/app.min.js';
  document.head.appendChild(script);
  webpushr('setup', {
    key: 'BKm-wMk2Xcx2UUBRth0YXGgU4BQ85P_NR8qX6U5YTTrj7skEnKIwDsFNlQPpbzxlikl9b0ZDihe6L0apTD6OpPU'
  });
})();
