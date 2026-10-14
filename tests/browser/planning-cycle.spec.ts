import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
const fixture = JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.json', import.meta.url), 'utf8'))
const oracle = JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.expected.json', import.meta.url), 'utf8'))
import { defaultState, type AppState } from '../../src/logic/storage'
import { checkConnectivity } from '../../src/logic/connectivity'
import { scoreBoard } from '../../src/logic/scoring'
import { strategyById } from '../../src/data/strategies'
import { downloadPlanningState, loadPlanningState, recordGuideClipboard } from './journey-helpers'

const initial = fixture as AppState
const score = (state: AppState) => scoreBoard(state.board, state.borders, new Map(state.pool.map((chart) => [chart.uid, chart])), state.strategyId ? strategyById.get(state.strategyId)!.weights : state.weights, { adjacencyMode: state.adjacencyMode, adjacentAffectsSelf: state.adjacentAffectsSelf, disabledMods: new Set(state.disabledMods) })

test.beforeEach(async ({ page }) => {
  await recordGuideClipboard(page)
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
})

test('完整非空规划经刷新和实际 JSON 下载载入恢复所有持久字段及评分', async ({ page }) => {
  await expect(page.locator('header h1')).toHaveText('永火 航程规划')
  await loadPlanningState(page, initial)
  await expect(page.locator('.tile:not(.empty)')).toHaveCount(9)
  await expect(page.locator('.score-total strong')).toHaveText('13.0')
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('allflame-voyage-solver') ?? '{}').pool?.length)).toBe(12)
  await page.reload()
  await expect(page.locator('.tile:not(.empty)')).toHaveCount(9)
  const restored = await downloadPlanningState(page)
  expect(restored).toEqual(initial)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出', exact: true }).click()
  const backup = await pending
  const path = await backup.path()
  await loadPlanningState(page, defaultState())
  await expect(page.locator('.tile.empty')).toHaveCount(9)
  await page.locator('.import-actions input[type=file]').setInputFiles(path!)
  await expect(page.locator('.import-panel .muted.pad')).toHaveText('已从 JSON 载入规划状态')
  await expect(page.locator('.tile:not(.empty)')).toHaveCount(9)
  const loaded = await downloadPlanningState(page)
  expect(loaded).toEqual(restored)
  expect(score(loaded)).toEqual(score(restored))
  await expect(page.locator('.score-total strong')).toHaveText('13.0')
})

test('所选候选完成九步复制后仅核销已消耗实例，补库存和边界再执行第二航程', async ({ page }) => {
  await loadPlanningState(page, initial)
  await page.locator('.solve-big').click()
  await expect(page.locator('.solve-result:not(.invalid)').first()).toBeVisible()
  await page.locator('.solve-result:not(.invalid)').last().click()
  const chosen = await downloadPlanningState(page)
  const selected = new Set(chosen.board.map((placement) => placement!.chartUid))
  expect(selected.size).toBe(9)
  expect(selected.has(oracle.survivedUid)).toBe(true)
  expect(selected.has(oracle.notSurvivedUid)).toBe(true)
  expect(checkConnectivity(chosen.board, new Map(chosen.pool.map((chart) => [chart.uid, chart])), 'strict').valid).toBe(true)
  await page.locator('.copy-into-game').click()
  for (let step = 0; step < 9; step++) {
    const placement = chosen.board[oracle.copyOrder[step]]!
    const chart = chosen.pool.find((entry) => entry.uid === placement.chartUid)!
    await expect(page.locator('.copyseq .pc-head')).toContainText(`第 ${step + 1}/9 步`)
    await expect(page.locator('.copyseq .pc-name')).toHaveText(chart.name)
    await page.locator('.copyseq-go').click()
  }
  await expect(page.locator('.copyseq')).toHaveCount(0)
  expect((await downloadPlanningState(page)).pool).toEqual(chosen.pool)
  expect(await page.evaluate(() => (window as unknown as { copied: string[] }).copied.length)).toBe(9)
  await page.locator('.finish-voyage').click()
  await expect(page.locator('.preserve-confirm .pc-name')).toHaveText('双航程人工海图·甲')
  await page.locator('.pc-kept').click()
  await expect(page.locator('.preserve-confirm .pc-name')).toHaveText('双航程人工海图·乙')
  await page.locator('.pc-lost').click()
  await expect(page.locator('.voyage-msg')).toHaveText('航程已完成：消耗 8 张海图，保留 1 张')
  const finished = await downloadPlanningState(page)
  const expectedUids = chosen.pool.filter((chart) => !selected.has(chart.uid) || chart.uid === oracle.survivedUid).map((chart) => chart.uid)
  expect(finished.pool.map((chart) => chart.uid)).toEqual(expectedUids)
  expect(finished.board).toEqual(Array(9).fill(null))
  expect({ ...finished, pool: chosen.pool, board: chosen.board }).toEqual(chosen)
  expect(finished.pool.find((chart) => chart.uid === oracle.survivedUid)?.preserved).toBe(false)
  for (let index = 0; index < oracle.second.addBlankCount; index++) await page.getByRole('button', { name: '+ 添加海图', exact: true }).click()
  await page.getByTitle('列表视图（编辑海图）', { exact: true }).click()
  await page.locator('.chart-card').filter({ has: page.locator('.chart-name', { hasText: /^双航程人工海图·甲$/ }) }).click()
  await page.locator('.board-grid .tile').first().click()
  await page.locator('.board-grid .tile').first().hover()
  await page.locator('.board-grid .tile').first().locator('.tile-actions button').first().click()
  await page.locator('[data-border-segment="0"]').click()
  await page.getByPlaceholder('搜索边界词缀…').fill('怪物群规模提高 24%')
  await page.locator('.bpop-item').filter({ hasText: '相邻区域的怪物群规模提高 24%' }).click()
  const replenished = await downloadPlanningState(page)
  expect(replenished.pool).toHaveLength(9)
  expect(replenished.borders[0]).toBe('b-pack-2')
  await page.locator('.solve-big').click()
  await expect(page.locator('.solve-result:not(.invalid)').first()).toBeVisible()
  const second = await downloadPlanningState(page)
  const secondUids = second.board.map((placement) => placement!.chartUid)
  expect(new Set(secondUids).size).toBe(9)
  expect(new Set(secondUids)).toEqual(new Set(replenished.pool.map((chart) => chart.uid)))
  expect(secondUids).toContain(oracle.survivedUid)
  expect(secondUids).not.toContain(oracle.notSurvivedUid)
  expect(second.board[0]?.chartUid).toBe(oracle.survivedUid)
  for (const uid of selected) if (uid !== oracle.survivedUid) expect(secondUids).not.toContain(uid)
  expect(checkConnectivity(second.board, new Map(second.pool.map((chart) => [chart.uid, chart])), 'strict').valid).toBe(true)
})

test('未标记保留时仅消耗本盘九张，三张未使用库存与全部配置继续保留', async ({ page }) => {
  const state: AppState = { ...initial, pool: initial.pool.map(({ preserved: _preserved, ...chart }) => chart) }
  await loadPlanningState(page, state)
  await page.locator('.finish-voyage').click()
  await expect(page.locator('.preserve-confirm')).toHaveCount(0)
  await expect(page.locator('.voyage-msg')).toHaveText('航程已完成：消耗 9 张海图')
  const finished = await downloadPlanningState(page)
  expect(finished.pool.map((chart) => chart.uid)).toEqual(['journey-10', 'journey-11', 'journey-12'])
  expect(finished.board).toEqual(Array(9).fill(null))
  expect({ ...finished, pool: state.pool, board: state.board }).toEqual(state)
})
