import { expect, test } from './offline'
import { readFileSync } from 'node:fs'
import { defaultState, type AppState } from '../../src/logic/storage'
import { exportState, loadState, openEmptyApp } from './acceptance-helpers'

const fixture: AppState = JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.json', import.meta.url), 'utf8'))
const borders = ['b-divine', 'b-rare-1', 'b-rare-1', ...Array(9).fill('b-exp-1')]

test('空库存先看十二边适配，换策略或摆盘仅按输入重算，查看明细不改规划', async ({ page }) => {
  await openEmptyApp(page)
  const panel = page.getByRole('region', { name: '边界适配分' })
  await expect(panel).toContainText('先选策略')
  const initial = { ...defaultState(), strategyId: 'divine-border-rares', borders }
  await loadState(page, initial)
  await expect(panel.getByRole('status', { includeHidden: true })).toHaveText('重点 1 条 · 适配 2 条')
  await expect(panel).toContainText('必要边界已具备')
  await panel.getByText('依据', { exact: true }).click()
  await expect(panel.locator('.border-affinity-entry')).toHaveCount(12)
  await expect(panel.locator('.border-affinity-entry').nth(1)).toContainText('5/10 · 适配')
  await expect(panel.locator('a').first()).toHaveAttribute('href', /github.com/)
  expect(await exportState(page)).toEqual(initial)

  await loadState(page, { ...fixture, strategyId: 'divine-border-rares', borders })
  await expect(panel.getByRole('status', { includeHidden: true })).toHaveText('重点 1 条 · 适配 2 条')
  await expect(page.locator('.tile:not(.empty)')).toHaveCount(9)
  const card = page.locator('.strat-card').filter({ has: page.locator('.strat-name').filter({ hasText: '魔法怪流' }) })
  await card.locator('.strat-use').click()
  await expect(panel.getByRole('status', { includeHidden: true })).toHaveText('重点 0 条 · 适配 0 条')
  const switched = await exportState(page)
  expect(switched.board).toEqual(fixture.board)
  expect(switched.pool).toEqual(fixture.pool)
  expect(switched.borders).toEqual(borders)
})

test('未填全、缺必要边界和未覆盖规则清楚区分，窄屏明暗主题详情可读', async ({ page }, testInfo) => {
  await openEmptyApp(page)
  const panel = page.getByRole('region', { name: '边界适配分' })
  await loadState(page, { ...defaultState(), strategyId: 'divine-border-rares', borders: Array(12).fill(null) })
  await expect(panel).toContainText('边界未填满（0/12）')
  await expect(panel.getByRole('status', { includeHidden: true })).toHaveText('待评估')
  await page.locator('[data-border-segment="0"]').click()
  await page.getByPlaceholder('搜索边界词缀…').fill('稀有怪物数量提高 50%')
  await page.locator('.bpop-item').filter({ hasText: '相邻区域的稀有怪物数量提高 50%' }).click()
  await expect(panel).toContainText('边界未填满（1/12）')
  await expect(panel).toContainText('尚缺必要边界')

  await loadState(page, { ...defaultState(), strategyId: 'divine-border-rares', borders: Array(12).fill('b-rare-1') })
  await expect(panel.getByRole('status', { includeHidden: true })).toHaveText('重点 0 条 · 适配 12 条')
  await expect(panel).toContainText('缺少必要边界')
  await panel.getByText('依据', { exact: true }).click()
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
  await expect(panel).toContainText('部分边界暂无规则')
  await expect(panel.getByRole('status', { includeHidden: true })).toHaveText('待评估')
  expect(errors).toEqual([])
  await expect(page.locator('[data-border-segment="11"] .bslot-affinity')).toHaveCount(0)
})


test('每条实际边界按0–2弱化、3–6蓝色、7–10金色展示，切策略同步且不改规划', async ({ page }, testInfo) => {
  await openEmptyApp(page)
  const state = { ...defaultState(), strategyId: 'divine-border-rares', borders: ['b-minmagic', 'b-pack-2', 'b-pack-3', 'b-rare-2', 'b-divine', ...Array(7).fill('b-minmagic')] }
  await loadState(page, state)
  const panel = page.getByRole('region', { name: '边界适配分' })
  await expect(panel.getByRole('status', { includeHidden: true })).toHaveText('重点 2 条 · 适配 1 条')
  await expect(panel.getByText('权重合计 22')).not.toBeVisible()
  await expect(panel.getByText('0–2 可忽略；3–6 适配；7–10 重点。')).not.toBeVisible()
  await expect(panel.locator('summary')).toHaveText('依据')
  for (const [segment, , band] of [[0, 0, 'low'], [1, 2, 'low'], [2, 3, 'medium'], [3, 7, 'high'], [4, 10, 'high']] as const) {
    const edge = page.locator(`[data-border-segment="${segment}"]`)
    await expect(edge).toHaveAttribute('data-affinity-band', band)
    await expect(edge.locator('.bslot-affinity')).toHaveCount(0)
    await expect(edge).not.toHaveAttribute('title', /相关度|\/10/)
  }
  expect(await exportState(page)).toEqual(state)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['dark', 'light']) {
      const button = page.getByRole('button', { name: `切换到${theme === 'dark' ? '深色' : '浅色'}主题`, exact: true })
      if (await button.count()) await button.click()
      const colors = await page.locator('.board-grid [data-affinity-band]').evaluateAll(edges => Object.fromEntries(edges.map(edge => [edge.getAttribute('data-border-segment'), getComputedStyle(edge).borderColor])))
      expect(colors[0]).toBe(theme === 'dark' ? 'rgb(59, 66, 77)' : 'rgb(220, 225, 232)')
      expect(colors[2]).toBe(theme === 'dark' ? 'rgb(116, 182, 244)' : 'rgb(32, 95, 155)')
      expect(colors[3]).toBe(theme === 'dark' ? 'rgb(246, 198, 106)' : 'rgb(138, 91, 0)')
      for (const edge of await page.locator('.bslot').all()) {
        expect(await edge.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
        if (await edge.evaluate(element => element.classList.contains('bslot-vertical'))) {
          const label = edge.locator('.bslot-label')
          expect(await label.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
          await expect(label).not.toHaveCSS('text-overflow', 'ellipsis')
        }
      }
      await page.locator('.board-wrap').screenshot({ path: testInfo.outputPath(`border-bands-${theme}-${width}.png`) })
    }
  }
  await page.locator('.strat-card').filter({ has: page.locator('.strat-name').filter({ hasText: '魔法怪流' }) }).locator('.strat-use').click()
  await expect(page.locator('[data-border-segment="0"]')).toHaveAttribute('data-affinity-band', 'high')
  await expect(page.locator('[data-border-segment="1"]')).toHaveAttribute('data-affinity-band', 'medium')
  await expect(page.locator('.bslot-affinity')).toHaveCount(0)
  await expect(page.locator('[data-border-segment="4"]')).toHaveAttribute('data-affinity-band', 'low')
  const after = await exportState(page)
  expect(after.borders).toEqual(state.borders)
  expect(after.pool).toEqual(state.pool)
  expect(after.board).toEqual(state.board)
})
