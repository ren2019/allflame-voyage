import { expect, test } from './offline'

test('页面标题、教程、更新记录和保留向导的完整交互说明使用简中', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page).toHaveTitle('永火航程规划 - 流放之路 3.29')
  await expect(page.locator('.onboard')).toContainText('Ctrl+Alt+C 高级复制')
  await page.locator('.onboard-actions button').last().click()
  await expect(page.locator('.import-panel textarea')).toHaveAttribute('placeholder', /Ctrl\+Alt\+C 高级复制/)
  await page.getByRole('button', { name: '🧭 使用教程', exact: true }).click()
  for (let step = 0; step < 8; step++) {
    await expect(page.locator('.tutorial .panel-title')).toContainText(/[\u4e00-\u9fff]/)
    if (step === 1) await expect(page.locator('.tutorial')).toContainText('Ctrl+Alt+C 高级复制')
    await expect(page.locator('.tutorial .tut-where')).toContainText(/[\u4e00-\u9fff]/)
    for (const paragraph of await page.locator('.tutorial .tut-body').allTextContents()) expect(paragraph).toMatch(/[\u4e00-\u9fff]/)
    if (step < 7) await page.locator('.tutorial .tut-next').click()
  }
  await page.getByRole('button', { name: '⚓ 开始规划', exact: true }).click()
  await page.getByRole('button', { name: '更新记录', exact: true }).click()
  await expect(page.locator('.updates-log .panel-title')).toContainText('原版更新记录')
  await expect(page.locator('.update-row')).toHaveCount(31)
  for (const title of await page.locator('.update-title').allTextContents()) expect(title).toMatch(/[\u4e00-\u9fff]/)
  for (const detail of await page.locator('.update-detail').allTextContents()) expect(detail).toMatch(/[\u4e00-\u9fff]/)
  await page.locator('.updates-log').getByRole('button', { name: '完成', exact: true }).click()
  // Exposes all steps and save/previous/next controls; dynamic strategy/type labels
  // come from the original definitions localized in parallel by #6.
  await page.getByRole('button', { name: '+ 添加海图', exact: true }).click()
  await page.getByRole('button', { name: '🔖 为策略保留海图…', exact: true }).click()
  await expect(page.locator('.save-wizard .panel-title')).toContainText('为策略保留海图')
  while (await page.locator('.save-wizard').getByRole('button', { name: '下一步 →', exact: true }).count()) {
    await page.locator('.save-wizard').getByRole('button', { name: '下一步 →', exact: true }).click()
  }
  await page.getByRole('button', { name: '💾 保存保留数量', exact: true }).click()
  await expect(page.locator('.save-wizard')).toHaveCount(0)
})
