import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import update_home_fallback as home

INDEX = ('<main>\r\n<section class="content-section" id="articles">\r\n'
         '  <div class="article-grid">\r\n    <a class="article-card featured" href="old.html">'
         '<div class="art"></div></a>\r\n  </div>\r\n</section>\r\n<footer>x</footer>\n</main>')


def post(day, url, **extra):
    return {'title': 'T ' + url, 'excerpt': '<p>Résumé &amp; suite</p>', 'date': f'2026-11-{day:02d}T10:00:00+00:00',
            'url': url, **extra}


class HomeFallbackTests(unittest.TestCase):
    def test_keeps_three_newest_valid_posts_like_script_js(self):
        posts = [post(1, '/posts/a.html'), post(14, '/publications/b.html'), post(12, '/posts/c.html'),
                 post(13, '/posts/d.html'), post(20, 'https://evil.example/x.html'), post(21, '/posts/Bad_Name.html'),
                 {'title': 'no url', 'date': '2026-11-22T10:00:00+00:00'}, post(22, '/posts/e.html', date='not a date')]
        self.assertEqual([p['url'] for p in home.latest_posts(posts)],
                         ['/publications/b.html', '/posts/d.html', '/posts/c.html'])

    def test_render_replaces_only_the_cards_and_keeps_line_endings(self):
        text = home.render(INDEX, [post(14, '/posts/new.html', featured_image='/article-media/x.webp')])
        self.assertIn('href="/posts/new.html"', text)
        self.assertNotIn('old.html', text)
        self.assertIn('14 NOVEMBRE 2026', text)
        self.assertIn('Résumé &amp; suite', text)
        self.assertIn('src="https://dingodoronetech.eu.org/article-media/x.webp"', text)
        self.assertTrue(text.startswith('<main>\r\n<section'))
        self.assertTrue(text.endswith('</div>\r\n</section>\r\n<footer>x</footer>\n</main>'))

    def test_titles_are_escaped(self):
        text = home.render(INDEX, [post(14, '/posts/new.html', title='<b>"A" & B</b>')])
        self.assertNotIn('<b>', text)
        self.assertIn('&quot;A&quot; &amp; B', text)

    def test_missing_block_or_posts_changes_nothing(self):
        self.assertIsNone(home.render('<main></main>', [post(14, '/posts/new.html')]))
        self.assertIsNone(home.render(INDEX, []))

    def test_main_never_raises_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.html').write_bytes(INDEX.encode('utf-8'))
            (root / 'posts.json').write_text(json.dumps({'posts': [post(14, '/posts/new.html')]}), encoding='utf-8')
            home.main(root / 'posts.json', root / 'index.html')
            first = (root / 'index.html').read_bytes()
            home.main(root / 'posts.json', root / 'index.html')
            self.assertEqual(first, (root / 'index.html').read_bytes())
            home.main(root / 'missing.json', root / 'index.html')
            (root / 'posts.json').write_text('not json', encoding='utf-8')
            home.main(root / 'posts.json', root / 'index.html')
            self.assertEqual(first, (root / 'index.html').read_bytes())


if __name__ == '__main__':
    unittest.main()
