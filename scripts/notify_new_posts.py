#!/usr/bin/env python3
"""Send one Webpushr notification for each newly published WordPress article."""
import html
import json
import os
import re
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

API = "https://public-api.wordpress.com/rest/v1.1/sites/dingodoronetech.wordpress.com/posts/?number=100&fields=ID,slug,title,date,status,excerpt"
ENDPOINT = "https://api.webpushr.com/v1/notification/send/all"
STATE = Path("data/last-notified-post.json")


def text(value):
    return re.sub(r"\\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def fetch_posts():
    with urlopen(Request(API, headers={"User-Agent": "Dingodor-article-notifier/1.0"}), timeout=20) as response:
        posts = json.load(response).get("posts", [])
    return [post for post in posts if post.get("status") == "publish" and post.get("ID") and post.get("slug")]


def save(post):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps({"id": post["ID"], "date": post.get("date", "")}, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")


def main():
    key = os.environ.get("WEBPUSHR_REST_KEY")
    token = os.environ.get("WEBPUSHR_AUTH_TOKEN")
    if not key or not token:
        print("Secrets Webpushr manquants : aucune notification envoyée.")
        return 0
    posts = fetch_posts()
    if not posts:
        print("Aucun article publié trouvé.")
        return 0
    posts.sort(key=lambda p: (p.get("date", ""), p["ID"]))
    if not STATE.exists():
        save(posts[-1])
        print("Point de départ enregistré, sans renvoyer les anciens articles.")
        return 0
    last_id = json.loads(STATE.read_text(encoding="utf-8"))["id"]
    positions = [i for i, post in enumerate(posts) if post["ID"] == last_id]
    if not positions:
        # The previous article may be older than the 100 most recent posts.
        # Avoid sending an uncontrolled batch of historical notifications.
        save(posts[-1])
        print("Ancien repère introuvable : repère actualisé sans notification.")
        return 0
    new = posts[positions[0] + 1:]
    if not new:
        print("Aucun nouvel article.")
        return 0
    post = new[0]
    title = text(post.get("title"))[:80] or "Nouvel article"
    excerpt = text(post.get("excerpt"))[:240] or "Découvrez le nouvel article sur Dingodor One Tech."
    target = "https://dingodoronetech.eu.org/article.html?slug=" + quote(post["slug"], safe="")
    payload = json.dumps({
        "title": ("Nouvel article : " + title)[:100],
        "message": excerpt,
        "target_url": target,
        "name": "Article " + str(post["ID"])
    }).encode("utf-8")
    request = Request(ENDPOINT, data=payload, method="POST", headers={
        "Content-Type": "application/json",
        "webpushrKey": key,
        "webpushrAuthToken": token,
    })
    try:
        with urlopen(request, timeout=20) as response:
            if not 200 <= response.status < 300:
                raise RuntimeError("Webpushr a refusé l’envoi.")
    except HTTPError as error:
        print(f"Échec de l’envoi Webpushr (HTTP {error.code}).", file=sys.stderr)
        return 1
    save(post)
    print(f"Notification envoyée pour l’article {post['ID']}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
