import { useMemo } from 'react'
import { planSession } from '../logic/sessionPlan'
import type { StrategyReservationPreferences } from '../data/strategies'
import type { Borders, ChartData } from '../types'

interface Props {
  pool: ChartData[]
  borders: Borders
  reservations: StrategyReservationPreferences
  pieceKeeps: Record<string, number>
  centerChoice: Record<string, string>
  onUseStrategy: (id: string) => void
  onClose: () => void
}

/** Overlay that sequences the whole library into a session of voyages. */
export function SessionPlanner({ pool, borders, reservations, pieceKeeps, centerChoice, onUseStrategy, onClose }: Props) {
  const plan = useMemo(
    () => planSession(pool, borders, reservations, pieceKeeps, centerChoice),
    [pool, borders, reservations, pieceKeeps, centerChoice],
  )
  const ready = plan.entries.filter((e) => e.status === 'ready')
  const waiting = plan.entries.filter((e) => e.status === 'waiting')
  let step = 0

  return (
    <div className="onboard-backdrop" onClick={onClose}>
      <div className="onboard session-plan" onClick={(e) => e.stopPropagation()}>
        <div className="panel-title">
          航程计划
          <span className="spacer" />
          <button onClick={onClose}>完成</button>
        </div>
        <p className="onboard-intro" style={{ marginBottom: 10 }}>
          按下列顺序使用库存；每次实际航程后点击完成航程核销。后续计划只使用前面航程剩余的海图。
        </p>
        {pool.length < 9 && (
          <div className="muted pad">库存不足九张，请先导入海图。</div>
        )}
        <div className="plan-list">
          {ready.map((e) => {
            step += e.runs
            return (
              <div key={e.strategyId} className="plan-row ready">
                <span className="plan-step">
                  {e.runs > 1 ? `${step - e.runs + 1}-${step}` : step}
                </span>
                <span className="plan-name">
                  {e.name}
                  {e.runs > 1 && <span className="plan-runs"> ×{e.runs}</span>}
                </span>
                <span className="plan-note muted">{e.note}</span>
                <span className="spacer" />
                <button
                  onClick={() => {
                    onUseStrategy(e.strategyId)
                    onClose()
                  }}
                  title="启用此策略并关闭计划"
                >
                  使用
                </button>
              </div>
            )
          })}
          {ready.length === 0 && pool.length >= 9 && (
            <div className="muted pad">
              当前没有可运行计划，请查看下方各策略缺少的材料。
            </div>
          )}
        </div>
        {waiting.length > 0 && (
          <>
            <div className="panel-title small">等待材料</div>
            <div className="plan-list">
              {waiting.map((e) => (
                <div key={e.strategyId} className="plan-row waiting">
                  <span className="plan-step">⏳</span>
                  <span className="plan-name">{e.name}</span>
                  <span className="plan-note muted">{e.note}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="muted small-note">
          已分配 {plan.allocated} 张海图 · 剩余 {plan.leftover} 张（保留材料及零散海图）。
          求解设置中的保护规则决定各策略可使用哪些海图。
        </div>
      </div>
    </div>
  )
}
