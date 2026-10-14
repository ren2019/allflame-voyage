import { expect, it } from 'vitest'
import extra from '../../samples/charted-extra-shapes.zh-CN.txt?raw'
import original from '../../samples/charted.zh-CN.txt?raw'
import expected from '../../samples/charted-extra-shapes.zh-CN.expected.json' with { type: 'json' }
import { parseChartText } from './parser'

const [corner, junction, crossing] = extra.trim().split(/\n\s*(?=物品类别: 海图)/)
it('imports the real client 角落 chart with its existing Corner topology', () => {
  const result = parseChartText(corner)
  expect(result.rejected).toEqual([])
  expect(result.charts).toHaveLength(1)
  expect(result.charts[0]).toMatchObject({ name: '远洋 冒险 珊瑚暗礁海图', level: 83,
    areaType: 'seafloor-ridges', shape: 'Corner', edges: [true, true, false, false],
    modIds: ['voy-flask'], rewards: [{ stat: 'quantity', percent: 165 }, { stat: 'sulphur', percent: 30 }] })
})
it.each(expected.map((chart, index) => ({ chart, index })))('preserves all copied fields and only original downside text for $chart.shape', ({ chart, index }) => {
  const text = extra.trim().split(/\n\s*(?=物品类别: 海图)/)[index]
  const result = parseChartText(text)
  expect(result.rejected).toEqual([])
  const { uid: _uid, ...actual } = result.charts[0]
  expect(actual).toEqual(chart)
})
it.each(['LF', 'CRLF'])('imports all five collected shapes in a %s batch as distinct instances', (newline) => {
  const text = `${original}\n${extra}`
  const result = parseChartText(newline === 'CRLF' ? text.replace(/\n/g, '\r\n') : text)
  expect(result.rejected).toEqual([])
  expect(result.charts.map((chart) => chart.shape)).toEqual(['End', 'Straight', 'Corner', 'Junction', 'Crossing'])
  expect(new Set(result.charts.map((chart) => chart.uid)).size).toBe(5)
  expect(result.charts.slice(2).map(({ uid: _uid, ...chart }) => chart)).toEqual(expected)
})
it('imports the real 交叉 chart with its existing Operative Strongbox effect', () => {
  const result = parseChartText(crossing)
  expect(result.rejected).toEqual([])
  expect(result.charts[0]).toMatchObject({ name: '海洋 旅程 珊瑚密林海图', areaType: 'undersea-groves', level: 83,
    shape: 'Crossing', edges: [true, true, true, true], modIds: ['adj-opbox-1'],
    rewards: [{ stat: 'quantity', percent: 95 }, { stat: 'sulphur', percent: 30 }, { stat: 'packsize', percent: 16 }] })
})
it('imports the real 节点 chart without dropping its header rarity reward', () => {
  const result = parseChartText(junction)
  expect(result.rejected).toEqual([])
  expect(result.charts[0]).toMatchObject({ name: '海洋 旅程 金沙海床海图', areaType: 'abyssal-plain', level: 83,
    shape: 'Junction', edges: [true, true, true, false], modIds: ['voy-pack-2'],
    rewards: [{ stat: 'quantity', percent: 32 }, { stat: 'packsize', percent: 25 }, { stat: 'rarity', percent: 60 }] })
})
