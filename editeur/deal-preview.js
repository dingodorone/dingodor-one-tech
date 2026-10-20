'use strict';
const articleShowPreview=showPreview;
let dealPreviewGeneration=0,dealPreviewURL=null;
showPreview=async function(){
 if(mode!=='bons-plans'){articleShowPreview();return;}
 const generation=++dealPreviewGeneration,root=$('preview-content'),data=getData(),links=dealLinks(data.message);
 const approved=Array.isArray(data.preview_products)?data.preview_products:[],manual=Array.isArray(data.images)?data.images:[];
 const jobs=[],products=links.map((url,i)=>({...approved.find(p=>p.url===url),url,image:manual[i]||approved.find(p=>p.url===url)?.image||''}));
 const article=DealView.render({message:data.message,products,spotlight:data.spotlight===true,date:data.date||new Date().toISOString()},{privateImages:true,loadPrivateImage(path,box){
  jobs.push((async()=>{try{
   const file=await api('/contents/'+path.slice(1)),ext=path.split('.').pop().toLowerCase(),mime={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'}[ext];
   const img=document.createElement('img');img.src='data:'+mime+';base64,'+file.content.replace(/\s/g,'');img.alt='Photo du produit';box.append(img);
  }catch{box.textContent='Photo privée momentanément indisponible';}})());
 }});
 root.textContent='Préparation de l’aperçu…';if(!$('preview-dialog').open)$('preview-dialog').showModal();
 await Promise.all(jobs);
 if(generation!==dealPreviewGeneration||mode!=='bons-plans'||!$('preview-dialog').open)return;
 const page='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src \'self\' data:; base-uri \'none\'; form-action \'none\'"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Space+Grotesk:wght@600;700&display=swap"><link rel="stylesheet" href="https://dingodoronetech.eu.org/styles.css?v=3"><link rel="stylesheet" href="https://dingodoronetech.eu.org/bons-plans.css?v=5-shared"><link rel="stylesheet" href="https://dingodoronetech.eu.org/spotlight.css?v=1"><style>body{margin:0}.deals-shell{padding:16px 20px}.deal-text{white-space:normal}.deal-text p{margin:14px 0}</style></head><body><main class="deals-shell">'+article.outerHTML+'</main></body></html>';
 if(dealPreviewURL)URL.revokeObjectURL(dealPreviewURL);
 dealPreviewURL=URL.createObjectURL(new Blob([page],{type:'text/html'}));
 const frame=document.createElement('iframe');frame.sandbox='allow-same-origin';frame.title='Aperçu du bon plan — même présentation que le site';frame.src=dealPreviewURL;
 root.replaceChildren(frame);
};
$('preview').onclick=showPreview;
