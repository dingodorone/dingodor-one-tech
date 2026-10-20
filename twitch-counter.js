(() => {
  const counter = document.getElementById('twitch-counter');
  if (!counter) return;
  const number = document.getElementById('twitch-followers');
  const progress = document.getElementById('twitch-progress');
  const message = document.getElementById('twitch-remaining');
  const freshness = document.getElementById('twitch-updated');
  let lastTimestamp = 0;

  function render(data) {
    const timestamp = Date.parse(data.updated_at);
    if (data.channel !== 'dingodorone' || !Number.isSafeInteger(data.followers) ||
        data.followers < 0 || !Number.isFinite(timestamp) || timestamp < lastTimestamp) return false;
    lastTimestamp = timestamp;
    number.textContent = new Intl.NumberFormat('fr-FR').format(data.followers);
    progress.value = Math.min(data.followers, 100);
    progress.setAttribute('aria-valuetext', `${data.followers} followers sur un objectif de 100`);
    const remaining = Math.max(0, 100 - data.followers);
    message.textContent = remaining === 0 ? 'Objectif atteint : merci à toute la communauté !' :
      `Encore ${remaining} ${remaining === 1 ? 'personne' : 'personnes'} pour lancer les lives !`;
    const date = new Intl.DateTimeFormat('fr-FR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}).format(timestamp);
    freshness.textContent = `${Date.now() - timestamp > 3 * 3600000 ? 'Dernier relevé' : 'Mis à jour'} le ${date} · Actualisation prévue toutes les 30 min`;
    freshness.dateTime = data.updated_at;
    return true;
  }

  async function update() {
    // Scheduled Actions commits do not trigger a new Pages build. Read the small
    // public JSON from GitHub directly; no secret or access token reaches visitors.
    const sources = [
      'https://raw.githubusercontent.com/dingodorone/dingodor-one-tech/main/data/twitch-followers.json',
      '/data/twitch-followers.json'
    ];
    for (const source of sources) {
      try {
        const response = await fetch(source, {cache:'no-store', credentials:'omit', signal:AbortSignal.timeout(10000)});
        if (response.ok && render(await response.json())) return;
      } catch (_) { /* Retain the last successful public count. */ }
    }
    freshness.textContent = lastTimestamp ? 'Dernier relevé conservé · Actualisation temporairement indisponible' :
      'Compteur temporairement indisponible. Retrouvez la chaîne sur Twitch.';
  }
  update();
  setInterval(() => { if (!document.hidden) update(); }, 5 * 60 * 1000);
})();
