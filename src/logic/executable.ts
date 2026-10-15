import { checkConnectivity } from './connectivity'
import type { AppState } from './storage'
import type { SolverResult } from './solver'
import type { Board, ChartData } from '../types'

/** A candidate belongs to the action and inventory that actually produced it. */
export interface SolveResultContext {
  origin: 'strategy' | 'filler'
  eligibleUids: string[]
  locked: Board
  inputs: string
}

// Loading a candidate changes the board, not the solve inputs. Any change to
// inventory, protection, borders or settings requires solving again.
const solveInputs = (state: AppState) => JSON.stringify({ ...state, board: undefined, voyageHistory: undefined })

export function createSolveResultContext(
  state: AppState, eligiblePool: ChartData[], locked: Board, origin: SolveResultContext['origin'],
): SolveResultContext {
  return { origin, eligibleUids: eligiblePool.map((c) => c.uid),
    locked: locked.map((p) => p ? { ...p } : null), inputs: solveInputs(state) }
}

/** UI designation only; the original solver and scoring remain unchanged. */
export function isExecutableResult(result: SolverResult, state: AppState, context: SolveResultContext | null): boolean {
  if (!context || context.inputs !== solveInputs(state)) return false
  const board = result.board
  if (!result.valid || board.length !== 9 || board.some((p) => !p)) return false
  const uids = board.map((p) => p!.chartUid)
  if (new Set(uids).size !== 9) return false
  const locked = state.board.map((p) => p && state.pool.find((c) => c.uid === p.chartUid)?.preserved ? p : null)
  const violatesPins = (pins: Board) => pins.some((p, i) => p && (board[i]?.chartUid !== p.chartUid || board[i]?.rotation !== p.rotation))
  if (violatesPins(context.locked) || violatesPins(locked)) return false
  const eligible = new Set(context.eligibleUids)
  const charts = new Map(state.pool.filter((c) => eligible.has(c.uid)).map((chart) => [chart.uid, chart]))
  return uids.every((uid) => charts.has(uid)) && checkConnectivity(board, charts, state.mode).valid
}
