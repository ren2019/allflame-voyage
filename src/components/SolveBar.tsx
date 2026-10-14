import { useState } from 'react'
import { solve, type SolverResult } from '../logic/solver'
import type { AppState } from '../logic/storage'
import { applyCenterChoice, type StrategyDef } from '../data/strategies'
import { selectStrategySolvePool } from '../logic/solverPoolSelection'
import { createSolveResultContext, isExecutableResult, type SolveResultContext } from '../logic/executable'

interface Props {
  state: AppState
  /** curated strategy currently overriding weights, or null for manual */
  activeStrategy: StrategyDef | null
  results: SolverResult[]
  resultContext: SolveResultContext | null
  /** which result is currently loaded on the board, or null */
  appliedIdx: number | null
  onResults: (r: SolverResult[], context: SolveResultContext | null) => void
  onApply: (r: SolverResult, idx: number) => void
  /** open the multi-voyage session planner */
  onOpenPlanner: () => void
  /** open the Solver Settings popup */
  onOpenSettings: () => void
}

/** The front-and-centre solve control: sits under the board, above
 *  "Copy into game", so solve → pick a result → copy is one straight line. */
export function SolveBar({ state, activeStrategy, results, resultContext, appliedIdx, onResults, onApply, onOpenPlanner, onOpenSettings }: Props) {
  const [busy, setBusy] = useState(false)
  const [solveNote, setSolveNote] = useState('')
  const weights = activeStrategy ? activeStrategy.weights : state.weights

  const run = () => {
    setBusy(true)
    setSolveNote('')
    // let the UI paint the busy state before the (synchronous) solve
    window.setTimeout(() => {
      try {
        // locked charts sitting on the board are pinned to their exact cell -
        // the solver arranges everything else around them (issue #9)
        const locked = state.board.map((placement) => {
          if (!placement) return null
          const chart = state.pool.find((c) => c.uid === placement.chartUid)
          return chart?.preserved ? { ...placement } : null
        })
        const lockedUids = new Set(locked.filter(Boolean).map((p) => p!.chartUid))
        // the user's centre-piece pick reshapes rules + readiness (issue #49)
        const effectiveStrategy = activeStrategy
          ? applyCenterChoice(activeStrategy, state.centerChoice[activeStrategy.id])
          : null
        const { solvePool, heldBack, heldBackFor } = selectStrategySolvePool(
          state.pool,
          effectiveStrategy,
          state.strategyReservations,
          lockedUids,
          state.pieceKeeps,
        )
        // a strategy with selectable layouts uses the user's pick (or its first)
        const layoutVariant =
          effectiveStrategy?.layouts?.find(
            (v) => v.id === state.layoutChoice[effectiveStrategy.id],
          ) ?? effectiveStrategy?.layouts?.[0]
        const res = solve(solvePool, state.borders, weights, {
          mode: state.mode,
          allowRotation: state.allowRotation,
          adjacencyMode: state.adjacencyMode,
          adjacentAffectsSelf: state.adjacentAffectsSelf,
          disabledMods: new Set(state.disabledMods),
          topK: 5,
          strategyRules: effectiveStrategy?.rules,
          strategyLayout: layoutVariant?.layout ?? effectiveStrategy?.layout,
          strategyLayoutPenalty: effectiveStrategy?.layoutPenalty,
          locked,
        })
        const context = createSolveResultContext(state, solvePool, locked, 'strategy')
        onResults(res, context)
        // loading the best result right away saves the extra click - the
        // alternatives stay one click away in the strip below
        if (res.length > 0) onApply(res[0], 0)
        const notes: string[] = []
        const lockedCount = locked.filter(Boolean).length
        if (lockedCount > 0)
          notes.push(`已固定 ${lockedCount} 张锁定海图的位置和朝向。`)
        if (heldBack > 0)
          notes.push(
            `为 ${heldBackFor.join('、')} 保留了 ${heldBack} 张海图。可在库存的 🔖 保留向导中调整数量。`,
          )
        if (solvePool.length < 9)
          notes.push(`仅有 ${solvePool.length} 张可用海图，无法填满九格。`)
        else if (res.length && !isExecutableResult(res[0], state, context))
          notes.push('这些海图无法组成可执行摆盘，当前显示最佳参考方案。')
        setSolveNote(notes.join(' '))
      } finally {
        setBusy(false)
      }
    }, 30)
  }

  return (
    <div className="solve-bar">
      <div className="solve-row">
        <button className="solve-big" onClick={run} disabled={busy || state.pool.length === 0}>
          {busy ? (
            '正在求解…'
          ) : (
            <>
              求解
              <span className="solve-big-sub">
                从 {state.pool.length} 张海图中规划最佳摆盘
                {activeStrategy ? ` · ${activeStrategy.name}` : ''}
              </span>
            </>
          )}
        </button>
        <button
          className="solve-settings-btn"
          onClick={onOpenPlanner}
          title="将全部库存安排为连续多次航程"
        >
          📋<span className="solve-settings-label">连续规划</span>
        </button>
        <button
          className="solve-settings-btn"
          onClick={onOpenSettings}
          title="连接规则、奖励权重、海图保护、备用海图航程与优选海图搜索"
        >
          ⚙<span className="solve-settings-label">设置</span>
        </button>
      </div>
      {solveNote && <div className="muted small-note solve-bar-note">{solveNote}</div>}
      {results.length > 0 && (
        <>
          <div className="solve-results">
            {results.map((r, i) => {
              const executable = isExecutableResult(r, state, resultContext)
              return (
              <button
                key={i}
                className={`solve-result ${appliedIdx === i ? 'applied' : ''} ${executable ? '' : 'invalid'}`}
                onClick={() => onApply(r, i)}
                title={
                  executable
                    ? '将此可执行方案载入摆盘'
                    : '不可执行：格子、库存或连接条件不满足，仅供参考'
                }
              >
                <span className="sr-rank">#{i + 1}</span>
                <span className="sr-pts">{r.reward.toFixed(1)}</span>
                <span className="sr-pts-label">分</span>
                {appliedIdx === i ? (
                  <span className={`sr-badge on-board ${executable ? 'ok' : 'bad'}`}>已载入 · {executable ? '可执行' : '不可执行'}</span>
                ) : executable ? (
                  <span className="sr-badge ok">✓ 可执行</span>
                ) : (
                  <span className="sr-badge bad">✗ 不可执行</span>
                )}
              </button>
              )
            })}
          </div>
          <div className="muted small-note solve-bar-note">
            按所选权重排序。点击候选载入摆盘，再使用下方“复制到游戏”。
          </div>
        </>
      )}
    </div>
  )
}
