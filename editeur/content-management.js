'use strict';
let publicationStates=new Map(), managementRequests=new Map(), lifecycleVersion=0;

async function optionalContent(path){
 try{return await api('/contents/'+path+'?ref=main');}
 catch(error){if(error.httpStatus===404)return null;throw error;}
}
function publicationLabel(path,data={}){
 if(path.startsWith('bons-plans/'))return data.published?'Publication activée':'Brouillon privé';
 const q=publicationStates.get(path.replace(/^articles\//,'queue/'));
 if(!q)return 'Brouillon privé';
 if(q.action==='remove')return q.state==='queued'?'Retrait en cours':q.state==='transmitted'?'Brouillon — retiré du site':'Brouillon privé';
 if(q.state==='queued')return 'Publication programmée / en cours';
 if(q.state==='transmitted')return 'Publié / transmis au site';
 return 'Programmation annulée';
}
function updateManagementControls(){
 const path=current?.path, data=mode==='bons-plans'?{published:$('deal-published').checked}:draft;
 $('content-state').textContent=path?publicationLabel(path,data):'Nouveau brouillon privé';
 $('content-state').dataset.state=path&&managementRequests.has(path)?'pending':'';
 if(path&&managementRequests.has(path))$('content-state').textContent='Gestion en cours…';
 $('save').textContent=mode==='bons-plans'&&data.published?'Enregistrer et mettre à jour':'Enregistrer le brouillon';
 $('publish').hidden=false;
 $('publish').textContent=mode==='bons-plans'?(data.published?'Mettre à jour le bon plan':'Publier le bon plan'):'Publier / programmer';
 $('return-draft').disabled=!path||managementRequests.has(path);
 $('trash-content').disabled=!path||managementRequests.has(path);
 $('cancel-schedule').hidden=true;
 if(mode==='articles'){
  const q=publicationStates.get(path?.replace(/^articles\//,'queue/'));
  $('publish-update').checked=q?.state==='transmitted'||q?.action==='remove';
 }
 $('publication-help').textContent=mode==='articles'?
  'Enregistrer conserve votre travail en privé. Pour remplacer la version en ligne, utilisez Publier / programmer. Repasser en brouillon retire la version en ligne et annule sa programmation.':
  'Ouvrez un bon plan pour modifier son texte, ses liens et ses images. Repasser en brouillon le retire du site. La corbeille permet de le restaurer.';
}
const lifecyclePaint=paint;
paint=function(data){lifecyclePaint(data);updateManagementControls();};
const lifecycleSwitch=switchMode;
switchMode=async function(next){await lifecycleSwitch(next);updateManagementControls();};
const lifecycleRefresh=refreshList;
refreshList=async function(){
 await lifecycleRefresh();
 const folder=await optionalContent('queue');
 const states=new Map();
 if(folder)await Promise.all(folder.filter(e=>e.name.endsWith('.json')).map(async e=>{
  const file=await api('/contents/'+e.path+'?ref=main');
  states.set(e.path,JSON.parse(decode(file.content)));
 }));
 publicationStates=states;drawList();updateManagementControls();
};
drawList=function(){
 const q=$('search').value.toLowerCase(),list=$('drafts');list.replaceChildren();
 for(const e of entries.filter(x=>x.name.endsWith('.json'))){
  const meta=metadataCache.get(e.path),title=meta?.title||e.name.replace(/\.json$/,'').replace(/-/g,' ');
  if(![title,e.name,...(meta?.categories||[])].join(' ').toLowerCase().includes(q))continue;
  const row=document.createElement('section');row.className='content-entry';
  row.append(textNode('strong',title),textNode('small',publicationLabel(e.path,meta)));
  row.append(action('Modifier',()=>task(async()=>{
   if(unsaved()&&!confirm('Ouvrir un autre contenu sans enregistrer les modifications ?'))return;
   const file=await api('/contents/'+e.path+'?ref=main');current={path:e.path,sha:file.sha};
   paint(JSON.parse(decode(file.content)));status('Contenu ouvert. Modifiez-le puis enregistrez.');
  })));
  list.append(row);
 }
 if(!list.children.length)list.append(textNode('p','Aucun contenu dans cette section.'));
};

async function requestManagement(actionName,path,sha){
 const request_id=crypto.randomUUID(),payload={action:actionName,path,expected_sha:sha,request_id};
 await api('/actions/workflows/manage.yml/dispatches',{method:'POST',body:JSON.stringify({ref:'main',inputs:{payload:JSON.stringify(payload)}})});
 managementRequests.set(path,request_id);updateManagementControls();
 status('Demande envoyée. Le traitement et le déploiement peuvent prendre quelques minutes.');
 const link=document.createElement('a');link.href='https://github.com/'+REPO+'/actions/workflows/manage.yml';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Suivre le traitement';
 $('status').append(document.createElement('br'),link);
 watchManagement(path,request_id,actionName,lifecycleVersion,0);
}
function watchManagement(path,id,actionName,version,attempt){
 setTimeout(async()=>{
  if(version!==lifecycleVersion||!token)return;
  try{
   const result=await api('/actions/workflows/manage.yml/runs?per_page=30');
   const run=result.workflow_runs.find(r=>r.display_title==='Gestion '+id);
   if(!run||run.status!=='completed'){
    if(attempt<90)watchManagement(path,id,actionName,version,attempt+1);
    else{managementRequests.delete(path);updateManagementControls();status('Le traitement prend plus de temps que prévu. Vérifiez son résultat dans Suivi des publications.',true);}
    return;
   }
   if(busy){watchManagement(path,id,actionName,version,attempt);return;}
   managementRequests.delete(path);
   if(run.conclusion!=='success'){updateManagementControls();status('Le traitement a échoué. Votre contenu reste récupérable. Consultez Suivi des publications avant de réessayer.',true);return;}
   await task(async()=>{
    if(current?.path===path){
     if(actionName==='trash'){
      if(unsaved()){protectText();current=null;savedSignature='';changed();}
      else{current=null;paint(mode==='articles'?{body:'<p></p>'}:{message:'',published:false});}
     }else if(!unsaved()){
      const file=await api('/contents/'+path+'?ref=main');current.sha=file.sha;paint(JSON.parse(decode(file.content)));
     }else{
      // Preserve edits made while the workflow ran, but update the write lease.
      const file=await api('/contents/'+path+'?ref=main');current.sha=file.sha;
      if(mode==='bons-plans'){$('deal-published').checked=false;draft.published=false;}
     }
    }
    await refreshList();
    status(actionName==='trash'?'Contenu déplacé dans la corbeille privée. Son retrait du site est transmis ; le déploiement peut prendre quelques minutes.':actionName==='restore'?'Contenu restauré en brouillon privé. Rien n’a été republié.':'Retour en brouillon effectué. Le retrait du site est transmis ; le déploiement peut prendre quelques minutes.');
   });
  }catch(error){managementRequests.delete(path);updateManagementControls();status('Impossible de vérifier le résultat : '+error.message+' Consultez Suivi des publications.',true);}
 },10000);
}
async function manageCurrent(actionName){
 if(!current)throw Error('Ouvrez d’abord un contenu enregistré.');
 if(managementRequests.has(current.path))throw Error('Une demande est déjà en cours pour ce contenu.');
 const message=actionName==='trash'?'Déplacer ce contenu dans la corbeille privée et le retirer du site ? Vous pourrez le restaurer.':'Repasser ce contenu en brouillon et le retirer du site ? Toute programmation sera annulée.';
 if(!confirm(message))return;
 clearTimeout(autoTimer);
 if(unsaved()){
  const previous=$('deal-published').checked;
  if(mode==='bons-plans')$('deal-published').checked=false;
  try{await save();}catch(error){$('deal-published').checked=previous;throw error;}
 }
 await requestManagement(actionName,current.path,current.sha);
}
$('return-draft').onclick=()=>task(()=>manageCurrent('draft'));
$('trash-content').onclick=()=>task(()=>manageCurrent('trash'));
$('refresh-content').onclick=()=>task(async()=>{await refreshList();status('Liste et états actualisés.');});
$('trash-list').onclick=()=>task(async()=>{
 const root=tools('Corbeille privée — articles et bons plans');
 root.append(textNode('p','Chargement…'));
 const folders=await Promise.all(['articles','bons-plans'].map(name=>optionalContent('trash/'+name)));
 root.replaceChildren(textNode('p','Restaurer remet le contenu en brouillon sans le republier. Les médias sont conservés.'));
 let count=0;
 for(const folder of folders.filter(Boolean))for(const entry of folder.filter(x=>x.name.endsWith('.json'))){
  const file=await api('/contents/'+entry.path+'?ref=main'),item=JSON.parse(decode(file.content)),row=document.createElement('section');
  row.append(textNode('h3',item.data.title||item.data.message?.slice(0,100)||entry.name),textNode('p',item.path.startsWith('articles/')?'Article':'Bon plan'));
  row.append(action('Restaurer en brouillon',()=>task(async()=>{
   if(managementRequests.has(entry.path))throw Error('Restauration déjà en cours.');
   await requestManagement('restore',entry.path,file.sha);$('tools-dialog').close();
  })));root.append(row);count++;
 }
 if(!count)root.append(textNode('p','La corbeille est vide.'));
});
const lifecyclePublish=$('publish').onclick;
$('publish').onclick=()=>{
 if(current&&managementRequests.has(current.path)){status('Attendez la fin de la gestion en cours avant de publier.',true);return;}
 if(mode==='articles'){lifecyclePublish();return;}
 if(!confirm('Publier cette version du bon plan sur le site ?'))return;
 task(async()=>{const previous=$('deal-published').checked;$('deal-published').checked=true;
  try{await save();updateManagementControls();}catch(error){$('deal-published').checked=previous;updateManagementControls();throw error;}
 });
};
const lifecycleSaved=window.editorSaved;
window.editorSaved=()=>{lifecycleSaved();updateManagementControls();};
const lifecycleDisconnected=window.editorDisconnected;
window.editorDisconnected=()=>{lifecycleVersion++;managementRequests.clear();publicationStates.clear();lifecycleDisconnected();};
const lifecycleSave=save;
save=async function(){
 if(current&&managementRequests.has(current.path))throw Error('Gestion en cours. Vos modifications restent dans l’éditeur ; enregistrez-les après le traitement.');
 return lifecycleSave();
};
const lifecycleTask=task;
task=async function(fn){await lifecycleTask(fn);if(!busy)updateManagementControls();};

