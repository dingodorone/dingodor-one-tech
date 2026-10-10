(function () {
  if (!['dingodoronetech.eu.org','localhost','127.0.0.1'].includes(location.hostname)) return;
  const previous=document.getElementById('dingodor-translate');
  if (previous?.dataset.version === '3') return;
  previous?.remove();
  const app = location.pathname.startsWith('/app/');
  const host = document.createElement('div'); host.id='dingodor-translate'; host.dataset.version='3'; host.className='notranslate'; host.setAttribute('translate','no');
  const button=document.createElement('button');button.type='button';button.className='d1-translate-trigger';button.textContent='🌐 Languages';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','d1-translate-dialog');
  const dialog=document.createElement('dialog');dialog.id='d1-translate-dialog';dialog.setAttribute('aria-labelledby','d1-translate-title');
  dialog.innerHTML='<div class="d1-translate-heading"><h2 id="d1-translate-title">🌐 Languages</h2><button class="d1-translate-close" type="button" aria-label="Fermer">×</button></div><p>Choose your language · Kies je taal · Sprache wählen</p><div class="d1-translate-languages"></div><p class="d1-translate-note"></p>';
  dialog.querySelector('.d1-translate-note').textContent=app?'Traduction automatique avec Google Traduction. La version traduite du site s’ouvre dans votre navigateur.':'Traduction automatique avec Google Traduction, dans un nouvel onglet.';
  const languages=[['en','English'],['nl','Nederlands'],['de','Deutsch'],['es','Español'],['it','Italiano'],['pt','Português'],['pl','Polski'],['ar','العربية']];
  const list=dialog.querySelector('.d1-translate-languages');
  languages.forEach(([language,label])=>{const a=document.createElement('a');a.textContent=label+' ↗';a.dataset.language=language;a.hreflang=language;a.lang=language;a.target='_blank';a.rel='noopener noreferrer';list.append(a);});
  const other=document.createElement('a');other.textContent='Autres langues · More languages ↗';other.className='d1-translate-other';other.target='_blank';other.rel='noopener noreferrer';list.after(other);
  function sourceURL(){
    if(app){
      const section=document.querySelector('.section.active')?.id.replace('sec-','') || location.hash.slice(1);
      const pages={'articles':'articles.html','bons-plans':'bons-plans.html','promos':'page.html?slug=code-promo-2','occasion':'occasion-dingo.html','partenaires':'partenaires.html','camera':'guide-camera.html','about':'page.html?slug=contact'};
      return 'https://dingodoronetech.eu.org/'+(pages[section]||'');
    }
    return 'https://dingodoronetech.eu.org/'+location.pathname.replace(/^\//,'')+location.search+location.hash;
  }
  function refreshLinks(){const source=sourceURL();list.querySelectorAll('a').forEach(a=>{const url=new URL('https://translate.google.com/translate');url.searchParams.set('sl','fr');url.searchParams.set('tl',a.dataset.language);url.searchParams.set('u',source);a.href=url.href;});const url=new URL('https://translate.google.com/');url.searchParams.set('op','websites');url.searchParams.set('sl','fr');url.searchParams.set('tl','en');url.searchParams.set('u',source);other.href=url.href;}
  button.addEventListener('click',()=>{refreshLinks();dialog.showModal();});
  dialog.querySelector('.d1-translate-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  host.append(button,dialog);
  const header=document.querySelector('header');
  if(app && header) header.after(host);
  else if(header){
    const contact=header.querySelector('a[href*="slug=contact"]');
    const nav=header.querySelector('nav');
    if(contact && contact.parentElement===header){
      const actions=document.createElement('div');actions.className='d1-header-actions';
      contact.before(actions);actions.append(contact,host);
    } else if(contact) contact.after(host);
    else if(nav) nav.append(host);
    else header.append(host);
  } else document.body.prepend(host);
  const css=document.createElement('style');css.textContent=`
#dingodor-translate{font-family:system-ui,sans-serif;display:flex;justify-content:flex-end;padding:10px 20px;box-sizing:border-box;background:#f6f8fb;border-bottom:1px solid #dce4ee}.d1-translate-trigger{position:static;border:1px solid #20d6e7;background:#10283d;color:#fff;border-radius:999px;padding:12px 18px;font:700 14px system-ui;box-shadow:0 6px 22px #07111f26;cursor:pointer}#d1-translate-dialog{margin:auto;width:min(440px,calc(100% - 32px));max-height:80dvh;overflow:auto;padding:24px;border:1px solid #bcdcd9;border-radius:24px;background:#f6f8fb;color:#10283d;box-sizing:border-box;box-shadow:0 24px 80px #07111f40}#d1-translate-dialog::backdrop{background:#07111f99}.d1-translate-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.d1-translate-heading h2{font:800 21px system-ui;margin:0}.d1-translate-close{background:#e3ecef;border:0;border-radius:50%;width:40px;height:40px;flex-shrink:0;font:24px system-ui;color:#10283d;cursor:pointer}#d1-translate-dialog p{font:14px/1.6 system-ui;margin:16px 0;color:#516777}.d1-translate-languages{display:grid;grid-template-columns:1fr 1fr;gap:10px}.d1-translate-languages a{display:block;text-decoration:none;color:#10283d;background:#fff;border:1px solid #dce4ee;border-radius:12px;padding:14px;font:700 15px system-ui}.d1-translate-languages a:hover{background:#eaf8f6;border-color:#087f86}.d1-translate-other{display:block;color:#087f86;font:700 14px/1.6 system-ui;margin-top:18px;text-decoration:underline}#d1-translate-dialog .d1-translate-note{font-size:12px;margin-bottom:0}.d1-translate-trigger:focus-visible,#d1-translate-dialog a:focus-visible,.d1-translate-close:focus-visible{outline:3px solid #0a74ef;outline-offset:3px}`;
  if(!app)css.textContent+=`
#dingodor-translate{display:inline-flex;flex-shrink:0;padding:0;background:transparent;border:0}.d1-header-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}.d1-translate-trigger{min-height:42px;padding:9px 13px;border:1px solid #c9dce7;border-radius:12px;background:#eaf4f8;color:#10283d;box-shadow:none;white-space:nowrap;font:700 13px system-ui}.d1-translate-trigger:hover{background:#dceff3;border-color:#087f86}.site-header nav #dingodor-translate{margin-left:0}
@media(min-width:1151px) and (max-width:1550px){.site-header{flex-wrap:wrap;height:auto!important;min-height:72px;padding:1rem 1.2rem!important;gap:1rem!important}.site-header .menu-button{display:block;margin-left:auto}.site-header nav{display:none;order:3;width:100%;flex-direction:column;align-items:stretch;gap:0;border-top:1px solid var(--line)}.site-header nav.open{display:flex}.site-header nav a{padding:.65rem 0}}
@media(max-width:1150px){.d1-header-actions .desktop-cta{display:inline-flex}.d1-header-actions{order:2}.site-header nav #dingodor-translate{padding:8px 0}}
@media(max-width:720px){.d1-header-actions{width:100%;justify-content:flex-end}.d1-header-actions .button-small{min-height:38px}.d1-translate-trigger{min-height:38px}.site-header nav{order:3}}
`;
  if(app)css.textContent+='#dingodor-translate{background:#0c1a2e;border-color:#16c7d824;padding:8px 16px}.d1-translate-trigger{padding:10px 15px}.notification-permission-active #dingodor-translate,.notification-provider-prompt #dingodor-translate{visibility:hidden}';
  document.head.append(css);
})();