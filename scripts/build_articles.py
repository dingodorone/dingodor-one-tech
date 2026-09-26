#!/usr/bin/env python3
"""Publish WordPress posts as crawlable HTML and rebuild the site sitemap."""
import html
import json
import re
import time
import unicodedata
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "posts"
ORIGIN = "https://dingodoronetech.eu.org"
API = "https://public-api.wordpress.com/rest/v1.1/sites/dingodoronetech.wordpress.com/posts/"
FIELDS = "ID,slug,title,date,modified,excerpt,content,featured_image,status,type"
STATIC_URLS = ["/", "/articles.html", "/guide-camera.html", "/partenaires.html",
               "/page.html?slug=code-promo-2", "/page.html?slug=contact",
               "/twitch.html", "/alarme-pg107.html"]


def plain(value):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", " ", value or ""))).strip()


def api_posts():
    offset = 0
    found = None
    while found is None or offset < found:
        query = urlencode({"number": 100, "offset": offset, "fields": FIELDS})
        request = Request(API + "?" + query, headers={"User-Agent": "Dingodor-SEO-Builder/1.0"})
        for attempt in range(3):
            try:
                with urlopen(request, timeout=60) as response:
                    data = json.load(response)
                break
            except (OSError, ValueError):
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
        found = int(data["found"])
        batch = data.get("posts", [])
        if not batch:
            raise RuntimeError(f"WordPress returned no posts at offset {offset}/{found}")
        yield from (post for post in batch if post.get("status") == "publish" and post.get("type") == "post")
        offset += len(batch)


def article_path(post):
    slug = post["slug"]
    if slug == "pg107":
        return "/alarme-pg107.html"
    readable = unicodedata.normalize("NFKD", unquote(slug)).encode("ascii", "ignore").decode("ascii")
    readable = re.sub(r"[^a-z0-9]+", "-", readable.lower()).strip("-")[:85].strip("-")
    return "/posts/" + str(int(post["ID"])) + "-" + (readable or "article") + ".html"


def date_iso(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()


def article_html(post, url):
    title = plain(post.get("title")) or "Article Dingodor One Tech"
    excerpt = plain(post.get("excerpt"))[:155] or plain(post.get("content"))[:155]
    image = post.get("featured_image") or ""
    structured = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": title,
                  "datePublished": post["date"], "dateModified": post.get("modified") or post["date"],
                  "author": {"@type": "Person", "name": "Dingodor One Tech"},
                  "mainEntityOfPage": url, "description": excerpt}
    if image.startswith("https://"):
        structured["image"] = image
    schema = json.dumps(structured, ensure_ascii=False).replace("<", "\\u003c")
    social_image = f'<meta property="og:image" content="{html.escape(image, quote=True)}">' if image.startswith("https://") else ""
    published = date_iso(post["date"])
    description = html.escape(excerpt, quote=True)
    safe_title = html.escape(title)
    content = post.get("content") or "<p>Contenu indisponible pour le moment.</p>"
    return f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="canonical" href="{url}"><meta name="description" content="{description}">
<meta property="og:type" content="article"><meta property="og:title" content="{html.escape(title, quote=True)}"><meta property="og:description" content="{description}"><meta property="og:url" content="{url}">{social_image}
<title>{safe_title} — Dingodor One Tech</title><link rel="stylesheet" href="/content.css?v=9"><script type="application/ld+json">{schema}</script></head>
<body data-view="static-post" data-post-id="{int(post['ID'])}"><a class="skip" href="#contenu">Aller au contenu</a>
<header class="site-header"><a class="brand" href="/"><span class="brand-mark">D1</span><span>Dingodor <strong>One Tech</strong></span></a><button class="menu-button" type="button" aria-expanded="false" aria-controls="navigation">Menu</button><nav id="navigation"><a href="/">Accueil</a><a href="/articles.html">Articles</a><a href="/guide-camera.html">Guide caméra</a><a href="/page.html?slug=code-promo-2">Codes promo</a><a href="/partenaires.html">Partenaires</a><a class="nav-contact" href="/page.html?slug=contact">✉ Contact</a></nav></header>
<main id="contenu" class="article-wrap"><header class="article-head"><a class="back" href="/articles.html">← Tous les articles</a><h1>{safe_title}</h1><p class="meta"><time datetime="{published}">{published}</time></p></header><article id="wp-content" class="wp-content">{content}</article><section id="comments" class="comments-section" hidden></section></main>
<footer>© Dingodor One Tech · <a href="/page.html?slug=contact">Contact</a></footer><script src="/wp-content.js?v=13" defer></script><script src="/webpushr.js" defer></script></body></html>'''


def write_if_changed(path, contents):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text(encoding="utf-8") != contents:
        path.write_text(contents, encoding="utf-8")


def main():
    entries = []
    current = set()
    for post in api_posts():
        path = article_path(post)
        if path == "/alarme-pg107.html":
            continue  # The existing hand-built guide is the canonical version.
        local = ROOT / path.lstrip("/")
        if local in current:
            raise RuntimeError(f"Duplicate slug: {path}")
        current.add(local)
        modified = date_iso(post.get("modified") or post["date"])
        entries.append((path, modified))
        write_if_changed(local, article_html(post, ORIGIN + path))
    if not entries:
        raise RuntimeError("No published posts returned; preserving existing pages and sitemap")
    # Only remove files generated by this script; never touch the manual PG107 guide.
    for old in OUTPUT.glob("*.html"):
        if old not in current:
            old.unlink()
    urls = [f"  <url><loc>{html.escape(ORIGIN + path, quote=True)}</loc></url>" for path in STATIC_URLS]
    urls += [f"  <url><loc>{ORIGIN + path}</loc><lastmod>{modified}</lastmod></url>" for path, modified in entries]
    write_if_changed(ROOT / "sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(urls) + '\n</urlset>\n')
    print(f"Generated {len(entries)} pages and a sitemap with {len(entries) + len(STATIC_URLS)} URLs")


if __name__ == "__main__":
    main()
