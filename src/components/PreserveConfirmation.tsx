import { useEffect, useRef, useState } from 'react'
import { chartShapeLabel, voyageModText } from '../data/localization'
import { buildSingleChartSearch } from '../logic/regex'
import type { PreserveCandidate } from '../logic/voyageCompletion'
import './preserve-confirmation.css'

export function PreserveConfirmation({ candidate: { cell, chart }, step, total, onDecide, onCancel }: {
  candidate: PreserveCandidate
  step: number
  total: number
  onDecide: (survived: boolean) => void
  onCancel: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'failure'>('idle')
  const [showText, setShowText] = useState(false)
  const active = useRef(true)
  const panel = useRef<HTMLElement>(null)
  const fullText = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => {
    const element = panel.current
    if (!element) return
    let frame = 0
    // Fallback text, copy feedback and user textarea resizing can all change
    // height without changing the parent's current step.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => element.scrollIntoView({ block: 'nearest' }))
    })
    observer.observe(element)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [])
  const text = buildSingleChartSearch(chart)
  const feedback = status === 'pending' ? '正在复制…'
    : status === 'success' ? '已复制定位文本；请在游戏中核对后确认结果。'
      : status === 'failure' ? '复制失败，请选择全文后手动复制。' : ''
  const copy = async () => {
    setStatus('pending')
    try {
      await navigator.clipboard.writeText(text)
      if (active.current) setStatus('success')
    } catch {
      if (active.current) { setStatus('failure'); setShowText(true) }
    }
  }
  const row = ['上', '中', '下'][Math.floor(cell / 3)]
  const col = ['左', '中', '右'][cell % 3]
  return <section ref={panel} className="preserve-confirm voyage-check" aria-label="航程保留核查">
    <div className="pc-head">确认保留海图 {step}/{total} · {row}{col}格（对应格已高亮）</div>
    <div className="pc-name">{chart.name}</div>
    <div className="pc-sub">区域等级 {chart.level}{chart.shape ? ` · ${chartShapeLabel(chart.shape)}` : ''}
      {' · '}{chart.implicitText ?? chart.modIds.map(voyageModText).join('；')}</div>
    <div className="pc-actions">
      <button onClick={copy} disabled={status === 'pending'}>复制定位文本</button>
      <button onClick={() => setShowText(!showText)} aria-expanded={showText}>查看定位全文</button>
    </div>
    <div role="status" className="pc-copy-status">{feedback}</div>
    {showText && <div className="pc-full-text">
      <textarea ref={fullText} aria-label="完整定位文本" value={text} readOnly rows={3} onFocus={(event) => event.target.select()} />
      <button onClick={() => { fullText.current?.focus(); fullText.current?.select() }}>选择全文</button>
    </div>}
    <p className="pc-instruction">搜索可能命中多张相同海图，请核对实物及数量，再确认这张是否保留。复制不会进入下一张。</p>
    <div className="pc-actions">
      <button className="pc-kept" onClick={() => onDecide(true)}>已保留</button>
      <button className="pc-lost" onClick={() => onDecide(false)}>已消耗</button>
      <button onClick={onCancel}>取消核销</button>
    </div>
  </section>
}
