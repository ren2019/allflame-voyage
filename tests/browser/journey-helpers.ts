import { expect, type Page } from '@playwright/test'
import type { AppState } from '../../src/logic/storage'

export async function loadPlanningState(page: Page, state: AppState) {
  await page.locator('.import-actions input[type=file]').setInputFiles({ name: 'planning.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(state)) })
  await expect(page.locator('.import-panel .muted.pad')).toHaveText('已从 JSON 载入规划状态')
}
export async function downloadPlanningState(page: Page): Promise<AppState> {
  const pending = page.waitForEvent('download')
  await page.locator('.import-actions button').nth(2).click()
  const stream = await (await pending).createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
export async function recordGuideClipboard(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { const host = window as unknown as { copied?: string[] }; (host.copied ??= []).push(text) } } })
  })
}
