import type { Board, ChartData, Scope } from '../types'
import { rotateEdges } from './connectivity'
import type { ScoreOptions } from './scoring'

/** Shared geometry for scoring and regional reminders; no numeric reward assumptions. */
export function boardEffectScope(board: Board, charts: Map<string, ChartData>, opts: ScoreOptions) {
  const physical: number[][] = Array.from({ length: 9 }, () => [])
  const connected: number[][] = Array.from({ length: 9 }, () => [])
  const edges = board.map(p => {
    const chart = p ? charts.get(p.chartUid) : undefined
    return chart && p ? rotateEdges(chart.edges, p.rotation) : null
  })
  const dirs = [{ dr:-1,dc:0,opp:2 },{ dr:0,dc:1,opp:3 },{ dr:1,dc:0,opp:0 },{ dr:0,dc:-1,opp:1 }]
  board.forEach((p,i) => {
    if (!p) return
    // Preserve scoring accumulation order: north, south, west, east.
    for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const r=Math.floor(i/3)+dr,c=i%3+dc
      if(r>=0&&r<3&&c>=0&&c<3&&board[r*3+c]) physical[i].push(r*3+c)
    }
    dirs.forEach((d,k) => {
      const r = Math.floor(i/3)+d.dr, c = i%3+d.dc
      if (r<0||r>2||c<0||c>2) return
      const n = r*3+c
      if (edges[i]?.[k] && edges[n]?.[d.opp]) connected[i].push(n)
    })
  })
  const adjacentTargets = (i: number) => {
    const base = opts.adjacencyMode === 'connected' ? connected[i] : physical[i]
    return opts.adjacentAffectsSelf ? [...base,i] : base
  }
  return {
    connCount: connected.map(n => n.length), adjacentTargets,
    targets: (i: number, scope: Scope) => scope === 'self' ? [i] : scope === 'adjacent' ? adjacentTargets(i) : board.flatMap((p,n)=>p?[n]:[]),
  }
}
