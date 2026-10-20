"""Explicitly build branch-based Pages even after a GITHUB_TOKEN push."""
import json
import os
import subprocess
import time


def api(*args):
    return json.loads(subprocess.check_output(['gh', 'api', *args], text=True))


def deployed_expected(result, expected, repository):
    if result.get('status') != 'built':
        return False
    deployed = result.get('commit')
    if deployed == expected:
        return True
    if not deployed:
        return False
    # Another writer (for example the Twitch counter) can advance main while
    # Pages is building. Accept only a deployed descendant, never an older or
    # unrelated version. verify_publication.py still checks exact article bytes.
    comparison = api('repos/' + repository + '/compare/' + expected + '...' + deployed)
    return comparison.get('status') in {'ahead', 'identical'}


def main():
    repository = os.environ['GITHUB_REPOSITORY']
    endpoint = 'repos/' + repository + '/pages/builds'
    expected = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    current = api(endpoint + '/latest')
    if deployed_expected(current, expected, repository):
        print('GitHub Pages already deployed ' + expected)
        return
    api('--method', 'POST', endpoint)
    for _ in range(60):
        result = api(endpoint + '/latest')
        if deployed_expected(result, expected, repository):
            print('GitHub Pages deployed a version containing ' + expected)
            return
        if result.get('commit') == expected:
            if result.get('status') == 'errored':
                raise RuntimeError('Pages build failed: ' + str(result.get('error')))
        time.sleep(10)
    raise RuntimeError('Expected Pages deployment not confirmed; indexes remain unchanged')


if __name__ == '__main__':
    main()
