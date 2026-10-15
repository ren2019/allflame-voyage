import { test, expect } from './offline'
import { installClipboardRecorder } from './acceptance-helpers'
import { fullCycle, visualTargets, visualCalibration } from './spec21-flow.mjs'

test('规格21整页闭环保留原评分和核销，提示复制不改业务状态，下一轮刷新与备份可恢复', async ({ page, baseURL }, testInfo) => {
  test.setTimeout(60000)
  const errors: string[] = []
  const external: string[] = []
  const failed: string[] = []
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(baseURL!).origin) external.push(request.url()) })
  page.on('requestfailed', request => failed.push(request.url()))
  page.on('pageerror', error => errors.push(error.message))
  await installClipboardRecorder(page)
  await page.goto('/')
  await fullCycle(page)
  await visualTargets(page, (name: string, target: typeof page) => target.screenshot({ path: testInfo.outputPath(`${name}.png`) }))
  await visualCalibration(page, (name: string, target: typeof page) => target.screenshot({ path: testInfo.outputPath(`${name}.png`) }))
  expect(errors).toEqual([])
  expect(external).toEqual([])
  expect(failed).toEqual([])
})
