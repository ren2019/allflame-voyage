import { describe, expect, it } from 'vitest'
import fixture from './fixtures/acceptance/journey-two-voyages.json'
import { defaultState, decodeShare, encodeShare, type AppState } from '../src/logic/storage'
import { completedBoardScore, createVoyageRecord, currentScoringContext, scoringContextKey } from '../src/logic/voyageHistory'

const state: AppState = { ...fixture, voyageHistory: [], mode: 'strict', adjacencyMode: 'connected' }
const record = () => createVoyageRecord(state, 'completion-1', '2026-10-15T00:00:00.000Z')!

describe('completion snapshot and planning backup public boundaries', () => {
  it('keeps the original score and actual settings, not displayed rounding or stale manual weights', () => {
    expect(record().score).toBeCloseTo(12.96)
    expect(record().score).not.toBe(13)
    expect(record().scoringContext).toMatchObject({ strategyId: 'alc-and-go', adjacencyMode: 'connected', adjacentAffectsSelf: true, disabledMods: ['adj-crab-2'] })
    expect(record().scoringContext.weights['voyage:quant']).not.toBe(state.weights['voyage:quant'])
  })
  it('compares settings independently of inventory, borders, preferences and key ordering', () => {
    const key = scoringContextKey(currentScoringContext(state))
    const other = { ...state, pool: [], borders: defaultState().borders, layoutChoice: {}, pieceKeeps: {}, voyageHistory: [record()] }
    expect(scoringContextKey(currentScoringContext(other))).toBe(key)
    const context = currentScoringContext(state)
    const { weights, ...settings } = context
    expect(scoringContextKey({ weights: Object.fromEntries(Object.entries(weights).reverse()), ...settings })).toBe(key)
    expect(scoringContextKey(currentScoringContext({ ...state, adjacencyMode: 'physical' }))).not.toBe(key)
    expect(scoringContextKey(currentScoringContext({ ...state, disabledMods: [] }))).not.toBe(key)
    expect(scoringContextKey(currentScoringContext({ ...state, strategyId: null }))).not.toBe(key)
  })
  it('preserves the stored context key bytes when weights or duplicate disabled IDs arrive unordered', () => {
    const context = currentScoringContext({ ...state, strategyId: null,
      weights: { 'border:divine': 10, 'adjacent:box': 4 },
      disabledMods: ['voy-jelly', 'adj-box-1', 'voy-jelly'],
    })
    expect(context.disabledMods).toEqual(['adj-box-1', 'voy-jelly'])
    const key = '{"ruleVersion":"3.29-additive-rewards-v1","strategyId":null,"weights":{"adjacent:box":4,"border:divine":10},"adjacencyMode":"connected","adjacentAffectsSelf":true,"disabledMods":["adj-box-1","voy-jelly"],"connectivityMode":"strict"}'
    expect(scoringContextKey(context)).toBe(key)
    expect(scoringContextKey({ ...context, weights: { 'border:divine': 10, 'adjacent:box': 4 },
      disabledMods: ['voy-jelly', 'adj-box-1', 'adj-box-1'],
    })).toBe(key)
  })
  it('never snapshots partial, duplicate-instance, missing-inventory or disconnected plans, including experiment mode partials', () => {
    expect(completedBoardScore({ ...state, mode: 'any', board: state.board.map((p, i) => i === 0 ? null : p) })).toBeNull()
    expect(completedBoardScore({ ...state, board: state.board.map((p, i) => i === 1 ? state.board[0] : p) })).toBeNull()
    expect(completedBoardScore({ ...state, pool: state.pool.slice(1) })).toBeNull()
    expect(completedBoardScore({ ...state, pool: state.pool.map((c) => ({ ...c, edges: [false, false, false, false] })) })).toBeNull()
  })
  it('restores valid old scoring versions and deduplicates identities without manufacturing past history', () => {
    const old = record()
    old.scoringContext.ruleVersion = 'older-score-model'
    old.contextKey = scoringContextKey(old.scoringContext)
    const backup = { ...state, voyageHistory: [old, old, { score: Infinity }] }
    const restored = decodeShare(encodeShare(backup as AppState))!
    expect(restored.pool).toEqual(state.pool)
    expect(restored.strategyReservations).toEqual(state.strategyReservations)
    expect(restored.voyageHistory).toEqual([old])
    const { voyageHistory: _, ...legacy } = state
    expect(decodeShare(encodeShare(legacy as AppState))!.voyageHistory).toEqual([])
  })
})
