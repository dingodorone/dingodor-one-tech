"""Render released native articles; never read private drafts from this repository."""
import hashlib
import html
import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urlsplit, parse_qs

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
            elif key == 'id' and tag in {'h2','h3','h4'} and re.fullmatch(r'[a-zA-Z][a-zA-Z0-9_-]{0,100}', value):
                safe.append(('id', value))
            elif key == 'class' and tag == 'div':
                classes = [c for c in value.split() if c in {'dt-buttons','dt-callout','dt-toc','dt-gallery'}]
                if classes:
                    safe.append(('class', ' '.join(classes)))
            elif key == 'rel' and tag == 'a':
                safe.append(('rel', ' '.join(c for c in value.split() if c in {'nofollow','sponsored','noopener','noreferrer'})))
            elif key == 'target' and tag == 'a' and value == '_blank':
                safe.append(('target', '_blank'))
            elif key == 'class' and tag == 'figure':
                classes = [c for c in value.split() if c == 'dt-photo' or c in {'dt-align-left', 'dt-align-center', 'dt-align-right'} or re.fullmatch(r'dt-width-(?:[1-9][0-9]|100)', c)]
                if classes:
                    safe.append(('class', ' '.join(dict.fromkeys(classes))))
            elif key in {'colspan', 'rowspan', 'start', 'width', 'height'} and value.isdigit():
                safe.append((key, value))
            elif key == 'href' and tag == 'a' and (urlsplit(value).scheme in {'https', 'http', 'mailto'} or re.fullmatch(r'#[a-zA-Z][a-zA-Z0-9_-]{0,100}', value)):
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


def video_markup(item):
    value = (item.get('file') or item.get('url') or '').strip()
    if not value:
        return ''
    caption = html.escape(item.get('caption', ''))
    title = html.escape(item.get('caption') or 'Vidéo', quote=True)
    if value.startswith(('/media/', '/article-media/')):
        if '..' in value or any(c in value for c in '?#%\\') or not value.lower().endswith(('.mp4', '.webm')):
            raise ValueError('Fichier vidéo invalide')
        player = '<video controls playsinline preload="metadata" src="' + html.escape(value, quote=True) + '"></video>'
    else:
        url = urlsplit(value)
        if url.scheme != 'https':
            raise ValueError('Utiliser un lien vidéo HTTPS')
        host = url.hostname
        identifier = ''
        embed = ''
        if host in {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'}:
            identifier = url.path.strip('/').split('/')[-1] if url.path != '/watch' else parse_qs(url.query).get('v', [''])[0]
            if re.fullmatch(r'[A-Za-z0-9_-]{11}', identifier):
                embed = 'https://www.youtube-nocookie.com/embed/' + identifier
        elif host in {'vimeo.com', 'www.vimeo.com', 'player.vimeo.com'}:
            identifier = url.path.strip('/').split('/')[-1]
            if identifier.isdigit():
                embed = 'https://player.vimeo.com/video/' + identifier
        elif host in {'dailymotion.com', 'www.dailymotion.com', 'dai.ly'}:
            identifier = url.path.strip('/').split('/')[-1].split('_')[0]
            if re.fullmatch(r'[A-Za-z0-9]+', identifier):
                embed = 'https://www.dailymotion.com/embed/video/' + identifier
        if embed:
            player = '<iframe src="' + embed + '" title="' + title + '" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>'
        elif url.path.lower().endswith(('.mp4', '.webm')):
            player = '<video controls playsinline preload="metadata" src="' + html.escape(value, quote=True) + '"></video>'
        else:
            player = '<p>Vidéo disponible sur sa plateforme :</p>'
        player += '<p><a href="' + html.escape(value, quote=True) + '" target="_blank" rel="noopener noreferrer">Ouvrir la vidéo</a></p>'
    try:
        width = min(100, max(10, round(float(item.get('width', 100)))))
    except (ValueError, TypeError, OverflowError):
        width = 100
    return '<figure class="dt-video" style="width:' + str(width) + '%">' + player + ('<figcaption>' + caption + '</figcaption>' if caption else '') + '</figure>'

VIDEO_CSS = '.wp-content .dt-video{margin:1.5em auto;width:100%;max-width:900px}.wp-content .dt-video iframe{display:block;width:100%;aspect-ratio:16/9;height:auto;border:0}.wp-content .dt-video video{display:block;width:100%;max-height:75vh;background:#000}.wp-content .dt-video figcaption{text-align:center;color:#62717e}.wp-content .dt-video p{font-size:.9em}'

BLOCK_CSS = '.wp-content .dt-buttons{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}.wp-content .dt-buttons a{display:inline-block;background:#0879ed;color:white;padding:12px 18px;border-radius:10px;text-decoration:none}.wp-content .dt-callout,.wp-content .dt-toc{background:#edf6ff;border-left:4px solid #0879ed;padding:20px;margin:20px 0}.wp-content .dt-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px}'

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
    for index, item in enumerate(data.get('videos', []), 1):
        markup = video_markup(item)
        marker = '[[video:' + str(index) + ']]'
        if marker in content:
            content = content.replace('<p>' + marker + '</p>', markup).replace(marker, markup)
        elif item.get('position') == 'start':
            content = markup + content
        elif item.get('position') == 'paragraph':
            try:
                number = max(1, int(item.get('paragraph') or 1))
            except (ValueError, TypeError):
                raise ValueError('Numéro de paragraphe invalide')
            endings = list(re.finditer(r'</p>', content))
            if endings:
                offset = endings[min(number, len(endings)) - 1].end()
                content = content[:offset] + markup + content[offset:]
            else:
                content += markup
        else:
            content += markup
    identifier = -int(hashlib.sha256(slug.encode()).hexdigest()[:12], 16)
    path = '/publications/' + slug + '.html'
    post = dict(ID=identifier, title=data['title'], slug=slug, date=data['date'], excerpt=data.get('excerpt', ''), featured_image=featured, content=content)
    page = article_html(post, ORIGIN + path).replace('data-view="static-post"', 'data-view="github-post"')
    seo_title = str(data.get('seo_title') or '').strip()
    meta = str(data.get('meta_description') or '').strip()
    if seo_title:
        page = re.sub(r'<title>.*?</title>', lambda match: '<title>' + html.escape(seo_title) + ' — Dingodor One Tech</title>', page, count=1)
        page = re.sub(r'<meta property="og:title" content="[^"]*">', lambda match: '<meta property="og:title" content="' + html.escape(seo_title, quote=True) + '">', page, count=1)
    if meta:
        for key in ('name="description"', 'property="og:description"'):
            page = re.sub(r'<meta ' + key + r' content="[^"]*">', lambda match: '<meta ' + key + ' content="' + html.escape(meta, quote=True) + '">', page, count=1)
    if featured.startswith('/article-media/'):
        page = page.replace('</head>', '<meta property="og:image" content="' + ORIGIN + featured + '"></head>')
    taxonomy = dict(categories=data.get('categories', []), tags=data.get('tags', []))
    if taxonomy['categories'] or taxonomy['tags'] or data.get('modified'):
        def enhance_schema(match):
            schema = json.loads(match.group(1))
            schema.update(articleSection=taxonomy['categories'], keywords=taxonomy['tags'], dateModified=data.get('modified', data['date']))
            encoded = json.dumps(schema, ensure_ascii=False).replace('<', chr(92) + 'u003c')
            return '<script type="application/ld+json">' + encoded + '</script>'
        page = re.sub(r'<script type="application/ld\+json">(.*?)</script>', enhance_schema, page, count=1, flags=re.S)
    post.update(taxonomy)
    page = page.replace('</head>', '<style>' + PHOTO_CSS + VIDEO_CSS + BLOCK_CSS + '</style></head>')
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


