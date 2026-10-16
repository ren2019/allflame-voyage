import { readFileSync } from 'node:fs'
import { expect, test } from './offline'
import type { Page } from '@playwright/test'
import type { AppState } from '../../src/logic/storage'
import { downloadPlanningState, loadPlanningState, recordGuideClipboard } from './journey-helpers'

const fixture: AppState = JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.json', import.meta.url), 'utf8'))
const automatic: AppState = {
  ...fixture, voyageHistory: [],
  pool: fixture.pool.map(({ preserved: _preserved, ...chart }) => chart),
  borders: ['b-keep-2', null, null, null, null, null, 'b-keep-1', null, null, 'b-keep-1', null, null],
  disabledMods: ['b-keep-1', 'b-keep-2'],
  weights: { ...fixture.weights, preserve: 0 },
}

async function openCheck(page: Page, state = automatic) {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  await loadPlanningState(page, state)
  await page.locator('.finish-voyage').click()
  return page.getByRole('region', { name: '航程保留核查', exact: true })
}

test('自动保留核查按放置顺序复制当前海图，逐张确认后统一核销一次', async ({ page }) => {
  await recordGuideClipboard(page)
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  await loadPlanningState(page, automatic)
  await page.locator('.finish-voyage').click()
  const panel = page.locator('.preserve-confirm:not(.copyseq)')
  await expect(panel.locator('.pc-head')).toContainText('1/2')
  const first = automatic.pool.find((chart) => chart.uid === automatic.board[6]!.chartUid)!
  await expect(panel.locator('.pc-name')).toHaveText(first.name)
  await expect(page.locator('.board-grid .tile').nth(6)).toHaveClass(/highlighted/)
  await panel.getByRole('button', { name: '复制定位文本', exact: true }).click()
  await expect(panel.getByRole('status')).toContainText('已复制')
  await expect(panel.locator('.pc-head')).toContainText('1/2')
  await expect.poll(() => page.evaluate(() => (window as unknown as { copied: string[] }).copied))
    .toEqual([`${first.name} ${first.implicitText} 区域等级 ${first.level}`])
  expect(await downloadPlanningState(page)).toEqual(automatic)
  await panel.locator('.pc-kept').click()
  await expect(panel.locator('.pc-head')).toContainText('2/2')
  expect(await downloadPlanningState(page)).toEqual(automatic)
  await panel.locator('.pc-lost').evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(panel).toHaveCount(0)
  const finished = await downloadPlanningState(page)
  expect(finished.pool.map((chart) => chart.uid)).toEqual(automatic.pool.filter((chart) =>
    !automatic.board.some((placement) => placement?.chartUid === chart.uid) || chart.uid === first.uid,
  ).map((chart) => chart.uid))
  expect(finished.board).toEqual(Array(9).fill(null))
  expect(finished.voyageHistory).toHaveLength(1)
})

test('延迟剪贴板需确认才报成功，前进或取消后旧请求不能污染下一步', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: () => new Promise<void>((resolve, reject) => {
        Object.assign(window, { resolveCheckCopy: resolve, rejectCheckCopy: () => reject(new Error('Denied')) })
      }),
    } })
  })
  const panel = await openCheck(page)
  const status = panel.locator('[role=status]')
  const copy = panel.getByRole('button', { name: '复制定位文本', exact: true })
  await copy.click()
  await expect(status).toHaveText('正在复制…')
  expect(await downloadPlanningState(page)).toEqual(automatic)
  await page.evaluate(() => (window as unknown as { resolveCheckCopy: () => void }).resolveCheckCopy())
  await expect(status).toContainText('已复制定位文本')
  await expect(panel.locator('.pc-head')).toContainText('1/2')
  await copy.click()
  await panel.locator('.pc-kept').click()
  await expect(panel.locator('.pc-head')).toContainText('2/2')
  await page.evaluate(() => (window as unknown as { rejectCheckCopy: () => void }).rejectCheckCopy())
  await expect(status).toBeEmpty()
  await expect(panel.getByRole('textbox')).toHaveCount(0)
  await copy.click()
  await panel.getByRole('button', { name: '取消核销', exact: true }).click()
  await page.evaluate(() => (window as unknown as { resolveCheckCopy: () => void }).resolveCheckCopy())
  await page.locator('.finish-voyage').click()
  await expect(panel.locator('.pc-head')).toContainText('1/2')
  await expect(status).toBeEmpty()
  expect(await downloadPlanningState(page)).toEqual(automatic)
})

for (const unavailable of [false, true]) {
  test(`剪贴板${unavailable ? '不可用' : '拒绝'}保留步骤和库存，可选择完整原文手动复制`, async ({ page }) => {
    await page.addInitScript((missing) => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: missing ? undefined : {
        writeText: async () => { throw new Error('Denied') },
      } })
    }, unavailable)
    const panel = await openCheck(page)
    await panel.getByRole('button', { name: '复制定位文本', exact: true }).click()
    await expect(panel.getByRole('status')).toContainText('复制失败')
    const chart = automatic.pool.find((entry) => entry.uid === automatic.board[6]!.chartUid)!
    const text = `${chart.name} ${chart.implicitText} 区域等级 ${chart.level}`
    await expect(panel.getByRole('textbox', { name: '完整定位文本', exact: true })).toHaveValue(text)
    await panel.getByRole('button', { name: '选择全文', exact: true }).click()
    expect(await panel.getByRole('textbox').evaluate((el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart)).toBe(text.length)
    await expect(panel.locator('.pc-head')).toContainText('1/2')
    expect(await downloadPlanningState(page)).toEqual(automatic)
  })
}

for (const survived of [true, false]) {
  test(`自动和手工候选合并后全部${survived ? '保留' : '消耗'}，重复中间确认不跳步`, async ({ page }) => {
    const state = { ...automatic, pool: automatic.pool.map((chart, index) => ({ ...chart, preserved: index === 4 || index === 9 })) }
    const panel = await openCheck(page, state)
    const selected = survived ? '.pc-kept' : '.pc-lost'
    await expect(panel.locator('.pc-head')).toContainText('1/3')
    await panel.locator(selected).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
    await expect(panel.locator('.pc-head')).toContainText('2/3')
    await panel.locator(selected).click()
    await expect(panel.locator('.pc-head')).toContainText('3/3')
    expect(await downloadPlanningState(page)).toEqual(state)
    await panel.locator(selected).click()
    const finished = await downloadPlanningState(page)
    expect(finished.pool.map((chart) => chart.uid)).toEqual(survived
      ? ['journey-01', 'journey-05', 'journey-07', 'journey-10', 'journey-11', 'journey-12']
      : ['journey-10', 'journey-11', 'journey-12'])
    // A manual off-board marker remains untouched even when all placed charts are consumed.
    expect(finished.pool.find((chart) => chart.uid === 'journey-10')?.preserved).toBe(true)
    expect(finished.voyageHistory).toHaveLength(1)
  })
}

test('任意中间步骤取消完全回滚，恢复新规划使旧核销失效，重新开始清除旧结果', async ({ page }) => {
  const panel = await openCheck(page)
  for (const intermediate of [0, 1]) {
    if (intermediate) await panel.locator('.pc-kept').click()
    await panel.getByRole('button', { name: '取消核销', exact: true }).click()
    expect(await downloadPlanningState(page)).toEqual(automatic)
    await page.locator('.finish-voyage').click()
    await expect(panel.locator('.pc-head')).toContainText('1/2')
  }
  await panel.locator('.pc-kept').click()
  const replacement = { ...automatic, pool: automatic.pool.map((chart) => ({ ...chart, name: `新库存 ${chart.name}` })) }
  await loadPlanningState(page, replacement)
  await expect(panel).toHaveCount(0)
  await expect(page.locator('.voyage-msg')).toContainText('已取消核销')
  expect(await downloadPlanningState(page)).toEqual(replacement)
  await page.locator('.finish-voyage').click()
  await expect(panel.locator('.pc-head')).toContainText('1/2')
  await expect(panel.locator('.pc-name')).toContainText('新库存')
  await panel.locator('.pc-lost').click()
  await panel.locator('.pc-lost').click()
  expect((await downloadPlanningState(page)).pool).toHaveLength(3)
})

for (const width of [1280, 390]) {
  test(`${width}px 两主题核查信息和全部操作自动进入视口且无横向溢出`, async ({ page }) => {
    const height = width === 1280 ? 720 : 844
    await page.setViewportSize({ width, height })
    await recordGuideClipboard(page)
    const panel = await openCheck(page)
    for (const theme of ['dark', 'light']) {
      if (theme === 'light') {
        await panel.getByRole('button', { name: '取消核销', exact: true }).click()
        await page.locator('.theme-link').click()
        await page.locator('.finish-voyage').click()
      }
      await expect(panel.locator('.pc-head')).toContainText('1/2')
      for (const control of [panel.locator('.pc-head'), ...await panel.getByRole('button').all()]) {
        await expect(control).toBeVisible()
        await expect.poll(async () => {
          const bounds = await control.boundingBox()
          return !!bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= height
        }).toBe(true)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await panel.getByRole('button', { name: '复制定位文本', exact: true }).click()
      await expect(panel.getByRole('status')).toContainText('已复制')
      await page.screenshot({ path: `/tmp/allflame-voyage-40-${width}-${theme}.png` })
    }
  })
}

test('核查期间调整评分策略不改变候选，最终历史仍记录完成时的计分口径', async ({ page }) => {
  const panel = await openCheck(page)
  await page.getByRole('group', { name: '当前策略', exact: true }).getByRole('button', { name: '无策略（手动）', exact: true }).click()
  await expect(panel.locator('.pc-head')).toContainText('1/2')
  expect((await downloadPlanningState(page)).strategyId).toBeNull()
  await panel.locator('.pc-lost').click()
  await panel.locator('.pc-lost').click()
  const finished = await downloadPlanningState(page)
  expect(finished.voyageHistory).toHaveLength(1)
  expect(finished.voyageHistory[0].strategyId).toBeNull()
  expect(finished.voyageHistory[0].scoringContext.strategyId).toBeNull()
})
