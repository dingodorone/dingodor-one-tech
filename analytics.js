(function () {
  'use strict';
  if (window.dingodorAnalytics) return;
  window.dingodorAnalytics = true;
  var key = 'dingodor-analytics-consent-v1', id = 'G-T1CDDKT6BB';
  var active = false, banner;
  function start() {
    if (active) return;
    active = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { allow_google_signals: false, allow_ad_personalization_signals: false });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(script);
  }
  function read() {
    try {
      var saved = JSON.parse(localStorage.getItem(key));
      if (saved && saved.expires > Date.now()) return saved.choice;
    } catch (error) {}
    return null;
  }
  function choose(choice) {
    try { localStorage.setItem(key, JSON.stringify({ choice: choice, expires: Date.now() + 180 * 86400000 })); } catch (error) {}
    if (choice === 'accepted') start();
    else {
      window['ga-disable-' + id] = true;
      document.cookie.split(';').forEach(function (cookie) {
        var name = cookie.split('=')[0].trim();
        if (!/^_ga(?:_|$)/.test(name)) return;
        var domains = location.hostname.split('.');
        document.cookie = name + '=; Max-Age=0; path=/';
        while (domains.length > 1) {
          document.cookie = name + '=; Max-Age=0; path=/; domain=' + domains.join('.');
          domains.shift();
        }
      });
    }
    banner.hidden = true;
    settings.focus();
  }
  var settings;
  function mount() {
    var style = document.createElement('style');
    style.textContent = '#dt-analytics-banner{position:fixed;bottom:54px;left:12px;right:12px;margin:auto;max-width:620px;padding:20px;background:#fff;color:#172536;border:1px solid #788493;border-radius:12px;box-shadow:0 6px 30px #0003;z-index:2147483646;font:15px/1.5 system-ui;text-align:left}#dt-analytics-banner[hidden]{display:none}#dt-analytics-banner p{margin:8px 0 16px}#dt-analytics-banner button{font:inherit;padding:10px 18px;margin:4px;border:1px solid #172536;border-radius:6px;background:#172536;color:#fff;cursor:pointer}#dt-analytics-settings{position:fixed;bottom:10px;left:10px;z-index:2147483645;background:#fff;color:#172536;border:1px solid #788493;border-radius:6px;padding:7px 12px;font:13px system-ui;cursor:pointer}#dt-analytics-banner button:focus-visible,#dt-analytics-settings:focus-visible{outline:3px solid #168675;outline-offset:3px}';
    document.head.appendChild(style);
    banner = document.createElement('section');
    banner.id = 'dt-analytics-banner';
    banner.setAttribute('aria-label', 'Choix des statistiques');
    banner.innerHTML = '<strong>Statistiques de visite</strong><p>Avec votre accord, Google Analytics utilise des cookies pour mesurer les visites et les pages consultées. Vous pouvez refuser et continuer à naviguer, ou modifier votre choix avec le bouton « Cookies ».</p><button type="button" data-choice="rejected">Refuser</button><button type="button" data-choice="accepted">Accepter</button>';
    banner.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () { choose(button.dataset.choice); });
    });
    settings = document.createElement('button');
    settings.type = 'button';
    settings.id = 'dt-analytics-settings';
    settings.textContent = 'Cookies';
    settings.addEventListener('click', function () { banner.hidden = false; banner.querySelector('button').focus(); });
    document.body.appendChild(banner);
    document.body.appendChild(settings);
    var choice = read();
    banner.hidden = choice !== null;
    if (choice === 'accepted') start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
}());
