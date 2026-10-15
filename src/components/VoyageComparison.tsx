import { useMemo } from 'react'
import { compareVoyageHistory } from '../logic/voyageComparison'
import type { AppState } from '../logic/storage'
import './voyage-comparison.css'

const verdictText = {
  insufficient: '样本不足，积累至少 5 次可比航程后再给运行参考',
  low: '历史偏低，可考虑攒图',
  normal: '历史常规，按自己的节奏运行',
  high: '历史较好，可优先跑',
}

/** No setters: this panel cannot alter scores, solver settings or history. */
export function VoyageComparison({ state }: { state: AppState }) {
  const comparison = useMemo(() => compareVoyageHistory(state), [state])
  const proportion = (count: number) => comparison?.count
    ? `${Number((100 * count / comparison.count).toFixed(1))}%` : '—'
  return (
    <section className="voyage-comparison" aria-label="当前摆盘历史参考">
      <strong>当前摆盘历史参考</strong>
      {!comparison ? <p className="muted">{!state.strategyId
        ? '请选择策略后查看个人历史参考。'
        : '摆盘完整且连接有效后，再与已完成航程比较。'}</p> : <>
        <div className="voyage-comparison-summary">
          <span title={`未经舍入的当前评分：${comparison.score}`}>当前分数 {comparison.score.toFixed(1)}</span>
          <span>最近可比航程 {comparison.count} 次</span>
        </div>
        <p className={`voyage-comparison-verdict ${comparison.verdict}`} role="status">{verdictText[comparison.verdict]}</p>
        <div className="voyage-comparison-counts">
          <span>低于当前 {comparison.lower} 次（{proportion(comparison.lower)}）</span>
          <span>等分 {comparison.equal} 次（{proportion(comparison.equal)}）</span>
          <span>高于当前 {comparison.higher} 次（{proportion(comparison.higher)}）</span>
        </div>
        <details>
          <summary>比较口径与说明</summary>
          <p>同策略、同计分口径先筛选，再取最近 30 次已完成航程；当前待运行盘不计入样本。库存和边界可以不同。</p>
          <p>按未经舍入的评分比较：低于当前的样本计完整秩，等分计半秩；后 25% 为偏低、前 25% 为较好，25% 与 75% 边界及历史与当前全部同分归常规。上方次数是实际严格高低与等分的次数。</p>
          <p>仅作个人历史参考，不是攻略固定门槛或收益保证。</p>
        </details>
      </>}
    </section>
  )
}
