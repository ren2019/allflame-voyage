import { readFileSync } from 'node:fs'
import { expect, test } from './offline'
import type { AppState } from '../../src/logic/storage'
import { downloadPlanningState, loadPlanningState } from './journey-helpers'

const fixture: AppState = JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.json', import.meta.url), 'utf8'))

test('完成有效恢复盘仅记录一次原始分数，历史随刷新与备份恢复', async ({ page }) => {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  const state = { ...fixture, pool: fixture.pool.map(({ preserved: _preserved, ...chart }) => chart) }
  await loadPlanningState(page, state)
  await expect(page.getByLabel('航程历史')).toContainText('已记录 0 次')
  await page.locator('.finish-voyage').dblclick()
  await expect(page.getByLabel('航程历史')).toContainText('已记录 1 次')
  await expect(page.getByLabel('航程历史')).toContainText('最近完成分数 13.0')
  const finished = await downloadPlanningState(page)
  expect(finished.voyageHistory).toHaveLength(1)
  expect(finished.voyageHistory[0].strategyId).toBe('alc-and-go')
  expect(finished.voyageHistory[0].score).toBeCloseTo(12.96)
  expect(finished.voyageHistory[0].score).not.toBe(13)
  expect(finished.pool).toHaveLength(3)
  await page.waitForTimeout(400)
  await page.reload()
  await expect(page.getByLabel('航程历史')).toContainText('已记录 1 次')
  expect((await downloadPlanningState(page)).voyageHistory).toEqual(finished.voyageHistory)
  await loadPlanningState(page, finished)
  await expect(page.getByLabel('航程历史')).toContainText('已记录 1 次')
  expect((await downloadPlanningState(page)).voyageHistory).toEqual(finished.voyageHistory)
})

test('取消保留核销、半盘核销不积累历史，原库存核销不变', async ({ page }) => {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  await loadPlanningState(page, fixture)
  await page.locator('.finish-voyage').click()
  await page.getByRole('button', { name: '取消核销', exact: true }).click()
  expect((await downloadPlanningState(page)).pool).toEqual(fixture.pool)
  await expect(page.getByLabel('航程历史')).toContainText('已记录 0 次')
  await loadPlanningState(page, { ...fixture, board: fixture.board.map((p, i) => i === 0 ? p : null), pool: fixture.pool.map(({ preserved: _, ...c }) => c) })
  await page.locator('.finish-voyage').click()
  await expect(page.getByLabel('航程历史')).toContainText('已记录 0 次')
  expect((await downloadPlanningState(page)).pool).toHaveLength(11)
})

test('损坏历史备份保留有效库存偏好并明确提示，存储失败不冒充已保存', async ({ page }) => {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  await page.getByLabel('恢复规划备份', { exact: true }).setInputFiles({ name: 'damaged.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...fixture, voyageHistory: [{ score: 'broken' }] })) })
  await expect(page.locator('.planning-backup [role=status]')).toContainText('已忽略损坏航程历史')
  await expect(page.getByLabel('航程历史')).toContainText('已记录 0 次')
  expect((await downloadPlanningState(page)).pool).toEqual(fixture.pool)
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError') } })
  await loadPlanningState(page, { ...fixture, pool: fixture.pool.map(({ preserved: _, ...c }) => c) })
  await page.locator('.finish-voyage').click()
  await expect(page.getByRole('alert').filter({ hasText: '当前历史未持久化' })).toBeVisible()
  expect((await downloadPlanningState(page)).pool).toHaveLength(3)
})


test('本地损坏历史不抹除库存、偏好或有效记录，刷新不追加记录', async ({ page }) => {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  await loadPlanningState(page, { ...fixture, pool: fixture.pool.map(({ preserved: _, ...c }) => c) })
  await page.locator('.finish-voyage').click()
  const finished = await downloadPlanningState(page)
  await page.evaluate((backup) => localStorage.setItem('allflame-voyage-solver', JSON.stringify({ ...backup, v: 4, voyageHistory: [...backup.voyageHistory, { score: 'corrupt' }] })), finished)
  await page.reload()
  await expect(page.getByRole('alert').filter({ hasText: '已忽略损坏航程历史' })).toBeVisible()
  await expect(page.getByLabel('航程历史')).toContainText('已记录 1 次')
  expect(await downloadPlanningState(page)).toEqual(finished)
})

test('同一渲染内重复完成点击只核销一次，重新载入新航程仍可完成', async ({ page }) => {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  const ready = { ...fixture, pool: fixture.pool.map(({ preserved: _, ...chart }) => chart) }
  await loadPlanningState(page, ready)
  await page.evaluate(() => {
    const finish = document.querySelector<HTMLButtonElement>('.finish-voyage')!
    finish.click()
    finish.click()
  })
  await expect(page.getByLabel('航程历史')).toContainText('已记录 1 次')
  const first = await downloadPlanningState(page)
  expect(first.pool).toHaveLength(3)
  await loadPlanningState(page, { ...ready, voyageHistory: first.voyageHistory })
  await page.locator('.finish-voyage').click()
  await expect(page.getByLabel('航程历史')).toContainText('已记录 2 次')
  const second = await downloadPlanningState(page)
  expect(new Set(second.voyageHistory.map((entry) => entry.completionId)).size).toBe(2)
})

test('恢复乱序历史时最近完成分数按完成时间展示', async ({ page }) => {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  await loadPlanningState(page, { ...fixture, pool: fixture.pool.map(({ preserved: _, ...chart }) => chart) })
  await page.locator('.finish-voyage').click()
  const finished = await downloadPlanningState(page)
  const base = finished.voyageHistory[0]
  const newer = { ...base, completionId: 'newer', completedAt: '2026-10-15T10:00:00.000Z', score: 27.25 }
  const older = { ...base, completionId: 'older', completedAt: '2026-10-14T10:00:00.000Z', score: 5.5 }
  await loadPlanningState(page, { ...finished, voyageHistory: [newer, older] })
  await expect(page.getByLabel('航程历史')).toContainText('最近完成分数 27.3')
  expect((await downloadPlanningState(page)).voyageHistory).toEqual([newer, older])
})

for (const width of [390, 1280]) {
  test(`${width}px 历史损坏警告始终可见，普通历史保留响应式折叠`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await page.locator('.onboard-actions button').last().click()
    await loadPlanningState(page, fixture)
    await page.evaluate((backup) => localStorage.setItem('allflame-voyage-solver', JSON.stringify({ ...backup, v: 4, voyageHistory: [{ score: 'corrupt' }] })), fixture)
    await page.reload()
    const warning = page.getByRole('alert').filter({ hasText: '已忽略损坏航程历史' })
    await expect(warning).toHaveCount(1)
    await expect(warning).toBeVisible()
    await expect(page.getByLabel('航程历史', { exact: true })).toHaveJSProperty('open', width > 1100)
    await warning.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `/tmp/allflame-history-damage-${width}.png` })
    expect((await downloadPlanningState(page)).pool).toEqual(fixture.pool)
  })

  test(`${width}px 存储失败警告始终可见且仅出现一次，备份仍包含核销结果`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await page.locator('.onboard-actions button').last().click()
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError') } })
    await loadPlanningState(page, { ...fixture, pool: fixture.pool.map(({ preserved: _, ...chart }) => chart) })
    await page.locator('.finish-voyage').click()
    const warning = page.getByRole('alert').filter({ hasText: '当前历史未持久化' })
    await expect(warning).toHaveCount(1)
    await expect(warning).toBeVisible()
    await expect(warning).toContainText('请导出规划备份')
    await expect(page.getByLabel('航程历史', { exact: true })).toHaveJSProperty('open', width > 1100)
    const finished = await downloadPlanningState(page)
    expect(finished.pool).toHaveLength(3)
    expect(finished.voyageHistory).toHaveLength(1)
  })

  test(`${width}px 损坏历史备份的恢复提示可见，保持普通历史响应式折叠`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await page.locator('.onboard-actions button').last().click()
    await page.getByLabel('恢复规划备份', { exact: true }).setInputFiles({ name: 'damaged.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...fixture, voyageHistory: [{ score: 'broken' }] })) })
    const warning = page.locator('.planning-backup [role=status]')
    await expect(warning).toContainText('已忽略损坏航程历史')
    await expect(warning).toBeVisible()
    await expect(page.getByLabel('航程历史', { exact: true })).toHaveJSProperty('open', width > 1100)
    expect((await downloadPlanningState(page)).pool).toEqual(fixture.pool)
  })
}
