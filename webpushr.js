(function () {
  if (document.getElementById('dingodor-notifications')) return;
  const section = document.createElement('section');
  section.id = 'dingodor-notifications';
  section.setAttribute('aria-label', 'Abonnement aux notifications');
  section.innerHTML = '<div><strong>Gardons le contact</strong><p>Recevez les nouveaux articles et bons plans directement dans votre navigateur.</p></div><div class="notification-actions"><button type="button" id="webpushr-subscription-button" data-button-text="S’abonner aux notifications" data-show-subscriber-count="false" data-background-color="#087f86" data-border-radius="999px" data-padding="12px 20px" data-font-family="inherit">S’abonner aux notifications</button><p id="dingodor-notification-status" role="status" aria-live="polite"></p></div>';
  const footer = document.querySelector('footer');
  if (footer) footer.before(section); else document.body.append(section);
  const style = document.createElement('style');
  style.textContent = '#dingodor-notifications{max-width:1100px;margin:36px auto;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;gap:24px;background:linear-gradient(120deg,#eaf8f6,#eff5ff);border:1px solid #bcdcd9;border-radius:24px;box-sizing:border-box;color:#173e48;font-family:inherit}#dingodor-notifications strong{font-size:22px}#dingodor-notifications p{margin:8px 0 0;font-size:14px;line-height:1.6}#dingodor-notifications button{border:0;background:#087f86;color:white;padding:12px 20px;border-radius:999px;cursor:pointer;font:700 14px inherit}#dingodor-notifications button:focus-visible{outline:3px solid #174c91;outline-offset:4px}.notification-actions{min-width:230px}#dingodor-notification-status{max-width:330px}@media(max-width:700px){#dingodor-notifications{margin:28px 18px;padding:22px;display:block}.notification-actions{margin-top:18px;min-width:0}}';
  document.head.append(style);
  const button = document.getElementById('webpushr-subscription-button');
  const status = document.getElementById('dingodor-notification-status');
  function update() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      button.hidden = true;
      status.textContent = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'Sur iPhone ou iPad, ajoutez le site à l’écran d’accueil, puis ouvrez-le pour activer les notifications.' : 'Les notifications ne sont pas disponibles dans ce navigateur.';
    } else if (Notification.permission === 'denied') {
      button.hidden = true;
      status.textContent = 'Les notifications sont bloquées. Autorisez-les dans les réglages de ce site dans votre navigateur.';
    } else if (Notification.permission === 'granted') {
      button.hidden = true;
      status.textContent = 'Les notifications sont autorisées sur ce navigateur.';
    }
  }
  update();
  window.addEventListener('focus', update);
  button.addEventListener('click', () => {
    if (typeof window._webpushrRequestPermission !== 'function') {
      status.textContent = 'Le service de notifications charge encore ou est bloqué. Réessayez dans quelques instants.';
    } else {
      status.textContent = 'Confirmez votre choix dans la demande de votre navigateur.';
      setTimeout(update, 1200);
    }
  });
})();

(function (window, document, tagName, id) {
  if (typeof window.webpushr !== 'undefined') return;

  window.webpushr = window.webpushr || function () {
    (window.webpushr.q = window.webpushr.q || []).push(arguments);
  };

  const firstScript = document.getElementsByTagName(tagName)[0];
  const script = document.createElement(tagName);
  script.id = id;
  script.async = true;
  script.src = 'https://cdn.webpushr.com/app.min.js';
  firstScript.parentNode.insertBefore(script, firstScript);
})(window, document, 'script', 'webpushr-jssdk');

webpushr('setup', {
  key: 'BKm-wMk2Xcx2UUBRth0YXGgU4BQ85P_NR8qX6U5YTTrj7skEnKIwDsFNlQPpbzxlikl9b0ZDihe6L0apTD6OpPU'
});
