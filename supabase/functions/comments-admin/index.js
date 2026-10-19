// GitHub credentials are verified for every request; never stored or logged.
const ORIGIN = 'https://dingodoronetech.eu.org';
const OWNER_ID = 271846348;
const REPO = 'dingodorone/dingodor-one-tech-drafts';
export async function handleRequest(req, env, fetcher = fetch) {
  const origin = req.headers.get('origin');
  const headers = {'Content-Type':'application/json', 'Cache-Control':'no-store', 'Vary':'Origin'};
  if (origin === ORIGIN) Object.assign(headers, {'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'content-type, apikey, x-editor-token','Access-Control-Allow-Methods':'POST, OPTIONS'});
  const reply = (status, data) => new Response(JSON.stringify(data), {status, headers});
  if (origin && origin !== ORIGIN) return reply(403, {error:'Origine refusée.'});
  if (req.method === 'OPTIONS') return new Response(null, {status:204, headers});
  if (req.method !== 'POST') return reply(405, {error:'Méthode refusée.'});
  const token = req.headers.get('x-editor-token') || '';
  if (!token || token.length > 1000 || /\s/.test(token)) return reply(401, {error:'Reconnectez-vous à votre éditeur.'});
  try {
    const raw = await req.text();
    if (raw.length > 16000) return reply(413, {error:'Message trop long.'});
    let input;
    try { input = JSON.parse(raw); } catch { return reply(400, {error:'Demande illisible.'}); }
    if (!['list','approve','hide','reply','delete'].includes(input.action)) return reply(400, {error:'Action inconnue.'});
    if (input.action !== 'list' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id || '')) return reply(400, {error:'Commentaire invalide.'});
    if (input.action === 'reply' && (typeof input.reply !== 'string' || input.reply.trim().length > 10000)) return reply(400, {error:'Réponse limitée à 10 000 caractères.'});
    const githubHeaders = {Authorization:'Bearer '+token, Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Dingodor-Comments-Admin'};
    const user = await fetcher('https://api.github.com/user', {headers:githubHeaders, signal:AbortSignal.timeout(10000)});
    if (!user.ok) return reply(user.status === 401 ? 401 : 503, {error:'Connexion GitHub indisponible ou expirée. Reconnectez-vous.'});
    if ((await user.json()).id !== OWNER_ID) return reply(403, {error:'Cet espace est réservé au propriétaire du site.'});
    const repo = await fetcher('https://api.github.com/repos/'+REPO, {headers:githubHeaders, signal:AbortSignal.timeout(10000)});
    if (!repo.ok || !(await repo.json()).permissions?.push) return reply(403, {error:'Votre clé doit permettre la modification du dépôt privé de l’éditeur.'});
    const url = env.get('SUPABASE_URL');
    const key = env.get('SUPABASE_SERVICE_ROLE_KEY') || env.get('SUPABASE_SECRET_KEY') || Object.values(JSON.parse(env.get('SUPABASE_SECRET_KEYS') || '{}'))[0];
    if (!url || !key) return reply(503, {error:'Service de modération non configuré.'});
    const dbHeaders = {apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
    const db = async (query, options={}) => fetcher(url+'/rest/v1/article_comments?'+query, {...options,headers:{...dbHeaders,...options.headers},signal:AbortSignal.timeout(15000)});
    if (input.action === 'list') {
      const page = Number.isInteger(input.page) && input.page >= 0 ? Math.min(input.page,10000) : 0;
      const filter = input.filter === 'published' ? '&approved=eq.true' : input.filter === 'all' ? '' : '&approved=eq.false';
      const result = await db('select=id,article_slug,author_name,email,body,approved,created_at,author_reply&order=created_at.desc,id.desc&limit=30&offset='+page*30+filter, {headers:{Prefer:'count=exact'}});
      if (!result.ok) return reply(503, {error:'Les commentaires sont indisponibles. Réessayez dans un instant.'});
      const comments = await result.json();
      return reply(200, {comments,total:Number(result.headers.get('content-range')?.split('/')[1]) || 0,page});
    }
    const options = input.action === 'delete' ? {method:'DELETE'} : {method:'PATCH',body:JSON.stringify(input.action === 'reply' ? {author_reply:input.reply.trim() || null} : {approved:input.action === 'approve'})};
    const result = await db('id=eq.'+input.id+'&select=id', {...options,headers:{Prefer:'return=representation'}});
    if (!result.ok) return reply(503, {error:'La modification n’a pas pu être confirmée. Actualisez avant de réessayer.'});
    const rows = await result.json();
    return rows.length ? reply(200, {ok:true}) : reply(404, {error:'Ce commentaire a déjà été supprimé. Actualisez la liste.'});
  } catch {
    return reply(503, {error:'Connexion interrompue. Votre réponse reste dans le formulaire ; actualisez avant de réessayer.'});
  }
}
if (typeof Deno !== 'undefined') Deno.serve(req => handleRequest(req,Deno.env));

