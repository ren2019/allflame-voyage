// Random demo chart generator - for playing with the tool at realistic pool sizes
// before real chart data is available.

import { VOYAGE_MODS } from '../data/mods'
import type { ChartData, Edges } from '../types'
import { newUid } from './parser'

const PREFIXES = ['沉没', '溺亡', '深渊', '珊瑚', '海草覆盖', '盐水腐朽', '潮汐', '巨兽', '藤壶附着', '珍珠', '深海', '沉船', '海妖', '甲胄', '风暴']
const BASES = ['暗礁', '海沟', '宝库', '迷宫', '墓地', '海架', '裂隙', '洞窟', '海盆', '山脊', '空洞', '洞穴', '旷野', '密林']
const SUFFIXES = ['', '', '', '之力', '丰饶', '深海', '黄金', '风暴', '毁灭']

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

function randomEdges(): Edges {
  // weight toward 2–3 connectors like the shapes seen in game
  const count = pick([1, 2, 2, 2, 3, 3, 4])
  const dirs = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, count)
  const edges: Edges = [false, false, false, false]
  for (const d of dirs) edges[d] = true
  return edges
}

export function generateDemoCharts(count: number): ChartData[] {
  const selfMods = VOYAGE_MODS.filter((m) => m.scope === 'self')
  const implicits = VOYAGE_MODS.filter((m) => m.scope !== 'self')
  const charts: ChartData[] = []
  const usedNames = new Set<string>()
  for (let i = 0; i < count; i++) {
    let name = ''
    do {
      name = `已测绘 ${pick(PREFIXES)}${pick(BASES)}${pick(SUFFIXES)}（示例）`
    } while (usedNames.has(name))
    usedNames.add(name)
    // 1-2 area mods (magic prefix/suffix) + 1 revealed implicit
    const modIds = [pick(selfMods).id]
    if (Math.random() < 0.6) {
      const second = pick(selfMods).id
      if (second !== modIds[0]) modIds.push(second)
    }
    modIds.push(pick(implicits).id)
    charts.push({
      uid: newUid(),
      name,
      level: 68 + Math.floor(Math.random() * 16),
      edges: randomEdges(),
      modIds,
    })
  }
  return charts
}
