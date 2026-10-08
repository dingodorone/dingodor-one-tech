'use strict';
function articleAddress(){
 const slug=current?current.path.split('/').pop().replace(/\.json$/,''):slugify($('seo-slug').value||$('title').value);
 return slug?'https://dingodoronetech.eu.org/publications/'+slug+'.html':'';
}
function updateArticleAddress(){
 const url=mode==='articles'?articleAddress():'';
 $('article-address').value=url;
 $('copy-article-address').disabled=!url;
 $('copy-article-address').textContent=current?'Copier le lien':'Enregistrer le brouillon et copier le lien';
 $('article-address-help').textContent=current?'Cette adresse est conservée. Elle sera accessible après la publication et sa mise en ligne.':'Adresse prévue : enregistrez le brouillon pour la fixer. Elle sera accessible après publication.';
}
const addressPaint=paint;paint=function(data){addressPaint(data);updateArticleAddress();};
const addressSaved=window.editorSaved;window.editorSaved=function(){addressSaved?.();updateArticleAddress();};
for(const id of ['title','seo-slug'])$(id).addEventListener('input',updateArticleAddress);
$('article-address').onclick=()=>{$('article-address').select();};
$('copy-article-address').onclick=()=>task(async()=>{
 if(!current)await save();
 updateArticleAddress();
 try{await navigator.clipboard.writeText(articleAddress());status('Lien de l’article copié. Il sera accessible après sa mise en ligne.');}
 catch{$('article-address').focus();$('article-address').select();status('Le lien est sélectionné : appuyez sur Ctrl + C pour le copier.');}
});

