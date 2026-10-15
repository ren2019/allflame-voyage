import { expect, test, type Page } from './offline'

async function exportedBorders(page: Page): Promise<(string | null)[]> {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出规划备份', exact: true }).click()
  const stream = await (await downloadPromise).createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8')).borders
}

async function selectBorder(page: Page, segment: number, query: string, text: string) {
  await page.locator(`[data-border-segment="${segment}"]`).click()
  await page.getByPlaceholder('搜索边界词缀…').fill(query)
  await page.locator('.bpop-item').filter({ hasText: text }).click()
}

test('all twelve real border controls support Chinese search, selection, replacement and clearing', async ({ page }) => {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  for (let segment = 0; segment < 12; segment++) {
    const slot = page.locator(`[data-border-segment="${segment}"]`)
    await selectBorder(page, segment, '怪物群规模提高 16%', '相邻区域的怪物群规模提高 16%')
    await expect(slot).toContainText('16% 群规模')
    await expect(slot).toHaveAttribute('title', '相邻区域的怪物群规模提高 16%')
  }
  expect(await exportedBorders(page)).toEqual(Array(12).fill('b-pack-1'))
  for (let segment = 0; segment < 12; segment++) {
    const slot = page.locator(`[data-border-segment="${segment}"]`)
    await selectBorder(page, segment, '怪物群规模提高 24%', '相邻区域的怪物群规模提高 24%')
    await expect(slot).toContainText('24% 群规模')
  }
  expect(await exportedBorders(page)).toEqual(Array(12).fill('b-pack-2'))
  for (let segment = 0; segment < 12; segment++) {
    const slot = page.locator(`[data-border-segment="${segment}"]`)
    await slot.click()
    await page.getByRole('button', { name: '无边界词缀', exact: true }).click()
    await expect(slot).toContainText('·')
  }
  expect(await exportedBorders(page)).toEqual(Array(12).fill(null))
})

test('normal border choices and modifier browser hide maintenance status and conflicts', async ({ page }) => {
  await page.goto('/')
  await page.locator('.onboard-actions button').last().click()
  await page.locator('[data-border-segment="0"]').click()
  await expect(page.locator('.bpop-item')).toHaveCount(65)
  await expect(page.getByText(/仅来源|待客户端|译名冲突/)).toHaveCount(0)
  await page.getByPlaceholder('搜索边界词缀…').fill('死者硫磺')
  await page.locator('.bpop-item').filter({ hasText: '相邻区域的稀有怪物掉落死者硫磺' }).click()
  await expect(page.locator('[data-border-segment="0"]')).toHaveAttribute('title', '相邻区域的稀有怪物掉落死者硫磺')
  await expect(page.getByLabel('译名冲突')).toHaveCount(0)
  expect((await exportedBorders(page))[0]).toBe('b-sulphdrop')
  await page.getByRole('button', { name: /^(Mods|词缀)$/ }).click()
  await page.getByPlaceholder('搜索词缀…').fill('死者硫磺')
  await expect(page.locator('.mb-row')).toHaveCount(1)
  await expect(page.locator('.mb-row')).toContainText('相邻区域的稀有怪物掉落死者硫磺')
  await expect(page.getByText(/仅来源|待客户端|译名冲突/)).toHaveCount(0)
})
