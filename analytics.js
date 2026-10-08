// Google Analytics retiré : aucun suivi ni bandeau.
(function () {
  'use strict';
  window['ga-disable-G-T1CDDKT6BB'] = true;
  try { localStorage.removeItem('dingodor-analytics-consent-v1'); } catch (error) {}
  document.cookie.split(';').forEach(function (cookie) {
    var name = cookie.split('=')[0].trim();
    if (!/^_ga(?:_|$)/.test(name)) return;
    document.cookie = name + '=; Max-Age=0; path=/';
    var domains = location.hostname.split('.');
    while (domains.length > 1) {
      document.cookie = name + '=; Max-Age=0; path=/; domain=' + domains.join('.');
      domains.shift();
    }
  });
}());
