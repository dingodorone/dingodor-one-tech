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
    def test_new_article_and_update_keep_comments_mount(self):
        data = dict(title='Article', slug='article', date='2026-01-01T12:00:00+00:00', body='<p>Texte</p>')
        for body in ('<p>Texte</p>', '<p>Texte mis à jour</p>'):
            data['body'] = body
            page, post = native_articles.render(data)
            self.assertIn('data-view="github-post"', page)
            self.assertIn('<section id="comments"', page)
            self.assertIn('/wp-content.js', page)
            self.assertLess(page.index('</article>'), page.index('<section id="comments"'))
            self.assertEqual(post['slug'], 'article')

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

    def test_typography_options_survive_publication(self):
        # Les controles de typographie de l'editeur (police, taille, classes)
        # doivent donner le meme rendu sur le site publie.
        self.assertEqual(native_articles.safe_text_style("font-family:'Manrope','Space Grotesk',sans-serif"),
                         "font-family:'manrope','space grotesk',sans-serif")
        self.assertEqual(native_articles.safe_text_style('font-family:Georgia, "Times New Roman", serif'),
                         'font-family:georgia, "times new roman", serif')
        self.assertEqual(native_articles.safe_text_style('font-size:22px'), 'font-size:22px')
        # Pas de valeur exotique ou de fonction (url, expression, data)
        self.assertEqual(native_articles.safe_text_style('font-family:url(http://x/f.woff)'), '')
        self.assertEqual(native_articles.safe_text_style('font-size:var(--x)'), '')
        self.assertEqual(native_articles.safe_text_style('font-size:9px'), '')
        # Les classes de typographie sont conservees, les autres supprimees
        cleaned = native_articles.clean('<p class="dt-text-lg unknown">A<span class="dt-font-serif">B</span></p>')
        self.assertIn('class="dt-text-lg"', cleaned)
        self.assertIn('class="dt-font-serif"', cleaned)
        self.assertNotIn('unknown', cleaned)
        # Le CSS de typographie est embarque dans la page publiee
        page, _ = native_articles.render(dict(title='T', slug='s', date='2026-01-01T00:00:00+00:00',
                                               body='<p class="dt-text-lg">x</p>'))
        self.assertIn('.dt-text-lg{font-size:1.25em}', page)
        self.assertIn('.dt-font-serif', page)

    def test_keeps_decorative_table_and_card_styles(self):
        # Styles decoratifs de l'article XCPE (cartes, chips, barres, bordures) : le site
        # doit publier le meme rendu que l'editeur. Les valeurs restent restreintes et
        # sans fonction CSS (pas d'url(), expression(), etc.).
        self.assertEqual(
            native_articles.safe_text_style('background:#e8590c;color:#fff;text-align:center;padding:16px 8px;border-radius:12px;width:25%'),
            'background:#e8590c;color:#fff;text-align:center;padding:16px 8px;border-radius:12px;width:25%')
        self.assertEqual(
            native_articles.safe_text_style('background:#fff;color:#1d2433;border:1px solid #e8590c;border-radius:99px;padding:1px 10px;font-size:13px;font-weight:600;display:inline-block'),
            'background:#fff;color:#1d2433;border:1px solid #e8590c;border-radius:99px;padding:1px 10px;font-size:13px;font-weight:600;display:inline-block')
        self.assertEqual(
            native_articles.safe_text_style('background:#2f9e44;color:#fff;width:90%;min-width:34px;border-radius:6px;padding:2px 8px;font-weight:700;text-align:right'),
            'background:#2f9e44;color:#fff;width:90%;min-width:34px;border-radius:6px;padding:2px 8px;font-weight:700;text-align:right')
        self.assertEqual(
            native_articles.safe_text_style('width:100%;border-collapse:separate;border-spacing:8px;margin:10px 0'),
            'width:100%;border-collapse:separate;border-spacing:8px;margin:10px 0')
        self.assertEqual(
            native_articles.safe_text_style('border-left:6px solid #9c36b5;padding-left:12px;color:#9c36b5'),
            'border-left:6px solid #9c36b5;padding-left:12px;color:#9c36b5')
        # Le filtre reste conservateur : les proprietes inconnues ou dangereuses sont toujours supprimees.
        self.assertEqual(native_articles.safe_text_style('background:#fff;box-shadow:0 0 5px red'), 'background:#fff')
        self.assertEqual(native_articles.safe_text_style('background:url(javascript:alert(1))'), '')
        self.assertEqual(native_articles.safe_text_style('position:fixed;width:100%'), 'width:100%')
        self.assertEqual(native_articles.safe_text_style('background:#fff;padding:1px url(x)'), 'background:#fff')

    def test_future_released_article_fails_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'data/native-candidates').mkdir(parents=True)
            (root / 'data/native-candidates/future.json').write_text(json.dumps(dict(title='future', slug='future', date='2999-01-01T00:00:00+00:00', body='<p>Secret</p>')))
            with self.assertRaises(ValueError):
                native_articles.build(root)
            self.assertFalse((root / 'publications/future.html').exists())
