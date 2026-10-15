'use strict';
// ZIP decoding stays on this device. Only referenced raster images are uploaded.
const ArticleZIP = (() => {
  const MAX = 80 * 1024 * 1024;
  function normalize(name) {
    if (/^[\\/]|^[a-z]:|[\x00-\x1f]/i.test(name)) throw Error('Chemin de fichier invalide.');
    const parts = [];
    for (const part of name.replace(/\\/g, '/').split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') { if (!parts.length) throw Error('Chemin hors du ZIP.'); parts.pop(); }
      else parts.push(part);
    }
    return parts.join('/');
  }
  function crc32(bytes) {
    let crc = -1;
    for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
    return (crc ^ -1) >>> 0;
  }
  async function read(buffer) {
    if (buffer.byteLength > MAX || buffer.byteLength < 22) throw Error('ZIP invalide ou supérieur à 80 Mo.');
    const bytes = new Uint8Array(buffer), v = new DataView(buffer);
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (v.getUint32(i, true) === 0x06054b50 && i + 22 + v.getUint16(i + 20, true) === bytes.length) { end = i; break; }
    }
    if (end < 0 || v.getUint16(end + 4, true) || v.getUint16(end + 6, true)) throw Error('ZIP invalide ou réparti en plusieurs volumes.');
    const count = v.getUint16(end + 10, true), centralSize = v.getUint32(end + 12, true);
    let offset = v.getUint32(end + 16, true), total = 0;
    const centralEnd = offset + centralSize, files = new Map();
    if (count > 300 || centralEnd > end || v.getUint16(end + 8, true) !== count) throw Error('ZIP trop complexe ou invalide.');
    for (let i = 0; i < count; i++) {
      if (offset + 46 > centralEnd || v.getUint32(offset, true) !== 0x02014b50) throw Error('Index ZIP invalide.');
      const flags = v.getUint16(offset + 8, true), method = v.getUint16(offset + 10, true);
      const crc = v.getUint32(offset + 16, true), packedSize = v.getUint32(offset + 20, true), size = v.getUint32(offset + 24, true);
      const length = v.getUint16(offset + 28, true), extra = v.getUint16(offset + 30, true), comment = v.getUint16(offset + 32, true), local = v.getUint32(offset + 42, true);
      if (offset + 46 + length + extra + comment > centralEnd || local + 30 > offset) throw Error('Entrée ZIP invalide.');
      const rawName = new TextDecoder('utf-8', {fatal:true}).decode(bytes.subarray(offset + 46, offset + 46 + length));
      const name = normalize(rawName);
      offset += 46 + length + extra + comment;
      if (rawName.endsWith('/')) continue;
      total += size;
      if (flags & 1 || ![0, 8].includes(method) || size > 20 * 1024 * 1024 || total > MAX || size === 0xffffffff || files.has(name)) throw Error('ZIP chiffré, trop volumineux ou contenant des doublons.');
      if (v.getUint32(local, true) !== 0x04034b50 || v.getUint16(local + 8, true) !== method) throw Error('En-tête ZIP invalide.');
      const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
      if (start + packedSize > v.getUint32(end + 16, true)) throw Error('Données ZIP tronquées.');
      const packed = bytes.subarray(start, start + packedSize);
      files.set(name, {name, size, async bytes() {
        let result;
        if (method === 0) result = packed;
        else {
          if (typeof DecompressionStream === 'undefined') throw Error('Ce navigateur ne sait pas décompresser ce ZIP. Utilisez un navigateur récent.');
          const reader = new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
          const chunks = []; let received = 0;
          try { for (;;) { const {value, done} = await reader.read(); if (done) break; received += value.length; if (received > size) throw Error('Taille décompressée invalide.'); chunks.push(value); } }
          catch (error) { await reader.cancel().catch(() => {}); throw error; }
          result = new Uint8Array(received); let cursor = 0; for (const chunk of chunks) { result.set(chunk, cursor); cursor += chunk.length; }
        }
        if (result.length !== size || crc32(result) !== crc) throw Error('Fichier ZIP endommagé : ' + name);
        return result;
      }});
    }
    if (offset !== centralEnd) throw Error('Index ZIP incomplet.');
    return files;
  }
  function resolve(htmlPath, source) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(source) || source.startsWith('/')) throw Error('Image non incluse dans le ZIP : ' + source.slice(0, 100));
    let value; try { value = decodeURIComponent(source.split(/[?#]/)[0]); } catch { throw Error('Adresse d’image invalide.'); }
    return normalize(htmlPath.split('/').slice(0, -1).concat(value).join('/'));
  }
  function htmlFiles(files) {
    return [...files.keys()].filter(n => /\.html?$/i.test(n) && !n.startsWith('__MACOSX/')).sort((a,b) => {
      const score = s => /(?:^|\/)article-pour-editeur\.html$/i.test(s) ? 0 : /(?:copier|autonome|apercu)/i.test(s) ? 2 : 1;
      return score(a) - score(b) || a.localeCompare(b);
    });
  }
  return {read, normalize, resolve, htmlFiles, crc32};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ArticleZIP;

if (typeof document !== 'undefined') (() => {
  const button = document.createElement('button');
  button.id = 'import-article-zip'; button.type = 'button'; button.textContent = 'Importer un article ZIP';
  $('new').before(button);
  const dialog = document.createElement('dialog'); dialog.id = 'article-import-dialog';
  dialog.innerHTML = '<h2>Importer un article avec ses images</h2><p>Choisissez un ZIP contenant un article HTML et ses images JPG, PNG, WebP ou GIF. Un nouveau brouillon privé sera créé ; rien ne sera publié.</p><label>Fichier ZIP<input id="article-import-file" type="file" accept=".zip,application/zip"></label><small>80 Mo maximum au total, 20 Mo par fichier. Les images doivent être incluses dans le ZIP avec les chemins utilisés dans le HTML.</small><label id="article-import-choice" hidden>Article à importer<select id="article-import-html"></select></label><label>Titre de l’article<input id="article-import-title"></label><p id="article-import-details" role="status" aria-live="polite"></p><div class="dialog-actions"><button id="article-import-cancel" type="button">Fermer</button><button id="article-import-submit" type="button" class="primary" disabled>Créer le brouillon avec ses images</button></div>';
  document.body.append(dialog);
  let files = null, plan = null;
  const feedback = message => { $('article-import-details').textContent = message; };
  function fail(error) { feedback(error.message); status(error.message, true); }
  button.onclick = () => {
    if (mode !== 'articles') { status('Ouvrez la section Articles.', true); return; }
    if (unsaved() && ($('title').value.trim() || $('body').textContent.trim())) { status('Enregistrez le texte ouvert avant d’importer un nouvel article.', true); return; }
    dialog.showModal();
  };
  $('article-import-cancel').onclick = () => { if (!busy) dialog.close(); };
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  async function prepare() {
    plan = null; $('article-import-submit').disabled = true;
    const htmlPath = $('article-import-html').value;
    const source = new TextDecoder('utf-8', {fatal:true}).decode(await files.get(htmlPath).bytes());
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const root = doc.querySelector('article') || doc.body;
    root.querySelectorAll('script,style,iframe,object,embed,svg,math,form,button,input,link,meta,video,audio').forEach(n => n.remove());
    const h1 = root.querySelector('h1');
    const title = (h1?.textContent || doc.title || htmlPath.split('/').pop().replace(/\.html?$/i, '')).trim();
    h1?.remove();
    const pictures = new Map();
    for (const img of root.querySelectorAll('img')) {
      const source = img.getAttribute('src');
      if (!source) throw Error('Une image n’a pas d’adresse dans le HTML.');
      const path = ArticleZIP.resolve(htmlPath, source);
      if (!/\.(png|jpe?g|webp|gif)$/i.test(path)) throw Error('Format d’image non pris en charge : ' + path);
      const entry = files.get(path); if (!entry) throw Error('Image manquante dans le ZIP : ' + path);
      if (!pictures.has(path)) {
        const bytes = await entry.bytes(), extension = path.split('.').pop().toLowerCase();
        const mime = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'}[extension];
        const file = new File([bytes], path.split('/').pop(), {type:mime});
        // Decode every image before uploading any of them.
        const image = await createImageBitmap(file); image.close();
        pictures.set(path, {file, uploaded:null});
      }
      img.removeAttribute('srcset'); img.setAttribute('src', path);
    }
    if (!root.textContent.trim()) throw Error('Ce fichier HTML ne contient pas de texte d’article.');
    plan = {root, pictures}; $('article-import-title').value = title;
    feedback(pictures.size + ' image(s) trouvée(s). Les légendes et leur position dans le texte seront conservées.');
    $('article-import-submit').disabled = false;
  }
  $('article-import-file').onchange = async () => {
    files = null; plan = null; $('article-import-submit').disabled = true;
    $('article-import-choice').hidden = true; $('article-import-html').replaceChildren();
    const file = $('article-import-file').files[0]; if (!file) return;
    try {
      if (file.size > 80 * 1024 * 1024) throw Error('Le ZIP dépasse 80 Mo.');
      feedback('Lecture du ZIP sur votre appareil…'); files = await ArticleZIP.read(await file.arrayBuffer());
      const names = ArticleZIP.htmlFiles(files); if (!names.length) throw Error('Aucun article HTML dans ce ZIP.');
      for (const name of names) { const option = document.createElement('option'); option.value = option.textContent = name; $('article-import-html').append(option); }
      $('article-import-choice').hidden = names.length === 1; await prepare();
    } catch (error) { fail(error); }
  };
  $('article-import-html').onchange = async () => { try { await prepare(); } catch (error) { fail(error); } };
  $('article-import-submit').onclick = () => task(async () => {
    try {
      if (!plan) throw Error('Choisissez un ZIP valide.');
      if (mode !== 'articles') throw Error('Revenez à la section Articles.');
      if (unsaved() && ($('title').value.trim() || $('body').textContent.trim())) throw Error('Enregistrez d’abord le texte ouvert.');
      const title = $('article-import-title').value.trim(); if (!title || !slugify(title)) throw Error('Ajoutez un titre.');
      let number = 0;
      for (const item of plan.pictures.values()) {
        feedback('Import des images : ' + (++number) + ' / ' + plan.pictures.size + '…');
        if (!item.uploaded) item.uploaded = await upload(item.file, 'image');
      }
      const root = plan.root.cloneNode(true);
      for (const img of root.querySelectorAll('img')) img.src = plan.pictures.get(img.getAttribute('src')).uploaded;
      const body = filteredHTML(root.innerHTML), excerpt = root.querySelector('p')?.textContent.trim().slice(0, 320) || '';
      const featured = plan.pictures.values().next().value?.uploaded || '';
      current = null;
      paint({title, body, excerpt, featured_image:featured, slug:slugify(title).slice(0,65) + '-' + Date.now().toString(36) + '-' + crypto.randomUUID().slice(0,6), published:false, videos:[]});
      changed();
      // After this point the imported text stays recoverable even if saving fails.
      plan = null;
      try { await save(); dialog.close(); status('Article et images importés dans un nouveau brouillon privé. Rien n’a été publié.'); }
      catch (error) { dialog.close(); status('Article importé dans l’éditeur, mais enregistrement incomplet : ' + error.message + ' Cliquez sur Enregistrer le brouillon pour réessayer.', true); }
    } catch (error) { fail(error); }
  });
  const sync = () => { button.hidden = $('article-fields').hidden; };
  new MutationObserver(sync).observe($('article-fields'), {attributes:true, attributeFilter:['hidden']}); sync();
})();
