import { test, expect } from './offline'
import { readFileSync } from 'node:fs'
import { openEmptyApp, loadState, exportState } from './acceptance-helpers'
import type { AppState } from '../../src/logic/storage'

const inventory: AppState = JSON.parse(readFileSync(new URL('../../src/logic/__fixtures__/real-inventory-layout.json', import.meta.url), 'utf8'))

test('真实库存网格与列表的海图卡片及内容互不重叠', async ({ page }, testInfo) => {
  await openEmptyApp(page)
  await loadState(page, inventory)
  const before = await exportState(page)
  for (const theme of ['dark', 'light']) {
    const switcher = page.getByRole('button', { name: `切换到${theme === 'dark' ? '深色' : '浅色'}主题`, exact: true })
    if (await switcher.count()) await switcher.click()
    for (const width of [1440, 1280, 1024, 1920, 390]) {
      await page.setViewportSize({ width, height: 1000 })
      for (const view of ['grid', 'list']) {
        const switcher = page.getByRole('button', { name: view === 'list' ? '列表视图（编辑海图）' : '网格视图', exact: true })
        if (await switcher.count()) await switcher.click()
        const cards = page.locator(view === 'grid' ? '.chart-sq' : '.chart-card')
        await expect(cards).toHaveCount(inventory.pool.length)
        const overlaps = await cards.evaluateAll(nodes => {
          const rects = nodes.map(node => node.getBoundingClientRect())
          const failures: { a: number; b: number; width: number; height: number }[] = []
          for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) {
            const width = Math.min(rects[a].right, rects[b].right) - Math.max(rects[a].left, rects[b].left)
            const height = Math.min(rects[a].bottom, rects[b].bottom) - Math.max(rects[a].top, rects[b].top)
            if (width > 1 && height > 1) failures.push({ a, b, width, height })
          }
          return failures.slice(0, 5)
        })
        await page.locator('.library').screenshot({ path: testInfo.outputPath(`inventory-${view}-${theme}-${width}.png`) })
        expect(overlaps, `${view}/${width}: card rectangles overlap`).toEqual([])
        if (view === 'grid') {
          const overflow = await cards.evaluateAll(nodes => nodes.flatMap((card, index) => {
            const box = card.getBoundingClientRect()
            return [...card.querySelectorAll('.sq-head,.sq-reward-text,.sq-shortname,.sq-pct,.sq-statname,.sq-footer')].flatMap(node => {
              const rect = node.getBoundingClientRect()
              return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1 ? [{ index, part: node.className, box: { width: box.width, height: box.height }, content: { width: rect.width, height: rect.height } }] : []
            })
          }).slice(0, 5))
          expect(overflow, `${view}/${width}: card content reaches neighboring cards`).toEqual([])
        }
      }
    }
  }
  expect(await exportState(page)).toEqual(before)
})
