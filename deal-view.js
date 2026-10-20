(() => {
'use strict';
const Text = (() => {
  function safeURL(value, allowMail = false) {
    try { const url = new URL(value); return (['https:', 'http:'].includes(url.protocol) || allowMail && url.protocol === 'mailto:') && !url.username && !url.password ? url.href : ''; } catch { return ''; }
  }
  function inline(text, parent) {
    const pattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>\[\]"\)]+)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
    let offset = 0;
    for (const match of text.matchAll(pattern)) {
      parent.append(document.createTextNode(text.slice(offset, match.index)));
      if (match[2] || match[3]) {
        const raw = match[2] || match[3].replace(/[.,;!]+$/, ''), url = safeURL(raw);
        if (url) {
          const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer sponsored'; a.textContent = match[1] || raw; parent.append(a);
          if (match[3]) parent.append(document.createTextNode(match[3].slice(raw.length)));
        } else parent.append(document.createTextNode(match[0]));
      } else {
        const tag = document.createElement(match[4] ? 'strong' : 'em');
        inline(match[4] || match[5], tag); parent.append(tag);
      }
      offset = match.index + match[0].length;
    }
    parent.append(document.createTextNode(text.slice(offset)));
  }
  function render(message) {
    const root = document.createElement('div'); root.className = 'deal-text';
    for (const block of message.replace(/\r\n?/g, '\n').replace(/\\\n/g, '\n').split(/\n\s*\n/)) {
      const p = document.createElement('p');
      block.split('\n').forEach((line, i) => { if (i) p.append(document.createElement('br')); inline(line, p); }); root.append(p);
    }
    return root;
  }
  function fromHTML(html) {
    const root = new DOMParser().parseFromString(html, 'text/html').body;
    root.querySelectorAll('script,style,iframe,object,embed,svg,math,form').forEach(n => n.remove());
    function visit(node) {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1) return '';
      const text = [...node.childNodes].map(visit).join('');
      if (node.tagName === 'A') { const url = safeURL(node.getAttribute('href')); return url ? '[' + (text.trim() || url).replace(/[\[\]]/g, '') + '](' + url.replace(/\(/g, '%28').replace(/\)/g, '%29') + ')' : text; }
      if (['B','STRONG'].includes(node.tagName)) return '**' + text + '**';
      if (['I','EM'].includes(node.tagName)) return '*' + text + '*';
      if (node.tagName === 'BR') return '\n';
      if (['P','DIV','LI','H1','H2','H3','H4','BLOCKQUOTE'].includes(node.tagName)) return text + '\n\n';
      return text;
    }
    return [...root.childNodes].map(visit).join('').replace(/\n{3,}/g, '\n\n').trim();
  }
  return {safeURL, render, fromHTML, toHTML: text => render(text).innerHTML};
})();
function element(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function render(deal, options={}){
 const article=element('article','deal-post'+(deal.spotlight===true?' is-spotlight':''));
 if(/^[a-z0-9-]+$/.test(deal.id||''))article.id=deal.id;
 if(deal.spotlight===true)article.append(element('span','spotlight-badge','✦ À la une'));
 const header=element('header','deal-author'),avatar=element('span','deal-avatar'),label=element('div');avatar.setAttribute('aria-hidden','true');
 const date=new Date(deal.date||Date.now()),time=element('time','',new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Paris'}).format(date));time.dateTime=date.toISOString();
 label.append(element('strong','','Dingodor One Tech'),time);header.append(avatar,label);
 article.append(header,Text.render(deal.message||''));
 const pictures=element('div','deal-products');
 for(const product of deal.products||[]){
  const url=Text.safeURL(product.url);if(!url)continue;
  const publicImage=/^\/bon-plan-media\/[a-f0-9]{64}\.(jpg|jpeg|png|webp|gif)$/.test(product.image||'');
  const privateImage=options.privateImages&&/^\/media\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|gif)$/.test(product.image||'');
  if(!publicImage&&!privateImage)continue;
  const card=element('a','deal-product');card.href=url;card.target='_blank';card.rel='noopener noreferrer sponsored';card.setAttribute('aria-label','Voir la photo et l’offre chez le marchand');
  const box=element('div','deal-image');
  if(privateImage&&options.loadPrivateImage)options.loadPrivateImage(product.image,box);
  else{const img=element('img');img.src=product.image;img.alt='Photo du produit';img.loading='lazy';img.decoding='async';box.append(img);}
  card.append(box);pictures.append(card);
 }
 if(pictures.childNodes.length)article.append(pictures);
 return article;
}
window.DealView={render,renderText:Text.render};
})();
