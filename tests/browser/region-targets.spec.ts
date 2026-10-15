import { test, expect } from './offline'
import { openEmptyApp, loadState, exportState } from './acceptance-helpers'
import { readFileSync } from 'node:fs'
const real = JSON.parse(
  readFileSync(
    new URL(
      '../../src/logic/__fixtures__/real-inventory-layout.json',
      import.meta.url,
    ),
    'utf8',
  ),
)
import type { AppState } from '../../src/logic/storage'

test('真实库存重算盘的中央目标可开关、键盘查看且不改变规划', async ({
  page,
}) => {
  await openEmptyApp(page)
  await loadState(page, real as AppState)
  const before = await exportState(page)
  const toggle = page.getByRole('button', { name: '区域目标', exact: true })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  const cells = page.locator('.region-targets')
  await expect(cells).toHaveCount(9)
  const gameArt = page.locator('.region-target img')
  expect(await gameArt.count()).toBeGreaterThan(0)
  await expect
    .poll(() =>
      gameArt.evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            (node as HTMLImageElement).complete &&
            (node as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true)
  await expect(gameArt.first()).toHaveCSS('filter', 'none')
  await expect(
    cells.nth(0).getByRole('button', { name: /宝藏锚/ }),
  ).toBeVisible()
  await expect(cells.nth(0).locator('button')).toHaveCount(4)
  await expect(cells.nth(1).getByRole('button', { name: /箱子/ })).toBeVisible()
  await expect(cells.nth(4).getByRole('button', { name: /箱子/ })).toHaveCount(
    0,
  )
  const icon = cells.nth(1).getByRole('button', { name: /箱子/ })
  await icon.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: '区域 2 目标详情' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('奥术师保险箱')
  await expect(dialog).toContainText('格 5')
  await expect(dialog).toContainText('精华囚禁怪')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(icon).toBeFocused()
  await page.setViewportSize({ width: 390, height: 844 })
  await cells.nth(0).scrollIntoViewIfNeeded()
  await page.screenshot({
    path: testInfo.outputPath('real-narrow.png'),
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  for (const tile of await page.locator('.tile.with-region-targets').all()) {
    const summary = tile.locator('.tile-duo,.tile-duo-text').first()
    if (await summary.count()) {
      const top = await summary.boundingBox(),
        overlay = await tile.locator('.region-targets').boundingBox()
      expect(top!.y + top!.height).toBeLessThanOrEqual(overlay!.y)
    }
  }
  await toggle.click()
  await expect(cells).toHaveCount(0)
  expect(await exportState(page)).toEqual(before)
})

test('派生合并与神圣条件样例支持四槽溢出、策略切换和空格', async ({
  page,
}, testInfo) => {
  await openEmptyApp(page)
  const chart = (uid: string, modIds: string[] = [], areaType?: string) => ({
    uid,
    name: uid,
    level: 83,
    edges: [true, true, true, true],
    modIds,
    areaType,
  })
  const pool = [
    chart('source', [
      'adj-box-1',
      'adj-box-2',
      'adj-arcbox-1',
      'adj-lantern',
      'adj-fish',
      'adj-spirit-1',
      'adj-msg-1',
    ]),
    chart('recipient', [], 'clam-infested-shelf'),
  ]
  const derived = {
    ...real,
    pool,
    board: [
      { chartUid: 'source', rotation: 0 },
      { chartUid: 'recipient', rotation: 0 },
      ...Array(7).fill(null),
    ],
    strategyId: 'divine-border-rares',
    borders: [null, 'b-divine', ...Array(10).fill(null)],
  }
  await loadState(page, derived as AppState)
  await page.getByRole('button', { name: '区域目标', exact: true }).click()
  const cells = page.locator('.region-targets')
  await expect(cells).toHaveCount(2)
  await expect(
    cells.nth(0).getByRole('button', { name: '暂无目标', exact: true }),
  ).toBeVisible()
  await expect(cells.nth(1).locator('button')).toHaveCount(4)
  await expect(
    cells.nth(1).getByRole('button', { name: /箱子 · 高优先级 98/ }),
  ).toBeVisible()
  await cells
    .nth(1)
    .getByRole('button', { name: /更多目标/ })
    .click()
  const detail = page.getByRole('dialog', { name: '区域 2 目标详情' })
  for (const text of [
    '奥术师保险箱',
    '普通保险箱',
    '珍稀鱼',
    '金币堆',
    '藏宝蛤蜊',
    '神圣石',
  ])
    await expect(detail).toContainText(text)
  await page.keyboard.press('Escape')
  await page
    .locator('.strat-card')
    .filter({
      has: page.locator('.strat-name').filter({ hasText: '魔法怪流' }),
    })
    .locator('.strat-use')
    .click()
  await expect(
    cells.nth(1).getByRole('button', { name: /箱子 · 中优先级 40/ }),
  ).toBeVisible()
  await expect(cells.nth(1).locator('button')).toHaveCount(4)
  await cells
    .nth(1)
    .getByRole('button', { name: /更多目标/ })
    .click()
  for (const text of [
    '奥术师保险箱',
    '普通保险箱',
    '珍稀鱼',
    '金币堆',
    '藏宝蛤蜊',
    '神圣石',
  ])
    await expect(detail).toContainText(text)
  await page.keyboard.press('Escape')
  await page.screenshot({
    path: testInfo.outputPath('desktop.png'),
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await cells.nth(1).scrollIntoViewIfNeeded()
  await page.screenshot({
    path: testInfo.outputPath('narrow.png'),
  })
  const bounds = await cells.nth(1).evaluate((el) => {
    const a = el.getBoundingClientRect(),
      t = el.closest('.tile')!.getBoundingClientRect()
    return {
      left: a.left >= t.left,
      right: a.right <= t.right,
      bottom: a.bottom <= t.bottom,
    }
  })
  expect(bounds).toEqual({ left: true, right: true, bottom: true })
})

test('单一目的地目标与明暗主题保持优先级颜色，原图不染色', async ({
  page,
}, testInfo) => {
  await openEmptyApp(page)
  const one = {
    ...real,
    strategyId: null,
    pool: [
      {
        uid: 'one',
        name: 'one',
        level: 83,
        edges: [true, true, true, true],
        modIds: [],
        areaType: 'anchorfield',
      },
    ],
    board: [{ chartUid: 'one', rotation: 0 }, ...Array(8).fill(null)],
    borders: Array(12).fill(null),
  }
  await loadState(page, one as AppState)
  await page.getByRole('button', { name: '区域目标', exact: true }).click()
  await expect(page.locator('.region-targets')).toHaveCount(1)
  const icon = page.locator('.region-targets button')
  await expect(icon).toHaveCount(1)
  await expect(icon).toHaveAccessibleName('箱子 · 高优先级 85 · 查看详情')
  await expect(icon).toHaveCSS('color', 'rgb(246, 198, 106)')
  await page.getByRole('button', { name: '切换到浅色主题' }).click()
  await expect(icon).toHaveCSS('color', 'rgb(138, 91, 0)')
  await page.screenshot({
    path: testInfo.outputPath('light.png'),
  })
})
