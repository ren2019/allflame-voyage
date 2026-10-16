import { useEffect, useMemo, useState } from 'react'
import type { AppState } from '../logic/storage'
import { voyagesNewestFirst } from '../logic/voyageHistory'
import { VoyageComparison } from './VoyageComparison'

/** History is auxiliary context. Stack it collapsed alongside strategies on narrow screens. */
export function VoyageHistoryPanels({ state, damagedHistory, storageFailed }: {
  state: AppState
  damagedHistory: boolean
  storageFailed: boolean
}) {
  const [expanded, setExpanded] = useState(() => matchMedia('(min-width: 1101px)').matches)
  useEffect(() => {
    const layout = matchMedia('(min-width: 1101px)')
    const syncLayout = () => setExpanded(layout.matches)
    layout.addEventListener('change', syncLayout)
    return () => layout.removeEventListener('change', syncLayout)
  }, [])
  const latestVoyage = useMemo(() => voyagesNewestFirst(state.voyageHistory)[0], [state.voyageHistory])
  return <>
    {damagedHistory && <div className="voyage-history voyage-history-warning" role="alert">已忽略损坏航程历史，库存与规划偏好已保留。</div>}
    {storageFailed && <div className="voyage-history voyage-history-warning" role="alert">本地存储写入失败，当前历史未持久化。请导出规划备份；本次核销结果保持有效。</div>}
    <VoyageComparison state={state} expanded={expanded} />
    <details className="voyage-history history-disclosure muted pad" aria-label="航程历史" open={expanded}>
      <summary><strong>航程历史</strong></summary>
      <div>已记录 {state.voyageHistory.length} 次
        {latestVoyage && <> · 最近完成分数 {latestVoyage.score.toFixed(1)}</>}
      </div>
      <div>仅记录功能启用后完成的有效九格摆盘，不代表游戏出发记录。</div>
    </details>
  </>
}
