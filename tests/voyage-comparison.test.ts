import { describe, expect, it } from 'vitest'
import fixture from './fixtures/acceptance/journey-two-voyages.json'
import type { AppState } from '../src/logic/storage'
import { createVoyageRecord, scoringContextKey } from '../src/logic/voyageHistory'
import { compareVoyageHistory } from '../src/logic/voyageComparison'

const state: AppState = { ...fixture, voyageHistory: [], mode: 'strict', adjacencyMode: 'connected' }
const base = createVoyageRecord(state, 'derived-example', '2026-10-15T00:00:00.000Z')!
// Artificial statistical examples derived from a valid fixture context, not past game voyages.
const records = (scores: number[]) => scores.map((score, i) => ({ ...base, score,
  completionId: `derived-${i}`, completedAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString() }))

describe('read-only current-board historical guidance', () => {
  it('reports zero and four comparable completions without a three-tier recommendation or appending the current board', () => {
    expect(compareVoyageHistory(state)).toMatchObject({ count: 0, lower: 0, equal: 0, higher: 0, verdict: 'insufficient' })
    expect(compareVoyageHistory(state)!.score).toBeCloseTo(12.96)
    const history = records([1, 2, base.score, 20])
    expect(compareVoyageHistory({ ...state, voyageHistory: history })).toMatchObject({ count: 4, lower: 2, equal: 1, higher: 1, verdict: 'insufficient' })
    expect(history).toHaveLength(4)
    expect(state.voyageHistory).toEqual([])
  })
  it.each([
    [[base.score, 20, 30, 40, 50], 'low', 0, 1, 4],
    [[1, 2, base.score, 20, 30], 'normal', 2, 1, 2],
    [[1, 2, 3, 4, base.score], 'high', 4, 1, 0],
    [[0, 10, 20, 30, 40, 50, 60, 70], 'normal', 2, 0, 6],
    [[0, 1, 2, 3, 4, 5, 20, 30], 'normal', 6, 0, 2],
    [[base.score, base.score, base.score, base.score, base.score], 'normal', 0, 5, 0],
    [[0, base.score, base.score, 20, 30, 40, 50, 60], 'normal', 1, 2, 5],
    [[0, 1, 2, 3, 4, base.score, base.score, 30], 'normal', 5, 2, 1],
    [[base.score, base.score, 20, 30, 40], 'low', 0, 2, 3],
    [[base.score, base.score, base.score, 20, 30], 'normal', 0, 3, 2],
    [[1, 2, base.score, base.score, base.score], 'normal', 2, 3, 0],
    [[1, 2, 3, base.score, base.score], 'high', 3, 2, 0],
    [[20, 20, 20, 20, 20], 'low', 0, 0, 5],
    [[1, 1, 1, 1, 1], 'high', 5, 0, 0],
  ] as const)('uses midrank with strict 25/75 boundaries and actual counts: %s', (scores, verdict, lower, equal, higher) => {
    expect(compareVoyageHistory({ ...state, voyageHistory: records([...scores]) })).toMatchObject({ count: scores.length, verdict, lower, equal, higher })
  })

  it('takes the newest thirty after filtering, retaining unrelated and older records unchanged', () => {
    const comparable = records([100, ...Array(30).fill(1)])
    const unrelated = records(Array(31).fill(100)).map((record) => ({ ...record,
      completionId: `unrelated-${record.completionId}`, completedAt: '2026-12-01T00:00:00.000Z',
      strategyId: 'milky-speedrun', contextKey: 'different-strategy' }))
    const history = [comparable[30], ...unrelated, ...comparable.slice(0, 30)]
    const snapshot = JSON.stringify(history)
    expect(compareVoyageHistory({ ...state, voyageHistory: history })).toMatchObject({ count: 30, lower: 30, equal: 0, higher: 0, verdict: 'high' })
    expect(compareVoyageHistory({ ...state, voyageHistory: comparable.slice(1) })).toMatchObject({ count: 30, lower: 30, verdict: 'high' })
    expect(JSON.stringify(history)).toBe(snapshot)
  })

  it('isolates strategy, scoring version and effective scoring settings while keeping raw scores', () => {
    const same = records(Array(5).fill(base.score + 0.000001))
    // All scores display as 13.0, but each sample is strictly higher than the pending board.
    expect(compareVoyageHistory({ ...state, voyageHistory: same })).toMatchObject({ count: 5, lower: 0, equal: 0, higher: 5, verdict: 'low' })
    const variants = [
      { ...base.scoringContext, ruleVersion: 'previous-version' },
      { ...base.scoringContext, adjacencyMode: 'physical' as const },
      { ...base.scoringContext, adjacentAffectsSelf: false },
      { ...base.scoringContext, disabledMods: [] },
      { ...base.scoringContext, connectivityMode: 'any' as const },
      { ...base.scoringContext, weights: { ...base.scoringContext.weights, 'voyage:quant': 99 } },
      { ...base.scoringContext, strategyId: 'milky-speedrun' },
    ]
    for (const scoringContext of variants) {
      const other = same.map((record) => ({ ...record, strategyId: scoringContext.strategyId, scoringContext, contextKey: scoringContextKey(scoringContext) }))
      expect(compareVoyageHistory({ ...state, voyageHistory: [...same.slice(0, 4), ...other] })).toMatchObject({ count: 4, verdict: 'insufficient' })
    }
  })

  it('never supplies a percentile without a strategy or a complete valid held board', () => {
    const voyageHistory = records([1, 2, 3, 4, 5])
    expect(compareVoyageHistory({ ...state, voyageHistory, strategyId: null })).toBeNull()
    expect(compareVoyageHistory({ ...state, voyageHistory, board: state.board.map((p, i) => i ? p : null) })).toBeNull()
    expect(compareVoyageHistory({ ...state, voyageHistory, pool: [] })).toBeNull()
    expect(compareVoyageHistory({ ...state, voyageHistory, pool: state.pool.map((c) => ({ ...c, edges: [false, false, false, false] })) })).toBeNull()
    expect(compareVoyageHistory({ ...state, voyageHistory, borders: Array(12).fill(null) })).toMatchObject({ count: 5 })
    expect(compareVoyageHistory({ ...state, voyageHistory, pool: [...state.pool, { ...state.pool[0], uid: 'unused-extra' }] })).toMatchObject({ count: 5, verdict: 'high' })
  })

})
