(function () {
  if (document.getElementById('dingodor-notifications')) return;
  const section = document.createElement('section');
  section.id = 'dingodor-notifications';
  section.setAttribute('aria-label', 'Abonnement aux notifications');
  section.innerHTML = '<div><strong>Gardons le contact</strong><p>Recevez les nouveaux articles et bons plans directement dans votre navigateur.</p></div><div class="notification-actions"><button type="button" id="dingodor-subscribe-button" data-button-text="S’abonner aux notifications" data-show-subscriber-count="false" data-background-color="#087f86" data-border-radius="999px" data-padding="12px 20px" data-font-family="inherit">S’abonner aux notifications</button><p id="dingodor-notification-status" role="status" aria-live="polite"></p></div>';
  const footer = document.querySelector('footer');
  if (footer) footer.before(section); else document.body.append(section);
  const style = document.createElement('style');
  style.textContent = '#dingodor-notifications{max-width:1100px;margin:36px auto;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;gap:24px;background:linear-gradient(120deg,#eaf8f6,#eff5ff);border:1px solid #bcdcd9;border-radius:24px;box-sizing:border-box;color:#173e48;font-family:inherit}#dingodor-notifications strong{font-size:22px}#dingodor-notifications p{margin:8px 0 0;font-size:14px;line-height:1.6}#dingodor-notifications button{border:0;background:#087f86;color:white;padding:12px 20px;border-radius:999px;cursor:pointer;font:700 14px inherit}#dingodor-notifications button:focus-visible{outline:3px solid #174c91;outline-offset:4px}.notification-actions{min-width:230px}#dingodor-notification-status{max-width:330px}@media(max-width:700px){#dingodor-notifications{margin:28px 18px;padding:22px;display:block}.notification-actions{margin-top:18px;min-width:0}}';
  document.head.append(style);
  const button = document.getElementById('dingodor-subscribe-button');
  const status = document.getElementById('dingodor-notification-status');
  let confirmed=false, working=false;
  function update() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      button.hidden = true;
      status.textContent = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'Sur iPhone ou iPad, ajoutez le site à l’écran d’accueil, puis ouvrez-le pour activer les notifications.' : 'Les notifications ne sont pas disponibles dans ce navigateur.';
    } else if (Notification.permission === 'denied') {
      button.hidden = true;
      status.textContent = 'Les notifications sont bloquées. Autorisez-les dans les réglages de ce site dans votre navigateur.';
    } else if (confirmed) {
      button.hidden = true;
      status.textContent = 'Vous êtes abonné aux notifications sur ce navigateur.';
    }
  }
  update();
  window.addEventListener('focus', update);
  const ready=()=>typeof window._webpushrSubscribeNow==='function' && window.WebPushr?.swRegistration && typeof window._wp_prompt_info!=='undefined';
  button.addEventListener('click', async () => {
    if(working)return;
    working=true;button.disabled=true;
    try {
      status.textContent='Confirmez votre choix dans la demande de votre navigateur.';
      const permission=await Notification.requestPermission();
      if(permission!=='granted'){status.textContent=permission==='denied'?'Les notifications sont bloquées dans le navigateur.':'Vous pouvez vous abonner plus tard.';return;}
      status.textContent='Autorisation accordée. Connexion au service de notifications…';
      if(!ready()&&typeof window._webpushrSubscribeNow!=='function'){
        document.getElementById('webpushr-jssdk')?.remove();
        const retry=document.createElement('script');retry.id='webpushr-jssdk';retry.async=true;retry.src='https://cdn.webpushr.com/app.min.js?retry='+Date.now();document.head.append(retry);
      }
      for(let i=0;i<40&&!ready();i++)await new Promise(resolve=>setTimeout(resolve,500));
      if(!ready())throw Error('unavailable');
      const result=await Promise.race([window._webpushrSubscribeNow(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),20000))]);
      if(result!=='true')throw Error('registration');
      confirmed=true;status.textContent='Vous êtes abonné aux notifications sur ce navigateur.';
    }catch(_){
      status.textContent=Notification.permission==='granted'?'Autorisation accordée, mais l’abonnement n’a pas pu être enregistré. Si votre protection bloque Webpushr, autorisez ce service sur ce site puis réessayez.':'La demande n’a pas pu s’ouvrir. Vérifiez les autorisations de ce site dans votre navigateur.';
    }finally{
      working=false;button.disabled=false;
      if(Notification.permission==='granted'&&!confirmed)button.textContent='Finaliser mon abonnement';
      update();
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
