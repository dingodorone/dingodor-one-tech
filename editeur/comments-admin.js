'use strict';
(() => {
 let moderatorPromise;
 const firebaseModule=()=>moderatorPromise||(moderatorPromise=import('/firebase-moderator.js?v=2-rest'));
 const open=$('comments-open'),dialog=$('comments-dialog'),list=$('comments-list'),feedback=$('comments-feedback');
 let page=0,version=0,loading=false;
 const answers=new Map(),titles=new Map();
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const say=(text,error=false)=>{feedback.textContent=text;feedback.classList.toggle('error',error);};
 async function request(payload){
  if(!token)throw Error('Connectez-vous à votre éditeur.');
  const m=await firebaseModule();
  if(!await m.isConnected())throw Error('Cliquez sur « Connecter mon compte Google » pour gérer les commentaires.');
  try{return await m.moderate(payload);}catch(e){if(e.code==='PERMISSION_DENIED'||e.code==='database/permission-denied')throw Error('Accès refusé. Utilisez le compte Google propriétaire du site.');throw e;}
 }
 async function loadTitles(){try{const r=await fetch('/data/published-posts.json',{cache:'no-store'});if(!r.ok)return;const data=await r.json();for(const item of (Array.isArray(data)?data:data.posts||[])){const slug=item.slug||item.url?.match(/\/([^/]+)\.html$/)?.[1];if(slug)titles.set(slug,item.title?.rendered||item.title||slug);}}catch{}}
 async function load(){
  const id=++version;loading=true;list.setAttribute('aria-busy','true');$('comments-refresh').disabled=true;say('Chargement des commentaires…');
  try{
   const data=await request({action:'list',filter:$('comments-filter').value,page});
   if(id!==version||!token)return;
   list.replaceChildren();
   for(const c of data.comments)render(c);
   if(!data.comments.length)list.append(el('p',$('comments-filter').value==='pending'?'Aucun commentaire en attente.':'Aucun commentaire dans cette sélection.'));
   $('comments-prev').disabled=page===0;$('comments-next').disabled=(page+1)*30>=data.total;
   $('comments-count').textContent=(data.limited?'500 derniers : ': '')+data.total+' commentaire'+(data.total>1?'s':'')+' · page '+(page+1);
   say('Liste à jour. Les réponses sont publiques avec le commentaire validé.');
  }catch(e){if(id===version)say(e.message,true);}finally{if(id===version){loading=false;list.removeAttribute('aria-busy');$('comments-refresh').disabled=false;}}
 }
 function render(c){
  const card=el('section');card.className='comment-admin-card';
  const heading=el('h3',c.author_name+' · '+(c.approved?'Publié':'En attente / masqué'));card.append(heading);
  const link=el('a',titles.get(c.article_slug)||c.article_slug.replace(/-/g,' '));
  if(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.article_slug)){link.href='/publications/'+encodeURIComponent(c.article_slug)+'.html';link.target='_blank';link.rel='noopener noreferrer';}
  card.append(link,el('p',new Date(c.created_at).toLocaleString('fr-FR')));
  const body=el('p',c.body);body.className='comment-admin-body';card.append(body);
  card.append(el('p',c.email?'E-mail privé : '+c.email:'Aucune adresse e-mail renseignée.'));
  const label=el('label','Votre réponse publique');const area=el('textarea');area.rows=3;area.maxLength=10000;area.value=answers.has(c.id)?answers.get(c.id):c.author_reply||'';area.addEventListener('input',()=>answers.set(c.id,area.value));label.append(area);card.append(label);
  const actions=el('div');actions.className='comment-admin-actions';
  function button(text,action,primary=false){const b=el('button',text);b.type='button';if(primary)b.className='primary';b.onclick=async()=>{
   if(action==='delete'&&!confirm('Supprimer définitivement ce commentaire et sa réponse ?'))return;
   if(action==='reply'&&!area.value.trim()&&c.author_reply&&!confirm('Retirer votre réponse publiée ?'))return;
   const buttons=card.querySelectorAll('button');buttons.forEach(n=>n.disabled=true);
   try{await request({action,id:c.id,...(action==='reply'?{reply:area.value}:{})});if(!token)return;if(action==='delete'||action==='reply')answers.delete(c.id);say('Modification enregistrée.');await load();}catch(e){say(e.message,true);}finally{buttons.forEach(n=>n.disabled=false);}
  };actions.append(b);}
  button(c.approved?'Masquer':'Publier',c.approved?'hide':'approve',!c.approved);
  button(c.author_reply?'Enregistrer la réponse':'Répondre','reply');button('Supprimer','delete');card.append(actions);list.append(card);
 }
 open.onclick=async()=>{dialog.showModal();await loadTitles();page=0;try{const m=await firebaseModule();const connected=await m.isConnected();$('comments-google').hidden=connected;$('comments-google-status').textContent=connected?'Compte Google propriétaire connecté.':'Connexion Google nécessaire pour la modération.';if(connected)await load();else{list.replaceChildren();say('Connectez votre compte Google pour consulter les messages.');}}catch{say('Impossible de charger la connexion Google. Réessayez.',true);}};
 $('comments-google').onclick=async()=>{try{const m=await firebaseModule();await m.connect();$('comments-google').hidden=true;$('comments-google-status').textContent='Compte Google propriétaire connecté.';page=0;await load();}catch(e){say(e.code==='auth/popup-closed-by-user'?'Connexion annulée.':e.code==='auth/popup-blocked'?'Autorisez la fenêtre de connexion Google dans votre navigateur.':e.message,true);}};
 $('comments-close').onclick=()=>dialog.close();
 $('comments-refresh').onclick=()=>load();
 $('comments-filter').onchange=()=>{page=0;load();};
 $('comments-prev').onclick=()=>{if(!loading&&page>0){page--;load();}};
 $('comments-next').onclick=()=>{if(!loading){page++;load();}};
 const previous=window.editorDisconnected;
 window.editorDisconnected=()=>{version++;dialog.close();list.replaceChildren();answers.clear();say('');if(moderatorPromise)moderatorPromise.then(m=>m.disconnect()).catch(()=>{});if(previous)previous();};
})();


