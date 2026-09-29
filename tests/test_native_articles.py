import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import native_articles
import build_articles


class NativeTests(unittest.TestCase):
    def test_sanitizes_active_content_and_rejects_remote_images(self):
        self.assertEqual(native_articles.clean('<p onclick="x()">Bonjour<strong>oui</strong><script>secret()</script></p>'), '<p>Bonjour<strong>oui</strong></p>')
        self.assertNotIn('javascript:', native_articles.clean('<a href="javascript:alert(1)">Lien</a>'))
        with self.assertRaises(ValueError):
            native_articles.clean('<img src="https://tracker.example/image">')

    def test_native_and_wordpress_only_enter_staged_index(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'data/native-candidates').mkdir(parents=True)
            data = dict(title='Native', slug='native', date='2026-01-01T12:00:00+00:00', body='<h2>Section</h2><p>Texte</p>')
            (root / 'data/native-candidates/native.json').write_text(json.dumps(data))
            (root / 'data/published-posts.json').write_text('{"posts":[]}')
            wp = dict(ID=2, slug='wp', title='WordPress', date='2026-01-01T10:00:00Z')
            with patch.object(build_articles, 'ROOT', root), patch.object(build_articles, 'api_posts', return_value=[wp]):
                build_articles.main(root / 'staged')
            self.assertEqual(json.loads((root / 'data/published-posts.json').read_text()), {'posts': []})
            posts = json.loads((root / 'staged/data/published-posts.json').read_text())['posts']
            self.assertEqual({p['title'] for p in posts}, {'Native', 'WordPress'})
            self.assertTrue((root / 'publications/native.html').exists())
            self.assertIn('data-view="github-post"', (root / 'publications/native.html').read_text(encoding='utf-8'))

    def test_future_released_article_fails_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'data/native-candidates').mkdir(parents=True)
            (root / 'data/native-candidates/future.json').write_text(json.dumps(dict(title='future', slug='future', date='2999-01-01T00:00:00+00:00', body='<p>Secret</p>')))
            with self.assertRaises(ValueError):
                native_articles.build(root)
            self.assertFalse((root / 'publications/future.html').exists())
