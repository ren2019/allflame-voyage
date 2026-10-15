import { useEffect, useRef, useState } from 'react'
import type { Borders } from '../types'
import { localizedBorder } from '../data/borderLocale'
import { strategyById } from '../data/strategies'
import { BORDER_AFFINITY_RULES, borderAffinityPriority, evaluateBorderAffinity } from '../logic/borderAffinity'
import './border-affinity.css'

const segmentLabel = (segment: number) => `${['上', '右', '下', '左'][Math.floor(segment / 3)]}${segment % 3 + 1}`
type Evaluation = ReturnType<typeof evaluateBorderAffinity>

function BorderAnalysis({ evaluation, strategyId, onClose }: {
  evaluation: Evaluation
  strategyId: string | null
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => {
      dialog?.close()
      opener.current?.focus()
    }
  }, [])
  // Sort a display copy only; zero is known, unlike a missing or invalid rule.
  const entries = [...evaluation.contributions].sort((a, b) => {
    const aKnown = borderAffinityPriority(a.weight) !== null
    const bKnown = borderAffinityPriority(b.weight) !== null
    if (aKnown !== bKnown) return aKnown ? -1 : 1
    return (aKnown ? b.weight! - a.weight! : 0) || a.segment - b.segment
  })
  return (
    <dialog ref={ref} className="border-analysis" aria-label="边界分析" onCancel={event => { event.preventDefault(); onClose() }}>
      <div className="border-analysis-heading">
        <h2>边界分析</h2>
        <button type="button" autoFocus aria-label="关闭边界分析" onClick={onClose}>×</button>
      </div>
      <p>当前策略：{strategyId ? strategyById.get(strategyId)?.name ?? strategyId : '未选策略'}</p>
      <p className="muted">0–2 可忽略；3–6 适配；7–10 重点。按权重从高到低排列，同分按边界位置排列；未评估项在后。</p>
      {evaluation.requiredBorder?.present && <p className="border-affinity-required">必要边界已具备：{localizedBorder(evaluation.requiredBorder.id)?.short ?? evaluation.requiredBorder.id}</p>}
      {evaluation.total !== null && <p className="muted">权重合计 {evaluation.total}</p>}
      <p className="muted">{BORDER_AFFINITY_RULES.basis} 规则版本：{evaluation.version}。</p>
      <ol className="border-affinity-entries">
        {entries.map(entry => {
          const priority = borderAffinityPriority(entry.weight)
          return (
            <li key={entry.segment} className="border-affinity-entry" data-affinity-band={priority?.band}>
              <div className="border-affinity-row">
                <span className="border-affinity-position muted">{segmentLabel(entry.segment)}</span>
                <span>{entry.borderId ? localizedBorder(entry.borderId)?.text ?? entry.borderId : '尚未录入'}</span>
                <strong>{priority ? `${entry.weight}/10 · ${priority.label}` : '待评估'}</strong>
              </div>
              <p>{priority ? entry.reason : entry.borderId ? strategyId ? '暂无规则' : '未选策略' : '未录入'}</p>
              <div className="border-affinity-sources">来源：{entry.sourceIds.length === 0 ? '暂无规则来源' : entry.sourceIds.map(id => {
                const source = BORDER_AFFINITY_RULES.sources[id]
                return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : <span key={id}>来源未覆盖</span>
              })}</div>
            </li>
          )
        })}
      </ol>
    </dialog>
  )
}

/** Board-local, read-only legend and analysis. Accepts no planning mutations. */
export function BorderAffinity({ strategyId, borders }: { strategyId: string | null; borders: Borders }) {
  const [open, setOpen] = useState(false)
  const evaluation = evaluateBorderAffinity(strategyId, borders)
  const entered = borders.slice(0, 12).filter(Boolean).length
  const unknown = strategyId && evaluation.contributions.some(entry => entry.borderId && !borderAffinityPriority(entry.weight))
  return (
    <div className="border-affinity" role="region" aria-label="边界适配分">
      <div className="border-affinity-heading">
        <div className="border-affinity-legend" aria-label="边界相关度分档">
          <span className="muted">边界</span>
          <span data-affinity-band="low">可忽略</span>
          <span data-affinity-band="medium">适配</span>
          <span data-affinity-band="high">重点</span>
        </div>
        <button type="button" onClick={() => setOpen(true)}>边界分析</button>
      </div>
      {evaluation.status === 'no-strategy' && <p>先选策略</p>}
      {entered < 12 && <p>边界未填满（{entered}/12）</p>}
      {(unknown || (strategyId && !BORDER_AFFINITY_RULES.strategies[strategyId])) && <p>部分边界暂无规则</p>}
      {evaluation.requiredBorder && !evaluation.requiredBorder.present && (
        <p className="border-affinity-required missing">
          {entered < 12 ? '尚缺必要边界：' : '缺少必要边界：'}
          {localizedBorder(evaluation.requiredBorder.id)?.short ?? evaluation.requiredBorder.id}
        </p>
      )}
      {open && <BorderAnalysis evaluation={evaluation} strategyId={strategyId} onClose={() => setOpen(false)} />}
    </div>
  )
}
