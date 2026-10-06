"""Render released native articles; never read private drafts from this repository."""
import hashlib
import html
import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urlsplit

def safe_image_source(value):
    if (value.startswith('/media/') or value.startswith('/article-media/')) and '..' not in value and not any(c in value for c in ['?', '#', '%', '\\']):
        return True
    url = urlsplit(value)
    return (url.scheme == 'https' and url.netloc == 'dingodoronetech.wordpress.com'
            and url.path.startswith('/wp-content/uploads/')
            and url.path.lower().endswith(('.jpg','.jpeg','.png','.webp','.gif'))
            and not url.query and not url.fragment)

def safe_text_style(value):
    rules = []
    for declaration in value.split(';'):
        key, sep, val = declaration.partition(':')
        key, val = key.strip().lower(), val.strip().lower()
        allowed = False
        if key in {'color', 'background-color'}:
            allowed = bool(re.fullmatch(r'#[0-9a-f]{3}(?:[0-9a-f]{3})?|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)', val))
        elif key == 'font-size':
            allowed = bool(re.fullmatch(r'(?:1[2-9]|[2-5][0-9]|6[0-4])px', val))
        elif key == 'text-align':
            allowed = val in {'left','center','right','justify'}
        elif key == 'font-weight':
            allowed = val in {'normal','bold','400','700'}
        elif key == 'font-style':
            allowed = val in {'normal','italic'}
        elif key == 'text-decoration-line':
            allowed = val in {'underline','line-through','underline line-through','none'}
        elif key == 'line-height':
            allowed = val in {'1','1.25','1.5','1.75','2'}
        if sep and allowed:
            rules.append(key + ':' + val)
    return ';'.join(rules)

PHOTO_CSS = '''
.wp-content table{border-collapse:collapse;width:100%;table-layout:auto;margin:1.5em 0}.wp-content td,.wp-content th{border:1px solid #d6e3e5;padding:14px 16px;overflow-wrap:normal;word-break:normal;hyphens:none;vertical-align:top}.wp-content th{background:#eaf4f3;text-align:left}.wp-content blockquote{border-left:4px solid #168675;margin:1em 0;padding:12px 22px;background:#eef6f4}.wp-content pre{white-space:pre-wrap;background:#eef1f3;padding:16px}
.wp-content figure.dt-photo{max-width:100%;box-sizing:border-box;margin-top:1.5em;margin-bottom:1.5em;padding:0;clear:both}
.wp-content figure.dt-photo img{display:block;width:100%;max-width:100%;height:auto;margin:0;border-radius:10px}
.wp-content figure.dt-photo.dt-align-left{margin-left:0;margin-right:auto}
.wp-content figure.dt-photo.dt-align-center{margin-left:auto;margin-right:auto}
.wp-content figure.dt-photo.dt-align-right{margin-left:auto;margin-right:0}
.wp-content figure.dt-photo figcaption{text-align:center;font-size:.9em;line-height:1.5;color:#62717e;margin-top:.65em;overflow-wrap:anywhere}
''' + ''.join('.wp-content figure.dt-photo.dt-width-%d{width:%d%%}' % (n,n) for n in range(10,101))


class SafeHTML(HTMLParser):
    tags = set('p br h2 h3 h4 h5 h6 strong b em i u s del sub sup blockquote ul ol li a img figure figcaption pre code table thead tbody tr td th hr div span'.split())
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
            elif key == 'style' and tag not in {'img','figure'}:
                style = safe_text_style(value)
                if style:
                    safe.append(('style', style))
            elif key == 'class' and tag == 'figure':
                classes = [c for c in value.split() if c == 'dt-photo' or c in {'dt-align-left', 'dt-align-center', 'dt-align-right'} or re.fullmatch(r'dt-width-(?:[1-9][0-9]|100)', c)]
                if classes:
                    safe.append(('class', ' '.join(dict.fromkeys(classes))))
            elif key in {'colspan', 'rowspan', 'start', 'width', 'height'} and value.isdigit():
                safe.append((key, value))
            elif key == 'href' and tag == 'a' and urlsplit(value).scheme in {'https', 'http', 'mailto'}:
                safe.append((key, value))
            elif key == 'src' and tag == 'img' and safe_image_source(value):
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
    page = page.replace('</head>', '<style>' + PHOTO_CSS + '</style></head>')
    return page, {k: v for k, v in dict(post, url=path, source='github', sha256=hashlib.sha256(page.encode()).hexdigest()).items() if k != 'content'}


def build(root):
    from build_articles import write_if_changed
    posts = []
    for source in sorted((root / 'data/native-candidates').glob('*.json')):
        data = json.loads(source.read_text(encoding='utf-8'))
        if data.get('withdrawn'):
            slug=data['slug']
            if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',slug):
                raise ValueError('Invalid withdrawn slug')
            write_if_changed(root / 'publications' / (slug + '.html'), '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Article retiré</title></head><body><h1>Cet article a été retiré.</h1><p><a href="/articles.html">Voir les autres articles</a></p></body></html>')
            continue
        if datetime.fromisoformat(data['date'].replace('Z', '+00:00')) > datetime.now(timezone.utc):
            raise ValueError('Future article reached public repository')
        page, post = render(data)
        write_if_changed(root / post['url'].lstrip('/'), page)
        posts.append(post)
    return posts

