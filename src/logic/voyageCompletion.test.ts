import { expect, it } from 'vitest'
import type { Board, ChartData } from '../types'
import { collectPreserveCandidates } from './voyageCompletion'

const pool: ChartData[] = Array.from({ length: 10 }, (_, cell) => ({
  uid: `chart-${cell}`, name: `人工海图 ${cell}`, level: 83,
  edges: [true, true, true, true], modIds: [],
}))
const board = pool.slice(0, 9).map((chart) => ({ chartUid: chart.uid, rotation: 0 }))
const charts = new Map(pool.map((chart) => [chart.uid, chart]))

it('30% 和 50% 保留边界逐段识别实际接触格，与评分和策略设置无关', () => {
  // Independently specified board geometry, clockwise groups of three segments.
  const expectedCells = [0, 1, 2, 2, 5, 8, 6, 7, 8, 0, 3, 6]
  for (const id of ['b-keep-1', 'b-keep-2']) {
    for (let segment = 0; segment < 12; segment++) {
      const borders = Array(12).fill(null)
      borders[segment] = id
      expect(collectPreserveCandidates(board, borders, charts).map(({ cell }) => cell))
        .toEqual([expectedCells[segment]])
    }
  }
})

it('合并本盘手工标记和边界候选，角落去重，从左下开始而且不包含空格及未上盘库存', () => {
  const inventory = new Map(pool.map((chart) => [chart.uid, {
    ...chart, preserved: ['chart-4', 'chart-9'].includes(chart.uid),
  }]))
  const partial: Board = [...board]
  partial[7] = null
  expect(collectPreserveCandidates(partial,
    ['b-keep-1', null, null, null, null, null, 'b-keep-2', 'b-keep-1', null, 'b-keep-2', null, null],
    inventory).map(({ cell, chart }) => [cell, chart.uid]))
    .toEqual([[6, 'chart-6'], [4, 'chart-4'], [0, 'chart-0']])
})
