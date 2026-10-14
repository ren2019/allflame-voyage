#!/usr/bin/env python3
"""Validate an acquired offline library without contacting PoEDB."""
from pathlib import Path
import argparse, hashlib, html, json, re
parser=argparse.ArgumentParser();parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1]);args=parser.parse_args()
root=args.root;lib=root/'samples/text-library'
def load(path):return json.loads(path.read_text())
sources=load(lib/'sources.json');data=load(lib/'library.json');coverage=load(lib/'coverage.json');inventory=load(lib/'repository-inventory.json')
by_source={s['sourceId']:s for s in sources};assert len(by_source)==len(sources),'Duplicate source ID'
for source in sources:
    path=root/source['snapshotPath'];assert path.is_file(),f'Missing snapshot {path}'
    assert hashlib.sha256(path.read_bytes()).hexdigest()==source['snapshotSha256'],f'Snapshot digest mismatch: {path}'
    assert source['sourceVersion'] and source['retrievedAt']
    assert source['url'] is None or re.match(r'https://poedb\.tw/(cn|us)/',source['url']),f'Non-formal source: {source["url"]}'
records=data['records'];keys=[(r['kind'],r['internalId']) for r in records];assert len(set(keys))==len(keys),'Duplicate internal identity'
assert len({r['internalId'] for r in records})==len(records),'Duplicate internal ID'
required_mods={r['internalId'] for r in inventory}
actual_mods={r['internalId'] for r in records if r['kind'] in ['border','chart-implicit','reward']}
assert len(required_mods)==141 and actual_mods==required_mods,'Mod coverage denominator mismatch'
# The repository inventory itself must follow the live ID boundary.
source_ids=set(re.findall(r"\bid:\s*'((?:cm|adj|voy|b)-[^']+)'",(root/'src/data/mods.ts').read_text()))
assert source_ids==required_mods,'Repository inventory drift'
assert len([r for r in records if r['kind']=='border'])==64
assert len([r for r in records if r['kind']=='chart-implicit' and r['scope']=='adjacent'])==43
assert len([r for r in records if r['kind']=='chart-implicit' and r['scope']=='global'])==19
assert len([r for r in records if r['kind']=='reward'])==15
destinations={r['internalId'] for r in records if r['kind']=='destination'}
live_destinations=set(re.findall(r"\bid:\s*'([^']+)'",(root/'src/data/chartAreas.ts').read_text()))
assert len(destinations)==15 and destinations==live_destinations,'Destination coverage denominator mismatch'
assert {r['internalId'] for r in records if r['kind']=='shape'}=={'End','Straight','Corner','Junction','Crossing'}
assert set(coverage['investigatedModIds'])==actual_mods
for record in records:
    assert record['status'] in ['confirmed','source-only','missing','conflict','unmatched']
    assert record['mappingBasis'] in ['metadata','mod/stat-id','reviewed-semantics']
    assert record['sourceModId'] is None,'Do not fabricate native per-mod IDs from table ordinals'
    assert record['sources'],record['internalId']
    for ref in record['sources']:
        assert ref['sourceId'] in by_source,(record['internalId'],ref)
        assert ref['snapshotSha256']==by_source[ref['sourceId']]['snapshotSha256']
        assert ref['locator']
    if record['status']=='confirmed':
        assert record['clientSampleRefs'] and record['cnText']
        text=record.get('clientText') or record['cnText']
        assert text in (root/'samples/charted.zh-CN.txt').read_text(),record['internalId']
    if record['status']=='missing':assert record['attemptedSources'] and record['nextEvidence']
    if record['kind'] in ['chart-implicit','border']:
        for lang,key in [('cn','cnText'),('us','enText')]:
            raw=(lib/f'snapshots/maiden-voyage.{lang}.html').read_text()
            cleaned=html.unescape(re.sub('<[^>]*>','',re.sub(r'<br\s*/?>','\n',raw)))
            assert record[key] in cleaned,record['internalId']
assert len(load(lib/'observed-tables.cn.json'))==215 and len(load(lib/'observed-tables.us.json'))==215
print('141/141 mod IDs investigated; 15/15 destinations; 5/5 shape statuses; source digests valid; offline audit passed.')
