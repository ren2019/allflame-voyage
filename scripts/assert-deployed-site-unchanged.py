#!/usr/bin/env python3
"""Read-only proof that the protected deployment still matches a prior snapshot."""
import hashlib
import json
import os
from pathlib import Path
import sys

baseline = json.loads(Path(sys.argv[1]).read_text())
site = Path(baseline['site'])
for name, expected in baseline['files'].items():
    path = site / name
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected['sha256'], name
    assert path.stat().st_mtime_ns == expected['mtimeNs'], name
actual = {
    str(path.relative_to(site / 'www')): hashlib.sha256(path.read_bytes()).hexdigest()
    for path in (site / 'www').rglob('*') if path.is_file()
}
assert actual == baseline['staticAssets'], 'Deployed static file paths or bytes changed'
pid = int((site / 'server.pid').read_text())
os.kill(pid, 0)
print(json.dumps({'unchanged': True, 'livePid': pid, 'staticFiles': len(actual), 'metadataFiles': len(baseline['files'])}))
