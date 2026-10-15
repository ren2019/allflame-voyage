import { strategyById } from '../data/strategies'
import type { Weights } from '../types'
import { checkConnectivity } from './connectivity'
import { scoreBoard, type AdjacencyMode } from './scoring'
import type { AppState } from './storage'

/** Bump when scoring semantics, mod effects or curated strategy weights change.
 * Deliberately independent from the planning backup/storage schema version. */
export const SCORING_RULE_VERSION = '3.29-additive-rewards-v1'
export interface ScoringContext {
  ruleVersion: string
  strategyId: string | null
  weights: Weights
  adjacencyMode: AdjacencyMode
  adjacentAffectsSelf: boolean
  disabledMods: string[]
  connectivityMode: AppState['mode']
}
export interface VoyageRecord {
  completionId: string
  completedAt: string
  strategyId: string | null
  score: number
  scoringContext: ScoringContext
  contextKey: string
}

/** Only actual score/validity settings define comparability, never inventory,
 * borders, solver search budget, layout preferences or storage schema. */
export function currentScoringContext(state: AppState): ScoringContext {
  const weights = (state.strategyId && strategyById.get(state.strategyId)?.weights) || state.weights
  return {
    ruleVersion: SCORING_RULE_VERSION,
    strategyId: state.strategyId,
    weights: Object.fromEntries(Object.entries(weights).sort(([a], [b]) => a.localeCompare(b))),
    adjacencyMode: state.adjacencyMode,
    adjacentAffectsSelf: state.adjacentAffectsSelf,
    disabledMods: [...new Set(state.disabledMods)].sort(),
    connectivityMode: state.mode,
  }
}
export function scoringContextKey(context: ScoringContext): string {
  return JSON.stringify({
    ruleVersion: context.ruleVersion,
    strategyId: context.strategyId,
    weights: Object.fromEntries(Object.entries(context.weights).sort(([a], [b]) => a.localeCompare(b))),
    adjacencyMode: context.adjacencyMode,
    adjacentAffectsSelf: context.adjacentAffectsSelf,
    disabledMods: [...new Set(context.disabledMods)].sort(),
    connectivityMode: context.connectivityMode,
  })
}

/** Restored/manual plans do not need a live solver candidate. Position/layout
 * preferences remain soft preferences, as in the original solver. */
export function completedBoardScore(state: AppState): number | null {
  if (state.board.length !== 9 || state.board.some((p) => !p)) return null
  const uids = state.board.map((p) => p!.chartUid)
  if (new Set(uids).size !== 9) return null
  const charts = new Map(state.pool.map((chart) => [chart.uid, chart]))
  if (uids.some((uid) => !charts.has(uid))) return null
  if (!checkConnectivity(state.board, charts, state.mode).valid) return null
  const context = currentScoringContext(state)
  const score = scoreBoard(state.board, state.borders, charts, context.weights, {
    adjacencyMode: context.adjacencyMode,
    adjacentAffectsSelf: context.adjacentAffectsSelf,
    disabledMods: new Set(context.disabledMods),
  }).total
  return Number.isFinite(score) ? score : null
}
export function createVoyageRecord(state: AppState, completionId: string, completedAt: string): VoyageRecord | null {
  const score = completedBoardScore(state)
  if (score === null) return null
  const scoringContext = currentScoringContext(state)
  return { completionId, completedAt, strategyId: state.strategyId, score,
    scoringContext, contextKey: scoringContextKey(scoringContext) }
}

/** Validate only the history extension; a bad record must not invalidate the
 * surrounding planning backup. Older rule versions are retained, not upgraded. */
export function restoreVoyageHistory(value: unknown): { records: VoyageRecord[]; damaged: boolean } {
  if (value === undefined) return { records: [], damaged: false }
  if (!Array.isArray(value)) return { records: [], damaged: true }
  const records: VoyageRecord[] = []
  const ids = new Set<string>()
  let damaged = false
  for (const raw of value) {
    const c = raw?.scoringContext
    const valid = raw && typeof raw === 'object' &&
      typeof raw.completionId === 'string' && raw.completionId.length > 0 &&
      typeof raw.completedAt === 'string' && Number.isFinite(Date.parse(raw.completedAt)) &&
      typeof raw.score === 'number' && Number.isFinite(raw.score) &&
      (raw.strategyId === null || typeof raw.strategyId === 'string') &&
      c && typeof c === 'object' && typeof c.ruleVersion === 'string' && c.ruleVersion.length > 0 &&
      c.strategyId === raw.strategyId &&
      c.weights && typeof c.weights === 'object' && !Array.isArray(c.weights) &&
      Object.values(c.weights).every((w) => typeof w === 'number' && Number.isFinite(w)) &&
      (c.adjacencyMode === 'physical' || c.adjacencyMode === 'connected') &&
      typeof c.adjacentAffectsSelf === 'boolean' &&
      (c.connectivityMode === 'strict' || c.connectivityMode === 'any') &&
      Array.isArray(c.disabledMods) && c.disabledMods.every((id: unknown) => typeof id === 'string')
    if (!valid || raw.contextKey !== scoringContextKey(c)) { damaged = true; continue }
    if (ids.has(raw.completionId)) continue
    ids.add(raw.completionId)
    records.push(raw as VoyageRecord)
  }
  return { records, damaged }
}

/** A read-only chronological view. Restoring a backup preserves its array order;
 * recency uses completedAt, with stable input order when timestamps are equal. */
export function voyagesNewestFirst(records: readonly VoyageRecord[]): VoyageRecord[] {
  return [...records].sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
}
