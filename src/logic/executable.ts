import { applyCenterChoice, type StrategyDef } from '../data/strategies'
import { checkConnectivity } from './connectivity'
import { selectStrategySolvePool } from './solverPoolSelection'
import type { AppState } from './storage'
import type { SolverResult } from './solver'

/** UI designation only; the original solver and scoring remain unchanged. */
export function isExecutableResult(result: SolverResult, state: AppState, strategy: StrategyDef | null): boolean {
  const board = result.board
  if (!result.valid || board.length !== 9 || board.some((p) => !p)) return false
  const uids = board.map((p) => p!.chartUid)
  if (new Set(uids).size !== 9) return false
  const locked = state.board.map((p) => p && state.pool.find((c) => c.uid === p.chartUid)?.preserved ? p : null)
  if (locked.some((p, i) => p && (board[i]?.chartUid !== p.chartUid || board[i]?.rotation !== p.rotation))) return false
  const effective = strategy ? applyCenterChoice(strategy, state.centerChoice[strategy.id]) : null
  const { solvePool } = selectStrategySolvePool(state.pool, effective, state.strategyReservations,
    new Set(locked.filter(Boolean).map((p) => p!.chartUid)), state.pieceKeeps)
  const charts = new Map(solvePool.map((chart) => [chart.uid, chart]))
  return uids.every((uid) => charts.has(uid)) && checkConnectivity(board, charts, state.mode).valid
}
