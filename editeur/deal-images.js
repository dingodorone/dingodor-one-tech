'use strict';
(() => {
  const button = document.createElement('button'); button.id = 'deal-fetch-images'; button.type = 'button'; button.textContent = 'Récupérer les photos des liens';
  $('deal-image').before(button);
  const feedback = document.createElement('p'); feedback.id = 'deal-photo-status'; feedback.setAttribute('role', 'status'); button.before(feedback);
  let pending = null;
  function hasPhotos(data) {
    const urls = dealLinks(data.message);
    return urls.length && urls.every((url, i) => data.images?.[i] || data.preview_products?.find(p => p.url === url)?.image);
  }
  async function fetchPhotos() {
    if (pending) return pending;
    const data = getData(), message = data.message, urls = dealLinks(message);
    if (!urls.length || urls.length > 8) { feedback.textContent = 'Ajoutez de 1 à 8 liens pour récupérer leurs photos.'; return; }
    if (hasPhotos(data)) { feedback.textContent = 'Les photos sont déjà disponibles.'; return; }
    const request_id = crypto.randomUUID();
    const accessAtStart = token;
    button.disabled = true; feedback.textContent = 'Recherche des photos chez les marchands… Le texte reste modifiable. Rien n’est publié.';
    pending = (async () => {
      await api('/actions/workflows/deal-images.yml/dispatches', {method:'POST', body:JSON.stringify({ref:'main', inputs:{payload:JSON.stringify({request_id, message})}})});
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        if (token !== accessAtStart) return;
        const runs = await api('/actions/workflows/deal-images.yml/runs?event=workflow_dispatch&per_page=20');
        const run = runs.workflow_runs.find(r => r.display_title?.includes(request_id));
        if (!run || run.status !== 'completed') continue;
        if (run.conclusion !== 'success') throw Error('La récupération a échoué. Réessayez ou ajoutez une image manuelle.');
        const file = await api('/contents/.deal-previews/' + request_id + '.json?ref=main');
        const result = JSON.parse(decode(file.content));
        if (result.request_id !== request_id || result.message !== message || !Array.isArray(result.products) || JSON.stringify(result.products.map(p => p.url)) !== JSON.stringify(urls)) throw Error('La réponse ne correspond pas aux liens demandés.');
        if (mode !== 'bons-plans' || $('deal-message').value !== message) { feedback.textContent = 'Le texte a changé pendant la recherche. Relancez la récupération pour ses nouveaux liens.'; return; }
        const currentData = getData();
        draft.preview_products = result.products.map((p, i) => ({url:p.url, title:typeof p.title === 'string' ? p.title : '', image:currentData.images?.[i] || (/^\/media\/[a-zA-Z0-9._-]+$/.test(p.image || '') ? p.image : '') || currentData.preview_products?.find(previous => previous.url === p.url)?.image || ''}));
        changed();
        const found = draft.preview_products.filter(p => p.image).length;
        feedback.textContent = found === urls.length ? 'Photos récupérées. Enregistrez le brouillon pour les conserver.' : found + ' photo(s) récupérée(s) sur ' + urls.length + '. Le marchand ne fournit pas certaines photos : vous pouvez les ajouter manuellement.';
        return;
      }
      throw Error('La recherche prend plus de cinq minutes. Réessayez dans un instant.');
    })().catch(error => { feedback.textContent = error.message; }).finally(() => { pending = null; button.disabled = false; });
    return pending;
  }
  const showDealPreview = showPreview;
  button.onclick = async () => { await fetchPhotos(); if (mode === 'bons-plans') showDealPreview(); };
  showPreview = async function() {
    showDealPreview();
    if (mode !== 'bons-plans' || hasPhotos(getData())) return;
    $('exact-status').textContent = 'Recherche des photos en cours…';
    await fetchPhotos();
    if (mode === 'bons-plans' && $('preview-dialog').open) { showDealPreview(); $('exact-status').textContent = feedback.textContent; }
  };
  $('preview').onclick = showPreview;
})();
