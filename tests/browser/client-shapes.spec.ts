import { readFileSync } from 'node:fs'
import { expect, test } from './offline'
import expected from '../../samples/charted-extra-shapes.zh-CN.expected.json' with { type: 'json' }
import { downloadPlanningState } from './journey-helpers'

const extra = readFileSync(new URL('../../samples/charted-extra-shapes.zh-CN.txt', import.meta.url), 'utf8')
const original = readFileSync(new URL('../../samples/charted.zh-CN.txt', import.meta.url), 'utf8')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
})
for (const [index, chart] of expected.entries()) {
  test(`real controls import collected ${chart.shape} and export its literal fields`, async ({ page }) => {
    await page.locator('.import-panel textarea').fill(extra.trim().split(/\n\s*(?=物品类别: 海图)/)[index])
    await page.locator('.import-actions button').first().click()
    await expect(page.locator('.import-panel .muted.pad')).toHaveText('导入 1 张海图')
    await expect(page.locator('.chart-grid .chart-sq')).toHaveCount(1)
    const state = await downloadPlanningState(page)
    const { uid: _uid, ...actual } = state.pool[0]
    expect(actual).toEqual(chart)
  })
}
test('real controls import the original and new copies together with Windows line endings', async ({ page }) => {
  await page.locator('.import-panel textarea').fill(`${original}\n${extra}`.replace(/\n/g, '\r\n'))
  await page.locator('.import-actions button').first().click()
  await expect(page.locator('.import-panel .muted.pad')).toHaveText('导入 5 张海图')
  await expect(page.locator('.chart-grid .chart-sq')).toHaveCount(5)
  const state = await downloadPlanningState(page)
  expect(state.pool.map((chart) => chart.shape)).toEqual(['End', 'Straight', 'Corner', 'Junction', 'Crossing'])
  expect(new Set(state.pool.map((chart) => chart.uid)).size).toBe(5)
  expect(state.pool.slice(2).map(({ uid: _uid, ...chart }) => chart)).toEqual(expected)
})
