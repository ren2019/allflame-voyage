import { readFileSync } from 'node:fs'
import { expect, test } from './offline'
import { clipboardWrites, exportState, installClipboardRecorder, loadState, openEmptyApp } from './acceptance-helpers'
import type { AppState } from '../../src/logic/storage'

const inventory: AppState = { ...JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.json', import.meta.url), 'utf8')), voyageHistory: [] }

test('桌面历史在右侧，开始复制后无需额外滚动即可看到完整操作按钮', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await installClipboardRecorder(page)
  await openEmptyApp(page)
  await loadState(page, inventory)
  const positions = await page.evaluate(() => {
    const board = document.querySelector('.board-grid')!.getBoundingClientRect()
    return ['当前摆盘历史参考', '航程历史'].map(label => {
      const panel = document.querySelector(`[aria-label="${label}"]`)!.getBoundingClientRect()
      return { historyLeft: panel.left, boardRight: board.right }
    })
  })
  for (const position of positions) expect(position.historyLeft).toBeGreaterThan(position.boardRight)
  await page.evaluate(() => scrollTo(0, 0))
  await page.getByRole('button', { name: '📋 复制到游戏', exact: true }).click()
  // Measure before any action on the copy button: locator.click auto-scrolls and masks this bug.
  await expect.poll(() => page.locator('.copyseq-go').evaluate(button => {
    const box = button.getBoundingClientRect()
    return box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth
  })).toBe(true)
})

test('390px 两个历史区初始折叠，可展开阅读，且不挤入摆盘与复制操作之间', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openEmptyApp(page)
  await loadState(page, inventory)
  for (const label of ['当前摆盘历史参考', '航程历史']) {
    const panel = page.getByLabel(label, { exact: true })
    await expect(panel).toHaveJSProperty('open', false)
    await panel.locator(':scope > summary').click()
    await expect(panel).toHaveAttribute('open', '')
    expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  }
  await expect(page.getByLabel('当前摆盘历史参考', { exact: true })).toContainText('最近可比航程')
  await expect(page.getByLabel('航程历史', { exact: true })).toContainText('已记录 0 次')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '📋 复制到游戏', exact: true }).click()
  expect(await page.locator('.copyseq').evaluate(panel => panel.previousElementSibling?.classList.contains('board-wrap'))).toBe(true)
  await expect.poll(() => page.locator('.copyseq-go').evaluate(button => {
    const box = button.getBoundingClientRect()
    return box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth
  })).toBe(true)
})

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  for (const theme of ['dark', 'light']) {
    test(`${viewport.width}×${viewport.height} ${theme} 九步复制的按钮、高亮、搜索内容一致且完成取消刷新均不改规划`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport)
      await installClipboardRecorder(page)
      await openEmptyApp(page)
      await loadState(page, inventory)
      const toggle = page.getByRole('button', { name: `切换到${theme === 'dark' ? '深色' : '浅色'}主题`, exact: true })
      if (await toggle.count()) await toggle.click()
      const comparisonBefore = await page.getByLabel('当前摆盘历史参考', { exact: true }).textContent()
      await page.getByRole('button', { name: '📋 复制到游戏', exact: true }).click()
      await page.getByRole('button', { name: '取消', exact: true }).click()
      expect(await exportState(page)).toEqual(inventory)
      await page.evaluate(() => scrollTo(0, 0))
      await page.getByRole('button', { name: '📋 复制到游戏', exact: true }).click()
      const expectedWrites: string[] = []
      const order = [6, 7, 8, 3, 4, 5, 0, 1, 2]
      const measurements: unknown[] = []
      for (const [step, cell] of order.entries()) {
        const chart = inventory.pool.find(chart => chart.uid === inventory.board[cell]!.chartUid)!
        await expect(page.locator('.copyseq .pc-head')).toContainText(`第 ${step + 1}/9 步`)
        await expect(page.locator('.copyseq .pc-name')).toHaveText(chart.name)
        await expect(page.locator('.board-grid .tile.highlighted')).toHaveCount(1)
        await expect(page.locator('.board-grid .tile').nth(cell)).toHaveClass(/highlighted/)
        // Check real viewport coordinates before mouse/keyboard input; locator actions may auto-scroll.
        await expect.poll(() => page.locator('.copyseq-go').evaluate(button => {
          const box = button.getBoundingClientRect()
          return box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth
        })).toBe(true)
        const box = await page.locator('.copyseq-go').boundingBox()
        measurements.push({ step: step + 1, ...box })
        expectedWrites.push(`${chart.name} ${chart.implicitText} 区域等级 ${chart.level}`)
        if (step === 8) await page.screenshot({ path: testInfo.outputPath(`copy-${theme}-${viewport.width}x${viewport.height}.png`) })
        // Exercise both supported inputs without letting Playwright scroll the action for us.
        if (step % 2) await page.keyboard.press('Control+c')
        else await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
        await expect.poll(() => clipboardWrites(page)).toEqual(expectedWrites)
      }
      await testInfo.attach('copy-button-viewport-coordinates', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' })
      await expect(page.locator('.copyseq')).toHaveCount(0)
      await expect(page.locator('.board-grid .tile.highlighted')).toHaveCount(0)
      expect(await exportState(page)).toEqual(inventory)
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('allflame-voyage-solver') ?? '{}').pool?.length)).toBe(inventory.pool.length)
      await page.reload()
      expect(await exportState(page)).toEqual(inventory)
      expect(await page.getByLabel('当前摆盘历史参考', { exact: true }).textContent()).toBe(comparisonBefore)
      await expect(page.locator('.copyseq')).toHaveCount(0)
    })
  }
}
