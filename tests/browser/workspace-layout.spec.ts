import { readFileSync } from 'node:fs'
import { test, expect } from './offline'
import { openEmptyApp, loadState, exportState, installClipboardRecorder } from './acceptance-helpers'
import type { AppState } from '../../src/logic/storage'

const inventory: AppState = JSON.parse(readFileSync(new URL('../../src/logic/__fixtures__/real-inventory-layout.json', import.meta.url), 'utf8'))

test('保留原栏宽和四列，顶部策略有玩法说明，求解评分复制核销恢复原位置', async ({ page }, testInfo) => {
  await installClipboardRecorder(page)
  await openEmptyApp(page)
  await loadState(page, inventory)
  const before = await exportState(page)
  for (const theme of ['dark', 'light']) {
    const toggle = page.getByRole('button', { name: `切换到${theme === 'dark' ? '深色' : '浅色'}主题`, exact: true })
    if (await toggle.count()) await toggle.click()
    for (const width of [1440, 1280, 1920, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await page.evaluate(() => scrollTo(0, 0))
      const geometry = await page.evaluate(() => {
        const rect = (selector: string) => {
          const r = document.querySelector(selector)!.getBoundingClientRect()
          return { x: r.x, top: r.top, bottom: r.bottom, width: r.width }
        }
        return {
          columns: getComputedStyle(document.querySelector('.chart-grid')!).gridTemplateColumns.split(' ').length,
          library: rect('.library'), strategy: rect('.strategies'), solve: rect('.solve-row'),
          score: rect('.score-total'), board: rect('.board-grid'),
          overflows: document.documentElement.scrollWidth > innerWidth,
        }
      })
      expect(geometry.columns).toBe(4)
      if (width > 1100) {
        expect(geometry.library.width).toBe(360)
      }
      expect(geometry.strategy.top).toBeLessThan(geometry.board.top)
      expect(geometry.solve.top).toBeGreaterThan(geometry.board.bottom)
      expect(geometry.score.top).toBeGreaterThan(geometry.solve.bottom)
      expect(geometry.overflows).toBe(false)
      const tile = page.locator('.board-grid .tile').first()
      await tile.hover()
      expect(await tile.evaluate(node => {
        const box = node.getBoundingClientRect()
        return [...node.querySelectorAll('.tile-actions button')].every(button => {
          const r = button.getBoundingClientRect()
          return r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom
        })
      })).toBe(true)
      await page.getByRole('radio', { name: '高价值', exact: true }).check()
      await page.screenshot({ path: testInfo.outputPath(`workspace-${theme}-${width}.png`), fullPage: true })
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.locator('.copy-into-game').click()
  const sequence = await page.locator('.copyseq').boundingBox()
  const board = await page.locator('.board-grid').boundingBox()
  expect(sequence!.y).toBeGreaterThan(board!.y + board!.height)
  await expect(page.locator('.copyseq')).toContainText('第 1/9 步')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  expect(await exportState(page)).toEqual(before)
})

test('策略按钮保留布局和中心选项，玩法常驻可读且不改规划，刷新恢复所选配置', async ({ page }) => {
  await openEmptyApp(page)
  await loadState(page, inventory)
  const before = await exportState(page)
  const strategy = page.getByRole('group', { name: '当前策略', exact: true })
  await expect(page.getByRole('combobox', { name: '当前策略', exact: true })).toHaveCount(0)
  await strategy.getByRole('button', { name: '点金速刷', exact: true }).click()
  await page.getByRole('combobox', { name: '策略布局', exact: true }).selectOption('snake')
  await strategy.getByRole('button', { name: '速刷保险箱', exact: true }).click()
  await page.getByRole('combobox', { name: '中心海图', exact: true }).selectOption('opbox')
  const chosen = await exportState(page)
  expect(chosen.layoutChoice['alc-and-go']).toBe('snake')
  expect(chosen.centerChoice['milky-speedrun']).toBe('opbox')
  expect(chosen.pool).toEqual(before.pool)
  expect(chosen.board).toEqual(before.board)
  await expect(page.locator('.strategy-summary')).toContainText('开启保险箱')
  await expect(page.locator('.strategy-guide .strat-guide')).toBeVisible()
  await page.getByText('导入说明与搜索参考', { exact: true }).click()
  await expect(page.locator('.import-reference .ahk-help').first()).toBeVisible()
  expect(await exportState(page)).toEqual(chosen)
  await page.waitForTimeout(400)
  await page.reload()
  await expect(strategy.getByRole('button', { name: '速刷保险箱', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('combobox', { name: '中心海图', exact: true })).toHaveValue('opbox')
  await strategy.getByRole('button', { name: '点金速刷', exact: true }).click()
  await expect(page.getByRole('combobox', { name: '策略布局', exact: true })).toHaveValue('snake')
})

test('预留17px滚动条空间后，原宽库存仍保持四列且按钮不越界', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openEmptyApp(page)
  await loadState(page, inventory)
  await page.getByRole('button', { name: '单条中文校准模式', exact: true }).click()
  // Mac uses overlay scrollbars. Reserve 17px explicitly to model classic scrollbar space.
  await page.addStyleTag({ content: '.chart-grid { padding-right: 19px; }' })
  const layout = await page.locator('.chart-grid').evaluate(grid => ({
    columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
    gutter: parseFloat(getComputedStyle(grid).paddingRight) - 2,
    overflow: [...grid.querySelectorAll('.chart-sq')].some(card => {
      const box = card.getBoundingClientRect()
      return [...card.querySelectorAll('.sq-head,.sq-footer,.sq-reward-text')].some(part => {
        const r = part.getBoundingClientRect()
        return r.left < box.left - 1 || r.right > box.right + 1
      })
    }),
  }))
  expect(layout.gutter).toBeGreaterThan(0)
  expect(layout.columns).toBe(4)
  expect(layout.overflow).toBe(false)
})

test('示例与随机边界紧邻教程，备份入口紧邻分享，恢复保留完整规划和文件兼容', async ({ page }) => {
  await openEmptyApp(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  const tools = page.getByRole('group', { name: '教程与示例', exact: true })
  await expect(tools.getByRole('button')).toHaveText(['🧭 使用教程', '🎲 示例 ×25', '🎲 随机边界'])
  const positions = await tools.getByRole('button').evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect()
    return { left: r.left, right: r.right, centerY: r.top + r.height / 2 }
  }))
  expect(positions[1].left).toBeGreaterThanOrEqual(positions[0].right)
  expect(positions[2].left).toBeGreaterThanOrEqual(positions[1].right)
  expect(positions[1].centerY).toBeCloseTo(positions[0].centerY, 0)
  expect(positions[2].centerY).toBeCloseTo(positions[0].centerY, 0)
  await expect(page.locator('.import-panel').getByRole('button', { name: /示例/ })).toHaveCount(0)
  await expect(page.locator('.board-wrap').getByRole('button', { name: /随机边界/ })).toHaveCount(0)
  await tools.getByRole('button', { name: '🎲 示例 ×25', exact: true }).click()
  const demo = await exportState(page)
  expect(demo.pool).toHaveLength(25)
  await tools.getByRole('button', { name: '🎲 随机边界', exact: true }).click()
  const random = await exportState(page)
  expect(random.borders).toHaveLength(12)
  expect(random.borders.every(id => typeof id === 'string' && id.length > 0)).toBe(true)
  expect({ ...random, borders: demo.borders }).toEqual(demo)
  const transfer = page.locator('header .planning-transfer')
  await expect(transfer.getByRole('button', { name: '分享摆盘', exact: true })).toBeVisible()
  await expect(transfer.getByRole('button', { name: '导出规划备份', exact: true })).toBeVisible()
  await expect(transfer.getByLabel('恢复规划备份', { exact: true })).toHaveCount(1)
  await expect(page.locator('.import-panel input[type=file]')).toHaveCount(0)
  const originalFormat = { ...JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.json', import.meta.url), 'utf8')), voyageHistory: [] }
  await loadState(page, originalFormat)
  const saved = await exportState(page)
  expect(saved).toEqual(originalFormat)
  await page.getByLabel('恢复规划备份', { exact: true }).setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') })
  await expect(page.locator('.planning-backup [role=status]')).toContainText('JSON 文件无效')
  expect(await exportState(page)).toEqual(saved)
  await loadState(page, saved)
  expect(await exportState(page)).toEqual(saved)
  await loadState(page, saved)
  expect(await exportState(page)).toEqual(saved)
})
