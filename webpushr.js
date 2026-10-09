(function () {
  if (document.getElementById('dingodor-notifications')) return;
  const section = document.createElement('section');
  section.id = 'dingodor-notifications';
  section.setAttribute('aria-label', 'Abonnement aux notifications');
  section.innerHTML = '<div><strong>Gardons le contact</strong><p>Recevez les nouveaux articles et bons plans directement dans votre navigateur.</p></div><div class="notification-actions"><button type="button" id="dingodor-subscribe-button" data-button-text="S’abonner aux notifications" data-show-subscriber-count="false" data-background-color="#087f86" data-border-radius="999px" data-padding="12px 20px" data-font-family="inherit">S’abonner aux notifications</button><p id="dingodor-notification-status" role="status" aria-live="polite"></p></div>';
  const appHome = document.querySelector('#sec-accueil');
  const footer = document.querySelector('footer');
  if (appHome) { section.classList.add('notification-app-card'); appHome.append(section); }
  else if (footer) footer.before(section); else document.body.append(section);
  const style = document.createElement('style');
  style.textContent = '#dingodor-notifications{max-width:1100px;margin:36px auto;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;gap:24px;background:linear-gradient(120deg,#eaf8f6,#eff5ff);border:1px solid #bcdcd9;border-radius:24px;box-sizing:border-box;color:#173e48;font-family:inherit}#dingodor-notifications strong{font-size:22px}#dingodor-notifications p{margin:8px 0 0;font-size:14px;line-height:1.6}#dingodor-notifications button{border:0;background:#087f86;color:white;padding:12px 20px;border-radius:999px;cursor:pointer;font:700 14px inherit}#dingodor-notifications button:focus-visible{outline:3px solid #174c91;outline-offset:4px}.notification-actions{min-width:230px}#dingodor-notification-status{max-width:330px}@media(max-width:700px){#dingodor-notifications{margin:28px 18px;padding:22px;display:block}.notification-actions{margin-top:18px;min-width:0}}';
  style.textContent += '#dingodor-notifications{box-shadow:none;background:#f0f7f7;border-radius:20px}#dingodor-notifications strong{font-size:20px;letter-spacing:-.02em}#dingodor-notifications.notification-app-card{margin:22px 0;padding:20px;background:linear-gradient(145deg,#142d42,#0d1e30);border:1px solid rgba(22,199,216,.24);color:#e8faff;display:block;border-radius:22px;box-shadow:0 12px 28px rgba(0,0,0,.14)}.notification-app-card .notification-actions{min-width:0;margin-top:16px}.notification-app-card p{color:#a9c2d1}.notification-app-card details{color:#a9c2d1}.notification-app-card summary{cursor:pointer;font-size:12px}.notification-app-card a{color:#78eaf2!important}.notification-app-card #dingodor-subscribe-button{width:100%;min-height:46px;font-family:system-ui,sans-serif;font-weight:700;color:#05202b;background:linear-gradient(120deg,#16c7d8,#55dee7);box-sizing:border-box;border-radius:14px}body:has(#sec-accueil) .section{padding-bottom:calc(150px + env(safe-area-inset-bottom))}.notification-permission-active .bottom-nav{visibility:hidden}.notification-permission-active .install-banner{display:none!important}#webpushr-prompt-wrapper{position:relative;z-index:10000!important}#webpushr-lightbox-optin{z-index:10001!important}';
  document.head.append(style);
  if (appHome) {
    const observePrompt = () => {
      const approve = document.getElementById('webpushr-approve-button');
      const visible = approve && approve.getClientRects().length > 0;
      document.body.classList.toggle('notification-provider-prompt', Boolean(visible));
    };
    style.textContent += '.notification-provider-prompt .install-banner{display:none!important}.notification-provider-prompt .bottom-nav{visibility:hidden}';
    const observer = new MutationObserver(observePrompt);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
    observePrompt();
  }
  const button = document.getElementById('dingodor-subscribe-button');
  const status = document.getElementById('dingodor-notification-status');
  const android = /Android/i.test(navigator.userAgent);
  const androidChrome = android && /Chrome\/\d+/i.test(navigator.userAgent) && !/\bwv\b|EdgA|OPR\/|SamsungBrowser|YaBrowser|DuckDuckGo|Bing/i.test(navigator.userAgent);
  const help = document.createElement('div');
  help.className = 'notification-mobile-help';
  if (android) {
    const details = document.createElement('details');
    details.innerHTML = '<summary>Activer les notifications sur Android</summary><p>Dans Chrome : ⋮ → Paramètres → Paramètres des sites → Notifications. Autorisez les notifications, puis vérifiez que dingodoronetech.eu.org n’est pas bloqué.</p><p>Dans les réglages du téléphone : Applications → Chrome → Notifications → Autoriser les notifications.</p><p>Si vous êtes dans l’application Bing, ouvrez le site dans Chrome, en dehors de l’application. Évitez la navigation privée.</p>';
    const open = document.createElement('a');
    open.textContent = 'Ouvrir le site dans Chrome';
    const currentUrl = new URL(location.href);
    const destination = currentUrl.host + currentUrl.pathname + currentUrl.search;
    open.href = 'intent://' + destination + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(currentUrl.href) + ';end';
    open.style.cssText = 'display:inline-block;margin-top:12px;color:#086c73;font-weight:700;text-decoration:underline';
    if (!androidChrome) help.append(open);
    help.append(details);
    details.style.cssText = 'margin-top:12px;font-size:14px;max-width:420px';
    section.querySelector('.notification-actions').append(help);
  }
  let confirmed=false, working=false, existingSubscriber=false, subscriptionPaused=false;
  function update() {
    help.hidden = confirmed && !subscriptionPaused && window.Notification?.permission === 'granted';
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      button.hidden = true;
      status.textContent = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'Sur iPhone ou iPad, ajoutez le site à l’écran d’accueil, puis ouvrez-le pour activer les notifications.' : android ? 'Ce navigateur ne propose pas les notifications du site. Ouvrez le site directement dans Chrome.' : 'Les notifications ne sont pas disponibles dans ce navigateur.';
    } else if (Notification.permission === 'denied') {
      button.hidden = true;
      status.textContent = android ? 'Les notifications ne sont pas autorisées dans ce navigateur. Vérifiez les réglages du site et les notifications de Chrome dans les réglages Android.' : 'Les notifications sont bloquées. Autorisez-les dans les réglages de ce site dans votre navigateur.';
    } else if (subscriptionPaused) {
      button.hidden = true;
      status.textContent = 'Votre abonnement existe, mais les notifications sont désactivées. Réactivez-les avec la cloche de notifications.';
    } else if (confirmed) {
      button.hidden = true;
      status.textContent = existingSubscriber ? 'Vous êtes déjà abonné aux notifications sur ce navigateur.' : 'Vous êtes abonné aux notifications sur ce navigateur.';
    } else {
      button.hidden = false;
      button.textContent = Notification.permission === 'granted' ? 'Activer les notifications' : 'S’abonner aux notifications';
    }
  }
  update();
  async function checkExistingSubscription() {
    if (working || !('Notification' in window) || !navigator.serviceWorker) return;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem('_webpushr') || '{}') || {}; } catch (_) {}
      let active = false;
      for (const registration of registrations) {
        const worker = registration.active || registration.waiting || registration.installing;
        if (!worker || !['/webpushr-sw.js','/app/sw.js'].includes(new URL(worker.scriptURL).pathname)) continue;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription && subscription.endpoint === saved.endpoint && (!subscription.expirationTime || subscription.expirationTime > Date.now())) active = true;
      }
      const wasConfirmed = confirmed;
      existingSubscriber = active && Notification.permission === 'granted';
      subscriptionPaused = existingSubscriber && saved.bell_notification === 'off';
      confirmed = existingSubscriber && !subscriptionPaused;
      if (wasConfirmed && !confirmed && !subscriptionPaused) status.textContent = '';
      update();
    } catch (_) { update(); }
  }
  checkExistingSubscription();
  window.addEventListener('focus', checkExistingSubscription);
  let subscriptionChecks = 0;
  const subscriptionTimer = setInterval(() => {
    checkExistingSubscription();
    if (++subscriptionChecks >= 30) clearInterval(subscriptionTimer);
  }, 1000);
  const ready=()=>typeof window._webpushrSubscribeNow==='function' && window.WebPushr?.swRegistration && typeof window._wp_prompt_info!=='undefined';
  button.addEventListener('click', async () => {
    if(working)return;
    working=true;button.disabled=true;document.body.classList.add('notification-permission-active');
    let stage='AUTORISATION';
    try {
      status.textContent='Confirmez votre choix dans la demande de votre navigateur.';
      const permission=await Notification.requestPermission();
      if(permission!=='granted'){status.textContent=permission==='denied'?'Les notifications sont bloquées dans le navigateur.':'Vous pouvez vous abonner plus tard.';return;}
      stage='COMPOSANT-APPLICATION';
      status.textContent='Autorisation accordée. Activation des notifications…';
      const publicKey='BKm-wMk2Xcx2UUBRth0YXGgU4BQ85P_NR8qX6U5YTTrj7skEnKIwDsFNlQPpbzxlikl9b0ZDihe6L0apTD6OpPU';
      const app=location.pathname.startsWith('/app/');
      const registration=await navigator.serviceWorker.register(app?'/app/sw.js':'/webpushr-sw.js',{scope:app?'/app/':'/',updateViaCache:'none'});
      const decodeKey=value=>{const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));};
      if(!registration.active) {
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error('worker-timeout')),10000);
          const worker=registration.installing||registration.waiting;
          if(!worker){clearTimeout(timer);reject(Error('worker-inactive'));return;}
          worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timer);resolve();}});
        });
      }
      const subscription=await Promise.race([
        registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(publicKey)}),
        new Promise((_,reject)=>setTimeout(()=>reject(Error('push-timeout')),15000))
      ]);
      stage='ENREGISTREMENT-SERVEUR';
      const encode=value=>value?btoa(String.fromCharCode(...new Uint8Array(value))):null;
      const response=await fetch('https://subscriber.webpushr.com/subscribe/',{
        method:'POST',signal:AbortSignal.timeout(15000),
        body:JSON.stringify({endpoint:subscription.endpoint,key:encode(subscription.getKey('p256dh')),token:encode(subscription.getKey('auth')),site_id:publicKey,type:'POST',old:'',welcome_notification:1,timezone:new Date().getTimezoneOffset(),email:'',phone:''})
      });
      if(!response.ok)throw Error('HTTP '+response.status);
      let saved={};try{saved=JSON.parse(localStorage.getItem('_webpushr')||'{}')||{};}catch(_){}
      localStorage.setItem('_webpushr',JSON.stringify({...saved,endpoint:subscription.endpoint,bell_notification:'on'}));
      document.cookie='_webpushrEndPoint='+subscription.endpoint+';max-age=7776000;path=/;SameSite=Lax;Secure';
      confirmed=true;status.textContent='Vous êtes abonné aux notifications sur ce navigateur.';
    }catch(error){
      const reasons={
        'AUTORISATION':'La demande d’autorisation du navigateur n’a pas pu s’ouvrir.',
        'COMPOSANT-APPLICATION':'Le composant de notifications de l’application n’a pas pu démarrer.',
        'ABONNEMENT-TELEPHONE':'Le navigateur n’a pas pu créer l’abonnement aux notifications.',
        'ENREGISTREMENT-SERVEUR':'L’abonnement n’a pas pu être enregistré auprès du service de notifications.'
      };
      const http=String(error?.message||'').match(/HTTP\s+(\d{3})/);
      const detail=http?'HTTP '+http[1]:['NotAllowedError','InvalidStateError','AbortError','NotSupportedError','TypeError'].includes(error?.name)?error.name:/timeout/.test(error?.message||'')?'DELAI-DEPASSE':'ECHEC';
      status.textContent=reasons[stage]+' Vous pouvez réessayer. Diagnostic : '+stage+' / '+detail+'.';
      status.dataset.diagnostic=stage+' / '+detail;
      if(stage==='COMPOSANT-APPLICATION' && error?.message){
        const technical=document.createElement('details');technical.innerHTML='<summary>Détail du démarrage</summary>';
        const explanation=document.createElement('p');explanation.textContent=String(error.message).slice(0,600);technical.append(explanation);status.append(technical);
      }
    }finally{
      working=false;button.disabled=false;document.body.classList.remove('notification-permission-active');
      if(Notification.permission==='granted'&&!confirmed)button.textContent='Activer les notifications';
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
  key: 'BKm-wMk2Xcx2UUBRth0YXGgU4BQ85P_NR8qX6U5YTTrj7skEnKIwDsFNlQPpbzxlikl9b0ZDihe6L0apTD6OpPU',
  ...(location.pathname.startsWith('/app/') ? {sw:'/app/sw.js',scope:'/app/'} : {})
});
