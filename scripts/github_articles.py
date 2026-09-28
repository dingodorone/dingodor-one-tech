"""Explicit publication only: never discover or read the drafts branch here."""
import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

from build_articles import ROOT, ORIGIN, article_html, write_if_changed

START = '<!-- github-publications:start -->'
END = '<!-- github-publications:end -->'


def published(root):
    path = root / 'data/github-articles.json'
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else []


def sitemap_entries(root):
    return [(p['url'], p['date'][:10]) for p in published(root)]


def prepare(source, slug, root=ROOT):
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) or slug == 'modele':
        raise ValueError('Nom invalide ou modèle non publiable')
    raw = Path(source).read_text(encoding='utf-8')
    match = re.fullmatch(r'<!--\s*(\{.*?\})\s*-->\s*(.+)', raw, re.S)
    if not match:
        raise ValueError('Métadonnées JSON puis contenu HTML requis')
    meta = json.loads(match[1])
    if meta.get('status') != 'ready':
        raise ValueError('Le statut doit être exactement ready pour préparer une publication')
    for key in ('title', 'excerpt'):
        if not isinstance(meta.get(key), str) or not meta[key].strip():
            raise ValueError('Champ requis : ' + key)
    url = '/publications/' + slug + '.html'
    items = published(root)
    if any(p['url'] == url for p in items) or (root / url.lstrip('/')).exists():
        raise ValueError('Cet article existe déjà : modifier sa page publiée dans une PR séparée')
    date = datetime.now(timezone.utc).isoformat()
    post = dict(meta, ID=0, date=date, content=match[2], slug=slug)
    page = article_html(post, ORIGIN + url).replace('data-view="static-post" data-post-id="0"', 'data-view="github-post"')
    items.insert(0, dict(title=meta['title'], excerpt=meta['excerpt'], date=date, url=url))
    # Validate and prepare every output before writing any file.
    listing = (root / 'articles.html').read_text(encoding='utf-8')
    cards = ''.join('<a class="post-card" href="' + p['url'] + '"><div class="post-card-body"><h2>' + html.escape(p['title']) + '</h2><p>' + html.escape(p['excerpt']) + '</p></div></a>' for p in items)
    block = START + '<section aria-label="Articles rédigés sur GitHub" class="post-grid">' + cards + '</section>' + END
    if START in listing:
        listing = re.sub(re.escape(START) + '.*?' + re.escape(END), lambda _: block, listing, flags=re.S)
    else:
        anchor = '<form id="article-search"'
        if anchor not in listing:
            raise ValueError('Point d’insertion de la liste introuvable')
        listing = listing.replace(anchor, block + anchor, 1)
    sitemap = (root / 'sitemap.xml').read_text(encoding='utf-8')
    ET.fromstring(sitemap)
    entry = '<url><loc>' + ORIGIN + url + '</loc><lastmod>' + date[:10] + '</lastmod></url>\n'
    if '</urlset>' not in sitemap:
        raise ValueError('Sitemap invalide')
    sitemap = sitemap.replace('</urlset>', entry + '</urlset>')
    write_if_changed(root / url.lstrip('/'), page)
    write_if_changed(root / 'data/github-articles.json', json.dumps(items, ensure_ascii=False, indent=2) + '\n')
    write_if_changed(root / 'articles.html', listing)
    write_if_changed(root / 'sitemap.xml', sitemap)


if __name__ == '__main__':
    prepare(sys.argv[1], sys.argv[2])
