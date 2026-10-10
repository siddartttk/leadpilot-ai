import json
import sys
import urllib.request
for url in ['http://127.0.0.1:8000/api/health','http://127.0.0.1:3000']:
    try:
        with urllib.request.urlopen(url,timeout=15) as result:
            print(json.dumps({'url':url,'status':result.status}))
    except Exception as exc:
        print(f'Not ready: {url} ({type(exc).__name__})')
        sys.exit(1)
