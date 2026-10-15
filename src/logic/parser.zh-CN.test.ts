import { describe, expect, it } from 'vitest'
import samples from '../../samples/charted.zh-CN.txt?raw'
import { isChartClipboardText, parseChartText } from './parser'

const originals = samples.trim().split(/\n\s*(?=物品类别: 海图)/)
export const first = originals[0]
export const second = originals[1]

describe('mainland client import through the public parser', () => {
  it('imports the first real client chart with its calibrated adjacent effect', () => {
    const result = parseChartText(first)
    expect(result.rejected).toEqual([])
    expect(result.charts).toHaveLength(1)
    expect(result.charts[0]).toMatchObject({
      name: '航海 冒险 珊瑚暗礁海图', level: 83,
      areaType: 'clam-infested-shelf', shape: 'End',
      edges: [true, false, false, false], modIds: ['adj-crab-1'],
      implicitText: '相邻区域包含 8(8-10) 个额外的螃蟹群 — 数值不可调整',
      rewards: [{ stat: 'quantity', percent: 110 }, { stat: 'sulphur', percent: 75 }],
    })
    expect(isChartClipboardText(first)).toBe(true)
  })
  it('keeps second real chart area rewards distinct from its whole-voyage effect', () => {
    const result = parseChartText(second)
    expect(result.rejected).toEqual([])
    expect(result.charts).toHaveLength(1)
    expect(result.charts[0]).toMatchObject({
      name: '航海 深入 金沙海床海图', level: 83, areaType: 'abyssal-plain',
      shape: 'Straight', edges: [true, false, true, false], modIds: ['voy-pack-1'],
      implicitText: '所有航行区域的怪物群规模提高 5%',
      rewards: [{ stat: 'quantity', percent: 110 }, { stat: 'sulphur', percent: 60 }, { stat: 'packsize', percent: 5 }],
    })
  })
  it('refuses a mainland chart whose crucial voyage effect has no calibrated mapping', () => {
    const unknown = first.replace('相邻区域包含 8(8-10) 个额外的螃蟹群 — 数值不可调整', '明确未知的测试航行词缀')
    const result = parseChartText(unknown)
    expect(result.charts).toEqual([])
    expect(result.rejected).toEqual([{ name: '航海 冒险 珊瑚暗礁海图', reason: 'unrecognised voyage modifier: 明确未知的测试航行词缀' }])
  })
  it.each([
    first.replace(/\{ 基底属性 \}\n[^\n]+\n/, ''),
    first.replace(/(\{ 基底属性 \})\n[^\n]+/, '$1\n'),
  ])('refuses missing or empty crucial voyage modifiers', (text) => {
    expect(parseChartText(text)).toEqual({ charts: [], rejected: [{ name: '航海 冒险 珊瑚暗礁海图', reason: 'missing voyage modifier (基底属性)' }] })
  })
  it('separates a Windows batch into distinct instances without changing fields', () => {
    const result = parseChartText(samples.replace(/\n/g, '\r\n'))
    expect(result.rejected).toEqual([])
    expect(result.charts.map(({ name, modIds, level, shape }) => ({ name, modIds, level, shape }))).toEqual([
      { name: '航海 冒险 珊瑚暗礁海图', modIds: ['adj-crab-1'], level: 83, shape: 'End' },
      { name: '航海 深入 金沙海床海图', modIds: ['voy-pack-1'], level: 83, shape: 'Straight' },
    ])
    expect(new Set(result.charts.map((chart) => chart.uid)).size).toBe(2)
    const withoutUid = (text: string) => parseChartText(text).charts.map(({ uid: _uid, ...chart }) => chart)
    expect(withoutUid(samples.replace(/\n/g, '\r\n'))).toEqual(withoutUid(samples))
  })
  it('uses area level rather than item or requirement level', () => {
    expect(parseChartText(first.replace('区域等级: 83', '区域等级: 71')).charts[0].level).toBe(71)
  })
  it.each([
    [first.replace('海图形状：端点\n', ''), 'missing 海图形状'],
    [first.replace('海图形状：端点', '海图形状：明确未知形状'), 'unknown 海图形状: 明确未知形状'],
    [first.replace('物品类别: 海图', '物品类别: 戒指'), 'not a Chart item'],
  ])('rejects invalid items with their original name and reason', (text, reason) => {
    expect(parseChartText(text)).toEqual({ charts: [], rejected: [{ name: '航海 冒险 珊瑚暗礁海图', reason }] })
  })
  it('keeps valid items when another item in the batch is rejected', () => {
    const unknown = first.replace(/(\{ 基底属性 \}\n)[^\n]+/, '$1明确未知的测试航行词缀')
    const result = parseChartText(`${second}\n\n${unknown}`)
    expect(result.charts).toHaveLength(1)
    expect(result.charts[0].name).toBe('航海 深入 金沙海床海图')
    expect(result.rejected).toEqual([{ name: '航海 冒险 珊瑚暗礁海图', reason: 'unrecognised voyage modifier: 明确未知的测试航行词缀' }])
  })
  it('preserves only explicit downside text alongside the original implicit', () => {
    const result = parseChartText(samples)
    expect(result.charts[0].rawText).toBe('+33(26-40)% 怪物的混沌抗性\n+32(26-40)% 怪物的元素抗性\n怪物生命总增 60(46-60)%\n怪物伤害提高 35(26-35)%\n怪物的法术击中施加缓速')
    expect(result.charts[1].rawText).toBe('怪物有 +80% 的几率压制法术伤害\n+30(26-40)% 怪物的混沌抗性\n+35(26-40)% 怪物的元素抗性\n怪物的法术击中施加缓速\n怪物击中时致盲')
  })
  it('keeps the existing uncharted rejection category for a derived mainland prompt', () => {
    // Prompt candidate from handoff; derived text, not a collected real item.
    const uncharted = first.replace(/(\{ 基底属性 \}\n)[^\n]+/, '$1航行词缀将在完成测绘后揭示')
    expect(parseChartText(uncharted)).toEqual({ charts: [], rejected: [{ name: '航海 冒险 珊瑚暗礁海图', reason: 'not charted yet (run it first to reveal its modifier)' }] })
  })
})
