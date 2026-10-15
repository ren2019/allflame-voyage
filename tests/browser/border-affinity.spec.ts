import { expect, test } from './offline'
import { readFileSync } from 'node:fs'
import { defaultState, type AppState } from '../../src/logic/storage'
import { exportState, loadState, openEmptyApp } from './acceptance-helpers'

const fixture: AppState = JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.json', import.meta.url), 'utf8'))
const borders = ['b-divine', 'b-rare-1', 'b-rare-1', ...Array(9).fill('b-exp-1')]

test('空库存先看十二边适配，换策略或摆盘仅按输入重算，查看明细不改规划', async ({ page }) => {
  await openEmptyApp(page)
  const panel = page.getByRole('region', { name: '边界适配分' })
  await expect(panel).toContainText('请选择策略')
  const initial = { ...defaultState(), strategyId: 'divine-border-rares', borders }
  await loadState(page, initial)
  await expect(panel.getByRole('status')).toHaveText('边界适配分 20')
  await expect(panel).toContainText('必要边界已具备')
  await panel.getByText('查看十二条贡献与依据').click()
  await expect(panel.locator('.border-affinity-entry')).toHaveCount(12)
  await expect(panel.locator('.border-affinity-entry').nth(1)).toContainText('+5')
  await expect(panel.locator('a').first()).toHaveAttribute('href', /github.com/)
  expect(await exportState(page)).toEqual(initial)

  await loadState(page, { ...fixture, strategyId: 'divine-border-rares', borders })
  await expect(panel.getByRole('status')).toHaveText('边界适配分 20')
  await expect(page.locator('.tile:not(.empty)')).toHaveCount(9)
  const card = page.locator('.strat-card').filter({ has: page.locator('.strat-name').filter({ hasText: '魔法怪流' }) })
  await card.locator('.strat-use').click()
  await expect(panel.getByRole('status')).toHaveText('边界适配分 0')
  const switched = await exportState(page)
  expect(switched.board).toEqual(fixture.board)
  expect(switched.pool).toEqual(fixture.pool)
  expect(switched.borders).toEqual(borders)
})

test('未填全、缺必要边界和未覆盖规则清楚区分，窄屏明暗主题详情可读', async ({ page }, testInfo) => {
  await openEmptyApp(page)
  const panel = page.getByRole('region', { name: '边界适配分' })
  await loadState(page, { ...defaultState(), strategyId: 'divine-border-rares', borders: Array(12).fill(null) })
  await expect(panel).toContainText('已录入 0/12 条边界，尚不能完整评估')
  await expect(panel.getByRole('status')).toHaveText('边界适配分 · 待评估')
  await page.locator('[data-border-segment="0"]').click()
  await page.getByPlaceholder('搜索边界词缀…').fill('稀有怪物数量提高 50%')
  await page.locator('.bpop-item').filter({ hasText: '相邻区域的稀有怪物数量提高 50%' }).click()
  await expect(panel).toContainText('已录入 1/12 条边界')
  await expect(panel).toContainText('已录入边界尚未见必要边界')

  await loadState(page, { ...defaultState(), strategyId: 'divine-border-rares', borders: Array(12).fill('b-rare-1') })
  await expect(panel.getByRole('status')).toHaveText('边界适配分 60')
  await expect(panel).toContainText('必要边界缺失')
  await panel.getByText('查看十二条贡献与依据').click()
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['dark', 'light']) {
      const target = theme === 'dark' ? '深色' : '浅色'
      const switcher = page.getByRole('button', { name: `切换到${target}主题`, exact: true })
      if (await switcher.count()) await switcher.click()
      await panel.scrollIntoViewIfNeeded()
      expect(await panel.evaluate(element => element.getBoundingClientRect().right <= innerWidth)).toBe(true)
      expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
      const colors = await panel.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, text: getComputedStyle(element).color }))
      expect(colors).toEqual(theme === 'dark' ? { background: 'rgb(32, 36, 42)', text: 'rgb(232, 236, 242)' } : { background: 'rgb(255, 255, 255)', text: 'rgb(36, 44, 55)' })
      await page.screenshot({ path: testInfo.outputPath(`border-affinity-${theme}-${width}.png`) })
    }
  }
  await loadState(page, { ...defaultState(), strategyId: 'alc-and-go', borders: [...Array(11).fill('b-pack-1'), 'unknown-future-border'] })
  await expect(panel).toContainText('规则尚未覆盖，不能完整评估')
  await expect(panel.getByRole('status')).toHaveText('边界适配分 · 待评估')
  expect(errors).toEqual([])
})
