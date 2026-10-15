import { describe, expect, it } from 'vitest'
import fixture from './fixtures/acceptance/journey-two-voyages.json'
import expected from './fixtures/acceptance/journey-two-voyages.expected.json'
import { checkConnectivity } from '../src/logic/connectivity'
import { scoreBoard } from '../src/logic/scoring'
import { strategyById } from '../src/data/strategies'
import { defaultState, decodeShare, encodeShare } from '../src/logic/storage'
import type { AppState } from '../src/logic/storage'

const state = { ...fixture, voyageHistory: [] } as AppState

describe('artificial two-voyage fixture at public boundaries', () => {
  it('proves the full-state witness uses nine distinct real inventory instances and valid connections', () => {
    expect(new Set(state.board.map((placement) => placement!.chartUid)).size).toBe(9)
    expect(state.board.every((placement) => state.pool.some((chart) => chart.uid === placement!.chartUid))).toBe(true)
    expect(checkConnectivity(state.board, new Map(state.pool.map((chart) => [chart.uid, chart])), 'strict').valid).toBe(true)
    expect(state.weights).toEqual({ ...defaultState().weights, 'voyage:quant': 13, 'border:pack': 7 })
    const score = scoreBoard(state.board, state.borders, new Map(state.pool.map((chart) => [chart.uid, chart])), strategyById.get('alc-and-go')!.weights, { adjacencyMode: state.adjacencyMode, adjacentAffectsSelf: state.adjacentAffectsSelf, disabledMods: new Set(state.disabledMods) })
    expect(score.total).toBeCloseTo(12.96)
    expect(score.perStat.quantity).toBeCloseTo(expected.scoreWitness.perStatQuantity)
  })
  it('round-trips every persistent field through the public full-state codec', () => {
    expect(decodeShare(encodeShare(state))).toEqual(state)
  })
})
