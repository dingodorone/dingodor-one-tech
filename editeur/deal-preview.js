'use strict';
const articleShowPreview=showPreview;
showPreview=function(){
 if(mode!=='bons-plans'){articleShowPreview();return;}
 const root=$('preview-content'),data=getData(),links=dealLinks(data.message);
 root.replaceChildren();
 root.append(EditorLinks.render(data.message));
 const approved=Array.isArray(data.preview_products)?data.preview_products:[];
 const manual=Array.isArray(data.images)?data.images:[];
 const count=Math.max(links.length,manual.length,approved.length);
 for(let i=0;i<count;i++){
  const product=approved[i]||{},path=product.image||manual[i];
  if(!path&&!product.title)continue;
  const card=document.createElement('section');card.className='deal-preview-card';
  root.append(card);
  if(path){
   if(/^\/media\/[a-zA-Z0-9._-]+$/.test(path))previewMedia(path,card,false);
   else{
    try{const url=new URL(path,location.origin);if(url.origin===location.origin&&/^\/(?:bon-plan-media|deal-media|article-media)\//.test(url.pathname)||url.protocol==='https:'){
     const img=document.createElement('img');img.src=url.href;img.alt=product.title||'Image du bon plan';img.style.maxWidth='100%';img.style.maxHeight='320px';img.style.objectFit='contain';card.append(img);
    }}catch{}
   }
  }
  if(product.title){const title=document.createElement('h3');title.textContent=product.title;card.append(title);}

 }
 $('preview-dialog').showModal();
};
$('preview').onclick=showPreview;

