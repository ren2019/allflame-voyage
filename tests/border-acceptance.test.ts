import { describe, expect, it } from 'vitest'
import fixture from './fixtures/borders/acceptance.json'
import reviewed from '../samples/text-library/mappings.reviewed.json'
import { BORDER_CHOICES, localizedBorder, matchesBorderQuery } from '../src/data/borderLocale'
import { scoreBoard } from '../src/logic/scoring'
import { emptyBorders, type Board, type ChartData } from '../src/types'

function model(chartMod?: string) {
  const charts = new Map<string, ChartData>(Array.from({ length: 9 }, (_, cell) => {
    const uid = `offline-border-chart-${cell}`
    return [uid, { uid, name: `人工边界验收海图 ${cell}`, level: 83, edges: [true, true, true, true], modIds: cell === 0 && chartMod ? [chartMod] : [] }]
  }))
  const board: Board = [...charts.keys()].map((chartUid) => ({ chartUid, rotation: 0 }))
  return { charts, board }
}

describe('offline border acceptance through public scoring', () => {
  it.each(fixture.isolatedPositions)('segment $segment affects only its specified cell', ({ segment, perTile }) => {
    const { charts, board } = model()
    const borders = emptyBorders()
    borders[segment] = fixture.direct.id
    const score = scoreBoard(board, borders, charts, fixture.direct.weights)
    expect(score.perTile).toEqual(perTile)
    expect(score.total).toBeCloseTo(fixture.direct.total)
  })

  it('stacks two direct borders at each corner and none at the centre', () => {
    const { charts, board } = model()
    const score = scoreBoard(board, Array(12).fill(fixture.direct.id), charts, fixture.direct.weights)
    expect(score.perTile).toEqual(fixture.allBorders.perTile)
    expect(score.total).toBeCloseTo(fixture.allBorders.total)
  })

  it.each(fixture.semantics)('Chinese $id selection retains the original direct/connection/magnitude semantics', (example) => {
    const { charts, board } = model('chartMod' in example ? example.chartMod : undefined)
    const selected = BORDER_CHOICES.find((choice) => choice.text === example.cnText)
    expect(selected?.id).toBe(example.id)
    const borders = emptyBorders()
    borders[0] = selected!.id
    const actual = scoreBoard(board, borders, charts, example.weights)
    for (let cell = 0; cell < 9; cell++) expect(actual.perTile[cell]).toBeCloseTo(example.perTile[cell])
    expect(actual.total).toBeCloseTo(example.total)
    borders[0] = example.id
    expect(actual).toEqual(scoreBoard(board, borders, charts, example.weights))
  })

  it('counts only matched connectors for per-connection borders', () => {
    const { charts, board } = model()
    const borders = emptyBorders()
    borders[0] = 'b-rareconn-1'
    charts.get('offline-border-chart-0')!.edges = [true, true, false, true]
    expect(scoreBoard(board, borders, charts, { 'border:rareconn': 1 }).total).toBe(0.5)
    charts.get('offline-border-chart-1')!.edges = [true, true, true, false]
    expect(scoreBoard(board, borders, charts, { 'border:rareconn': 1 }).total).toBe(0)
  })
})

describe('border presentation preserves acquired evidence', () => {
  it.each(reviewed.filter((record) => record.internalId.startsWith('b-')))('exposes the reviewed text for $internalId', (record) => {
    const choice = localizedBorder(record.internalId)
    expect(choice?.text).toBe(record.cnText)
    expect(choice?.evidence?.sources).toHaveLength(2)
    expect(choice?.evidence?.clientSampleRefs).toEqual([])
    expect(matchesBorderQuery(record.internalId, record.cnText)).toBe(true)
    expect(matchesBorderQuery(record.internalId, record.repoEnText)).toBe(true)
  })
  it('keeps the complete 64-ID pool and never upgrades source-only or conflict evidence', () => {
    expect(BORDER_CHOICES).toHaveLength(64)
    expect(BORDER_CHOICES.filter((choice) => choice.status === 'source-only')).toHaveLength(63)
    expect(BORDER_CHOICES.filter((choice) => choice.status === 'conflict').map((choice) => choice.id)).toEqual(['b-sulphdrop'])
    expect(localizedBorder('b-sulphdrop')?.statusLabel).toBe('译名冲突，待客户端核对')
  })
})
