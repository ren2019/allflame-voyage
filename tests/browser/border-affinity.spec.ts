import { expect, test } from './offline'
import { readFileSync } from 'node:fs'
import { defaultState, type AppState } from '../../src/logic/storage'
import { exportState, loadState, openEmptyApp } from './acceptance-helpers'

const fixture: AppState = JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.json', import.meta.url), 'utf8'))
const borders = ['b-divine', 'b-rare-1', 'b-rare-1', ...Array(9).fill('b-exp-1')]

test('摆盘内打开边界分析，十二条按已知权重降序且同分按位置排列，只读且可键盘关闭', async ({ page }) => {
  await openEmptyApp(page)
  const state = { ...defaultState(), strategyId: 'divine-border-rares', borders: [
    'b-minmagic', 'b-pack-3', 'b-rare-2', 'b-divine', 'b-pack-2', 'b-rare-2',
    'unknown-future-border', null, 'b-pack-3', 'b-divine', 'b-minmagic', 'b-rare-1',
  ] }
  await loadState(page, state)
  const board = page.locator('.board-wrap')
  await expect(board.getByLabel('边界相关度分档')).toBeVisible()
  const opener = board.getByRole('button', { name: '边界分析', exact: true })
  await opener.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: '边界分析', exact: true })
  await expect(dialog).toContainText('当前策略：稀有怪神圣雨')
  await expect(dialog.locator('.border-affinity-entry')).toHaveCount(12)
  await expect(dialog.locator('.border-affinity-position')).toHaveText(['右1', '左1', '上3', '右3', '左3', '上2', '下3', '右2', '上1', '左2', '下1', '下2'])
  await expect(dialog.locator('.border-affinity-entry').first()).toContainText('10/10 · 优先')
  await expect(dialog.locator('.border-affinity-entry').nth(8)).toContainText('0/10 · 可略')
  await expect(dialog.locator('.border-affinity-entry').nth(10)).toContainText('暂无规则')
  await expect(dialog.locator('.border-affinity-entry').last()).toContainText('尚未录入')
  await expect(dialog.locator('a').first()).toHaveAttribute('href', /github.com/)
  await expect(dialog).toContainText('规则版本：3.29-border-affinity-1')
  await expect(dialog.locator('.border-affinity-entry').first()).toContainText('神圣')
  await page.keyboard.press('Shift+Tab')
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Tab')
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()
  expect(await exportState(page)).toEqual(state)
})

test('主界面保留缺项提醒，切策略后分析更新，窄屏明暗主题弹窗可读且内部滚动', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openEmptyApp(page)
  const panel = page.getByRole('region', { name: '边界适配分' })
  const opener = panel.getByRole('button', { name: '边界分析', exact: true })
  const dialog = page.getByRole('dialog', { name: '边界分析', exact: true })
  await expect(panel).toContainText('先选策略')
  await opener.click()
  await expect(dialog).toContainText('当前策略：未选策略')
  await expect(dialog.locator('.border-affinity-entry')).toHaveCount(12)
  await expect(dialog.locator('.border-affinity-entry').first()).toContainText('待评估')
  await dialog.getByRole('button', { name: '关闭边界分析' }).click()

  await loadState(page, { ...defaultState(), strategyId: 'divine-border-rares', borders: Array(12).fill(null) })
  await expect(panel).toContainText('边界未填满（0/12）')
  await expect(panel).toContainText('尚缺必要边界')
  await page.locator('[data-border-segment="0"]').click()
  await page.getByPlaceholder('搜索边界词缀…').fill('稀有怪物数量提高 50%')
  await page.locator('.bpop-item').filter({ hasText: '相邻区域的稀有怪物数量提高 50%' }).click()
  await expect(panel).toContainText('边界未填满（1/12）')
  await opener.click()
  await expect(dialog.locator('.border-affinity-entry').first()).toContainText('5/10 · 留意')
  await page.keyboard.press('Escape')

  const state = { ...fixture, strategyId: 'divine-border-rares', borders: Array(12).fill('b-rare-1') }
  await loadState(page, state)
  const beforeAnalysis = await exportState(page)
  await expect(panel).toContainText('缺少必要边界')
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['dark', 'light']) {
      const target = theme === 'dark' ? '深色' : '浅色'
      const switcher = page.getByRole('button', { name: `切换到${target}主题`, exact: true })
      if (await switcher.count()) await switcher.click()
      await opener.click()
      expect(await dialog.evaluate(element => element.getBoundingClientRect().right <= innerWidth)).toBe(true)
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
      expect(await dialog.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
      const colors = await dialog.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, text: getComputedStyle(element).color }))
      expect(colors).toEqual(theme === 'dark' ? { background: 'rgb(32, 36, 42)', text: 'rgb(232, 236, 242)' } : { background: 'rgb(255, 255, 255)', text: 'rgb(36, 44, 55)' })
      await dialog.evaluate(element => { element.scrollTop = element.scrollHeight })
      expect(await dialog.evaluate(element => element.scrollTop > 0)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`border-analysis-${theme}-${width}.png`) })
      await dialog.getByRole('button', { name: '关闭边界分析' }).click()
      await expect(opener).toBeFocused()
    }
  }
  expect(await exportState(page)).toEqual(beforeAnalysis)
  await page.getByRole('group', { name: '当前策略', exact: true }).getByRole('button', { name: '魔法怪流', exact: true }).click()
  await opener.click()
  await expect(dialog).toContainText('当前策略：魔法怪流')
  await expect(dialog.locator('.border-affinity-entry').first()).toContainText('0/10 · 可略')
  await page.keyboard.press('Escape')
  const switched = await exportState(page)
  expect(switched.pool).toEqual(state.pool)
  expect(switched.board).toEqual(state.board)
  expect(switched.borders).toEqual(state.borders)
  // Known six is between seven and three, rather than grouped with the zeroes.
  await loadState(page, { ...defaultState(), strategyId: 'milky-ethereal', borders: ['b-pack-3', 'b-pack-2', 'b-minmagic', 'b-divine', ...Array(8).fill('b-mag-2')] })
  await opener.click()
  const weights = await dialog.locator('.border-affinity-row strong').allTextContents()
  expect(weights).toEqual(['10/10 · 优先', '8/10 · 优先', '6/10 · 留意', ...Array(8).fill('3/10 · 留意'), '0/10 · 可略'])
  await page.keyboard.press('Escape')
  await loadState(page, { ...defaultState(), strategyId: 'alc-and-go', borders: [...Array(11).fill('b-pack-1'), 'unknown-future-border'] })
  await expect(panel).toContainText('部分边界暂无规则')
  await opener.click()
  await expect(dialog.locator('.border-affinity-entry').last()).toContainText('暂无规则')
  await page.keyboard.press('Escape')
  await loadState(page, { ...defaultState(), strategyId: 'future-strategy', borders })
  await expect(panel).toContainText('部分边界暂无规则')
  await opener.click()
  await expect(dialog.locator('.border-affinity-entry')).toHaveCount(12)
  await expect(dialog.locator('.border-affinity-row strong')).toHaveText(Array(12).fill('待评估'))
  await expect(dialog.locator('.border-affinity-position')).toHaveText(['上1', '上2', '上3', '右1', '右2', '右3', '下1', '下2', '下3', '左1', '左2', '左3'])
  await page.keyboard.press('Escape')
  expect(errors).toEqual([])
  await expect(page.locator('[data-border-segment="11"] .bslot-affinity')).toHaveCount(0)
})


test('每条实际边界按0–2弱化、3–6蓝色、7–10金色展示，切策略同步且不改规划', async ({ page }, testInfo) => {
  await openEmptyApp(page)
  const state = { ...defaultState(), strategyId: 'divine-border-rares', borders: ['b-minmagic', 'b-pack-2', 'b-pack-3', 'b-rare-2', 'b-divine', ...Array(7).fill('b-minmagic')] }
  await loadState(page, state)
  const panel = page.getByRole('region', { name: '边界适配分' })
  await expect(panel.getByText('权重合计 22')).not.toBeVisible()
  await expect(panel.getByText('0–2 可略；3–6 留意；7–10 优先。')).not.toBeVisible()
  await expect(panel.locator('summary')).toHaveCount(0)
  await expect(panel.getByRole('button', { name: '边界分析', exact: true })).toBeVisible()
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
  await page.getByRole('group', { name: '当前策略', exact: true }).getByRole('button', { name: '魔法怪流', exact: true }).click()
  await expect(page.locator('[data-border-segment="0"]')).toHaveAttribute('data-affinity-band', 'high')
  await expect(page.locator('[data-border-segment="1"]')).toHaveAttribute('data-affinity-band', 'medium')
  await expect(page.locator('.bslot-affinity')).toHaveCount(0)
  await expect(page.locator('[data-border-segment="4"]')).toHaveAttribute('data-affinity-band', 'low')
  const after = await exportState(page)
  expect(after.borders).toEqual(state.borders)
  expect(after.pool).toEqual(state.pool)
  expect(after.board).toEqual(state.board)
})
