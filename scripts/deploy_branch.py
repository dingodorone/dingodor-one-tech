"""Explicitly build branch-based Pages even after a GITHUB_TOKEN push."""
import json
import os
import subprocess
import time


def api(*args):
    return json.loads(subprocess.check_output(['gh', 'api', *args], text=True))


def main():
    endpoint = 'repos/' + os.environ['GITHUB_REPOSITORY'] + '/pages/builds'
    expected = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    current = api(endpoint + '/latest')
    if current.get('commit') == expected and current.get('status') == 'built':
        print('GitHub Pages already deployed ' + expected)
        return
    api('--method', 'POST', endpoint)
    for _ in range(60):
        result = api(endpoint + '/latest')
        if result.get('commit') == expected:
            if result.get('status') == 'built':
                print('GitHub Pages deployed ' + expected)
                return
            if result.get('status') == 'errored':
                raise RuntimeError('Pages build failed: ' + str(result.get('error')))
        time.sleep(10)
    raise RuntimeError('Expected Pages deployment not confirmed; indexes remain unchanged')


if __name__ == '__main__':
    main()
