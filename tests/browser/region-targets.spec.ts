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

test('词缀计分开关更新分数但保留真实区域目标和规划', async ({ page }) => {
  await openEmptyApp(page)
  const pool = Array.from({ length: 9 }, (_, i) => ({
    uid: `score-toggle-${i}`,
    name: `区域 ${i + 1}`,
    level: 83,
    edges: [true, true, true, true],
    modIds: i === 4 ? ['adj-box-1', 'voy-jelly'] : [],
  }))
  await loadState(page, {
    ...real,
    strategyId: null,
    weights: { 'adjacent:box': 4, 'border:divine': 10 },
    disabledMods: [],
    adjacentAffectsSelf: false,
    pool,
    board: pool.map((c) => ({ chartUid: c.uid, rotation: 0 })),
    borders: [null, 'b-divine', ...Array(10).fill(null)],
  } as AppState)
  const before = await exportState(page)
  const score = page.locator('.score-total strong')
  await expect(score).toHaveText('14.4')
  await page.getByRole('radio', { name: '全部', exact: true }).check()
  const cells = page.locator('.region-targets')
  const targetNames = await cells.locator('button').evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label')),
  )
  await expect(cells.getByRole('button', { name: /友好水母/ })).toHaveCount(9)
  await page.getByRole('button', { name: '词缀', exact: true }).click()
  const browser = page.locator('.modbrowser')
  const search = page.getByPlaceholder('搜索词缀…')
  await search.fill('水母')
  await browser.getByRole('checkbox').uncheck()
  await search.fill('相邻区域包含 1 个额外保险箱')
  await browser.getByRole('checkbox').uncheck()
  await browser.getByRole('button', { name: '完成', exact: true }).click()
  await expect(score).toHaveText('12.0')
  await expect(cells.getByRole('button', { name: /友好水母/ })).toHaveCount(9)
  await expect(cells.nth(1).getByRole('button', { name: /箱子/ })).toBeVisible()
  await page.getByRole('button', { name: '词缀（已停用 2 项）', exact: true }).click()
  await search.fill('神圣石')
  await browser.getByRole('checkbox').uncheck()
  await browser.getByRole('button', { name: '完成', exact: true }).click()
  await expect(score).toHaveText('0.0')
  expect(await cells.locator('button').evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label')),
  )).toEqual(targetNames)
  await cells.nth(1).getByRole('button', { name: /稀有怪/ }).click()
  const detail = page.getByRole('dialog', { name: '区域 2 目标详情' })
  await expect(detail).toContainText('稀有怪额外掉神圣石')
  await expect(detail).toContainText('边界 2')
  await expect(detail).toContainText('普通保险箱')
  await expect(detail).toContainText('格 5')
  await page.keyboard.press('Escape')
  const after = await exportState(page)
  expect(after).toEqual({ ...before, disabledMods: ['voy-jelly', 'adj-box-1', 'b-divine'] })
})

test('真实库存重算盘的中央目标可开关、键盘查看且不改变规划', async ({
  page,
}, testInfo) => {
  await openEmptyApp(page)
  await loadState(page, real as AppState)
  const before = await exportState(page)
  const toggle = page.getByRole('radio', { name: '全部', exact: true })
  await toggle.check()
  await expect(toggle).toBeChecked()
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
  await page.getByRole('radio', { name: '关闭', exact: true }).check()
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
  await page.getByRole('radio', { name: '全部', exact: true }).check()
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
  await page.getByRole('combobox', { name: '当前策略', exact: true }).selectOption({ label: '魔法怪流' })
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
  await page.getByRole('radio', { name: '全部', exact: true }).check()
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

test('区域目标三态筛选先排除灰色再计算四槽和更多，切策略同步且不改规划', async ({ page }, testInfo) => {
  await openEmptyApp(page)
  const chart = (uid: string, modIds: string[], areaType?: string) => ({ uid, name: uid, level: 83, edges: [true, true, true, true], modIds, areaType })
  const pool = [chart('filter-source', ['adj-box-1', 'adj-lantern', 'adj-msg-1', 'adj-spirit-1', 'adj-fish', 'voy-jelly', 'voy-essence']), chart('filter-recipient', [], 'clam-infested-shelf')]
  const state = { ...real, strategyId: 'alc-and-go', pool, board: [{ chartUid: pool[0].uid, rotation: 0 }, { chartUid: pool[1].uid, rotation: 0 }, ...Array(7).fill(null)], borders: Array(12).fill(null) }
  await loadState(page, state as AppState)
  const before = await exportState(page)
  const controls = page.getByRole('radiogroup', { name: '区域目标', exact: true })
  await expect(controls.getByRole('radio', { name: '关闭', exact: true })).toBeChecked()
  await expect(page.locator('.region-targets')).toHaveCount(0)
  await controls.getByRole('radio', { name: '全部', exact: true }).check()
  await expect(page.locator('.region-targets')).toHaveCount(2)
  await expect(page.locator('.region-targets .band-low')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /更多目标/ })).toBeVisible()
  await controls.getByRole('radio', { name: '高价值', exact: true }).check()
  await expect(page.locator('.region-targets')).toHaveCount(1)
  await expect(page.locator('.region-targets button')).toHaveCount(4)
  await expect(page.locator('.region-targets .band-low')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /更多目标|暂无目标/ })).toHaveCount(0)
  await expect(page.locator('.region-targets').getByRole('button', { name: /箱子 · 中优先级 40/ })).toBeVisible()
  expect(await exportState(page)).toEqual(before)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['dark', 'light']) {
      const button = page.getByRole('button', { name: `切换到${theme === 'dark' ? '深色' : '浅色'}主题`, exact: true })
      if (await button.count()) await button.click()
      expect(await controls.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
      await page.locator('.board-wrap').screenshot({ path: testInfo.outputPath(`target-modes-${theme}-${width}.png`) })
    }
  }
  await loadState(page, { ...state, borders: [null, 'b-anchor-1', ...Array(10).fill(null)] } as AppState)
  await expect(page.getByRole('button', { name: '更多目标 · 共 5 类', exact: true })).toBeVisible()
  await expect(page.locator('.region-targets button')).toHaveCount(4)
  await expect(page.locator('.region-targets .band-low')).toHaveCount(0)
  await page.getByRole('combobox', { name: '当前策略', exact: true }).selectOption({ label: '稀有怪传说装' })
  await expect(page.locator('.region-targets').getByRole('button', { name: /箱子/ })).toHaveCount(0)
  await expect(page.locator('.region-targets').getByRole('button', { name: /罪魂牢笼/ })).toBeVisible()
  const afterStrategy = await exportState(page)
  await controls.getByRole('radio', { name: '全部', exact: true }).check()
  await expect(page.locator('.region-targets .band-low')).toHaveCount(2)
  await controls.getByRole('radio', { name: '关闭', exact: true }).check()
  await expect(page.locator('.region-targets,.region-details')).toHaveCount(0)
  await controls.getByRole('radio', { name: '关闭', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(controls.getByRole('radio', { name: '高价值', exact: true })).toBeChecked()
  expect(await exportState(page)).toEqual(afterStrategy)
})
