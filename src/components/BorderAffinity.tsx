import type { Borders } from '../types'
import { localizedBorder } from '../data/borderLocale'
import { BORDER_AFFINITY_RULES, borderAffinityPriority, evaluateBorderAffinity } from '../logic/borderAffinity'
import './border-affinity.css'

const segmentLabel = (segment: number) => `${['上', '右', '下', '左'][Math.floor(segment / 3)]}${segment % 3 + 1}`

/** Display-only panel, deliberately accepts no board or planning mutations. */
export function BorderAffinity({ strategyId, borders }: { strategyId: string | null; borders: Borders }) {
  const evaluation = evaluateBorderAffinity(strategyId, borders)
  const entered = borders.slice(0, 12).filter(Boolean).length
  const priorities = evaluation.contributions.map(entry => borderAffinityPriority(entry.weight))
  const high = priorities.filter(priority => priority?.band === 'high').length
  const medium = priorities.filter(priority => priority?.band === 'medium').length
  return (
    <section className="border-affinity" aria-label="边界适配分">
      <div className="border-affinity-heading">
        <strong>边界</strong>
        <div className="border-affinity-legend" aria-label="边界相关度分档">
          <span data-affinity-band="low">可忽略</span>
          <span data-affinity-band="medium">适配</span>
          <span data-affinity-band="high">重点</span>
        </div>
      </div>
      {evaluation.status === 'no-strategy' && <p>先选策略</p>}
      {evaluation.status === 'incomplete' && <p>边界未填满（{entered}/12）</p>}
      {evaluation.status === 'unsupported' && <p>部分边界暂无规则</p>}
      {evaluation.requiredBorder && !evaluation.requiredBorder.present && (
        <p className="border-affinity-required missing">
          {evaluation.status === 'incomplete' ? '尚缺必要边界：' : '缺少必要边界：'}
          {localizedBorder(evaluation.requiredBorder.id)?.short ?? evaluation.requiredBorder.id}
        </p>
      )}
      <details>
        <summary>依据</summary>
        <p role="status" aria-live="polite">{evaluation.status !== 'complete' ? '待评估' : `重点 ${high} 条 · 适配 ${medium} 条`}</p>
        <p>0–2 可忽略；3–6 适配；7–10 重点。</p>
        {evaluation.requiredBorder?.present && <p className="border-affinity-required">必要边界已具备：{localizedBorder(evaluation.requiredBorder.id)?.short ?? evaluation.requiredBorder.id}</p>}
        {evaluation.total !== null && <p className="muted">权重合计 {evaluation.total}</p>}
        <p className="muted">{BORDER_AFFINITY_RULES.basis} 规则版本：{evaluation.version}。</p>
        <ol className="border-affinity-entries">
          {evaluation.contributions.map((entry) => (
            <li key={entry.segment} className="border-affinity-entry" data-affinity-band={priorities[entry.segment]?.band}>
              <div className="border-affinity-row">
                <span className="muted">{segmentLabel(entry.segment)}</span>
                <span>{entry.borderId ? localizedBorder(entry.borderId)?.short ?? entry.borderId : '尚未录入'}</span>
                <strong>{entry.weight === null ? '待评估' : `${entry.weight}/10 · ${priorities[entry.segment]?.label ?? '待评估'}`}</strong>
              </div>
              <p>{entry.reason ?? (entry.borderId ? strategyId ? '暂无规则' : '未选策略' : '未录入')}</p>
              {entry.sourceIds.length > 0 && <div className="border-affinity-sources">来源：{entry.sourceIds.map((id) => {
                const source = BORDER_AFFINITY_RULES.sources[id]
                return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : <span key={id}>来源未覆盖</span>
              })}</div>}
            </li>
          ))}
        </ol>
      </details>
    </section>
  )
}
