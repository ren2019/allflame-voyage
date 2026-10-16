import { test, expect } from './offline'
import type { Page } from '@playwright/test'

const previewName = '提交校准 Issue 预览'
const primaryName = '打开已预填的 GitHub Issue 草稿'
const shortName = '打开 GitHub Issue 草稿'
const entry = '/?view=calibration&entry=chart-implicit%3Aadj-crab-1'

async function saveAndPreview(page: Page, note: string) {
  await page.goto(entry)
  await page.getByLabel('校准备注').fill(note)
  await page.getByRole('button', { name: '保存本条', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: '提交校准 Issue（1）', exact: true }).click()
  return page.getByRole('dialog', { name: previewName })
}

test('short feedback opens a prefilled public draft with exactly the previewed JSON and keeps a title-only recovery link', async ({ page }) => {
  const note = '中文 "引号" \\ 路径\n```json\n~~~~\n备注 & ? # 😀'
  const preview = await saveAndPreview(page, note)
  const body = await preview.getByLabel('完整 Issue 正文', { exact: true }).inputValue()
  const json = await preview.getByLabel('完整校准 JSON', { exact: true }).inputValue()
  const file = JSON.parse(json)
  const fallback = new URL((await preview.getByRole('link', { name: shortName, exact: true }).getAttribute('href'))!)
  expect([...fallback.searchParams.keys()]).toEqual(['title'])
  await page.context().route('https://github.com/**', route => route.fulfill({ body: 'Isolated GitHub draft' }))
  const popupPromise = page.waitForEvent('popup')
  await preview.getByRole('button', { name: primaryName, exact: true }).click()
  const popup = await popupPromise
  await popup.waitForURL('https://github.com/**')
  const target = new URL(popup.url())
  expect(target.origin + target.pathname).toBe('https://github.com/ren2019/allflame-voyage-cn/issues/new')
  expect([...target.searchParams.keys()]).toEqual(['title', 'body'])
  expect(target.toString().length).toBeLessThanOrEqual(6000)
  expect(target.searchParams.get('title')).toBe(fallback.searchParams.get('title'))
  expect(target.searchParams.get('body')).toBe(body)
  expect(body).toContain(json)
  expect(file.records[0].note).toBe(note)
  expect(await popup.evaluate(() => window.opener)).toBeNull()
  await popup.close()
  await expect(preview).toContainText('最终发布')
  await preview.getByRole('button', { name: '返回编辑', exact: true }).click()
  await page.getByLabel('导入校准记录').setInputFiles({ name: 'draft.json', mimeType: 'application/json', buffer: Buffer.from(json) })
  await expect(page.getByRole('status')).toContainText('已导入')
  await expect(page.getByLabel('校准备注')).toHaveValue(note)
})

test('the complete encoded URL fits at 6000 characters and switches to full-body copy at 6001', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: {
    writeText: async (text: string) => { (window as unknown as { copiedBody: string }).copiedBody = text },
  } }))
  const preview = await saveAndPreview(page, 'x')
  const baseBody = await preview.getByLabel('完整 Issue 正文', { exact: true }).inputValue()
  const target = new URL((await preview.getByRole('link', { name: shortName, exact: true }).getAttribute('href'))!)
  target.searchParams.set('body', baseBody)
  const note = 'x'.repeat(1 + 6000 - target.toString().length)
  for (const [extra, expectedLength] of [[0, 6000], [1, 6001]]) {
    await preview.getByRole('button', { name: '返回编辑', exact: true }).click()
    await page.getByLabel('校准备注').fill(note + 'x'.repeat(extra))
    await page.getByRole('button', { name: '保存本条', exact: true }).click()
    await page.getByRole('button', { name: '提交校准 Issue（1）', exact: true }).click()
    const body = await preview.getByLabel('完整 Issue 正文', { exact: true }).inputValue()
    const complete = new URL(target)
    complete.searchParams.set('body', body)
    expect(complete.toString().length).toBe(expectedLength)
    await expect(preview.getByRole('button', { name: primaryName, exact: true })).toHaveCount(extra ? 0 : 1)
    if (extra) await expect(preview).toContainText('超过本站 6,000 字符的 URL 预算')
    await preview.getByRole('button', { name: '复制完整 Issue 内容', exact: true }).click()
    await expect(preview.getByRole('status')).toContainText('已复制完整 Issue 正文')
    expect(await page.evaluate(() => (window as unknown as { copiedBody: string }).copiedBody)).toBe(body)
    await expect(preview.getByLabel('完整 Issue 正文', { exact: true })).toHaveValue(body)
    const shortLink = preview.getByRole('link', { name: shortName, exact: true })
    const short = new URL((await shortLink.getAttribute('href'))!)
    expect([...short.searchParams.keys()]).toEqual(['title'])
    if (extra) {
      await expect(preview).toContainText('在 GitHub 正文粘贴')
      await page.context().route('https://github.com/**', route => route.fulfill({ body: 'Isolated short draft' }))
      const popupPromise = page.waitForEvent('popup')
      await shortLink.click()
      const popup = await popupPromise
      await popup.waitForLoadState()
      expect(popup.url()).toBe(short.toString())
      await popup.close()
    }
  }
  await preview.getByRole('button', { name: '返回编辑', exact: true }).click()
  await page.reload()
  await expect(page.getByLabel('校准备注')).toHaveValue(note + 'x')
})

test('clipboard refusal exposes selectable unchanged content and never claims copy success', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: {
    writeText: async () => { throw new DOMException('Permission denied', 'NotAllowedError') },
  } }))
  const note = '中'.repeat(1000) + '\n"复制失败仍完整" ~~~~~ 😀'
  const preview = await saveAndPreview(page, note)
  const body = await preview.getByLabel('完整 Issue 正文', { exact: true }).inputValue()
  await preview.getByRole('button', { name: '复制完整 Issue 内容', exact: true }).click()
  await expect(preview.getByRole('status')).toContainText('未能复制')
  await expect(preview.getByRole('status')).toContainText('手动复制')
  await expect(preview.getByRole('status')).not.toContainText('已复制')
  const manual = preview.getByLabel('完整 Issue 正文', { exact: true })
  await expect(manual).toBeFocused()
  expect(await manual.evaluate((element: HTMLTextAreaElement) => element.value.slice(element.selectionStart, element.selectionEnd))).toBe(body)
  expect(JSON.parse(await preview.getByLabel('完整校准 JSON', { exact: true }).inputValue()).records[0].note).toBe(note)
  await expect(preview.getByRole('link', { name: shortName, exact: true })).toBeVisible()
  await preview.getByRole('button', { name: '返回编辑', exact: true }).click()
  await page.reload()
  await expect(page.getByLabel('校准备注')).toHaveValue(note)
})

test('a blocked popup offers an explicit short link and keeps the saved snapshot for a retry', async ({ page }) => {
  const preview = await saveAndPreview(page, '弹窗失败也保留本条校准。')
  const body = await preview.getByLabel('完整 Issue 正文', { exact: true }).inputValue()
  const json = await preview.getByLabel('完整校准 JSON', { exact: true }).inputValue()
  await page.evaluate(() => { window.open = () => null })
  await preview.getByRole('button', { name: primaryName, exact: true }).click()
  await expect(preview.getByRole('status')).toContainText('可能被浏览器拦截')
  await expect(preview.getByRole('status')).toContainText('备用链接')
  await expect(preview.getByRole('status')).not.toContainText('已提交')
  await expect(preview.getByLabel('完整 Issue 正文', { exact: true })).toHaveValue(body)
  await expect(preview.getByLabel('完整校准 JSON', { exact: true })).toHaveValue(json)
  await page.context().route('https://github.com/**', route => route.fulfill({ body: 'Recovered GitHub draft' }))
  const popupPromise = page.waitForEvent('popup')
  await preview.getByRole('link', { name: shortName, exact: true }).click()
  const popup = await popupPromise
  await popup.waitForLoadState()
  expect(new URL(popup.url()).searchParams.get('body')).toBeNull()
  await popup.close()
  await preview.getByRole('button', { name: '返回编辑', exact: true }).click()
  await page.getByRole('button', { name: '提交校准 Issue（1）', exact: true }).click()
  expect(JSON.parse(await preview.getByLabel('完整校准 JSON', { exact: true }).inputValue()).records).toEqual(JSON.parse(json).records)
})

test('changing selection clears copy status and ignores clipboard completion from an earlier selection', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: {
    writeText: async () => {
      const state = window as unknown as { holdCopy?: boolean; finishCopy?: () => void }
      if (state.holdCopy) await new Promise<void>(resolve => { state.finishCopy = resolve })
    },
  } }))
  const preview = await saveAndPreview(page, '切换选择后重新检查复制状态。')
  const copy = preview.getByRole('button', { name: '复制完整 Issue 内容', exact: true })
  const checkbox = preview.getByRole('checkbox')
  await copy.click()
  await expect(preview.getByRole('status')).toContainText('已复制')
  await checkbox.uncheck()
  await checkbox.check()
  await expect(preview.getByRole('status')).toHaveCount(0)
  await page.evaluate(() => { (window as unknown as { holdCopy: boolean }).holdCopy = true })
  await copy.click()
  await checkbox.uncheck()
  await checkbox.check()
  await page.evaluate(() => (window as unknown as { finishCopy: () => void }).finishCopy())
  await expect(preview.getByRole('status')).toHaveCount(0)
  await page.evaluate(() => { (window as unknown as { holdCopy: boolean }).holdCopy = false })
  await copy.click()
  await expect(preview.getByRole('status')).toContainText('已复制')
})

for (const theme of ['dark', 'light']) {
  for (const width of [1280, 390]) {
    test(`delivery controls remain reachable by keyboard in ${theme} theme at ${width}px`, async ({ page }, testInfo) => {
      await page.addInitScript(theme => {
        localStorage.setItem('theme', theme)
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} } })
      }, theme)
      await page.setViewportSize({ width, height: 900 })
      const preview = await saveAndPreview(page, '检查中文校准草稿。')
      const primary = preview.getByRole('button', { name: primaryName, exact: true })
      await expect(primary).toBeInViewport()
      await page.context().route('https://github.com/**', route => route.fulfill({ body: 'Keyboard draft' }))
      await primary.focus()
      const popupPromise = page.waitForEvent('popup')
      await page.keyboard.press('Enter')
      const popup = await popupPromise
      await popup.waitForURL('https://github.com/**')
      expect(new URL(popup.url()).searchParams.get('body')).toBe(await preview.getByLabel('完整 Issue 正文', { exact: true }).inputValue())
      await popup.close()
      await page.screenshot({ path: testInfo.outputPath(`prefilled-${theme}-${width}.png`) })
      await preview.getByRole('button', { name: '返回编辑', exact: true }).click()
      await page.getByLabel('校准备注').fill('中文长备注。'.repeat(200))
      await page.getByRole('button', { name: '保存本条', exact: true }).click()
      await page.getByRole('button', { name: '提交校准 Issue（1）', exact: true }).click()
      const copy = preview.getByRole('button', { name: '复制完整 Issue 内容', exact: true })
      const fallback = preview.getByRole('link', { name: shortName, exact: true })
      await expect(copy).toBeInViewport()
      await expect(fallback).toBeInViewport()
      await copy.focus()
      await page.keyboard.press('Enter')
      await expect(preview.getByRole('status')).toContainText('已复制完整 Issue 正文')
      await page.keyboard.press('Tab')
      await expect(fallback).toBeFocused()
      await expect(fallback).toBeInViewport()
      const manual = preview.getByLabel('完整 Issue 正文', { exact: true })
      await manual.focus()
      await page.keyboard.press('ControlOrMeta+A')
      expect(await manual.evaluate((element: HTMLTextAreaElement) => element.selectionEnd - element.selectionStart)).toBe((await manual.inputValue()).length)
      expect(await preview.evaluate(element => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && element.scrollWidth <= element.clientWidth })).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`delivery-${theme}-${width}.png`) })
      await page.keyboard.press('Escape')
      await expect(preview).toHaveCount(0)
      await expect(page.getByRole('button', { name: '提交校准 Issue（1）', exact: true })).toBeFocused()
    })
  }
}
