import type { Borders } from '../types'
import { localizedBorder } from '../data/borderLocale'
import { BORDER_AFFINITY_RULES, evaluateBorderAffinity } from '../logic/borderAffinity'
import './border-affinity.css'

const segmentLabel = (segment: number) => `${['上', '右', '下', '左'][Math.floor(segment / 3)]}${segment % 3 + 1}`

/** Display-only panel, deliberately accepts no board or planning mutations. */
export function BorderAffinity({ strategyId, borders }: { strategyId: string | null; borders: Borders }) {
  const evaluation = evaluateBorderAffinity(strategyId, borders)
  const entered = borders.slice(0, 12).filter(Boolean).length
  return (
    <section className="border-affinity" aria-label="边界适配分">
      <div className="border-affinity-heading">
        <strong role="status" aria-live="polite">{evaluation.total === null ? '边界适配分 · 待评估' : `边界适配分 ${evaluation.total}`}</strong>
        <span className="muted">仅看策略与十二条边界</span>
      </div>
      {evaluation.status === 'no-strategy' && <p>请选择策略后查看边界适配。</p>}
      {evaluation.status === 'incomplete' && <p>已录入 {entered}/12 条边界，尚不能完整评估。</p>}
      {evaluation.status === 'unsupported' && <p>当前策略或边界规则尚未覆盖，不能完整评估。</p>}
      {evaluation.requiredBorder && (
        <p className={evaluation.requiredBorder.present ? 'border-affinity-required' : 'border-affinity-required missing'}>
          {evaluation.requiredBorder.present ? '必要边界已具备：' : evaluation.status === 'incomplete' ? '已录入边界尚未见必要边界：' : '必要边界缺失：'}
          {localizedBorder(evaluation.requiredBorder.id)?.short ?? evaluation.requiredBorder.id}
        </p>
      )}
      <details>
        <summary>查看十二条贡献与依据</summary>
        <p className="muted">{BORDER_AFFINITY_RULES.basis} 规则版本：{evaluation.version}。</p>
        <ol className="border-affinity-entries">
          {evaluation.contributions.map((entry) => (
            <li key={entry.segment} className="border-affinity-entry">
              <div className="border-affinity-row">
                <span className="muted">{segmentLabel(entry.segment)}</span>
                <span>{entry.borderId ? localizedBorder(entry.borderId)?.short ?? entry.borderId : '尚未录入'}</span>
                <strong>{entry.weight === null ? '待评估' : `+${entry.weight}`}</strong>
              </div>
              <p>{entry.reason ?? (entry.borderId ? strategyId ? '此策略或边界尚无权重规则。' : '选择策略后查看贡献。' : '缺少输入，不计作零价值。')}</p>
              {entry.sourceIds.length > 0 && <div className="border-affinity-sources">依据：{entry.sourceIds.map((id) => {
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
