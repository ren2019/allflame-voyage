import type { AppState } from './storage'
import { completedBoardScore, currentScoringContext, scoringContextKey, voyagesNewestFirst } from './voyageHistory'

export interface VoyageComparison {
  score: number
  count: number
  lower: number
  equal: number
  higher: number
  verdict: 'insufficient' | 'low' | 'normal' | 'high'
}

/** Read-only comparison: pending boards never become completed samples. */
export function compareVoyageHistory(state: AppState): VoyageComparison | null {
  if (!state.strategyId) return null
  const score = completedBoardScore(state)
  if (score === null) return null
  const key = scoringContextKey(currentScoringContext(state))
  const samples = voyagesNewestFirst(state.voyageHistory.filter((record) =>
    record.strategyId === state.strategyId && record.contextKey === key,
  )).slice(0, 30)
  const lower = samples.filter((record) => record.score < score).length
  const equal = samples.filter((record) => record.score === score).length
  // Midrank handles ties without inventing a strict score difference.
  const rank = (lower + equal / 2) / samples.length
  const verdict = samples.length < 5 ? 'insufficient'
    : rank < 0.25 ? 'low' : rank > 0.75 ? 'high' : 'normal'
  return { score, count: samples.length, lower, equal,
    higher: samples.length - lower - equal, verdict }
}
