import sys,unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import verify_publication as v

class RetryTests(unittest.TestCase):
 def setUp(self):self.post={'url':'/publications/example.html','sha256':'unused'}
 def test_delayed_page_eventually_available(self):
  errors=[HTTPError('url',404,'not ready',{},None)]*4+[None]
  with patch.object(v,'verify_post',side_effect=errors) as check,patch.object(v.time,'sleep') as sleep:
   v.verify_with_retry(self.post)
   self.assertEqual(check.call_count,5)
   self.assertEqual([c.args[0] for c in sleep.call_args_list],[5,10,20,30])
 def test_persistent_failure_names_page(self):
  with patch.object(v,'verify_post',side_effect=RuntimeError('outdated page')),patch.object(v.time,'sleep') as sleep:
   with self.assertRaisesRegex(RuntimeError,'https://dingodoronetech.eu.org/publications/example.html.*9 attempt'):
    v.verify_with_retry(self.post)
   self.assertEqual(sleep.call_count,8)
 def test_forbidden_fails_without_waiting(self):
  with patch.object(v,'verify_post',side_effect=HTTPError('url',403,'forbidden',{},None)),patch.object(v.time,'sleep') as sleep:
   with self.assertRaises(RuntimeError):v.verify_with_retry(self.post)
   sleep.assert_not_called()
 def test_invalid_path_fails_without_waiting(self):
  with patch.object(v,'verify_post',side_effect=ValueError('Invalid publication URL')),patch.object(v.time,'sleep') as sleep:
   with self.assertRaises(ValueError):v.verify_with_retry(self.post)
   sleep.assert_not_called()
 def test_success_does_not_wait(self):
  with patch.object(v,'verify_post'),patch.object(v.time,'sleep') as sleep:
   v.verify_with_retry(self.post)
   sleep.assert_not_called()

if __name__=='__main__':unittest.main()

