import { readFileSync } from 'node:fs'
import { expect, test } from './offline'
import type { AppState } from '../../src/logic/storage'
import { createVoyageRecord } from '../../src/logic/voyageHistory'
import { downloadPlanningState, loadPlanningState } from './journey-helpers'

const fixture: AppState = JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.json', import.meta.url), 'utf8'))
const ready = { ...fixture, voyageHistory: [], pool: fixture.pool.map(({ preserved: _, ...chart }) => chart) }
const base = createVoyageRecord(ready, 'derived-history-base', '2026-10-15T00:00:00.000Z')!
// Synthetic statistical history for acceptance; these are not claimed as real completed game voyages.
const history = (scores: number[]) => scores.map((score, i) => ({ ...base, score, completionId: `derived-${i}`,
  completedAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString() }))

test('当前盘只读参考从样本不足到完成后第五条，下一轮与刷新恢复一致', async ({ page }) => {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  const comparison = page.getByLabel('当前摆盘历史参考')
  await loadPlanningState(page, ready)
  await expect(comparison).toContainText('最近可比航程 0 次')
  await expect(comparison).toContainText('样本不足')
  const four = history([1, 2, 3, 4])
  await loadPlanningState(page, { ...ready, voyageHistory: four })
  await expect(comparison).toContainText('最近可比航程 4 次')
  await expect(comparison).toContainText('低于当前 4 次（100%）')
  await expect(comparison).not.toContainText('可优先跑')
  await page.locator('.finish-voyage').click()
  await expect(comparison).toContainText('摆盘完整且连接有效后')
  const completed = await downloadPlanningState(page)
  expect(completed.voyageHistory).toHaveLength(5)
  expect(completed.pool).toHaveLength(3)
  await loadPlanningState(page, { ...ready, voyageHistory: completed.voyageHistory })
  await expect(comparison).toContainText('最近可比航程 5 次')
  await expect(comparison).toContainText('历史较好，可优先跑')
  await expect(comparison).toContainText('低于当前 4 次（80%）')
  await expect(comparison).toContainText('等分 1 次（20%）')
  await expect(comparison).toContainText('高于当前 0 次（0%）')
  const next = await downloadPlanningState(page)
  expect(next.voyageHistory).toEqual(completed.voyageHistory)
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('allflame-voyage-solver') ?? '{}').voyageHistory?.length)).toBe(5)
  await page.reload()
  await expect(comparison).toContainText('历史较好，可优先跑')
  expect((await downloadPlanningState(page)).voyageHistory).toEqual(completed.voyageHistory)
})

test('切候选与策略仅重新比较，未选策略或无有效盘不伪造分位', async ({ page }) => {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  const samples = history([1, 2, 3, 4, 5])
  const prepared = { ...ready, voyageHistory: samples }
  await loadPlanningState(page, prepared)
  const comparison = page.getByLabel('当前摆盘历史参考')
  await expect(comparison).toContainText('历史较好，可优先跑')
  await page.locator('.solve-big').click()
  await expect(page.locator('.solve-result:not(.invalid)').first()).toBeVisible()
  for (const index of [0, 1]) {
    await page.locator('.solve-result:not(.invalid)').nth(index).click()
    const score = await page.locator('.score-total strong').innerText()
    await expect(comparison).toContainText(`当前分数 ${score}`)
    await expect(comparison).toContainText('最近可比航程 5 次')
    expect((await downloadPlanningState(page)).voyageHistory).toEqual(samples)
  }
  const current = await downloadPlanningState(page)
  await page.getByRole('combobox', { name: '当前策略', exact: true }).selectOption({ label: '速刷保险箱' })
  await expect(comparison).toContainText('最近可比航程 0 次')
  await expect(comparison).toContainText('样本不足')
  const changed = await downloadPlanningState(page)
  expect(changed.board).toEqual(current.board)
  expect(changed.voyageHistory).toEqual(samples)
  await page.getByRole('combobox', { name: '当前策略', exact: true }).selectOption('')
  await expect(comparison).toContainText('请选择策略')
  await expect(comparison).not.toContainText('可比航程')
  await loadPlanningState(page, { ...prepared, board: Array(9).fill(null) })
  await expect(comparison).toContainText('摆盘完整且连接有效后')
  await expect(comparison).not.toContainText('可比航程')
  expect((await downloadPlanningState(page)).voyageHistory).toEqual(samples)
})

test('三档与并列次数在明暗主题和390px下可读，只有真实严格高低才计次数', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  const comparison = page.getByLabel('当前摆盘历史参考')
  for (const [scores, label] of [
    [[20, 20, 20, 20, 20], '历史偏低，可考虑攒图'],
    [[base.score, base.score, base.score, base.score, base.score], '历史常规'],
    [[1, 2, 3, 4, 5], '历史较好，可优先跑'],
  ] as const) {
    await loadPlanningState(page, { ...ready, voyageHistory: history([...scores]) })
    await expect(comparison).toContainText(label)
  }
  await loadPlanningState(page, { ...ready, voyageHistory: history([1, base.score, base.score, 20, 30]) })
  await expect(comparison).toContainText('历史常规')
  await expect(comparison).toContainText('低于当前 1 次（20%）')
  await expect(comparison).toContainText('等分 2 次（40%）')
  await expect(comparison).toContainText('高于当前 2 次（40%）')
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const theme of ['dark', 'light']) {
      const toggle = page.getByRole('button', { name: `切换到${theme === 'dark' ? '深色' : '浅色'}主题`, exact: true })
      if (await toggle.isVisible()) await toggle.click()
      await comparison.locator('details').evaluate((element: HTMLDetailsElement) => { element.open = true })
      await expect(comparison).toContainText('当前待运行盘不计入样本')
      expect(await comparison.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const colors = await comparison.evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, text: getComputedStyle(element).color }))
      expect(colors).toEqual(theme === 'dark' ? { background: 'rgb(32, 36, 42)', text: 'rgb(232, 236, 242)' } : { background: 'rgb(255, 255, 255)', text: 'rgb(36, 44, 55)' })
      await comparison.screenshot({ path: testInfo.outputPath(`historical-reference-${theme}-${width}.png`) })
    }
  }
  expect(errors).toEqual([])
})
