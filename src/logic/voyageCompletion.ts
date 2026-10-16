import { borderModById } from '../data/mods'
import { borderTouches, type Board, type Borders, type ChartData } from '../types'

/** The game's Ctrl+click placement order, beginning at the bottom-left. */
export const FILL_ORDER = [6, 7, 8, 3, 4, 5, 0, 1, 2]

export interface PreserveCandidate {
  cell: number
  chart: ChartData
}

/** Physical preservation candidates; scoring configuration does not affect game borders. */
export function collectPreserveCandidates(
  board: Board, borders: Borders, charts: ReadonlyMap<string, ChartData>,
): PreserveCandidate[] {
  const touched = new Set<number>()
  borders.forEach((id, segment) => {
    if (id && borderModById.get(id)?.effects.some(({ stat, percent }) => stat === 'preserve' && percent > 0)) {
      touched.add(borderTouches(segment))
    }
  })
  const seen = new Set<string>()
  return FILL_ORDER.flatMap((cell) => {
    const placement = board[cell]
    const chart = placement ? charts.get(placement.chartUid) : undefined
    if (!chart || seen.has(chart.uid) || (!touched.has(cell) && !chart.preserved)) return []
    seen.add(chart.uid)
    return [{ cell, chart }]
  })
}
