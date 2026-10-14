// Throwaway UI question: table, single-entry review or risk board for 175 game records?
// All variants share the existing root route: ?prototype=calibration&variant=A|B|C.
import { useEffect, useState } from 'react'
import library from '../../samples/text-library/library.json'
import clientOriginal from '../../samples/charted.zh-CN.txt?raw'
import clientExtra from '../../samples/charted-extra-shapes.zh-CN.txt?raw'
import { voyageModById, borderModById } from '../data/mods'
import { voyageModText, voyageModShort } from '../data/localization'
import { localizedBorder } from '../data/borderLocale'
import './Calibration.prototype.css'

type Entry = {
  kind: string; internalId: string; cnText: string | null; enText: string | null;
  repositoryEnText?: string; scope: string | null; sourceScope?: string; status: string;
  sources: { sourceId: string; url: string | null; locator: string }[];
  clientSampleRefs: string[]; numericRange: number[][]; notes: string[];
  sourceObservations?: { cn?: string[] };
}
type Review = { status: 'pending' | 'approved' | 'change'; suggestion: string; note: string }
type Row = Entry & { key: string; english: string; englishBasis: string; chinese: string; short: string; place: string }
const kinds: Record<string, string> = { border: '边界词缀', 'chart-implicit': '航行词缀', reward: '奖励词缀', destination: '目的地', base: '海图基底', shape: '连接形状', field: '复制字段' }
const evidence: Record<string, string> = { conflict: '来源冲突', missing: '资料缺失', 'source-only': '仅来源', confirmed: '客户端已校准', unmatched: '未匹配' }
const scopes: Record<string, string> = { self: '本区域', adjacent: '相邻区域', global: '全航程', border: '直接相邻边格' }
const variants = ['A', 'B', 'C'] as const
type Variant = typeof variants[number]
const names = { A: '对照工作台', B: '逐条审阅', C: '风险看板' }
const fields: Record<string, string> = {
  itemClass: 'Item Class: Chart', rarity: 'Rarity: Rare', areaLevel: 'Area Level:',
  itemLevel: 'Item Level:', quantity: 'Item Quantity:', sulphur: "Dead Man's Sulphur:",
  packsize: 'Pack Size:', implicitSection: '{ Implicit Modifier }',
  shape: 'Chart Shape:', itemRarity: 'Item Rarity:',
}
const positions: Record<string, string> = {
  border: '摆盘 → 十二边界 → 词缀选择器', 'chart-implicit': '海图库 → 海图详情／词缀浏览',
  reward: '海图详情 → 奖励／权重', destination: '海图库 → 目的地／策略材料',
  base: '导入文本 → 海图基底', shape: '海图库 → 连接图标／导入字段',
  field: '高级复制原文 → 导入识别',
}
const urgency = (r: Entry) => r.status === 'conflict' || r.status === 'missing' ? 0 : r.status === 'confirmed' ? 2 : 1
const kindOrder = ['border', 'chart-implicit', 'reward', 'destination', 'base', 'shape', 'field']
const rows: Row[] = (library.records as Entry[]).map(r => {
  const mod = r.kind === 'border' ? borderModById.get(r.internalId) : voyageModById.get(r.internalId)
  const english = r.repositoryEnText || mod?.text || r.enText || (r.kind === 'shape' ? r.internalId : fields[r.internalId]) || ''
  const englishBasis = r.repositoryEnText || mod ? '原工具词条' : r.enText ? '采集的英文来源' : r.kind === 'shape' ? '原工具形状名称' : fields[r.internalId] ? '原工具字段；未取得配对英文实采' : '缺少英文对应'
  const chinese = r.kind === 'reward' || r.kind === 'chart-implicit' ? voyageModText(r.internalId)
    : r.kind === 'border' ? localizedBorder(r.internalId)?.text || '' : r.cnText || ''
  const short = r.kind === 'border' ? localizedBorder(r.internalId)?.short || '' : ['reward', 'chart-implicit'].includes(r.kind) ? voyageModShort(r.internalId) : ''
  return { ...r, key: r.kind + ':' + r.internalId, english, englishBasis, chinese, short, place: positions[r.kind] }
}).sort((a, b) => urgency(a) - urgency(b) || kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) || a.internalId.localeCompare(b.internalId))
const reviewLabels = { pending: '待审阅', approved: '审阅通过', change: '需要修改' }
const blankReview = (r: Row): Review => ({ status: 'pending', suggestion: r.chinese, note: '' })

function Topline({ row }: { row: Row }) {
  return <div className="cp-meta"><span className={'cp-badge ' + row.status}>{evidence[row.status]}</span><span>{kinds[row.kind]}</span><span>{scopes[row.scope || ''] || '名称／字段'}</span></div>
}
function Comparison({ row }: { row: Row }) {
  return <div className="cp-comparison"><div><label>英文</label><p lang="en">{row.english || '缺少英文对应'}</p><small>{row.englishBasis}</small></div>
    <div><label>当前中文</label><p>{row.chinese || '缺少中文'}</p>{row.short && row.short !== row.chinese && <small>界面简称：{row.short}</small>}</div></div>
}
function Context({ row }: { row: Row }) {
  const lit = row.scope === 'global' ? [0,1,2,3,4,5,6,7,8] : row.scope === 'adjacent' ? [1,3,5,7] : row.scope === 'border' ? [0] : [4]
  const shapeEdges: Record<string, string[]> = { End: ['n'], Straight: ['n','s'], Corner: ['n','e'], Junction: ['n','e','s'], Crossing: ['n','e','s','w'] }
  return <div className="cp-context">
    {row.kind === 'shape' ? <div className="cp-shape">{(shapeEdges[row.internalId] || []).map(d => <i key={d} className={d}/>)}<b/></div>
      : ['border','chart-implicit','reward'].includes(row.kind) ? <div className="cp-grid">{Array.from({length:9},(_,i)=><i className={lit.includes(i) ? 'lit' : i === 4 ? 'origin' : ''} key={i}>{i + 1}</i>)}</div> : <span className="cp-context-symbol">{row.kind === 'field' ? '{ }' : '◈'}</span>}
    <div><label>位置／用途</label><strong>{row.place}</strong><small>{row.kind === 'shape' ? '原工具标准朝向，可旋转；连接示意' : ['border','chart-implicit','reward'].includes(row.kind) ? row.scope === 'border' ? '示例：左上边界；实际影响位置取决于所选槽位' : row.scope === 'adjacent' ? '示意采用四邻接，不含海图自身；实际范围取决于连接设置' : '九格从左到右、从上到下编号；展示原工具作用范围' : '在导入和界面显示中使用'}</small></div>
  </div>
}
function Evidence({ row }: { row: Row }) {
  const sampleText = (ref: string) => {
    const [path, marker] = ref.split('#')
    const corpus = path.includes('extra-shapes') ? clientExtra : clientOriginal
    const index = Number(marker?.replace('sample-', '')) - 1
    return corpus.split(/(?=^物品类别\s*[:：])/m).filter(t => t.trim())[index] || '未取得对应原文'
  }
  const observations = [...new Set(row.sourceObservations?.cn || [])]
  return <details className="cp-evidence"><summary>查看来源、候选原文与样本（{row.sources.length} 个来源）</summary>
    {row.status === 'conflict' && <p className="cp-warning">存在版本／语义差异，请比较数值和作用范围。当前中文是程序正在显示的文字，不代表冲突已解决。</p>}
    <dl><dt>稳定标识</dt><dd>{row.internalId}</dd><dt>来源中文</dt><dd>{row.cnText || '没有唯一可采用的中文映射'}</dd>
    <dt>来源英文</dt><dd>{row.enText || '未取得'}</dd><dt>原工具 / 来源作用范围</dt><dd>{scopes[row.scope || ''] || '—'} / {scopes[row.sourceScope || row.scope || ''] || '—'}</dd></dl>
    {observations.length > 0 && <details><summary>来源中的 {observations.length} 条中文候选</summary><ul>{observations.map(t=><li key={t}>{t}</li>)}</ul></details>}
    <ul>{row.sources.map((s,i)=><li key={i}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.sourceId}</a> : <strong>{s.sourceId}</strong>}<small>{s.locator}</small></li>)}</ul>
    <p>真实样本：{row.clientSampleRefs.length ? row.clientSampleRefs.length + ' 份，可展开核对' : '尚无对应真实客户端样本'}</p>
    {row.clientSampleRefs.map(ref=><details key={ref}><summary>{ref}</summary><pre className="cp-sample">{sampleText(ref)}</pre></details>)}
    <p>来源证据保持独立。点击“审阅通过”只记录你的判断。</p>
  </details>
}
function ReviewForm({ row, review, update, next }: { row: Row; review: Review; update: (r: Review)=>void; next: ()=>void }) {
  return <div className="cp-review"><label htmlFor="cp-suggestion">建议中文</label><textarea id="cp-suggestion" value={review.suggestion} onChange={e=>update({...review,suggestion:e.target.value})}/>
    <label htmlFor="cp-note">校准备注</label><textarea id="cp-note" className="cp-note" placeholder="例如：与游戏原文不同；这里应指相邻区域。" value={review.note} onChange={e=>update({...review,note:e.target.value})}/>
    <div className="cp-actions"><button className={review.status === 'approved' ? 'chosen' : ''} onClick={()=>update({...review,status:'approved'})}>✓ 审阅通过</button><button className={review.status === 'change' ? 'chosen warning' : 'warning'} onClick={()=>update({...review,status:'change'})}>需要修改</button><button onClick={()=>update({...review,status:'pending'})}>暂放待审</button><button className="cp-next" onClick={next}>下一条 →</button></div>
    <small>当前：{reviewLabels[review.status]}。建议暂存在本次页面，刷新会清空。</small>
  </div>
}

export default function CalibrationPrototype() {
  const initial = new URL(location.href).searchParams.get('variant') as Variant
  const [variant,setVariant] = useState<Variant>(variants.includes(initial) ? initial : 'A')
  const [query,setQuery] = useState('')
  const [kind,setKind] = useState('all')
  const [filter,setFilter] = useState('all')
  const [reviewFilter,setReviewFilter] = useState('all')
  const [selected,setSelected] = useState(rows[0].key)
  const [reviews,setReviews] = useState<Record<string, Review>>({})
  const getReview = (r: Row) => reviews[r.key] || blankReview(r)
  const shown = rows.filter(r => (kind === 'all' || kind === r.kind) && (filter === 'all' || filter === r.status)
    && (reviewFilter === 'all' || getReview(r).status === reviewFilter)
    && [r.english,r.chinese,r.internalId,r.place,kinds[r.kind]].join(' ').toLowerCase().includes(query.toLowerCase()))
  const active = shown.find(r=>r.key === selected) || shown[0]
  const reviewed = Object.values(reviews).filter(r=>r.status !== 'pending').length
  const next = () => { if (!active || !shown.length) return; setSelected(shown[(shown.findIndex(r=>r.key === active.key)+1)%shown.length].key) }
  const changeVariant = (v: Variant) => { const url = new URL(location.href); url.searchParams.set('variant',v); history.replaceState(null,'',url); setVariant(v); window.scrollTo(0,0) }
  const cycle = (n:number) => changeVariant(variants[(variants.indexOf(variant)+n+3)%3])
  useEffect(()=>{
    document.title = '中文化校准 · 界面原型'
    const key = (e:KeyboardEvent) => { const target=e.target as HTMLElement; if(target.closest('input,textarea,select,[contenteditable]'))return; if(e.key==='ArrowLeft'){e.preventDefault();cycle(-1)} if(e.key==='ArrowRight'){e.preventDefault();cycle(1)} }
    const pop = ()=> { const v=new URL(location.href).searchParams.get('variant') as Variant; setVariant(variants.includes(v) ? v : 'A') }
    window.addEventListener('keydown',key); window.addEventListener('popstate',pop)
    return ()=> {window.removeEventListener('keydown',key);window.removeEventListener('popstate',pop)}
  },[variant])
  const exportReviews = () => {
    const data = rows.filter(r=>reviews[r.key]).map(r=>({位置:r.place,类别:kinds[r.kind],标识:r.internalId,英文:r.english,当前中文:r.chinese,来源状态:evidence[r.status],审阅:reviews[r.key]}))
    const url=URL.createObjectURL(new Blob([JSON.stringify({prototype:true,variant,records:data},null,2)],{type:'application/json'}))
    const a=document.createElement('a'); a.href=url;a.download='中文化校准-原型建议.json';a.click();URL.revokeObjectURL(url)
  }
  const panel = active && <><Topline row={active}/><Context row={active}/><Comparison row={active}/><ReviewForm row={active} review={getReview(active)} update={r=>setReviews({...reviews,[active.key]:r})} next={next}/><Evidence row={active}/></>
  const filters = <div className="cp-filters"><input aria-label="搜索词库" placeholder="搜索英文、中文、位置或标识…" value={query} onChange={e=>setQuery(e.target.value)}/>
    <select aria-label="词库类别" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">全部类别 · 175</option>{Object.entries(kinds).map(([id,label])=><option key={id} value={id}>{label} · {rows.filter(r=>r.kind===id).length}</option>)}</select>
    <select aria-label="证据状态" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部证据状态</option>{Object.entries(evidence).filter(([id])=>rows.some(r=>r.status===id)).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
    <select aria-label="审阅结果" value={reviewFilter} onChange={e=>setReviewFilter(e.target.value)}><option value="all">全部审阅结果</option>{Object.entries(reviewLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><span>{shown.length} 条匹配</span></div>
  const choose = (key:string) => {setSelected(key); if(variant==='C')document.querySelector('.cp-board-detail')?.scrollIntoView({behavior:'smooth',block:'start'})}
  return <div className={'cp-root cp-variant-' + variant}>
    <header className="cp-app-header"><h1>永火 <span className="accent">航程规划</span></h1><span className="cp-breadcrumb">词缀 / 中文化校准</span><a href="https://192.168.1.8:8443">打开航程规划 ↗</a></header>
    <div className="cp-page">
      <div className="cp-heading"><div><div className="cp-eyebrow">P0 · 游戏词库优先</div><h2>中文化校准</h2><p>先处理冲突与缺失，再校准仅来源条目；已校准内容最后抽查。</p></div><div className="cp-heading-actions"><span className="cp-prototype">界面原型 · 刷新清空建议</span><button onClick={exportReviews}>导出本次建议</button></div></div>
      <div className="cp-metrics"><button onClick={()=>{setFilter('all');setReviewFilter('all')}}><strong>175</strong><span>游戏词库</span></button><button className="risk" onClick={()=>setFilter('conflict')}><strong>14</strong><span>冲突</span></button><button className="risk" onClick={()=>setFilter('missing')}><strong>2</strong><span>缺失</span></button><button onClick={()=>setFilter('source-only')}><strong>134</strong><span>仅来源</span></button><button onClick={()=>setFilter('confirmed')}><strong>25</strong><span>客户端已校准</span></button><div className="cp-progress"><strong>{reviewed} / 175</strong><span>本次已审阅</span><progress max={175} value={reviewed}/></div></div>
      {filters}
      {shown.length === 0 ? <div className="cp-empty">没有匹配条目。<button onClick={()=>{setQuery('');setKind('all');setFilter('all');setReviewFilter('all')}}>清除筛选</button></div> : <>
      {variant === 'A' && <VariantA rows={shown} active={active!} reviews={reviews} choose={choose} panel={panel}/>}
      {variant === 'B' && <VariantB rows={shown} active={active!} reviews={reviews} choose={choose} panel={panel}/>}
      {variant === 'C' && <VariantC rows={shown} active={active!} reviews={reviews} choose={choose} panel={panel}/>}
      </>}
      <details className="cp-state"><summary>当前原型状态 · {names[variant]} · {Object.keys(reviews).length} 条编辑记录</summary><pre>{JSON.stringify({variant,query,kind,evidenceFilter:filter,reviewFilter,visibleCount:shown.length,selectedKey:selected,displayedKey:active?.key,reviews},null,2)}</pre></details>
    </div>
    {import.meta.env.DEV && <nav className="cp-switcher" aria-label="切换原型方案"><button aria-label="上一个方案" onClick={()=>cycle(-1)}>←</button><span>方案 {variant} · {names[variant]}</span><button aria-label="下一个方案" onClick={()=>cycle(1)}>→</button>{variants.map(v=><button key={v} aria-pressed={variant===v} className={variant===v?'current':''} onClick={()=>changeVariant(v)}>{v}</button>)}<small>← → 切换</small></nav>}
  </div>
}

type LayoutProps = { rows: Row[]; active: Row; reviews: Record<string, Review>; choose:(key:string)=>void; panel:React.ReactNode }
export function VariantA({rows,active,reviews,choose,panel}:LayoutProps) {
  return <div className="cp-workbench"><div className="cp-table-wrap"><table><thead><tr><th>位置／用途</th><th>英文</th><th>当前中文</th><th>状态</th></tr></thead><tbody>{rows.map(r=><tr key={r.key} className={active.key===r.key?'selected':''} onClick={()=>choose(r.key)}><td><span className="cp-priority">{urgency(r)===0?'优先 1':urgency(r)===1?'优先 2':'抽查'}</span><strong>{kinds[r.kind]}</strong><small>{r.place}</small></td><td lang="en">{r.english || '缺少英文'}</td><td>{r.chinese || '缺少中文'}</td><td><span className={'cp-badge ' + r.status}>{evidence[r.status]}</span><small>{reviewLabels[reviews[r.key]?.status || 'pending']}</small></td></tr>)}</tbody></table></div><aside className="cp-inspector"><h3>条目校准</h3>{panel}</aside></div>
}
export function VariantB({rows,active,reviews,choose,panel}:LayoutProps) {
  return <div className="cp-reading"><aside className="cp-queue"><h3>审阅队列 <small>{rows.length} 条</small></h3>{rows.map((r,i)=><button className={active.key===r.key?'selected':''} key={r.key} onClick={()=>choose(r.key)}><span className="cp-queue-number">{String(i+1).padStart(2,'0')}</span><span><strong>{r.chinese || r.english}</strong><small>{kinds[r.kind]} · {evidence[r.status]}</small></span><i>{reviews[r.key]?.status==='approved'?'✓':reviews[r.key]?.status==='change'?'!':'·'}</i></button>)}</aside><article className="cp-reading-sheet"><div className="cp-reading-title"><span>逐条核对 · {rows.findIndex(r=>r.key===active.key)+1} / {rows.length}</span><h3>{kinds[active.kind]}</h3></div>{panel}</article></div>
}
export function VariantC({rows,active,reviews,choose,panel}:LayoutProps) {
  const lanes=[{name:'先解决差异',hint:'冲突与缺失',rank:0},{name:'补真实证据',hint:'仅来源，等待客户端核对',rank:1},{name:'一致性抽查',hint:'已取得真实客户端原文',rank:2}]
  return <div><div className="cp-risk-board">{lanes.map(lane=><section key={lane.rank} className={'cp-lane lane-'+lane.rank}><div className="cp-lane-title"><div><h3>{lane.name}</h3><small>{lane.hint}</small></div><b>{rows.filter(r=>urgency(r)===lane.rank).length}</b></div><div className="cp-lane-items">{rows.filter(r=>urgency(r)===lane.rank).map(r=><button className={'cp-risk-card '+(active.key===r.key?'selected':'')} key={r.key} onClick={()=>choose(r.key)}><Topline row={r}/><span className="cp-card-location">{r.place}</span><strong>{r.chinese || '缺少中文'}</strong><p lang="en">{r.english}</p><small>{reviewLabels[reviews[r.key]?.status || 'pending']} · 展开校准 ↗</small></button>)}</div></section>)}</div><section className="cp-board-detail"><h3>当前条目 · {kinds[active.kind]}</h3><div className="cp-board-detail-body">{panel}</div></section></div>
}
