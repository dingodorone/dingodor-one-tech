#!/usr/bin/env python3
"""Refresh the static "Les derniers articles" cards of index.html.

script.js replaces these cards in the browser with the three newest entries of
data/published-posts.json. This script renders the same three cards in the HTML
itself, so crawlers, link previews and visitors without JavaScript see the real
latest articles too. It never blocks a publication: any problem is only a warning.
"""
import html
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://dingodoronetech.eu.org"
LIMIT = 3
# Same rule as the filter in script.js.
URL_RULE = re.compile(r"^/(?:posts/|publications/)[a-z0-9-]+\.html$|^/alarme-pg107\.html$")
SECTION = re.compile(
    r'(<section class="content-section" id="articles">.*?<div class="article-grid">)'
    r'(.*?)'
    r'(</div>\s*</section>)',
    re.S,
)
MONTHS = ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET",
          "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"]


def plain(value):
    text = re.sub(r"<[^>]*>", " ", str(value or ""))
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def parse_date(value):
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=ZoneInfo("UTC"))
    return parsed


def latest_posts(posts, limit=LIMIT):
    valid = []
    for post in posts:
        parsed = parse_date(post.get("date"))
        url = post.get("url")
        if parsed and isinstance(url, str) and URL_RULE.match(url):
            valid.append((parsed, post))
    valid.sort(key=lambda item: item[0], reverse=True)
    return [post for _, post in valid[:limit]]


def french_date(parsed):
    local = parsed.astimezone(ZoneInfo("Europe/Paris"))
    return f"{local.day} {MONTHS[local.month - 1]} {local.year}"


def image_url(value):
    value = str(value or "")
    if value.startswith("/") and not value.startswith("//"):
        return ORIGIN + value
    return value if value.startswith("https://") else ""


def card(post):
    esc = lambda text: html.escape(text, quote=True)
    title = plain(post.get("title")) or "Article Dingodor One Tech"
    image = image_url(post.get("featured_image"))
    picture = (f'<img class="home-article-image" src="{esc(image)}" alt="{esc(title)}" '
               f'loading="lazy" decoding="async">') if image else ""
    return (f'<a class="article-card" href="{esc(post["url"])}">{picture}'
            f'<div class="article-body"><small>{french_date(parse_date(post["date"]))}</small>'
            f'<h3>{esc(title)}</h3><p>{esc(plain(post.get("excerpt"))[:170])}</p>'
            f'<span class="read">Lire l’article →</span></div></a>')


def render(index_text, posts):
    """Return index_text with fresh cards, or None when nothing can be updated."""
    chosen = latest_posts(posts)
    if not chosen:
        return None
    cards = "".join(card(post) for post in chosen)
    if not SECTION.search(index_text):
        return None
    return SECTION.sub(lambda m: m.group(1) + cards + m.group(3), index_text, count=1)


def main(posts_path, index_path=None):
    index_path = Path(index_path) if index_path else ROOT / "index.html"
    try:
        posts = json.loads(Path(posts_path).read_text(encoding="utf-8"))["posts"]
        # Bytes keep the file's existing line endings untouched.
        current = index_path.read_bytes().decode("utf-8")
        updated = render(current, posts)
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"Warning: home fallback not updated ({error})")
        return
    if updated is None:
        print("Warning: home fallback not updated (no valid posts or article block not found)")
    elif updated != current:
        index_path.write_bytes(updated.encode("utf-8"))
        print("Home fallback articles updated")
    else:
        print("Home fallback articles already up to date")


if __name__ == "__main__":
    main(*(sys.argv[1:3] or ["data/published-posts.json"]))
