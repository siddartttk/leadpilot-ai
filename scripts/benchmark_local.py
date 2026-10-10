"""Small sequential local benchmark, not a production load test."""
import json
import math
import statistics
import time
from pathlib import Path
import httpx

results={}
with httpx.Client(base_url='http://127.0.0.1:8000',timeout=20) as client:
    response=client.post('/api/demo')
    response.raise_for_status()
    for endpoint in ['/api/leads?q=Maya&size=20','/api/analytics?days=180']:
        samples=[]
        for index in range(31):
            started=time.perf_counter()
            response=client.get(endpoint)
            response.raise_for_status()
            elapsed=(time.perf_counter()-started)*1000
            if index: samples.append(elapsed)
        ordered=sorted(samples)
        results[endpoint]={'requests':len(samples),'median_ms':round(statistics.median(samples),2),'p95_ms':round(ordered[math.ceil(.95*len(samples))-1],2)}
report={'context':'Sequential loopback HTTP, one API process, 160 synthetic leads, persistent SQLite. One warm-up request per endpoint. Includes HTTP and serialization. Not a concurrency or production benchmark.','results':results}
target=Path(__file__).resolve().parents[1]/'docs'/'benchmark.json'
target.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
