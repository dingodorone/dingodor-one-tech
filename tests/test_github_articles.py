import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import build_articles
import github_articles


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'articles.html').write_text('<form id="article-search"></form>', encoding='utf-8')
        (self.root / 'sitemap.xml').write_text('<urlset></urlset>', encoding='utf-8')
        self.source = self.root / 'input.html'

    def draft(self, status='draft'):
        self.source.write_text('<!--' + json.dumps(dict(title='Test & titre', excerpt='Résumé', status=status)) + '-->\n<p>Contenu test</p>', encoding='utf-8')

    def test_draft_refused_without_public_changes(self):
        for status in ('draft', 'publish', '', True, 'READY'):
            self.draft(status)
            before = {p.name: p.read_bytes() for p in self.root.iterdir()}
            with self.assertRaises(ValueError):
                github_articles.prepare(self.source, 'test', self.root)
            self.assertEqual(before, {p.name: p.read_bytes() for p in self.root.iterdir()})

    def test_explicit_publication_and_no_overwrite(self):
        self.draft('ready')
        github_articles.prepare(self.source, 'test', self.root)
        page = (self.root / 'publications/test.html').read_text(encoding='utf-8')
        self.assertIn('Contenu test', page)
        self.assertNotIn('static-post', page)
        self.assertIn('/publications/test.html', (self.root / 'articles.html').read_text(encoding='utf-8'))
        self.assertIn('/publications/test.html', (self.root / 'sitemap.xml').read_text(encoding='utf-8'))
        self.assertEqual(len(github_articles.published(self.root)), 1)
        with self.assertRaises(ValueError):
            github_articles.prepare(self.source, 'test', self.root)

    def test_invalid_slugs_and_model_refused(self):
        self.draft('ready')
        for slug in ('../test', '/tmp/test', 'modele', 'x;echo', 'a/b'):
            with self.assertRaises(ValueError):
                github_articles.prepare(self.source, slug, self.root)

    def test_wordpress_refresh_keeps_published_only(self):
        self.draft('ready')
        github_articles.prepare(self.source, 'test', self.root)
        # Even a stray draft source is never discovered by the public builder.
        (self.root / 'brouillons').mkdir()
        (self.root / 'brouillons/secret.html').write_text('SECRET_DRAFT', encoding='utf-8')
        post = dict(ID=123, slug='wordpress', title='WordPress', excerpt='Test', content='<p>Publié</p>', date='2026-09-28T10:00:00Z')
        with patch.object(build_articles, 'ROOT', self.root), patch.object(build_articles, 'OUTPUT', self.root / 'posts'), patch.object(build_articles, 'api_posts', return_value=[post]):
            build_articles.main()
        sitemap = (self.root / 'sitemap.xml').read_text(encoding='utf-8')
        self.assertIn('/publications/test.html', sitemap)
        self.assertNotIn('secret', sitemap)
        self.assertEqual(len(list((self.root / 'posts').glob('*.html'))), 1)


if __name__ == '__main__':
    unittest.main()
