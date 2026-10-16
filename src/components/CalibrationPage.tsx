import { useEffect, useRef, useState } from 'react'
import {
  CALIBRATION_ROWS, CALIBRATION_KINDS, CALIBRATION_SCOPES, EVIDENCE_LABELS,
  calibrationRow, calibrationSample, searchCalibrationRows, type CalibrationRow,
} from '../data/calibrationCatalogue'
import { REVIEW_LABELS, blankCalibrationEdit, reviewedRecord, sameCalibrationEdit,
  loadCalibrationRecords, saveCalibrationRecords, calibrationBaseChanged,
  importCalibrationRecords, type CalibrationEdit, type CalibrationRecords } from '../logic/calibrationRecords'
import { CalibrationSubmission } from './CalibrationSubmission'
import './calibration.css'

function downloadCalibrationFile(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = name; link.click()
  URL.revokeObjectURL(url)
}

export function CalibrationPage() {
  const initial = new URLSearchParams(location.search)
  const requested = initial.get('entry')
  const originSlot = initial.get('slot')
  const slot = originSlot !== null && /^(?:[0-9]|1[01])$/.test(originSlot) ? Number(originSlot) : null
  const [query, setQuery] = useState(initial.get('q') ?? (calibrationRow(requested) ? requested! : ''))
  const [kind, setKind] = useState(initial.get('kind') || 'all')
  const [evidence, setEvidence] = useState(initial.get('evidence') || 'all')
  const [selected, setSelected] = useState(calibrationRow(requested)?.key ?? CALIBRATION_ROWS[0].key)
  const [loaded, setLoaded] = useState(loadCalibrationRecords)
  const [drafts, setDrafts] = useState<Record<string, CalibrationEdit>>({})
  const [message, setMessage] = useState('')
  const [submissionRecords, setSubmissionRecords] = useState<CalibrationRecords | null>(null)
  const [submissionBlocked, setSubmissionBlocked] = useState(false)
  const [reviewFilter, setReviewFilter] = useState(initial.get('review') || 'all')
  const editFor = (r: CalibrationRow): CalibrationEdit => drafts[r.key] ?? loaded.records[r.key] ?? blankCalibrationEdit(r)
  const dirtyKeys = Object.keys(drafts).filter(key => !sameCalibrationEdit(drafts[key], loaded.records[key] ?? blankCalibrationEdit(calibrationRow(key)!)))
  const matches = (q: string, k: string, e: string, review = reviewFilter) => {
    const base = new Set(searchCalibrationRows(q).map(r => r.key))
    const normalized = q.normalize('NFKC').toLowerCase().replace(/\s+/g, '')
    return CALIBRATION_ROWS.filter(r => (k === 'all' || r.kind === k) &&
      (e === 'all' || r.source.status === e) &&
      (review === 'all' || editFor(r).status === review) &&
      (base.has(r.key) || !!normalized && (editFor(r).suggestion + editFor(r).note).normalize('NFKC').toLowerCase().replace(/\s+/g, '').includes(normalized)))
  }
  const save = (keys: string[]) => {
    try {
      const updates = Object.fromEntries(keys.map(key => [key, reviewedRecord(calibrationRow(key)!, editFor(calibrationRow(key)!))]))
      const records = saveCalibrationRecords(updates)
      setLoaded({ records, error: '', raw: null })
      setDrafts(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => !keys.includes(key))))
      setMessage('已保存 ' + keys.length + ' 条校准记录，仅存当前浏览器，可预览并提交校准 Issue。')
      return records
    } catch (error) {
      const current = loadCalibrationRecords()
      if (current.error) setLoaded(current)
      setMessage('保存失败：' + (error instanceof Error ? error.message : '浏览器存储不可用。') + ' 草稿仍保留，请复制建议和备注备份；恢复存储后可重新保存。')
    }
  }
  const startSubmission = () => {
    const current = loadCalibrationRecords()
    setLoaded(current)
    if (current.error || !Object.keys(current.records).length) return
    if (dirtyKeys.length) { setSubmissionBlocked(true); return }
    setSubmissionBlocked(false)
    setSubmissionRecords(current.records)
  }
  const saveAndContinue = () => {
    const records = save(dirtyKeys)
    if (!records) return
    setSubmissionBlocked(false)
    submissionButton.current?.focus()
    setSubmissionRecords(records)
  }
  const submissionButton = useRef<HTMLButtonElement>(null)
  const continueButton = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (submissionBlocked) continueButton.current?.focus() }, [submissionBlocked])
  const importFile = async (file: File) => {
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('文件超过 5 MB。')
      const result = importCalibrationRecords(await file.text())
      setLoaded({ records: result.records, error: '', raw: null })
      setMessage(`已导入 ${result.imported} 条，保留 ${result.kept} 条较新记录；未保存草稿仍保留。`)
    } catch (error) { setMessage('导入失败：' + (error instanceof Error ? error.message : '无法读取文件。')) }
  }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirtyKeys.length) { event.preventDefault(); event.returnValue = '' } }
    const sync = (event: StorageEvent) => { if (event.key === 'allflame.calibration.v1') setLoaded(loadCalibrationRecords()) }
    window.addEventListener('beforeunload', warn); window.addEventListener('storage', sync)
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('storage', sync) }
  }, [dirtyKeys.length])
  const activeRow = useRef<HTMLTableRowElement>(null)
  const shown = matches(query, kind, evidence)
  const row = calibrationRow(selected)!
  const updateFilters = (q: string, k: string, e: string) => {
    setQuery(q); setKind(k); setEvidence(e)
    const next = matches(q, k, e)
    if (next.length && !next.some(r => r.key === selected)) setSelected(next[0].key)
  }
  useEffect(() => {
    document.title = '中文化校准 · 永火航程规划'
    const url = new URL(location.href)
    url.searchParams.set('view', 'calibration'); url.searchParams.set('entry', selected)
    url.searchParams.set('q', query)
    for (const [key, value] of Object.entries({ kind, evidence, review: reviewFilter })) {
      if (value !== 'all') url.searchParams.set(key, value); else url.searchParams.delete(key)
    }
    history.replaceState(null, '', url)
    activeRow.current?.scrollIntoView({ block: 'nearest' })
  }, [selected, query, kind, evidence, reviewFilter])
  return <div className="cal-page">
    <header className="cal-app-header"><h1>永火 <span className="accent">航程规划</span></h1><span>词缀 / 中文化校准</span><a href="./" target="_blank" rel="noopener noreferrer">打开航程规划 ↗</a></header>
    {submissionRecords && <CalibrationSubmission records={submissionRecords} onClose={() => setSubmissionRecords(null)} />}
    <div className="cal-content">
      <div className="cal-heading"><div><small>P0 · 游戏词库优先</small><h2>中文化校准</h2><p>搜索定位单条，保存校准记录，再预览并提交校准 Issue。</p></div><div className="cal-toolbar">
        <button ref={submissionButton} disabled={!Object.keys(loaded.records).length || !!loaded.error} onClick={startSubmission}>提交校准 Issue（{Object.keys(loaded.records).length}）</button>
        {!!dirtyKeys.length && <button disabled={!!loaded.error} onClick={() => save(dirtyKeys)}>保存全部草稿（{dirtyKeys.length}）</button>}
        <label className="cal-import">导入校准记录<input type="file" aria-label="导入校准记录" accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = '' }} /></label>
        <span>{Object.keys(loaded.records).length ? '提交前可选择已保存记录；规划显示与原词库保持独立。' : '尚无有效已保存记录，请先编辑建议或备注并保存本条。'}</span>
      </div></div>
      <p role="status" className="cal-save-status">{message || (dirtyKeys.length ? dirtyKeys.length + ' 条未保存修改' : Object.keys(loaded.records).length + ' 条已保存校准记录')}</p>
      {submissionBlocked && <div role="alert" className="cal-draft-gate"><p>{dirtyKeys.length} 条未保存草稿。请保存全部草稿后继续，预览将包含最新建议、备注和审阅结果。</p><div className="cal-draft-gate-actions"><button ref={continueButton} disabled={!!loaded.error} onClick={saveAndContinue}>保存全部草稿并继续</button><button onClick={() => { setSubmissionBlocked(false); document.getElementById('cal-note')?.focus() }}>返回编辑</button></div></div>}
      {loaded.error && <div role="alert" className="cal-warning">{loaded.error} 现有数据仍保留。{loaded.raw && <button onClick={() => downloadCalibrationFile(loaded.raw!, '校准原始数据备份.json')}>导出原始保存数据</button>}</div>}
      <div className="cal-metrics"><button onClick={() => { setReviewFilter('all'); updateFilters('', 'all', 'all') }}><b>{CALIBRATION_ROWS.length}</b>游戏词库</button>
        {['conflict', 'missing', 'source-only', 'confirmed'].map(status => <button key={status} onClick={() => updateFilters(query, kind, status)}><b>{CALIBRATION_ROWS.filter(r => r.source.status === status).length}</b>{EVIDENCE_LABELS[status]}</button>)}</div>
      {requested && !calibrationRow(requested) && <p role="alert">没有找到该条目标识，请用关键词搜索。</p>}
      <div className="cal-filters">
        <input aria-label="搜索词库" placeholder="搜索中文、英文、标识，或粘贴完整词缀…" value={query} onChange={event => updateFilters(event.target.value, kind, evidence)} />
        <select aria-label="词库类别" value={kind} onChange={event => updateFilters(query, event.target.value, evidence)}><option value="all">全部类别</option>{Object.entries(CALIBRATION_KINDS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        <select aria-label="证据状态" value={evidence} onChange={event => updateFilters(query, kind, event.target.value)}><option value="all">全部证据状态</option>{Object.entries(EVIDENCE_LABELS).filter(([s]) => CALIBRATION_ROWS.some(r => r.source.status === s)).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        <select aria-label="审阅结果" value={reviewFilter} onChange={event => setReviewFilter(event.target.value)}><option value="all">全部审阅结果</option>{Object.entries(REVIEW_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        <span>{shown.length} 条匹配</span><button onClick={() => { setReviewFilter('all'); updateFilters('', 'all', 'all') }}>显示全部</button>
      </div>
      <div className="cal-workbench">
        <div className="cal-table"><table><thead><tr><th>位置／用途</th><th>英文</th><th>当前中文</th><th>状态</th></tr></thead><tbody>{shown.map(r => <tr key={r.key} ref={r.key === selected ? activeRow : undefined} className={r.key === selected ? 'selected' : ''} tabIndex={0} aria-selected={r.key === selected} onClick={() => setSelected(r.key)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(r.key) } }}>
          <td><span className="cal-priority">{r.priority === 0 ? '优先 1' : r.priority === 1 ? '优先 2' : '抽查'}</span><strong>{CALIBRATION_KINDS[r.kind]}</strong><small>{r.place}</small></td><td lang="en">{r.english || '缺少英文对应'}</td><td>{r.chinese || '缺少中文'}</td><td><span className={'cal-badge ' + r.source.status}>{EVIDENCE_LABELS[r.source.status]}</span><small>{REVIEW_LABELS[editFor(r).status]}{dirtyKeys.includes(r.key) ? ' · 未保存' : loaded.records[r.key] ? ' · 已保存' : ''}</small></td>
        </tr>)}</tbody></table>{!shown.length && <p className="cal-empty">没有匹配条目。右侧保留当前编辑位置。</p>}</div>
        <aside className="cal-inspector"><h3>条目校准</h3><span className={'cal-badge ' + row.source.status}>{EVIDENCE_LABELS[row.source.status]}</span><span className="cal-meta">{CALIBRATION_KINDS[row.kind]} · {CALIBRATION_SCOPES[row.source.scope || ''] || '名称／字段'}</span>
          <div className="cal-position"><label>位置／用途</label><strong>{row.place}</strong>{slot !== null && <small>入口来自：边界位置 {slot + 1}</small>}<small>稳定标识：{row.key}</small></div>
          <div className="cal-comparison"><div><label>英文</label><p lang="en">{row.english || '缺少英文对应'}</p><small>{row.englishBasis}</small></div><div><label>当前中文</label><p>{row.chinese || '缺少中文'}</p>{row.short && row.short !== row.chinese && <small>界面简称：{row.short}</small>}</div></div>
          {loaded.records[row.key] && calibrationBaseChanged(row, loaded.records[row.key]) && <p className="cal-warning">原文或证据已有更新，请复核此前建议。</p>}
          <div className="cal-editor">
            <label htmlFor="cal-suggestion">建议中文</label><textarea id="cal-suggestion" value={editFor(row).suggestion} onChange={event => setDrafts(previous => ({ ...previous, [row.key]: { ...editFor(row), suggestion: event.target.value } }))} />
            <label htmlFor="cal-note">校准备注</label><textarea id="cal-note" placeholder="记录实际原文、差异和需要核对的内容…" value={editFor(row).note} onChange={event => setDrafts(previous => ({ ...previous, [row.key]: { ...editFor(row), note: event.target.value } }))} />
            <div className="cal-review-actions">{Object.entries(REVIEW_LABELS).map(([status, label]) => <button key={status} aria-pressed={editFor(row).status === status} className={editFor(row).status === status ? 'chosen' : ''} onClick={() => setDrafts(previous => ({ ...previous, [row.key]: { ...editFor(row), status: status as CalibrationEdit['status'] } }))}>{label}</button>)}</div>
            <div className="cal-save-actions"><button className="primary" disabled={!dirtyKeys.includes(row.key) || !!loaded.error} onClick={() => save([row.key])}>保存本条</button>
              <button disabled={!dirtyKeys.includes(row.key)} onClick={() => setDrafts(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== row.key)))}>撤销未保存修改</button></div>
            <small>{dirtyKeys.includes(row.key) ? '本条有未保存修改。切换条目会保留草稿。' : loaded.records[row.key] ? '已保存：' + new Date(loaded.records[row.key].updatedAt).toLocaleString() : '尚未保存本条记录。'}</small>
          </div>
          <CalibrationEvidence key={row.key} row={row} />
        </aside>
      </div>
    </div>
  </div>
}

function CalibrationEvidence({ row }: { row: CalibrationRow }) {
  const [open, setOpen] = useState(false)
  const candidates = [...new Set(row.source.sourceObservations?.cn || [])]
  return <div className="cal-evidence"><button aria-expanded={open} onClick={() => setOpen(!open)}>查看来源与原文</button>{open && <div>
    {row.source.status === 'conflict' && <p className="cal-warning">请核对版本、数值和作用范围。当前中文不是已解决冲突的客户端原文。</p>}
    <dl><dt>来源中文</dt><dd>{row.source.cnText || '没有唯一可采用的中文映射'}</dd><dt>来源英文</dt><dd>{row.source.enText || '尚未取得'}</dd><dt>原工具 / 来源作用范围</dt><dd>{CALIBRATION_SCOPES[row.source.scope || ''] || '—'} / {CALIBRATION_SCOPES[row.source.sourceScope || row.source.scope || ''] || '—'}</dd><dt>版本 / 采集日期</dt><dd>{row.source.sourceVersion} / {row.source.retrievedAt}</dd></dl>
    {!!candidates.length && <details><summary>{candidates.length} 条中文候选</summary><ul>{candidates.map(text => <li key={text}>{text}</li>)}</ul></details>}
    <ul>{row.source.sources.map((source, index) => <li key={index}>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.sourceId}</a> : source.sourceId}<small>{source.locator}</small></li>)}</ul>
    <p>真实客户端原文：{row.source.clientSampleRefs.length ? '' : '尚无对应样本'}</p>
    {row.source.clientSampleRefs.map(ref => <details key={ref}><summary>{ref}</summary><pre className="cal-sample">{calibrationSample(ref)}</pre></details>)}
    <p>来源证据与人工审阅分开记录，审阅通过不会改变来源状态。</p>
  </div>}</div>
}
