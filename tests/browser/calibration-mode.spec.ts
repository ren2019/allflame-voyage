import { expect, test } from './offline'
import { openEmptyApp, loadState, exportState } from './acceptance-helpers'
import { defaultState } from '../../src/logic/storage'

const planningState = () => ({
  ...defaultState(),
  pool: [{ uid: 'calibration-map', name: '预留海图', level: 83, shape: 'cross' as const,
    edges: [true, true, true, true] as [boolean, boolean, boolean, boolean], modIds: ['voy-rare'] }],
  borders: ['b-sulphdrop', ...Array(11).fill('b-pack-1')],
})

test('calibration pencil is temporary and its compact record links leave planning unchanged', async ({ page }) => {
  await openEmptyApp(page)
  await loadState(page, planningState())
  const before = await exportState(page)
  await expect(page.locator('.calibration-link')).toHaveCount(0)
  const pencil = page.getByRole('button', { name: '单条中文校准模式', exact: true })
  await expect(pencil).toHaveAttribute('aria-pressed', 'false')
  await pencil.click()
  await expect(pencil).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.calibration-link')).toHaveCount(13)
  const border = page.locator('[data-border-segment="0"]')
  const popupPromise = page.waitForEvent('popup')
  await border.getByRole('link', { name: '校准该词缀' }).click()
  const popup = await popupPromise
  await expect(popup.getByLabel('搜索词库')).toHaveValue('border:b-sulphdrop')
  expect(new URL(popup.url()).searchParams.get('slot')).toBe('0')
  await expect(popup.locator('.cal-inspector .cal-badge').first()).toHaveText('来源冲突')
  await expect(page.locator('.bpop')).toHaveCount(0)
  await popup.close()
  const inventoryPopup = page.waitForEvent('popup')
  await page.locator('.chart-sq .calibration-link').click()
  const chartRecord = await inventoryPopup
  await expect(chartRecord.getByLabel('搜索词库')).toHaveValue('chart-implicit:voy-rare')
  await chartRecord.close()
  await expect(page.locator('.chart-sq.selected')).toHaveCount(0)
  await pencil.click()
  await expect(page.locator('.calibration-link')).toHaveCount(0)
  expect(await exportState(page)).toEqual(before)
  await pencil.click()
  await page.reload()
  await expect(page.getByRole('button', { name: '单条中文校准模式' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.calibration-link')).toHaveCount(0)
  expect(await exportState(page)).toEqual(before)
})

for (const width of [1280, 390]) {
  test(`reserved maps expose their strategy and material without overlapping calibration at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await openEmptyApp(page)
    await loadState(page, planningState())
    const before = await exportState(page)
    for (const view of ['grid', 'list']) {
      if (view === 'list') await page.getByRole('button', { name: '列表视图（编辑海图）' }).click()
      const card = page.locator(view === 'grid' ? '.chart-sq' : '.chart-card')
      const reservation = card.getByRole('button', { name: /查看策略预留/ })
      await expect(reservation).toBeVisible()
      await reservation.click()
      const details = page.getByRole('dialog', { name: '策略预留详情' })
      await expect(details).toContainText('神圣')
      await expect(details).toContainText('稀有怪')
      await details.getByRole('button', { name: '关闭' }).click()
      await expect(card).not.toHaveClass(/selected/)
      await page.getByRole('button', { name: '单条中文校准模式' }).click()
      const areas = [reservation, card.locator('.edge-glyph').first(), card.locator('.calibration-link').first(), card.locator(view === 'grid' ? '.sq-reward-text' : '.chart-mod')]
      const boxes = []
      for (const area of areas) { await expect(area).toBeVisible(); boxes.push((await area.boundingBox())!) }
      // These are distinct visible actions/content, so their hit rectangles must not overlap.
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        // A list modifier contains its own inline link; only compare against the other controls.
        if (view === 'list' && i === 2 && j === 3) continue
        const a = boxes[i], b = boxes[j]
        expect(Math.min(a.x + a.width, b.x + b.width) <= Math.max(a.x, b.x) ||
          Math.min(a.y + a.height, b.y + b.height) <= Math.max(a.y, b.y)).toBe(true)
      }
      await page.screenshot({ path: testInfo.outputPath(`inventory-${view}-${width}.png`), fullPage: true })
      const popupPromise = page.waitForEvent('popup')
      await card.locator('.calibration-link').first().click()
      const popup = await popupPromise
      await expect(popup.getByLabel('搜索词库')).toHaveValue('chart-implicit:voy-rare')
      await popup.close()
      await expect(card).not.toHaveClass(/selected/)
      await page.getByRole('button', { name: '单条中文校准模式' }).click()
      await expect(card.locator('.calibration-link')).toHaveCount(0)
    }
    expect(await exportState(page)).toEqual(before)
  })
}
