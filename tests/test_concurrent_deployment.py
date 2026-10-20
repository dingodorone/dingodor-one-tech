import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import deploy_branch


class ConcurrentDeploymentTests(unittest.TestCase):
    def test_exact_deployment_needs_no_comparison(self):
        with patch.object(deploy_branch, 'api') as api:
            self.assertTrue(deploy_branch.deployed_expected({'status':'built','commit':'expected'}, 'expected', 'owner/repo'))
            api.assert_not_called()

    def test_descendant_deployment_is_accepted(self):
        with patch.object(deploy_branch, 'api', return_value={'status':'ahead'}) as api:
            self.assertTrue(deploy_branch.deployed_expected({'status':'built','commit':'newer'}, 'expected', 'owner/repo'))
            api.assert_called_once_with('repos/owner/repo/compare/expected...newer')

    def test_older_and_unrelated_versions_are_rejected(self):
        for status in ['behind', 'diverged']:
            with patch.object(deploy_branch, 'api', return_value={'status':status}):
                self.assertFalse(deploy_branch.deployed_expected({'status':'built','commit':'other'}, 'expected', 'owner/repo'))

    def test_unfinished_deployment_is_not_accepted(self):
        with patch.object(deploy_branch, 'api') as api:
            self.assertFalse(deploy_branch.deployed_expected({'status':'building','commit':'expected'}, 'expected', 'owner/repo'))
            api.assert_not_called()

    def test_main_accepts_newer_build_after_concurrent_push(self):
        responses = [{'status':'building','commit':'old'}, {}, {'status':'built','commit':'newer'}, {'status':'ahead'}]
        with patch.dict(os.environ, {'GITHUB_REPOSITORY':'owner/repo'}), patch.object(deploy_branch.subprocess, 'check_output', return_value='expected'), patch.object(deploy_branch, 'api', side_effect=responses), patch.object(deploy_branch.time, 'sleep'):
            deploy_branch.main()


if __name__ == '__main__':
    unittest.main()
