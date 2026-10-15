import { readFileSync } from 'node:fs'
import { expect, test } from './offline'
import { downloadPlanningState, loadPlanningState } from './journey-helpers'

const planning = JSON.parse(readFileSync(new URL('../fixtures/acceptance/journey-two-voyages.json', import.meta.url), 'utf8'))

test('旧浅色偏好恢复，明暗切换与刷新保留且不改变规划', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'harvest')
  })
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  await loadPlanningState(page, planning)
  await expect(page.getByRole('button', { name: '切换到深色主题', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('allflame-voyage-solver') ?? '{}').pool?.length)).toBe(12)
  const before = await downloadPlanningState(page)
  for (const next of ['深色', '浅色']) {
    await page.getByRole('button', { name: `切换到${next}主题`, exact: true }).click()
    const other = next === '深色' ? '浅色' : '深色'
    await expect(page.getByRole('button', { name: `切换到${other}主题`, exact: true })).toBeVisible()
    await expect(page.locator('.score-total strong')).toHaveText('13.0')
    await page.reload()
    await expect(page.getByRole('button', { name: `切换到${other}主题`, exact: true })).toBeVisible()
    expect(await downloadPlanningState(page)).toEqual(before)
  }
})

test('旧深色偏好与校准页跟随主题，桌面和窄屏入口保持可操作', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'allflame')
  })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  await expect(page.getByRole('button', { name: '切换到浅色主题', exact: true })).toBeVisible()
  await loadPlanningState(page, planning)
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') await page.getByRole('button', { name: '切换到浅色主题', exact: true }).click()
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 })
      const calibrationLink = page.getByRole('link', { name: '中文校准 ↗', exact: true })
      const feedback = page.getByRole('link', { name: '🐛 反馈', exact: true })
      await expect(calibrationLink).toBeVisible()
      await expect(feedback).toBeVisible()
      const colors = await feedback.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, text: getComputedStyle(element).color }))
      expect(colors).toEqual(theme === 'dark' ? { background: 'rgb(32, 36, 42)', text: 'rgb(232, 236, 242)' } : { background: 'rgb(255, 255, 255)', text: 'rgb(36, 44, 55)' })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.getByRole('button', { name: '词缀（已停用 1 项）', exact: true }).click()
      await expect(page.locator('.modbrowser')).toBeVisible()
      expect(await page.locator('.modbrowser').evaluate(element => element.getBoundingClientRect().right <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`mod-dialog-${theme}-${width}.png`) })
      await page.locator('.modbrowser').getByRole('button', { name: '完成', exact: true }).click()
      await page.screenshot({ path: testInfo.outputPath(`planning-${theme}-${width}.png`), fullPage: true })
      const [calibration] = await Promise.all([page.waitForEvent('popup'), calibrationLink.click()])
      await calibration.setViewportSize({ width, height: 1000 })
      await expect(calibration.locator('.cal-page')).toBeVisible()
      expect(await calibration.locator('.cal-page').evaluate(element => getComputedStyle(element).color)).toBe(theme === 'dark' ? 'rgb(232, 236, 242)' : 'rgb(36, 44, 55)')
      expect(await calibration.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await calibration.screenshot({ path: testInfo.outputPath(`calibration-${theme}-${width}.png`), fullPage: true })
      await calibration.close()
    }
  }
  const sibling = await page.context().newPage()
  await sibling.goto('/')
  await expect(sibling.getByRole('button', { name: '切换到深色主题', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '切换到深色主题', exact: true }).click()
  await expect(sibling.getByRole('button', { name: '切换到浅色主题', exact: true })).toBeVisible()
  await sibling.getByRole('button', { name: '切换到浅色主题', exact: true }).click()
  await expect(page.getByRole('button', { name: '切换到深色主题', exact: true })).toBeVisible()
  await sibling.close()
  expect(errors).toEqual([])
})
