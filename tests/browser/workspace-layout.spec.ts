import { readFileSync } from 'node:fs'
import { test, expect } from './offline'
import { openEmptyApp, loadState, exportState, installClipboardRecorder } from './acceptance-helpers'
import type { AppState } from '../../src/logic/storage'

const inventory: AppState = JSON.parse(readFileSync(new URL('../../src/logic/__fixtures__/real-inventory-layout.json', import.meta.url), 'utf8'))

test('原版栏宽保留四列库存，策略求解评分先于摆盘，复制步骤紧邻高亮板', async ({ page }, testInfo) => {
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
          boardOverflow: [...document.querySelectorAll('.board-grid > *')].some(e => e.getBoundingClientRect().right > document.querySelector('.board-grid')!.getBoundingClientRect().right + 1),
        }
      })
      expect(geometry.columns).toBe(4)
      if (width > 1100) {
        expect(geometry.library.width).toBe(360)
        expect(geometry.solve.bottom).toBeLessThan(900)
        expect(geometry.score.bottom).toBeLessThan(900)
      }
      expect(geometry.strategy.top).toBeLessThan(geometry.board.top)
      expect(geometry.solve.bottom).toBeLessThan(geometry.board.top)
      expect(geometry.overflows).toBe(false)
      expect(geometry.boardOverflow).toBe(false)
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
  expect(sequence!.y + sequence!.height).toBeLessThanOrEqual(board!.y)
  await expect(page.locator('.copyseq')).toContainText('第 1/9 步')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  expect(await exportState(page)).toEqual(before)
})

test('紧凑策略入口保留布局和中心选项，展开攻略只读，刷新恢复所选配置', async ({ page }) => {
  await openEmptyApp(page)
  await loadState(page, inventory)
  const before = await exportState(page)
  const strategy = page.getByRole('combobox', { name: '当前策略', exact: true })
  await strategy.selectOption('alc-and-go')
  await page.getByRole('combobox', { name: '策略布局', exact: true }).selectOption('snake')
  await strategy.selectOption('milky-speedrun')
  await page.getByRole('combobox', { name: '中心海图', exact: true }).selectOption('opbox')
  const chosen = await exportState(page)
  expect(chosen.layoutChoice['alc-and-go']).toBe('snake')
  expect(chosen.centerChoice['milky-speedrun']).toBe('opbox')
  expect(chosen.pool).toEqual(before.pool)
  expect(chosen.board).toEqual(before.board)
  await page.getByText('攻略与材料', { exact: true }).click()
  await expect(page.locator('.strategy-guide .strat-guide')).toBeVisible()
  await page.getByText('导入说明与搜索参考', { exact: true }).click()
  await expect(page.locator('.import-reference .ahk-help').first()).toBeVisible()
  expect(await exportState(page)).toEqual(chosen)
  await page.waitForTimeout(400)
  await page.reload()
  await expect(strategy).toHaveValue('milky-speedrun')
  await expect(page.getByRole('combobox', { name: '中心海图', exact: true })).toHaveValue('opbox')
  await strategy.selectOption('alc-and-go')
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
