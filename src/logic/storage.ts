import { restoreVoyageHistory, type VoyageRecord } from './voyageHistory'
import type { AdjacencyMode } from './scoring'
import type { Board, Borders, ChartData, ConnectivityMode, Weights } from '../types'
import { emptyBoard, emptyBorders } from '../types'
import { DEFAULT_WEIGHTS } from './rewards'
import {
  defaultStrategyReservations,
  type StrategyReservationPreferences,
} from '../data/strategies'

export interface AppState {
  voyageHistory: VoyageRecord[]
  pool: ChartData[]
  board: Board
  borders: Borders
  weights: Weights
  mode: ConnectivityMode
  allowRotation: boolean
  adjacencyMode: AdjacencyMode
  adjacentAffectsSelf: boolean
  /** mod ids the user has switched off; they contribute nothing to any scoring */
  disabledMods: string[]
  /** active curated strategy id (overrides weights + shapes the solver) or null */
  strategyId: string | null
  /** keeper categories excluded from low-investment strategy solve pools */
  strategyReservations: StrategyReservationPreferences
  /** per-piece-type keep counts ("bank 2 Starfish for Meatfish"); keys from
   *  PIECE_TYPES, missing entries use each type's recommended default */
  pieceKeeps: Record<string, number>
  /** chosen layout variant per strategy id (missing = the strategy's default) */
  layoutChoice: Record<string, string>
  /** chosen centre-piece family per strategy id (missing = best available) */
  centerChoice: Record<string, string>
}

export const defaultState = (): AppState => ({
  voyageHistory: [],
  pool: [],
  board: emptyBoard(),
  borders: emptyBorders(),
  weights: { ...DEFAULT_WEIGHTS },
  mode: 'strict', // confirmed rule: adjacent connectors must match, all 9 filled
  allowRotation: true, // rotation confirmed in game
  adjacencyMode: 'physical',
  adjacentAffectsSelf: false,
  disabledMods: [],
  strategyId: null,
  strategyReservations: defaultStrategyReservations(),
  pieceKeeps: {},
  layoutChoice: {},
  centerChoice: {},
})

const LS_KEY = 'allflame-voyage-solver'
/** bump only when chart/board data (mod ids) changes incompatibly */
const STATE_VERSION = 4 // v4: parsed canonical Chart destination/area types

export function saveLocal(state: AppState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...state, v: STATE_VERSION }))
    return true
  } catch {
    return false
  }
}

export function loadLocal(): AppState | null {
  return loadLocalWithStatus().state
}

export function loadLocalWithStatus(): { state: AppState | null; damagedHistory: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { state: null, damagedHistory: false }
    const parsed = JSON.parse(raw)
    const revived = restorePlanningState(parsed)
    const damagedHistory = restoreVoyageHistory(parsed?.voyageHistory).damaged
    if (parsed?.v !== STATE_VERSION) {
      // mod data model changed: keep the user's preferences (weights, disabled
      // mods, settings) but reset the transient board that references mod ids.
      return { state: { ...revived, pool: [], board: emptyBoard(), borders: emptyBorders() }, damagedHistory }
    }
    return { state: revived, damagedHistory }
  } catch {
    return { state: null, damagedHistory: false }
  }
}

/** Share state via URL hash (base64 JSON). */
export function encodeShare(state: AppState): string {
  const json = JSON.stringify(state)
  return btoa(unescape(encodeURIComponent(json)))
}

export function decodeShare(hash: string): AppState | null {
  try {
    const json = decodeURIComponent(escape(atob(hash)))
    return restorePlanningState(JSON.parse(json))
  } catch {
    return null
  }
}

export function restorePlanningState(obj: unknown): AppState {
  const d = defaultState()
  if (typeof obj !== 'object' || obj === null) return d
  const o = obj as Partial<AppState>
  const reservationDefaults = defaultStrategyReservations()
  const rawReservations =
    typeof o.strategyReservations === 'object' &&
    o.strategyReservations !== null &&
    !Array.isArray(o.strategyReservations)
      ? o.strategyReservations
      : null
  return {
    voyageHistory: restoreVoyageHistory(o.voyageHistory).records,
    pool: Array.isArray(o.pool) ? o.pool : d.pool,
    board: Array.isArray(o.board) && o.board.length === 9 ? o.board : d.board,
    borders: Array.isArray(o.borders) && o.borders.length === 12 ? o.borders : d.borders,
    weights: { ...d.weights, ...(o.weights ?? {}) },
    // 'connected' was the old pre-launch guess (reachability); the confirmed
    // rule is connector-matching, so anything that isn't 'any' maps to 'strict'
    mode: o.mode === 'any' ? 'any' : 'strict',
    allowRotation: !!o.allowRotation,
    adjacencyMode: o.adjacencyMode === 'connected' ? 'connected' : 'physical',
    adjacentAffectsSelf: !!o.adjacentAffectsSelf,
    disabledMods: Array.isArray(o.disabledMods)
      ? o.disabledMods.filter((x): x is string => typeof x === 'string')
      : d.disabledMods,
    strategyId: typeof o.strategyId === 'string' ? o.strategyId : null,
    strategyReservations: {
      divine:
        typeof rawReservations?.divine === 'boolean'
          ? rawReservations.divine
          : reservationDefaults.divine,
      meatfish:
        typeof rawReservations?.meatfish === 'boolean'
          ? rawReservations.meatfish
          : reservationDefaults.meatfish,
      ethereal:
        typeof rawReservations?.ethereal === 'boolean'
          ? rawReservations.ethereal
          : reservationDefaults.ethereal,
    },
    pieceKeeps:
      typeof o.pieceKeeps === 'object' && o.pieceKeeps !== null && !Array.isArray(o.pieceKeeps)
        ? Object.fromEntries(
            Object.entries(o.pieceKeeps).filter(
              (entry): entry is [string, number] =>
                typeof entry[1] === 'number' && Number.isFinite(entry[1]),
            ),
          )
        : {},
    layoutChoice:
      typeof o.layoutChoice === 'object' && o.layoutChoice !== null && !Array.isArray(o.layoutChoice)
        ? Object.fromEntries(
            Object.entries(o.layoutChoice).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          )
        : {},
    centerChoice:
      typeof o.centerChoice === 'object' && o.centerChoice !== null && !Array.isArray(o.centerChoice)
        ? Object.fromEntries(
            Object.entries(o.centerChoice).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          )
        : {},
  }
}
