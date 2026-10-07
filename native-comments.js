// Only the publishable key is used here. Database policies enforce moderation.
const API = 'https://akytuwyokkahgzivxqsa.supabase.co/rest/v1/article_comments';
const KEY = 'sb_publishable_9qyZ4EEdaWtI3Don-SVYpg_kQfu-Br_';
function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
async function request(url, options = {}) {
  const response = await fetch(url, {...options, headers: {
    apikey: KEY, 'Content-Type': 'application/json', ...options.headers
  }, signal: AbortSignal.timeout(20000), cache: 'no-store'});
  if (!response.ok) {
    if (response.status === 409) throw new Error('Ce commentaire a déjà été envoyé. Il attend peut-être votre validation.');
    throw new Error('Connexion indisponible. Réessayez dans un instant. Votre texte est conservé.');
  }
  return response.status === 204 || options.method === 'POST' ? null : response.json();
}
export async function showNativeComments() {
  const section = document.querySelector('#comments');
  const slug = location.pathname.match(/^\/publications\/([a-z0-9]+(?:-[a-z0-9]+)*)\.html$/)?.[1];
  if (!section || !slug) return;
  section.hidden = false;
  const head = node('div', undefined, 'comments-head');
  head.append(node('h2', 'Commentaires'));
  const list = node('div', undefined, 'comment-list');
  const status = node('p', 'Chargement des commentaires…');
  status.setAttribute('role', 'status');
  const more = node('button', 'Afficher les commentaires plus anciens', 'comments-more');
  more.type = 'button'; more.hidden = true;
  const card = node('div', undefined, 'comment-form-card');
  card.append(node('h3', 'Laisser un commentaire'), node('p',
    'Sans création de compte. Votre commentaire sera visible après validation. Votre adresse e-mail restera privée et servira uniquement à la gestion de votre message. Les données sont conservées avec Supabase.'));
  const form = node('form');
  const grid = node('div', undefined, 'form-grid');
  function field(title, name, type, max) {
    const label = node('label', title);
    const input = node(type === 'textarea' ? 'textarea' : 'input');
    input.name = name; input.required = true; input.maxLength = max;
    if (type === 'textarea') { input.rows = 6; input.minLength = 3; }
    else { input.type = type; input.autocomplete = type === 'email' ? 'email' : 'name'; }
    label.append(input);
    return {label, input};
  }
  const author = field('Nom ou pseudonyme', 'author', 'text', 80);
  const email = field('E-mail (non publié)', 'email', 'email', 254);
  const body = field('Commentaire', 'comment', 'textarea', 5000);
  grid.append(author.label, email.label);
  const trap = node('input'); trap.name = 'website'; trap.type = 'text';
  trap.tabIndex = -1; trap.autocomplete = 'off'; trap.className = 'comment-honeypot';
  trap.hidden = true; trap.style.setProperty('display', 'none', 'important');
  trap.setAttribute('aria-hidden', 'true');
  const submit = node('button', 'Envoyer mon commentaire'); submit.type = 'submit';
  const sendStatus = node('p'); sendStatus.setAttribute('role', 'status');
  form.append(grid, body.label, trap, submit, sendStatus); card.append(form);
  section.replaceChildren(head, status, list, more, card);
  let offset = 0;
  let loading = false;
  async function load() {
    if (loading) return;
    loading = true; more.disabled = true;
    try {
      const query = new URLSearchParams({select:'id,author_name,body,created_at,author_reply',
        article_slug:'eq.' + slug, approved:'eq.true',
        order:'created_at.desc,id.desc', limit:'21', offset:String(offset)});
      const rows = await request(API + '?' + query);
      if (!offset) list.replaceChildren();
      for (const row of rows.slice(0, 20)) {
        const article = node('article', undefined, 'comment');
        const header = node('header');
        header.append(node('strong', row.author_name));
        const date = new Date(row.created_at);
        if (!Number.isNaN(date.getTime())) {
          const time = node('time', new Intl.DateTimeFormat('fr-FR', {dateStyle:'long'}).format(date));
          time.dateTime = date.toISOString(); header.append(time);
        }
        article.append(header, node('div', row.body, 'comment-text'));
        if (row.author_reply?.trim()) {
          const reply = node('div', undefined, 'comment-owner-reply');
          reply.append(node('strong', 'Réponse de Dingodor One Tech'), node('div', row.author_reply, 'comment-text'));
          article.append(reply);
        }
        list.append(article);
      }
      if (!offset && !rows.length) list.append(node('p', 'Aucun commentaire pour le moment. Soyez le premier à participer.', 'no-comments'));
      offset += Math.min(rows.length, 20);
      more.hidden = rows.length <= 20;
      more.textContent = 'Afficher les commentaires plus anciens';
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message; more.hidden = false; more.textContent = 'Réessayer le chargement';
    } finally { loading = false; more.disabled = false; }
  }
  more.onclick = load;
  let sending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    if (trap.value) { sendStatus.textContent = 'Votre commentaire a été reçu.'; return; }
    const payload = {article_slug:slug, author_name:author.input.value.trim(),
      email:email.input.value.trim(), body:body.input.value.trim()};
    if (!payload.author_name || payload.body.length < 3) {
      sendStatus.textContent = 'Indiquez votre nom et un commentaire d’au moins 3 caractères.'; return;
    }
    sending = true; submit.disabled = true; sendStatus.textContent = 'Envoi en cours…';
    try {
      await request(API, {method:'POST', headers:{Prefer:'return=minimal'}, body:JSON.stringify(payload)});
      body.input.value = '';
      sendStatus.textContent = 'Merci ! Votre commentaire a bien été reçu. Il sera affiché après validation.';
    } catch (error) { sendStatus.textContent = error.message; }
    finally { sending = false; submit.disabled = false; }
  });
  await load();
}
