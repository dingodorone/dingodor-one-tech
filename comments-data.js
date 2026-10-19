import {firebaseConfig} from './firebase-comments-config.js?v=1';
export async function loadPublished(slug,cursor=null){
 const params=new URLSearchParams({orderBy:'"$key"',limitToLast:String(cursor?22:21)});
 if(cursor)params.set('endAt',JSON.stringify(cursor));
 const r=await fetch(firebaseConfig.databaseURL+'/published/'+encodeURIComponent(slug)+'.json?'+params,{cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('Les commentaires sont momentanément indisponibles. Réessayez.');
 const data=await r.json();
 const sorted=Object.entries(data||{}).filter(([id])=>!cursor||id<cursor).sort(([a],[b])=>b.localeCompare(a));
 const selected=sorted.slice(0,20).map(([id,row])=>({...row,id}));
 return {rows:selected,hasMore:sorted.length>20,cursor:selected.at(-1)?.id||cursor};
}
export async function sendComment(payload){
 const text=JSON.stringify([payload.article_slug,payload.author_name.toLocaleLowerCase('fr-FR'),payload.body]);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 const id=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 const r=await fetch(firebaseConfig.databaseURL+'/pending/'+id+'.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,email:payload.email||'',approved:false,created_at:{'.sv':'timestamp'}}),signal:AbortSignal.timeout(20000)});
 if(!r.ok){if(r.status===401||r.status===403)throw Error('Envoi refusé : ce message a peut-être déjà été transmis. Vérifiez aussi les champs, puis réessayez.');throw Error('Envoi indisponible. Votre texte est conservé ; réessayez dans un instant.');}
}

