import { readFileSync } from 'node:fs'
import { test, expect } from './offline'
import { clipboardWrites, exportState, installClipboardRecorder, loadState, openEmptyApp } from './acceptance-helpers'
import type { AppState } from '../../src/logic/storage'

const fixture: AppState = JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.json', import.meta.url), 'utf8'))
// The existing artificial two-voyage model supplies known retained/lost instances.
// Only its unused twelfth chart changes to trigger a real recommendation.
const initial: AppState = {
  ...fixture, voyageHistory: [],
  pool: fixture.pool.map(chart => chart.uid === 'journey-12' ? { ...chart, modIds: ['voy-noequip'] } : chart),
  borders: ['b-minmagic', 'b-pack-3', 'b-rare-2', 'b-divine', 'b-pack-2', 'b-rare-2',
    'unknown-future-border', null, 'b-pack-3', 'b-divine', 'b-minmagic', 'b-rare-1'],
}

// This verifies the joined user journey, rather than repeating the complete
// seven-strategy/readiness and modal boundary matrices in the feature suites.
test('规格25推荐切换与边界分析衔接求解、九步复制、保留核销、下一航程和备份恢复', async ({ page }, testInfo) => {
  test.setTimeout(90000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await installClipboardRecorder(page)
  await openEmptyApp(page)
  await loadState(page, initial)
  const sidebar = page.locator('.solver-col')
  const options = sidebar.getByRole('group', { name: '当前策略', exact: true })
  const recommendations = sidebar.getByRole('region', { name: '策略推荐', exact: true })
  const divine = recommendations.getByRole('article', { name: '推荐稀有怪神圣雨', exact: true })
  await expect(divine).toContainText('发现：边界有“稀有怪物额外掉落神圣石”')
  await expect(divine).toContainText('尚缺：1× 海之柱海图、3× 巨型海星或保险箱海图、5× 提高稀有怪数量海图')
  await expect(recommendations.getByRole('article', { name: '推荐稀有怪传说装' })).toBeVisible()
  expect(await exportState(page)).toEqual(initial)

  await divine.getByRole('button', { name: '切换到稀有怪神圣雨', exact: true }).click()
  const switched = { ...initial, strategyId: 'divine-border-rares' }
  expect(await exportState(page)).toEqual(switched)
  await expect(divine).toHaveCount(0)
  await expect(sidebar.getByRole('complementary', { name: '策略玩法说明' })).toContainText('稀有怪神圣雨 · 玩法')
  await expect(page.locator('[data-border-segment="3"]')).toHaveAttribute('data-affinity-band', 'high')
  await expect(page.locator('[data-border-segment="0"]')).toHaveAttribute('data-affinity-band', 'low')
  const opener = page.locator('.board-wrap').getByRole('button', { name: '边界分析', exact: true })
  const dialog = page.getByRole('dialog', { name: '边界分析', exact: true })
  await opener.click()
  await expect(dialog).toContainText('当前策略：稀有怪神圣雨')
  await expect(dialog.locator('.border-affinity-entry')).toHaveCount(12)
  await expect(dialog.locator('.border-affinity-position')).toHaveText(['右1', '左1', '上3', '右3', '左3', '上2', '下3', '右2', '上1', '左2', '下1', '下2'])
  await expect(dialog.locator('.border-affinity-entry').first()).toContainText('10/10 · 优先')
  await expect(dialog.locator('.border-affinity-entry').last()).toContainText('尚未录入')
  await page.keyboard.press('Escape')
  await expect(opener).toBeFocused()
  expect(await exportState(page)).toEqual(switched)

  await options.getByRole('button', { name: '魔法怪流', exact: true }).click()
  await expect(page.locator('[data-border-segment="0"]')).toHaveAttribute('data-affinity-band', 'high')
  await expect(page.locator('[data-border-segment="3"]')).toHaveAttribute('data-affinity-band', 'low')
  await opener.click()
  await expect(dialog).toContainText('当前策略：魔法怪流')
  await expect(dialog).not.toContainText('当前策略：稀有怪神圣雨')
  await expect(dialog.locator('.border-affinity-position').first()).toHaveText('上1')
  await expect(dialog.locator('.border-affinity-entry').first()).toContainText('10/10 · 优先')
  await dialog.getByRole('button', { name: '关闭边界分析', exact: true }).click()
  expect(await exportState(page)).toEqual({ ...initial, strategyId: 'milky-ethereal' })

  await options.getByRole('button', { name: '速刷保险箱', exact: true }).click()
  await page.getByRole('combobox', { name: '中心海图', exact: true }).selectOption('opbox')
  await options.getByRole('button', { name: '点金速刷', exact: true }).click()
  await page.getByRole('combobox', { name: '策略布局', exact: true }).selectOption('snake')
  const prepared = await exportState(page)
  expect(prepared.pool).toEqual(initial.pool)
  expect(prepared.board).toEqual(initial.board)
  expect(prepared.borders).toEqual(initial.borders)
  expect(prepared.centerChoice['milky-speedrun']).toBe('opbox')
  expect(prepared.layoutChoice['alc-and-go']).toBe('snake')
  await page.locator('.solve-big').click()
  await expect(page.locator('.solve-result:not(.invalid)').first()).toBeVisible()
  await page.locator('.solve-result:not(.invalid)').last().click()
  const chosen = await exportState(page)
  const selected = chosen.board.map(placement => placement!.chartUid)
  expect(new Set(selected).size).toBe(9)
  expect(selected).toContain('journey-01')
  expect(selected).toContain('journey-02')
  expect(selected).not.toContain('journey-12') // unrelated-strategy reservation remains effective
  const chosenScore = await page.locator('.score-total strong').innerText()
  await page.getByRole('radio', { name: '高价值', exact: true }).check()
  await page.screenshot({ path: testInfo.outputPath('spec25-planning.png'), fullPage: true })
  await page.locator('.copy-into-game').click()
  const copied: string[] = []
  for (const [index, cell] of [6, 7, 8, 3, 4, 5, 0, 1, 2].entries()) {
    const chart = chosen.pool.find(chart => chart.uid === chosen.board[cell]!.chartUid)!
    await expect(page.locator('.copyseq .pc-head')).toContainText(`第 ${index + 1}/9 步`)
    await expect(page.locator('.copyseq .pc-name')).toHaveText(chart.name)
    copied.push(`${chart.name} ${chart.implicitText} 区域等级 ${chart.level}`)
    await page.locator('.copyseq-go').click()
    expect(await clipboardWrites(page)).toEqual(copied)
  }
  await expect(page.locator('.copyseq')).toHaveCount(0)
  expect(await exportState(page)).toEqual(chosen)
  await page.locator('.finish-voyage').click()
  await page.getByRole('button', { name: '取消核销', exact: true }).click()
  expect(await exportState(page)).toEqual(chosen)
  await page.locator('.finish-voyage').click()
  await expect(page.locator('.preserve-confirm .pc-name')).toHaveText('双航程人工海图·甲')
  await page.locator('.pc-kept').click()
  await expect(page.locator('.preserve-confirm .pc-name')).toHaveText('双航程人工海图·乙')
  await page.locator('.pc-lost').click()
  const completed = await exportState(page)
  expect(completed.pool.map(chart => chart.uid)).toEqual(chosen.pool.filter(chart => !selected.includes(chart.uid) || chart.uid === 'journey-01').map(chart => chart.uid))
  expect(completed.pool).toHaveLength(4)
  expect(completed.board).toEqual(Array(9).fill(null))
  expect(completed.voyageHistory).toHaveLength(1)
  expect(completed.voyageHistory![0].score.toFixed(1)).toBe(chosenScore)
  await expect(page.getByLabel('航程历史', { exact: true })).toContainText('已记录 1 次')
  // One reserved spare remains unavailable to the current strategy, so add six.
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: '+ 添加海图', exact: true }).click()
  await page.locator('.solve-big').click()
  await expect(page.locator('.solve-result:not(.invalid)').first()).toBeVisible()
  const next = await exportState(page)
  expect(next.pool).toHaveLength(10)
  expect(next.board.every(Boolean)).toBe(true)
  expect(next.voyageHistory).toEqual(completed.voyageHistory)
  for (const uid of selected.filter(uid => uid !== 'journey-01')) expect(next.board.map(placement => placement!.chartUid)).not.toContain(uid)
  await page.waitForTimeout(400)
  await page.reload()
  expect(await exportState(page)).toEqual(next)
  await loadState(page, completed)
  expect(await exportState(page)).toEqual(completed)
  expect(errors).toEqual([])
})
