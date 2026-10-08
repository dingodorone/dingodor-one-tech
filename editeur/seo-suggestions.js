'use strict';
// Suggestions are extracted locally. Nothing is sent to an external service.
function seoShorten(text,limit){
 const clean=String(text||'').replace(/\s+/g,' ').trim();
 if(clean.length<=limit)return clean;
 const cut=clean.slice(0,limit-1),space=cut.lastIndexOf(' ');
 return (space>limit*.6?cut.slice(0,space):cut).replace(/\s+(?:et|de|du|des|un|une|sur|pour|ses|sa|son|le|la|les|à)$/i,'').replace(/[,:;\s]+$/,'')+'…';
}
function suggestArticleSEO(title,excerpt,paragraphs,headings){
 const text=[title,...headings,...paragraphs].join(' ');
 const keywords=[];
 const subject=title.split(/\s*[:：]\s*/)[0].replace(/^(?:test|avis|comparatif|guide)\s+/i,'').trim();
 if(subject&&subject.length<=55)keywords.push(subject);
 const terms=[['scanner de livres',/scanner.*livres|livres.*scanner/i],['numérisation',/numéris/i],['OCR',/\bOCR\b/i],['PDF recherchable',/PDF recherchable/i],['domotique',/domotique/i],['caméra de surveillance',/caméra.*surveillance/i],['stockage',/stockage/i],['microSD',/microSD/i],['SSD',/\bSSD\b/],['NAS',/\bNAS\b/],['smartphone',/smartphone/i],['éclairage connecté',/éclairage connecté/i],['aspirateur robot',/aspirateur.*robot/i]];
 for(const [term,pattern] of terms)if(pattern.test(text)&&!keywords.some(k=>k.toLowerCase()===term.toLowerCase()))keywords.push(term);
 const introduction=paragraphs.filter(p=>p.trim()&&!/^(?:\[\[video:|voir.*vidéo|liens? affiliés?|https?:)/i.test(p.trim())).slice(0,3).join(' ');
 return {title:seoShorten(title,65),description:seoShorten(excerpt.trim()||introduction||title,160),tags:keywords.slice(0,8).join(', ')};
}
const seoSuggestButton=document.createElement('button');
seoSuggestButton.type='button';seoSuggestButton.id='suggest-seo';seoSuggestButton.textContent='Proposer le SEO de cet article';
const seoSuggestPanel=document.createElement('section');seoSuggestPanel.id='seo-suggestions';seoSuggestPanel.hidden=true;seoSuggestPanel.className='seo-panel';
seoSuggestPanel.style.cssText='padding:16px;border:1px solid #cddaea;border-radius:12px;margin:14px 0';
const seoFields=[['seo-suggestion-title','Titre SEO proposé',65],['seo-suggestion-description','Méta-description proposée',160],['seo-suggestion-tags','Mots-clés proposés (étiquettes)',300]];
const seoIntro=document.createElement('p');seoIntro.textContent='Suggestions tirées de votre contenu, à relire et modifier. Seuls les champs SEO vides seront complétés. Votre texte et l’adresse de l’article restent inchangés.';
seoSuggestPanel.append(seoIntro);
for(const [id,labelText,maxLength] of seoFields){
 const label=document.createElement('label');label.textContent=labelText;
 const input=document.createElement(id.includes('description')?'textarea':'input');input.id=id;input.maxLength=maxLength;if(input.tagName==='TEXTAREA')input.rows=3;
 label.append(input);seoSuggestPanel.append(label);
}
const seoChecks=document.createElement('p');seoChecks.id='seo-suggestion-checks';seoChecks.setAttribute('role','status');seoSuggestPanel.append(seoChecks);
const seoApply=document.createElement('button');seoApply.id='apply-seo-suggestions';seoApply.type='button';seoApply.textContent='Compléter les champs SEO vides';seoSuggestPanel.append(seoApply);
const seoClose=document.createElement('button');seoClose.type='button';seoClose.textContent='Fermer les suggestions';seoClose.style.marginLeft='8px';seoClose.onclick=()=>{seoSuggestPanel.hidden=true;};seoSuggestPanel.append(seoClose);
const seoDetails=document.querySelector('#article-fields .seo-panel');seoDetails.before(seoSuggestButton,seoSuggestPanel);
seoSuggestButton.onclick=()=>{
 if(mode!=='articles')return;
 const title=$('title').value.trim();if(!title){status('Ajoutez d’abord le titre de l’article.',true);return;}
 const body=$('body'),paragraphs=[...body.querySelectorAll('p')].filter(p=>!p.closest('.video-chip')).map(p=>p.textContent.trim());
 const suggestion=suggestArticleSEO(title,$('excerpt').value,paragraphs,[...body.querySelectorAll('h2,h3')].map(h=>h.textContent));
 $('seo-suggestion-title').value=suggestion.title;$('seo-suggestion-description').value=suggestion.description;$('seo-suggestion-tags').value=suggestion.tags;
 const missing=[...body.querySelectorAll('img')].filter(img=>!img.getAttribute('alt')?.trim()).length;
 seoChecks.textContent=(missing?missing+' image(s) sans description : ajoutez une description fidèle en cliquant sur chaque image.':'Les images du texte ont une description.')+' Les mots-clés servent à organiser vos articles ; ils ne garantissent pas un classement dans Google.';
 seoSuggestPanel.hidden=false;
};
seoApply.onclick=()=>{
 let count=0;
 for(const [target,source] of [['seo-title','seo-suggestion-title'],['seo-description','seo-suggestion-description'],['tags','seo-suggestion-tags']]){
  if(!$(target).value.trim()&&$(source).value.trim()){$(target).value=$(source).value.trim();count++;}
 }
 if(count){changed();updateSEO();seoDetails.open=true;seoChecks.textContent=count+' champ(s) complété(s). Vérifiez-les puis enregistrez le brouillon. Les réglages déjà présents ont été conservés.';}
 else seoChecks.textContent='Les champs contiennent déjà des réglages : aucun remplacement effectué. Vous pouvez les modifier dans SEO, catégories et partage.';
};
const seoSuggestionPaint=paint;paint=function(data){seoSuggestionPaint(data);seoSuggestPanel.hidden=true;};

