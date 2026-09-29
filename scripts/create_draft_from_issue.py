#!/usr/bin/env python3
"""Turn a labelled GitHub article issue into a safe draft on brouillons."""
import html
import os
import re
import unicodedata
from pathlib import Path


def field(body, name):
    match = re.search(r'^###\s+' + re.escape(name) + r'\s*$\n(.*?)(?=^###\s+|\Z)', body, re.M | re.S)
    if not match:
        return ''
    value = match.group(1).strip()
    return '' if value in {'_No response_', 'Aucune réponse'} else value


def slugify(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii').lower()
    value = re.sub(r'[^a-z0-9]+', '-', value).strip('-')
    return value[:70].strip('-') or 'article'


def markdown_to_html(value):
    blocks = []
    for block in re.split(r'\n\s*\n', value.strip()):
        lines = block.splitlines()
        if len(lines) == 1 and re.match(r'^#{1,3}\s+', lines[0]):
            level = min(len(lines[0]) - len(lines[0].lstrip('#')), 3)
            blocks.append(f'<h{level}>' + inline(lines[0][level:].strip()) + f'</h{level}>')
        else:
            blocks.append('<p>' + '<br>\n'.join(inline(line.strip()) for line in lines if line.strip()) + '</p>')
    return '\n\n'.join(blocks)


def inline(value):
    value = html.escape(value, quote=False)
    value = re.sub(r'\[([^]]+)\]\((https://[^)\s]+)\)', r'<a href="\2">\1</a>', value)
    value = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', value)
    return value


def main():
    body = os.environ.get('ISSUE_BODY', '')
    number = os.environ.get('ISSUE_NUMBER', '0')
    title = field(body, 'Titre')
    excerpt = field(body, 'Résumé')
    content = field(body, 'Article')
    image = field(body, 'Image principale (facultatif)')
    if not title or not excerpt or not content:
        raise SystemExit('Champs obligatoires manquants')
    if image and not re.fullmatch(r'https://[^\s]+', image):
        raise SystemExit('L’image doit être une URL https:// valide')
    slug = slugify(title) + '-' + str(number)
    metadata = {'title': title, 'excerpt': excerpt, 'status': 'draft'}
    if image:
        metadata['image'] = image
    html_body = markdown_to_html(content)
    if image:
        html_body = f'<p><img src="{html.escape(image, quote=True)}" alt="" style="max-width:100%;height:auto"></p>\n\n' + html_body
    Path('brouillons').mkdir(exist_ok=True)
    Path(f'brouillons/{slug}.html').write_text('<!--' + __import__('json').dumps(metadata, ensure_ascii=False) + '-->\n' + html_body + '\n', encoding='utf-8', newline='\n')
    print(slug)


if __name__ == '__main__':
    main()
