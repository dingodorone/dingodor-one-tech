"""Publish only Twitch's public follower total. Credentials stay in Actions secrets."""
import datetime
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request

CLIENT_ID = 'jwn0hh9mss12ii9eugszyozznrf8i8'
BROADCASTER_ID = '445892422'


def public_record(response):
    total = response.get('total')
    if type(total) is not int or total < 0:
        raise ValueError('Invalid follower total')
    return {'channel': 'dingodorone', 'followers': total, 'goal': 100,
            'updated_at': datetime.datetime.now(datetime.timezone.utc).isoformat()}


def request_json(url, *, data=None, headers=None):
    request = urllib.request.Request(url, data=data, headers=headers or {})
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Never print response bodies, headers, URLs with credentials, or tokens.
        raise RuntimeError(f'Twitch returned HTTP {error.code}') from None
    except (urllib.error.URLError, TimeoutError):
        raise RuntimeError('Twitch connection unavailable') from None


def main():
    secret = os.environ.get('TWITCH_CLIENT_SECRET')
    if not secret:
        raise RuntimeError('Missing TWITCH_CLIENT_SECRET')
    token = request_json('https://id.twitch.tv/oauth2/token', data=urllib.parse.urlencode({
        'client_id': CLIENT_ID, 'client_secret': secret, 'grant_type': 'client_credentials'
    }).encode())
    access = token.get('access_token')
    if not isinstance(access, str) or not access:
        raise RuntimeError('Twitch authentication failed')
    followers = request_json(
        f'https://api.twitch.tv/helix/channels/followers?broadcaster_id={BROADCASTER_ID}&first=1',
        headers={'Client-Id': CLIENT_ID, 'Authorization': 'Bearer ' + access})
    result = public_record(followers)
    path = Path('data/twitch-followers.json')
    path.parent.mkdir(exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)
    print(f"Public counter updated: {result['followers']}/100")


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Fixed safe messages only, never dump an authentication response.
        if isinstance(error, (RuntimeError, ValueError)):
            print(str(error), file=sys.stderr)
        else:
            print('Unable to update Twitch counter; previous total retained.', file=sys.stderr)
        sys.exit(1)
