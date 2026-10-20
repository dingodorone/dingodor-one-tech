'use strict';
window.EditorLinks = (() => {
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

(() => {
  const message = document.getElementById('deal-message');
  if (!message) return;
  const toolbar = document.createElement('div'); toolbar.className = 'deal-link-tools';
  const add = document.createElement('button'); add.id = 'deal-add-link'; add.type = 'button'; add.textContent = 'Ajouter un lien'; toolbar.append(add); message.closest('label').before(toolbar);
  const hint = document.createElement('p'); hint.textContent = 'Sélectionnez des mots puis ajoutez leur lien. Les liens d’un texte copié sont conservés. Les liens s’ouvrent depuis l’aperçu ci-dessous.';
  const preview = document.createElement('section'); preview.id = 'deal-live-preview'; preview.className = 'deal-live-preview'; preview.setAttribute('aria-label', 'Aperçu du texte et de ses liens');
  message.closest('label').after(hint, preview);
  function refresh() { preview.replaceChildren(); const title = document.createElement('strong'); title.textContent = 'Aperçu du texte'; preview.append(title, EditorLinks.render(message.value)); }
  message.addEventListener('input', refresh);
  message.addEventListener('paste', event => {
    const html = event.clipboardData?.getData('text/html');
    if (!html || !/<a\b/i.test(html)) return;
    event.preventDefault();
    const text = EditorLinks.fromHTML(html);
    if (message.value.length - (message.selectionEnd - message.selectionStart) + text.length > message.maxLength) { status('Ce collage dépasse la limite de 5 000 caractères.', true); return; }
    message.setRangeText(text, message.selectionStart, message.selectionEnd, 'end'); message.dispatchEvent(new Event('input', {bubbles:true}));
  });
  const originalPaint = paint;
  paint = function(...args) { const result = originalPaint(...args); refresh(); return result; };

  const dialog = document.createElement('dialog'); dialog.id = 'text-link-dialog';
  dialog.innerHTML = '<form id="text-link-form"><h2>Ajouter ou modifier un lien</h2><label>Texte affiché<input id="text-link-label" required></label><label>Adresse du lien<input id="text-link-url" type="url" required placeholder="https://…"></label><p id="text-link-error" role="alert"></p><div class="dialog-actions"><button id="text-link-cancel" type="button">Annuler</button><button class="primary">Insérer le lien</button></div></form>';
  document.body.append(dialog);
  let target = 'deal', start = 0, end = 0, existing = null;
  function open(kind) {
    target = kind; existing = null;
    const label = document.getElementById('text-link-label'), url = document.getElementById('text-link-url');
    label.value = ''; url.value = ''; document.getElementById('text-link-error').textContent = '';
    if (kind === 'deal') { start = message.selectionStart; end = message.selectionEnd; label.value = message.value.slice(start, end); }
    else {
      remember(); const sel = getSelection(); label.value = sel?.toString() || '';
      const node = range?.startContainer; existing = (node?.nodeType === 1 ? node : node?.parentElement)?.closest('a');
      if (existing && $('body').contains(existing)) { label.value = existing.textContent; url.value = existing.getAttribute('href'); } else existing = null;
    }
    dialog.showModal(); (label.value ? url : label).focus();
  }
  add.onclick = () => open('deal');
  $('link').onclick = () => open('article');
  document.getElementById('text-link-cancel').onclick = () => dialog.close();
  document.getElementById('text-link-form').onsubmit = event => {
    event.preventDefault();
    const label = document.getElementById('text-link-label').value.trim(), url = EditorLinks.safeURL(document.getElementById('text-link-url').value.trim(), target === 'article');
    if (!label || !url) { document.getElementById('text-link-error').textContent = 'Ajoutez un texte et une adresse HTTP ou HTTPS valide.'; return; }
    if (target === 'deal') {
      const text = '[' + label.replace(/[\[\]\r\n]/g, ' ') + '](' + url.replace(/\(/g,'%28').replace(/\)/g,'%29') + ')';
      if (message.value.length - (end-start) + text.length > message.maxLength) { document.getElementById('text-link-error').textContent = 'Le texte dépasse la limite de 5 000 caractères.'; return; }
      message.setRangeText(text, start, end, 'end'); message.dispatchEvent(new Event('input', {bubbles:true}));
    } else {
      dialog.close(); $('body').focus(); restore();
      const a = document.createElement('a'); a.href = url; a.textContent = label; a.target = '_blank'; a.rel = 'noopener noreferrer';
      if (existing?.isConnected) existing.replaceWith(a);
      else { document.execCommand('insertHTML', false, a.outerHTML); }
      changed(); remember();
    }
    dialog.close();
  };
  refresh();
})();
