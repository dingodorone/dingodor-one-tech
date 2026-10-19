import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,setPersistence,browserSessionPersistence,GoogleAuthProvider,signInWithPopup,signOut} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getDatabase,ref,get,query,orderByChild,equalTo,limitToLast,endBefore,update} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js';
import {firebaseConfig,ownerEmail} from './firebase-comments-config.js?v=1';
const app=initializeApp(firebaseConfig,'dingodor-comments-admin'),auth=getAuth(app),db=getDatabase(app);
const ready=setPersistence(auth,browserSessionPersistence).then(()=>auth.authStateReady());
let cached=new Map(),lastFilter=null;
function requireOwner(){const u=auth.currentUser;if(!u||u.email!==ownerEmail||!u.emailVerified)throw Error('Connectez le compte Google propriétaire du site pour gérer les commentaires.');return u;}
export async function isConnected(){await ready;try{requireOwner();return true;}catch{return false;}}
export async function connect(){await ready;const provider=new GoogleAuthProvider();provider.setCustomParameters({login_hint:ownerEmail,prompt:'select_account'});await signInWithPopup(auth,provider);try{requireOwner();}catch(e){await signOut(auth);throw e;}}
export async function disconnect(){cached.clear();await signOut(auth);}
function publicKey(row,id){return String(row.created_at)+'_'+id;}
function publicRow(row){const p={author_name:row.author_name,body:row.body,created_at:row.created_at};if(row.author_reply?.trim())p.author_reply=row.author_reply.trim();return p;}
export async function moderate(input){
 await ready;requireOwner();
 if(input.action==='list'){
  // Read at most 500 records per filter; the UI indicates this bounded view.
  const filters=[orderByChild(input.filter==='all'?'created_at':'approved')];
  if(input.filter!=='all')filters.push(equalTo(input.filter==='published'));
  filters.push(limitToLast(500));
  const snapshot=await get(query(ref(db,'pending'),...filters));
  requireOwner();const rows=Object.entries(snapshot.val()||{}).map(([id,row])=>({...row,id})).sort((a,b)=>b.created_at-a.created_at||b.id.localeCompare(a.id));
  cached=new Map(rows.map(c=>[c.id,c]));lastFilter=input.filter;
  const page=Math.max(0,Number(input.page)||0);
  return {comments:rows.slice(page*30,(page+1)*30),total:rows.length,limited:rows.length===500,page};
 }
 if(!/^[a-f0-9]{64}$/.test(input.id||''))throw Error('Commentaire invalide.');
 const snap=await get(ref(db,'pending/'+input.id));const row=snap.val();if(!row)throw Error('Ce commentaire a déjà été supprimé. Actualisez la liste.');
 const changes={},pub='published/'+row.article_slug+'/'+publicKey(row,input.id),privatePath='pending/'+input.id;
 if(input.action==='delete'){changes[privatePath]=null;changes[pub]=null;}
 else if(input.action==='approve'){changes[privatePath+'/approved']=true;changes[pub]=publicRow(row);}
 else if(input.action==='hide'){changes[privatePath+'/approved']=false;changes[pub]=null;}
 else if(input.action==='reply'){
  if(typeof input.reply!=='string'||input.reply.trim().length>10000)throw Error('Réponse limitée à 10 000 caractères.');
  const reply=input.reply.trim();changes[privatePath+'/author_reply']=reply||null;
  if(row.approved)changes[pub]=publicRow({...row,author_reply:reply});
 }else throw Error('Action inconnue.');
 requireOwner();await update(ref(db),changes);return {ok:true};
}

