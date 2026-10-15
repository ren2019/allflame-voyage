import { describe, it, expect } from 'vitest'
import fixture from './__fixtures__/real-inventory-layout.json'
import { scoreBoard, type ScoreOptions } from './scoring'
import { DEFAULT_WEIGHTS } from './rewards'
import { strategyById } from '../data/strategies'
import {
  priorityBand,
  REGION_TARGET_CONFIG,
  regionTargets,
} from './regionTargets'
import type { ChartData } from '../types'

const charts = new Map((fixture.pool as ChartData[]).map((c) => [c.uid, c]))
const options = {
  adjacencyMode: 'physical' as const,
  adjacentAffectsSelf: false,
}
const run = () =>
  regionTargets(fixture.board, fixture.borders, charts, 'alc-and-go', options)
describe('区域目标: 用户真实库存重算盘（不是已完成旧盘）', () => {
  it('保持手动默认权重78.78与实际点金速刷策略0的独立评分基线', () => {
    const score = scoreBoard(
      fixture.board,
      fixture.borders,
      charts,
      DEFAULT_WEIGHTS,
    )
    expect(
      scoreBoard(
        fixture.board,
        fixture.borders,
        charts,
        strategyById.get('alc-and-go')!.weights,
      ).total,
    ).toBe(0)
    expect(score.total).toBeCloseTo(78.78)
    expect(score.perTile.map((n) => Number(n.toFixed(2)))).toEqual([
      5.67, 10.22, 6.41, 10.72, 6.29, 10.88, 7.1, 14.9, 6.59,
    ])
  })
  it('中央奥术师供给四邻而非自身，全航程精华覆盖九格，锚只来自左上边界', () => {
    const cells = run()
    expect(
      cells.map((c) => c.targets.some((t) => t.id === 'arcanist-box')),
    ).toEqual([false, true, false, true, false, true, false, true, false])
    expect(cells.map((c) => c.targets.some((t) => t.id === 'essence'))).toEqual(
      Array(9).fill(true),
    )
    expect(cells[0].targets.map((t) => t.id).sort()).toEqual([
      'essence',
      'extra-packs',
      'magic-monster',
      'treasure-anchor',
    ])
    expect(cells[4].targets.some((t) => t.id === 'arcanist-box')).toBe(false)
  })
})

describe('区域目标组合与条件覆盖（派生规则样例，不是游戏现场证据）', () => {
  const chart = (
    uid: string,
    mods: string[] = [],
    areaType?: ChartData['areaType'],
  ): ChartData => ({
    uid,
    name: uid,
    level: 83,
    edges: [true, true, true, true],
    modIds: mods,
    areaType,
  })
  const derive = (
    pool: ChartData[],
    borders: (string | null)[] = Array(12).fill(null),
    strategy: string | null = null,
    opts: ScoreOptions = options,
  ) =>
    regionTargets(
      Array.from({ length: 9 }, (_, i) =>
        pool[i] ? { chartUid: pool[i].uid, rotation: 0 } : null,
      ),
      borders,
      new Map(pool.map((c) => [c.uid, c])),
      strategy,
      opts,
    )
  it('显式箱子、金币、明确首领各只占一槽，具体目标与重复来源仍完整', () => {
    const cells = derive(
      [
        chart('a', ['adj-box-1', 'adj-box-2', 'adj-arcbox-1']),
        chart('b', [], 'clam-infested-shelf'),
      ],
      [
        'b-crabboss',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        'b-octoboss',
      ],
    )
    expect(cells[1].groups.map((g) => g.id)).toEqual([
      'boxes',
      'message-bottle',
      'coins',
    ])
    expect(cells[1].groups[0].targets.map((t) => t.id)).toEqual([
      'arcanist-box',
      'strongbox',
    ])
    expect(
      cells[1].targets.find((t) => t.id === 'strongbox')?.sources,
    ).toHaveLength(2)
    expect(cells[1].targets.find((t) => t.id === 'strongbox')?.weight).toBe(60)
    expect(
      cells[0].groups.find((g) => g.id === 'bosses')?.targets.map((t) => t.id),
    ).toEqual(['filthscrabble', 'captainsbane'])
  })
  it('连接数为零时不把每连接边界当作已生效稀有怪目标', () => {
    expect(derive([chart('a')], ['b-rareconn-1'])[0].targets).toEqual([])
    expect(
      derive([chart('a'), chart('b')], ['b-rareconn-1'])[0].targets.map(
        (t) => t.id,
      ),
    ).toEqual(['rare-monster'])
  })

  it('神圣边界只提升接收格已存在的目标，策略不创造新目标', () => {
    const pool = [
      chart('source', ['adj-box-1', 'adj-lantern']),
      chart('recipient'),
    ]
    const border = ['b-divine', ...Array(11).fill(null)]
    const cells = derive(pool, border, 'divine-border-rares')
    expect(cells[0].targets.map((t) => [t.id, t.weight])).toEqual([
      ['rare-divine', 100],
    ])
    expect(cells[1].targets.map((t) => [t.id, t.weight])).toEqual([
      ['golden-lantern', 80],
      ['strongbox', 55],
    ])
    const local = derive(
      pool,
      ['b-divine', 'b-divine', ...Array(10).fill(null)],
      'divine-border-rares',
    )
    expect(local[1].targets.map((t) => [t.id, t.weight])).toEqual([
      ['rare-divine', 100],
      ['strongbox', 98],
      ['golden-lantern', 80],
    ])
    expect(
      derive(pool, border, 'milky-speedrun').map((c) =>
        c.targets.map((t) => t.id).sort(),
      ),
    ).toEqual(cells.map((c) => c.targets.map((t) => t.id).sort()))
  })
  it('遵循连接与自作用设置，禁用不参与，零分遭遇仍出现', () => {
    const pool = [
      {
        ...chart('a', ['adj-lantern', 'voy-jelly']),
        edges: [false, false, false, false] as ChartData['edges'],
      },
      chart('b'),
    ]
    expect(derive(pool)[1].targets.map((t) => t.id)).toEqual([
      'golden-lantern',
      'friendly-jellyfish',
    ])
    expect(
      derive(pool, undefined, null, {
        adjacencyMode: 'connected',
        adjacentAffectsSelf: false,
      })[1].targets.map((t) => t.id),
    ).toEqual(['friendly-jellyfish'])
    const self = regionTargets(
      [{ chartUid: 'a', rotation: 0 }, ...Array(8).fill(null)],
      Array(12).fill(null),
      new Map(pool.map((c) => [c.uid, c])),
      null,
      {
        ...options,
        adjacentAffectsSelf: true,
        disabledMods: new Set(['voy-jelly']),
      },
    )
    expect(self[0].targets.map((t) => t.id)).toEqual(['golden-lantern'])
  })
  it('0、1、4和超过4类；0权重仅保留详情，同分按配置顺序稳定', () => {
    expect(derive([]).every((c) => c.groups.length === 0)).toBe(true)
    expect(
      derive([chart('a', [], 'anchorfield')])[0].visible.map((g) => g.id),
    ).toEqual(['boxes'])
    const pool = [
      chart('a', [
        'adj-lantern',
        'adj-box-1',
        'adj-msg-1',
        'adj-fish',
        'adj-spirit-1',
      ]),
      chart('b'),
    ]
    const cell = derive(pool)[1]
    expect(cell.groups).toHaveLength(5)
    expect(cell.visible.map((g) => g.id)).toEqual([
      'golden-lantern',
      'message-bottle',
      'boxes',
    ])
    expect(cell.overflow).toBe(true)
    const cfg = structuredClone(REGION_TARGET_CONFIG)
    cfg.targets.find((t) => t.id === 'exotic-fish')!.basePriority = 0
    cfg.targets.find((t) => t.id === 'message-bottle')!.basePriority = 80
    const zero = regionTargets(
      [
        { chartUid: 'a', rotation: 0 },
        { chartUid: 'b', rotation: 0 },
        ...Array(7).fill(null),
      ],
      Array(12).fill(null),
      new Map(pool.map((c) => [c.uid, c])),
      null,
      options,
      cfg,
    )[1]
    expect(zero.targets.find((t) => t.id === 'exotic-fish')?.weight).toBe(0)
    expect(zero.groups).toHaveLength(4)
    expect(zero.visible.map((g) => g.id)).toEqual([
      'golden-lantern',
      'message-bottle',
      'boxes',
      'spirit-cage',
    ])
    expect(zero.overflow).toBe(false)
  })
  it.each([
    [0, null],
    [1, 'low'],
    [39, 'low'],
    [40, 'medium'],
    [69, 'medium'],
    [70, 'high'],
    [100, 'high'],
  ])('展示权重 %s 的颜色边界', (weight, band) => {
    expect(priorityBand(Number(weight))?.id ?? null).toBe(band)
  })
})
