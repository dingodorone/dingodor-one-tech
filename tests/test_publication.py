import hashlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import build_articles
import verify_publication
import notify_new_posts
import deploy_branch


class DeploymentTests(unittest.TestCase):
    def test_public_response_must_match_page(self):
        post = {'url': '/posts/1-test.html', 'sha256': hashlib.sha256(b'article').hexdigest()}
        response = MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.geturl.return_value = verify_publication.ORIGIN + post['url']
        response.read.return_value = b'article'
        with patch.object(verify_publication, 'urlopen', return_value=response):
            verify_publication.verify_post(post)
            response.read.return_value = b'custom 404 page'
            with self.assertRaises(RuntimeError):
                verify_publication.verify_post(post)
            response.read.return_value = b'article'
            response.geturl.return_value = verify_publication.ORIGIN + '/'
            with self.assertRaises(RuntimeError):
                verify_publication.verify_post(post)
        with patch.object(verify_publication, 'urlopen', side_effect=HTTPError('url', 404, 'missing', {}, None)):
            with self.assertRaises(HTTPError):
                verify_publication.verify_post(post)

    def test_failed_deployment_raises(self):
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'owner/repo'}), patch.object(deploy_branch.subprocess, 'check_output', return_value='abc'), patch.object(deploy_branch, 'api', side_effect=[{'commit': 'old'}, {}, {'commit': 'abc', 'status': 'errored'}]):
            with self.assertRaises(RuntimeError):
                deploy_branch.main()

    def test_missing_page_does_not_notify_or_advance_cursor(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / 'state.json'
            state.write_text('{"id":1}')
            posts = [{'ID': 1, 'date': '2026-09-28'}, {'ID': 2, 'date': '2026-09-29'}]
            with patch.dict(os.environ, {'WEBPUSHR_REST_KEY': 'test', 'WEBPUSHR_AUTH_TOKEN': 'test'}), patch.object(notify_new_posts, 'STATE', state), patch.object(notify_new_posts, 'fetch_posts', return_value=posts), patch.object(notify_new_posts, 'verify_post', side_effect=RuntimeError('404')), patch.object(notify_new_posts, 'urlopen') as send:
                with self.assertRaises(RuntimeError):
                    notify_new_posts.main()
                send.assert_not_called()
                self.assertEqual(json.loads(state.read_text()), {'id': 1})

    def test_page_preparation_keeps_live_indexes_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'sitemap.xml').write_text('old sitemap')
            (root / 'data').mkdir()
            (root / 'data/published-posts.json').write_text('{"posts":[]}')
            post = dict(ID=21254, slug='21254', title='', content='<h1>Original title</h1><p>Original content</p>', date='2026-09-29T06:30:00+02:00')
            with patch.object(build_articles, 'ROOT', root), patch.object(build_articles, 'api_posts', return_value=[post]):
                build_articles.main(root / 'pending')
            self.assertTrue((root / 'posts/21254-21254.html').exists())
            self.assertEqual((root / 'sitemap.xml').read_text(), 'old sitemap')
            self.assertEqual(json.loads((root / 'data/published-posts.json').read_text()), {'posts': []})
            candidate = json.loads((root / 'pending/data/published-posts.json').read_text())['posts'][0]
            self.assertEqual(candidate['title'], 'Original title')
            self.assertEqual(candidate['url'], '/posts/21254-21254.html')


if __name__ == '__main__':
    unittest.main()
