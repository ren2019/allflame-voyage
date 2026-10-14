#!/usr/bin/env python3
"""Replay reviewed formal-site snapshots. No network, translations or row joins."""
from pathlib import Path
import collections, hashlib, html, json, re
ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / 'samples/text-library'

def load(name): return json.loads((LIB / name).read_text())
def dump(name, value): (LIB / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def clean(s):
    return html.unescape(re.sub('<[^>]*>', '', re.sub(r'<br\s*/?>', '\n', s))).strip()
def section_rows(page, lang, section):
    s=(LIB / f'snapshots/{page}.{lang}.html').read_text()
    chunk=s.split(f'id="{section}"',1)[1].split('</table>',1)[0]
    return [[clean(c) for c in re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)] for row in re.findall(r'<tr[^>]*>(.*?)</tr>',chunk,re.S) if '<td' in row]
def all_rows(page,lang):
    s=(LIB/f'snapshots/{page}.{lang}.html').read_text()
    return [[clean(c) for c in re.findall(r'<td[^>]*>(.*?)</td>',row,re.S)] for row in re.findall(r'<tr[^>]*>(.*?)</tr>',s,re.S) if '<td' in row]
def ranges(text):
    return [[int(a),int(b or a)] for a,b in re.findall(r'(?<!\d)(\d+)(?:[—-](\d+))?', text)]
def page_ref(page,lang,locator):
    p=LIB/f'snapshots/{page.lower().replace("_","-")}.{lang}.html'
    return {'sourceId':p.stem,'url':f'https://poedb.tw/{lang}/{page}','locator':locator,'snapshotSha256':sha(p)}

def common(kind,id,cn,en,refs,status='source-only',scope=None):
    return dict(kind=kind,internalId=id,cnText=cn,enText=en,scope=scope,tier=None,numericRange=[],sourceMetadataId=None,sourceMetadataIds=[],sourceModId=None,sourceStatIds=[],sources=refs,retrievedAt='2026-10-14',sourceVersion='3.29 (visible league toolbar; exact patch unknown)',provenance='poedb-table',status=status,mappingBasis='reviewed-semantics',clientSampleRefs=[],notes=[])

manifest=[]
for p in sorted((LIB/'snapshots').glob('*.html')):
    page,lang=p.stem.rsplit('.',1)
    slug={'maiden-voyage':'Maiden_Voyage','comprehensive-charting':'Comprehensive_Charting','chart':'Chart','sandy-seabed-chart':'Sandy_Seabed_Chart','coral-forest-chart':'Coral_Forest_Chart','coral-reef-chart':'Coral_Reef_Chart'}[page]
    manifest.append(dict(sourceId=p.stem,url=f'https://poedb.tw/{lang}/{slug}',snapshotPath=str(p.relative_to(ROOT)),snapshotSha256=sha(p),retrievedAt='2026-10-14',sourceVersion='3.29 (visible league toolbar; exact patch unknown)',capture='complete-html-fallback-after-remio-loss',summary='Formal-site source; mod tables include hidden sections. No native per-mod IDs in HTML.'))
client=ROOT/'samples/charted.zh-CN.txt'
manifest.append(dict(sourceId='client.zh-CN',url=None,snapshotPath=str(client.relative_to(ROOT)),snapshotSha256=sha(client),retrievedAt='2026-10-14',sourceVersion='unknown',capture='client-verbatim',summary='Two user-provided mainland client advanced-copy charts.'))
dump('sources.json',manifest)
records=[]
review=load('mappings.reviewed.json')
for m in review:
    section=m['section']
    for lang in ['cn','us']:
        rows=section_rows('maiden-voyage',lang,section)
        text=m['cnLocatorText' if lang=='cn' else 'enLocatorText']
        candidates=[r for r in rows if r[2]==text and int(r[0])==m['requiredLevel']]
        assert len(candidates)==1,(m['internalId'],lang)
    r=common('border' if m['internalId'].startswith('b-') else 'chart-implicit',m['internalId'],m['cnText'],m['enText'],[page_ref('Maiden_Voyage',lang,section+' / exact description: '+m['cnLocatorText' if lang=='cn' else 'enLocatorText']) for lang in ['cn','us']],scope=m['repoScope'])
    r['numericRange']=ranges(m['cnText']);r['tier']={'requiredLevel':m['requiredLevel']};r['notes']=[m['reviewNote']];r['repositoryEnText']=m['repoEnText']
    if r['internalId'] in ['adj-crab-1','voy-pack-1']:
        r.update(status='confirmed',clientSampleRefs=['samples/charted.zh-CN.txt#sample-'+('1' if r['internalId']=='adj-crab-1' else '2')])
        r['clientText']='相邻区域包含 8(8-10) 个额外的螃蟹群 — 数值不可调整' if r['internalId']=='adj-crab-1' else '所有航行区域的怪物群规模提高 5%'
        assert r['clientText'] in client.read_text()
    if r['internalId']=='b-sulphdrop':
        r.update(status='conflict',conflictIds=['border-sulphur-wording']);r['notes'].append('Source-only border sentence uses 死者硫磺; real chart header uses 亡者硫磺. Border-client evidence needed.')
    records.append(r)

# Reward IDs are repository abstractions. Preserve independently searched source
# family lines, without manufacturing same-tier mappings where they do not exist.
reward_keys={'quant':('Quantity of Items found in adjacent Areas','相邻区域中找到的物品数量提高'),'sulph':("Dead Man's Sulphur found in adjacent Areas",'相邻区域中找到的亡者硫磺提高'),'rarity':('Rarity of Items found in adjacent Areas','相邻区域中找到的物品稀有度提高'),'pack':('Pack Size in adjacent Areas','相邻区域的怪物群规模提高'),'gold':('Gold found in adjacent Areas','相邻区域中找到的金币')}
for m in load('repository-inventory.json'):
    if not m['internalId'].startswith('cm-'):continue
    _,family,value=m['internalId'].split('-');value=int(value);enkey,cnkey=reward_keys[family];observations={}
    for lang,key in [('cn',cnkey),('us',enkey)]:
        observations[lang]=sorted(set(line for row in section_rows('maiden-voyage',lang,'MapDeepWaterChartMods') if row[1] in ['Prefix','Suffix','前缀','后缀'] for line in row[2].split('\n') if key in line))
    # Lines may include tags. They remain source-verbatim; no invented client alias.
    matching={lang:[line for line in lines if re.search(rf'(?<!\d){value}%',line)] for lang,lines in observations.items()}
    cn=matching['cn'][0] if matching['cn'] else None;en=matching['us'][0] if matching['us'] else None
    r=common('reward',m['internalId'],cn,en,[page_ref('Maiden_Voyage',lang,'MapDeepWaterChartMods / explicit rewards / '+key) for lang,key in [('cn',cnkey),('us',enkey)]],status='conflict' if observations['us'] else 'missing',scope='self')
    r.update(repositoryEnText=m['repoEnText'],numericRange=[[value,value]],sourceScope='adjacent',sourceObservations=observations,tier={'repositoryValue':value},conflictIds=['chart-explicit-scope']+([] if cn and en else ['chart-explicit-'+family+'-tiers']),attemptedSources=['Maiden_Voyage/cn','Maiden_Voyage/us','Sandy_Seabed_Chart/cn','Sandy_Seabed_Chart/us','Coral_Forest_Chart/cn','Coral_Reef_Chart/cn'],nextEvidence='Obtain target client explicit reward copy at this tier; reconcile version and charting phase before accepting template.')
    if m['internalId'] in ['cm-sulph-30','cm-sulph-45']:
        r['clientText']=f'此区域中找到的亡者硫磺提高 {value}%';assert r['clientText'] in client.read_text();r['clientSampleRefs']=['samples/charted.zh-CN.txt'];r['notes'].append('Client verifies self-area reward wording/value; table still conflicts on scope. Parser must use header total once.')
    records.append(r)

seed=json.loads((ROOT/'docs/research/poedb-text-inventory.json').read_text())
for d in seed['destinations']:
    if d['sourceMetadataId']:
        selected={}
        for lang in ['cn','us']:
            candidates=list({tuple(row) for row in all_rows('comprehensive-charting',lang) if len(row)==2 and d['sourceMetadataId'] in row[1].split('\n')})
            assert len(candidates)==1,(d['internalId'],lang);selected[lang]=candidates[0]
        assert selected['cn'][1]==selected['us'][1],d['internalId']
        refs=[page_ref('Comprehensive_Charting',lang,'destination table / room metadata '+d['sourceMetadataId']) for lang in ['cn','us']]
        cn,en=selected['cn'][0],selected['us'][0]
    else:
        cn,en=d['cnText'],d['enText'];refs=[page_ref('Maiden_Voyage',lang,'Roomss / '+name) for lang,name in [('cn',cn),('us',en)]]
        for lang,name in [('cn',cn),('us',en)]:assert name in clean((LIB/f'snapshots/maiden-voyage.{lang}.html').read_text())
    r=common('destination',d['internalId'],cn,en,refs)
    r.update(sourceMetadataId=d['sourceMetadataId'],sourceMetadataIds=selected['cn'][1].split('\n') if d['sourceMetadataId'] else [],mappingBasis='metadata' if d['sourceMetadataId'] else 'reviewed-semantics')
    if d['internalId'] in ['clam-infested-shelf','abyssal-plain']:r.update(status='confirmed',clientSampleRefs=['samples/charted.zh-CN.txt']);assert cn in client.read_text()
    if not d['sourceMetadataId']:r['notes'].append('No stable room metadata captured; names/base reviewed semantically, not by row number.')
    records.append(r)
for id,cn,page,metadata in [('sandy','金沙海床海图','Sandy_Seabed_Chart','ChartSandy'),('coral-forest','珊瑚密林海图','Coral_Forest_Chart','ChartCoralForest'),('coral-reef','珊瑚暗礁海图','Coral_Reef_Chart','ChartCoralReef')]:
    metadata='Metadata/Items/Deepwater/'+metadata
    for lang in ['cn','us']:assert metadata in (LIB/f'snapshots/{page.lower().replace("_","-")}.{lang}.html').read_text()
    r=common('base',id,cn,page.replace('_',' '),[page_ref(page,lang,'item / Type / '+metadata) for lang in ['cn','us']]);r.update(sourceMetadataId=metadata,sourceMetadataIds=[metadata],mappingBasis='metadata');records.append(r)
for shape in seed['shapes']:
    refs=[{'sourceId':'client.zh-CN','url':None,'locator':'海图形状：'+shape['cnText'],'snapshotSha256':sha(client)}] if shape['cnText'] else [page_ref('Sandy_Seabed_Chart',lang,'searched item and full mod table; no shape labels') for lang in ['cn','us']]
    r=common('shape',shape['internalId'],shape['cnText'],None,refs,status=shape['status']);r['provenance']='client-verbatim' if shape['cnText'] else 'poedb-table';r['sourceVersion']='unknown'
    if shape['cnText']:assert '海图形状：'+shape['cnText'] in client.read_text();r['clientSampleRefs']=['samples/charted.zh-CN.txt']
    else:r.update(attemptedSources=['Chart/cn','Maiden_Voyage/cn (full HTML)','Sandy_Seabed_Chart/cn (full HTML)','Comprehensive_Charting/cn','samples/charted.zh-CN.txt'],nextEvidence=f'Obtain real mainland client advanced-copy chart with {shape["internalId"]} shape; compare game connection directions. No translated alias until then.')
    records.append(r)
for field in seed['clientFields']:
    assert field['text'] in client.read_text()
    r=common('field',field['key'],field['text'],None,[{'sourceId':'client.zh-CN','url':None,'locator':'exact copied field: '+field['text'],'snapshotSha256':sha(client)}],status='confirmed');r.update(provenance='client-verbatim',sourceVersion='unknown',clientSampleRefs=['samples/charted.zh-CN.txt']);records.append(r)
# Unknown observed mechanism is kept outside the internal pool.
unmatched=[]
for lang in ['cn','us']:
    observed=[]
    for section in ['MapDeepWaterChartMods','DeepWaterBorderMods']:
        for row in section_rows('maiden-voyage',lang,section):
            observed.append({'section':section,'requiredLevel':int(row[0]),'affixType':row[1],'text':row[2]})
            if not row[2] or 'Toughness and Reward' in row[2]:
                unmatched.append(dict(kind='unmatched-mechanism',internalId=None,status='unmatched',lang=lang,sourceModId=None,sourceStatIds=[],text=row[2],sources=[page_ref('Maiden_Voyage',lang,section+' / '+('blank description' if not row[2] else row[2]))]))
    dump(f'observed-tables.{lang}.json',observed)
unmatched.append(dict(kind='base',internalId=None,status='unmatched',cnText='热泉裂口海图',enText='Thermal Vents Chart',sourceModId=None,sourceStatIds=[],sources=[page_ref('Chart',lang,'base list / Thermal Vents Chart') for lang in ['cn','us']],notes=['Fourth base outside original area types; no parser/strategy expansion.']))
# Room names outside the existing 15 destinations remain language-specific
# observations, since the differing /18 and /19 lists cannot be position-joined.
for lang in ['cn','us']:
    raw=(LIB/f'snapshots/maiden-voyage.{lang}.html').read_text()
    room_chunk=raw.split('id="Roomss"',1)[1].split('id="Upgrades"',1)[0]
    for text in re.findall(r'<div class="flex-grow-1 ms-2">(.*?)<div>',room_chunk):
        name=clean(text)
        known={r['cnText' if lang=='cn' else 'enText'] for r in records if r['kind']=='destination'}
        if name not in known:
            unmatched.append(dict(kind='destination',internalId=None,status='unmatched',lang=lang,text=name,sourceModId=None,sourceMetadataId=None,sourceStatIds=[],sources=[page_ref('Maiden_Voyage',lang,'Roomss / '+name)],notes=['Observed outside original destination pool; no bilingual row-order mapping.']))
for lang,text in [('cn','航行词缀将在完成测绘后揭示'),('us','Voyage Modifier will be revealed once Charted')]:
    raw=clean((LIB/f'snapshots/maiden-voyage.{lang}.html').read_text())
    if text in raw:
        unmatched.append(dict(kind='field-text',internalId=None,status='source-only',lang=lang,text=text,sourceModId=None,sourceStatIds=[],sources=[page_ref('Maiden_Voyage',lang,'MapDeepWaterChartMods / uncharted implicit')],notes=['Source text only; no real uncharted client copy acquired.']))
dump('conflicts.json',[{'internalId':r['internalId'],'status':r['status'],'conflictIds':r.get('conflictIds',[]),'repositoryScope':r['scope'],'sourceScope':r.get('sourceScope',r['scope']),'repositoryEnText':r.get('repositoryEnText'),'cnText':r['cnText'],'enText':r['enText'],'sourceObservations':r.get('sourceObservations',{}),'notes':r['notes'],'nextEvidence':r.get('nextEvidence','Obtain real mainland border-client text to distinguish translation context/version.')} for r in records if r['status'] in ['conflict','missing'] and r['kind'] in ['reward','border']])
dump('library.json',{'schemaVersion':1,'records':records,'unmatched':unmatched})
counts={kind:dict(collections.Counter(r['status'] for r in records if r['kind']==kind)) for kind in sorted(set(r['kind'] for r in records))}
dump('coverage.json',{'required':{'mods':141,'adjacent':43,'voyage':19,'border':64,'rewards':15,'destinations':15,'shapes':5,'fields':10},'statuses':counts,'investigatedModIds':[r['internalId'] for r in records if r['kind'] in ['chart-implicit','border','reward']],'unresolvedIds':[r['internalId'] for r in records if r['status'] in ['missing','conflict']],'clientCalibration':'Only two chart implicits, two destinations and two shapes. No real border-client corpus.','nativeModIds':'Unavailable in captured HTML; null for all. Explicit semantic alignment is retained.'})
print(json.dumps(counts,ensure_ascii=False))
