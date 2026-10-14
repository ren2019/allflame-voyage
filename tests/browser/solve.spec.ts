import { expect, test } from './offline'
import { readFileSync } from 'node:fs'
import type { AppState } from '../../src/logic/storage'
import { exportState, loadState, openEmptyApp, installClipboardRecorder, clipboardWrites } from './acceptance-helpers'
import { checkConnectivity, rotateEdges } from '../../src/logic/connectivity'

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/acceptance/${name}.json`, import.meta.url), 'utf8'))

const strategies = [
  ['strategy-alc', '点金速刷'], ['strategy-anchor', '锚地赐福'], ['strategy-speedrun', '速刷保险箱'],
  ['strategy-meatfish', '稀有怪传说装'], ['strategy-ethereal', '魔法怪流'],
  ['strategy-divine-rares', '稀有怪神圣雨'], ['strategy-divine-boxes', '神圣保险箱'],
]

for (const [name, label] of strategies) {
  test(`player selects ${label}, solves and loads the actual candidate instances and rotations`, async ({ page }) => {
    await installClipboardRecorder(page)
    await openEmptyApp(page)
    const state: AppState = fixture(name)
    const expected = fixture(`${name}.expected`)
    await loadState(page, { ...state, strategyId: null })
    const card = page.locator('.strat-card').filter({ has: page.locator('.strat-name').filter({ hasText: label }) })
    await card.locator('.strat-use').click()
    await expect(page.locator('.solve-big')).toContainText(label)
    await page.locator('.solve-big').click()
    await expect(page.locator('.solve-result').first()).toContainText('可执行', { timeout: 30000 })
    const first = await exportState(page)
    await page.locator('.solve-result').nth(1).click()
    const second = await exportState(page)
    expect(second.board).not.toEqual(first.board)
    await page.locator('.solve-result').first().click()
    expect((await exportState(page)).board).toEqual(first.board)
    await page.locator('.solve-result').nth(1).click()
    await expect(page.locator('.solve-result').nth(1)).toHaveClass(/applied/)
    const selected = await exportState(page)
    expect(selected.board).toEqual(second.board)
    expect(selected.board.filter(Boolean)).toHaveLength(9)
    expect(new Set(selected.board.map((p) => p!.chartUid)).size).toBe(9)
    expect(selected.board.every((p) => expected.initialUids.includes(p!.chartUid))).toBe(true)
    for (const pin of expected.locked) expect(selected.board[pin.cell]).toEqual(pin.placement)
    expect(checkConnectivity(selected.board, new Map(selected.pool.map((c) => [c.uid, c])), selected.mode).valid).toBe(true)
    for (let cell = 0; cell < 9; cell++) {
      const placement = selected.board[cell]!
      const chart = state.pool.find((c) => c.uid === placement.chartUid)!
      const tile = page.locator('.board-grid .tile').nth(cell)
      await tile.hover()
      await expect(page.locator('.poe-tt-title')).toHaveText(chart.name)
      await expect(page.locator('.poe-tt-body')).toContainText('区域等级：83')
      const edges = rotateEdges(chart.edges, placement.rotation)
      for (const [edge, direction] of ['n', 'e', 's', 'w'].entries()) {
        await expect(tile.locator(`.path-bar.${direction}`)).toHaveCount(edges[edge] ? 1 : 0)
      }
    }

    if (name === 'strategy-speedrun') {
      await page.locator('.copy-into-game').click()
      const expectedWrites: string[] = []
      for (const cell of [6, 7, 8, 3, 4, 5, 0, 1, 2]) {
        const chart = state.pool.find((c) => c.uid === selected.board[cell]!.chartUid)!
        await expect(page.locator('.copyseq .pc-name')).toHaveText(chart.name)
        expectedWrites.push(`${chart.name} ${chart.implicitText} 区域等级 ${chart.level}`)
        await page.locator('.copyseq-go').click()
        await expect.poll(() => clipboardWrites(page)).toEqual(expectedWrites)
        expect((await exportState(page)).pool).toEqual(state.pool)
      }
      await expect(page.locator('.copyseq')).toHaveCount(0)
      expect((await exportState(page)).board).toEqual(selected.board)
    }
  })
}

test('eight charts are a reference even when connectors are ignored; a ninth chart makes the retry executable', async ({ page }) => {
  const state: AppState = fixture('retry-insufficient')
  await openEmptyApp(page)
  await loadState(page, state)
  await page.locator('.solve-big').click()
  await expect(page.locator('.solve-result')).not.toHaveCount(0, { timeout: 30000 })
  await expect(page.locator('.solve-result.invalid')).toHaveCount(await page.locator('.solve-result').count())
  await expect(page.locator('.solve-result .sr-badge.ok')).toHaveCount(0)
  await expect(page.locator('.solve-result').first()).toContainText('不可执行')
  const ninth = fixture('retry-insufficient.expected').ninthChart
  const updated = await exportState(page)
  updated.pool.push(ninth)
  await loadState(page, updated)
  await page.locator('.solve-big').click()
  await expect(page.locator('.solve-result').first()).not.toHaveClass(/invalid/, { timeout: 30000 })
  await expect(page.locator('.solve-result').first()).toContainText('可执行')
  const solved = await exportState(page)
  expect(solved.board.filter(Boolean)).toHaveLength(9)
  expect(new Set(solved.board.map((p) => p!.chartUid)).size).toBe(9)
  expect(solved.board.every((p) => solved.pool.some((c) => c.uid === p!.chartUid))).toBe(true)
})

test('Chinese solver settings retain the original connector, rotation and protection controls', async ({ page }) => {
  await openEmptyApp(page)
  await loadState(page, fixture('strategy-speedrun'))
  await page.locator('.solve-settings-btn').last().click()
  const panel = page.locator('.solver')
  await expect(panel.locator('.panel-title').first()).toContainText('求解设置')
  await expect(panel).toContainText('连接规则')
  await expect(panel).toContainText('为其他策略保护海图')
  await expect(panel).toContainText('奖励权重（由策略覆盖）')
  await expect(panel).toContainText('优选海图搜索')
  await expect(panel.locator('.regex-row input')).toHaveValue(/\p{Script=Han}/u)
  await panel.locator('select').first().selectOption('any')
  await panel.getByText('允许旋转海图', { exact: true }).locator('input').uncheck()
  await panel.locator('input[name="strategy-reservation"][value="ethereal"]').uncheck()
  await panel.getByRole('button', { name: '完成', exact: true }).click()
  const changed = await exportState(page)
  expect(changed.mode).toBe('any')
  expect(changed.allowRotation).toBe(false)
  expect(changed.strategyReservations).toEqual({ divine: true, meatfish: true, ethereal: false })
})
