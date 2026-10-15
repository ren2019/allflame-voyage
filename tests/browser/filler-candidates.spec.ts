import { expect, test } from './offline'
import { defaultState, type AppState } from '../../src/logic/storage'
import type { ChartData } from '../../src/types'
import { exportState, loadState, openEmptyApp } from './acceptance-helpers'

// Artificial inventory reproducing the review finding, not client copy text.
// Nine level-90 quantity-100 charts are kept; exactly nine spare charts remain.
const inventory = (): AppState => ({
  ...defaultState(),
  strategyId: 'anchorfield-fishing',
  pool: ['best', 'filler'].flatMap((group) => Array.from({ length: 9 }, (_, i): ChartData => ({
    uid: `${group}-${i === 0 ? 'anchor' : i - 1}`,
    name: `${group}-${i === 0 ? 'anchor' : i - 1}`,
    level: group === 'best' ? 90 : 70,
    areaType: i === 0 ? 'anchorfield' : undefined,
    modIds: [],
    shape: 'Crossing',
    edges: [true, true, true, true],
    rewards: [{ stat: 'quantity', percent: group === 'best' ? 100 : 0 }],
  }))),
})

test('a spare voyage stays executable under an active strategy and uses only its eligible inventory', async ({ page }) => {
  await openEmptyApp(page)
  const state = inventory()
  await loadState(page, state)
  await page.locator('.solve-settings-btn').last().click()
  await page.locator('.filler-btn').click()
  await expect(page.locator('.solver')).toContainText('已用低价值备用海图组成可执行航程', { timeout: 30000 })
  await page.locator('.solver').getByRole('button', { name: '完成', exact: true }).click()
  await expect(page.locator('.solve-result').first()).not.toHaveClass(/invalid/)
  await page.locator('.solve-result').first().click()
  const applied = await exportState(page)
  expect(applied.strategyId).toBe('anchorfield-fishing')
  expect(applied.pool).toEqual(state.pool)
  expect(applied.board.map((p) => p!.chartUid).sort()).toEqual([
    'filler-anchor', 'filler-0', 'filler-1', 'filler-2', 'filler-3',
    'filler-4', 'filler-5', 'filler-6', 'filler-7',
  ].sort())
  await expect(page.locator('.solve-result').first()).toContainText('已载入 · 可执行')
})

test('spare candidates retain a preserved placement and expire when protections change', async ({ page }) => {
  await openEmptyApp(page)
  const state = inventory()
  state.pool[9].preserved = true
  state.board[0] = { chartUid: 'filler-anchor', rotation: 3 }
  await loadState(page, state)
  await page.locator('.solve-settings-btn').last().click()
  await page.locator('.filler-btn').click()
  await expect(page.locator('.solver')).toContainText('已用低价值备用海图组成可执行航程', { timeout: 30000 })
  await page.locator('.solver').getByRole('button', { name: '完成', exact: true }).click()
  await expect(page.locator('.solve-result').first()).not.toHaveClass(/invalid/)
  await page.locator('.solve-result').first().click()
  const applied = await exportState(page)
  expect(applied.board[0]).toEqual({ chartUid: 'filler-anchor', rotation: 3 })
  expect(applied.pool).toEqual(state.pool)
  // A newly protected spare invalidates the old batch before another solve.
  applied.pool.find((c) => c.uid === 'filler-0')!.preserved = true
  await loadState(page, applied)
  await expect(page.locator('.solve-result .sr-badge.ok')).toHaveCount(0)
  await expect(page.locator('.solve-result').first()).toContainText('不可执行')
})
