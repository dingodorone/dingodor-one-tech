"""Render released native articles; never read private drafts from this repository."""
import hashlib
import html
import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urlsplit


class SafeHTML(HTMLParser):
    tags = set('p br h2 h3 h4 h5 h6 strong b em i u s del blockquote ul ol li a img figure figcaption pre code table thead tbody tr td th hr div span'.split())
    void = {'br', 'img', 'hr'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.output = []
        self.blocked = 0

    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style', 'iframe', 'object', 'svg', 'math'}:
            self.blocked += 1
        if self.blocked or tag not in self.tags:
            return
        safe = []
        for key, value in attrs:
            if value is None:
                continue
            if key in {'title', 'alt'}:
                safe.append((key, value))
            elif key in {'colspan', 'rowspan', 'start', 'width', 'height'} and value.isdigit():
                safe.append((key, value))
            elif key == 'href' and tag == 'a' and urlsplit(value).scheme in {'https', 'http', 'mailto'}:
                safe.append((key, value))
            elif key == 'src' and tag == 'img' and (value.startswith('/media/') or value.startswith('/article-media/')) and '..' not in value and not any(c in value for c in ['?', '#', '%', '\\']):
                safe.append((key, value))
        if tag == 'img' and not any(k == 'src' for k, v in safe):
            raise ValueError('Importer les images dans la médiathèque privée avant de continuer.')
        self.output.append('<' + tag + ''.join(' ' + k + '="' + html.escape(v, quote=True) + '"' for k, v in safe) + '>')

    def handle_endtag(self, tag):
        if tag in {'script', 'style', 'iframe', 'object', 'svg', 'math'}:
            self.blocked = max(0, self.blocked - 1)
            return
        if not self.blocked and tag in self.tags and tag not in self.void:
            self.output.append('</' + tag + '>')

    def handle_data(self, data):
        if not self.blocked:
            self.output.append(html.escape(data))


def clean(value):
    parser = SafeHTML()
    parser.feed(value)
    return ''.join(parser.output)


def render(data):
    from build_articles import article_html, ORIGIN
    slug = data['slug']
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
        raise ValueError('Invalid slug')
    if not data.get('title', '').strip() or not data.get('body', '').strip():
        raise ValueError('Titre et texte requis')
    date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
    if date.tzinfo is None:
        raise ValueError('Timezone required')
    content = clean(data['body'])
    featured = data.get('featured_image', '')
    if featured:
        content = clean('<figure><img src="' + html.escape(featured, quote=True) + '" alt=""></figure>') + content
    identifier = -int(hashlib.sha256(slug.encode()).hexdigest()[:12], 16)
    path = '/publications/' + slug + '.html'
    post = dict(ID=identifier, title=data['title'], slug=slug, date=data['date'], excerpt=data.get('excerpt', ''), featured_image=featured, content=content)
    page = article_html(post, ORIGIN + path).replace('data-view="static-post"', 'data-view="github-post"')
    return page, {k: v for k, v in dict(post, url=path, source='github', sha256=hashlib.sha256(page.encode()).hexdigest()).items() if k != 'content'}


def build(root):
    from build_articles import write_if_changed
    posts = []
    for source in sorted((root / 'data/native-candidates').glob('*.json')):
        data = json.loads(source.read_text(encoding='utf-8'))
        if datetime.fromisoformat(data['date'].replace('Z', '+00:00')) > datetime.now(timezone.utc):
            raise ValueError('Future article reached public repository')
        page, post = render(data)
        write_if_changed(root / post['url'].lstrip('/'), page)
        posts.append(post)
    return posts
