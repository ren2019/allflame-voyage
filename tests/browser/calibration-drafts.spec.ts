import { test, expect } from './offline'

const previewName = '提交校准 Issue 预览'

test('all unsaved drafts can return to their editor or save into the latest complete submission snapshot', async ({ page }) => {
  await page.goto('/?view=calibration&entry=chart-implicit%3Aadj-crab-1')
  await page.getByLabel('建议中文').fill('此前保存的建议')
  await page.getByRole('button', { name: '保存本条', exact: true }).click()
  await page.getByLabel('建议中文').fill('螃蟹最新建议')
  await page.getByLabel('校准备注').fill('螃蟹最新备注')
  await page.getByRole('button', { name: '审阅通过', exact: true }).click()
  await page.getByLabel('搜索词库').fill('border:b-sulphdrop')
  await page.getByLabel('建议中文').fill('硫磺最新建议')
  await page.getByLabel('校准备注').fill('硫磺最新备注')
  await page.getByRole('button', { name: '需要修改', exact: true }).click()
  await page.getByLabel('词库类别').selectOption('border')
  await page.getByLabel('证据状态').selectOption('conflict')
  await page.getByLabel('审阅结果').selectOption('change')
  const editorUrl = page.url()
  const submit = page.getByRole('button', { name: '提交校准 Issue（1）', exact: true })
  await submit.click()
  await expect(page.getByRole('alert')).toContainText('2 条未保存草稿')
  await expect(page.getByRole('dialog', { name: previewName })).toHaveCount(0)
  await page.getByRole('button', { name: '返回编辑', exact: true }).click()
  expect(page.url()).toBe(editorUrl)
  await expect(page.getByLabel('搜索词库')).toHaveValue('border:b-sulphdrop')
  await expect(page.getByLabel('词库类别')).toHaveValue('border')
  await expect(page.getByLabel('证据状态')).toHaveValue('conflict')
  await expect(page.getByLabel('审阅结果')).toHaveValue('change')
  await expect(page.getByLabel('建议中文')).toHaveValue('硫磺最新建议')
  await expect(page.getByLabel('校准备注')).toHaveValue('硫磺最新备注')
  await expect(page.getByRole('button', { name: '保存全部草稿（2）', exact: true })).toBeVisible()
  await submit.click()
  await page.getByRole('button', { name: '保存全部草稿并继续', exact: true }).click()
  const preview = page.getByRole('dialog', { name: previewName })
  await expect(preview).toContainText('已选择 2 条 / 已保存 2 条')
  const json = await preview.getByLabel('完整校准 JSON', { exact: true }).inputValue()
  expect(JSON.parse(json).records).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: 'chart-implicit:adj-crab-1', suggestion: '螃蟹最新建议', note: '螃蟹最新备注', status: 'approved' }),
    expect.objectContaining({ key: 'border:b-sulphdrop', suggestion: '硫磺最新建议', note: '硫磺最新备注', status: 'change' }),
  ]))
  await preview.getByRole('button', { name: '返回编辑', exact: true }).click()
  await expect(page.getByRole('button', { name: /保存全部草稿（/ })).toHaveCount(0)
  await page.reload()
  await expect(page.getByLabel('建议中文')).toHaveValue('硫磺最新建议')
  // The existing import control is the maintainer's public decoder boundary.
  await page.getByLabel('导入校准记录').setInputFiles({ name: 'drafts.json', mimeType: 'application/json', buffer: Buffer.from(json) })
  await expect(page.getByRole('status')).toContainText('保留 2 条较新记录')
})

test('a failed save keeps every draft and the previous saved record, explains manual recovery and can retry', async ({ page }) => {
  await page.goto('/?view=calibration&entry=chart-implicit%3Aadj-crab-1')
  await page.getByLabel('建议中文').fill('之前成功保存的建议')
  await page.getByRole('button', { name: '保存本条', exact: true }).click()
  await page.getByLabel('建议中文').fill('失败后仍保留的建议')
  await page.getByLabel('校准备注').fill('失败后仍保留的备注')
  await page.getByLabel('搜索词库').fill('border:b-sulphdrop')
  await page.getByLabel('校准备注').fill('另一条草稿备注')
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'allflame.calibration.v1') throw new DOMException('storage quota exhausted', 'QuotaExceededError')
      return setItem.call(this, key, value)
    }
    window.addEventListener('test-restore-storage', () => { Storage.prototype.setItem = setItem }, { once: true })
  })
  const popups: string[] = []
  page.on('popup', popup => popups.push(popup.url()))
  await page.getByRole('button', { name: '提交校准 Issue（1）', exact: true }).click()
  await page.getByRole('button', { name: '保存全部草稿并继续', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('保存失败')
  await expect(page.getByRole('status')).toContainText('请复制建议和备注备份')
  await expect(page.getByRole('status')).not.toContainText('已保存')
  await expect(page.getByRole('dialog', { name: previewName })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('2 条未保存草稿')
  const savedView = await page.context().newPage()
  await savedView.goto('/?view=calibration&entry=chart-implicit%3Aadj-crab-1')
  await expect(savedView.getByLabel('建议中文')).toHaveValue('之前成功保存的建议')
  await savedView.close()
  await page.getByRole('button', { name: '返回编辑', exact: true }).click()
  await expect(page.getByLabel('校准备注')).toHaveValue('另一条草稿备注')
  await page.getByLabel('搜索词库').fill('chart-implicit:adj-crab-1')
  await expect(page.getByLabel('建议中文')).toHaveValue('失败后仍保留的建议')
  await expect(page.getByLabel('校准备注')).toHaveValue('失败后仍保留的备注')
  await page.getByLabel('校准备注').selectText()
  await page.evaluate(() => window.dispatchEvent(new Event('test-restore-storage')))
  await page.getByRole('button', { name: '提交校准 Issue（1）', exact: true }).click()
  await page.getByRole('button', { name: '保存全部草稿并继续', exact: true }).click()
  const preview = page.getByRole('dialog', { name: previewName })
  await expect(preview).toContainText('已选择 2 条 / 已保存 2 条')
  const records = JSON.parse(await preview.getByLabel('完整校准 JSON', { exact: true }).inputValue()).records
  expect(records).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: 'chart-implicit:adj-crab-1', suggestion: '失败后仍保留的建议', note: '失败后仍保留的备注' }),
    expect.objectContaining({ key: 'border:b-sulphdrop', note: '另一条草稿备注' }),
  ]))
  expect(popups).toEqual([])
})

test('submission rechecks storage and preserves corruption that appeared after opening the editor', async ({ page }) => {
  await page.goto('/?view=calibration&entry=chart-implicit%3Aadj-crab-1')
  await page.getByLabel('建议中文').fill('正常保存的建议')
  await page.getByRole('button', { name: '保存本条', exact: true }).click()
  const raw = '{"format":"allflame-calibration","version":1,"records":[{"key":"unknown:broken-after-load"}]}'
  await page.evaluate(raw => localStorage.setItem('allflame.calibration.v1', raw), raw)
  await page.getByRole('button', { name: '提交校准 Issue（1）', exact: true }).click()
  await expect(page.getByRole('dialog', { name: previewName })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('现有数据仍保留')
  await expect(page.getByRole('button', { name: /提交校准 Issue/ })).toBeDisabled()
  await page.getByLabel('校准备注').fill('损坏时仍可手动复制的草稿')
  await expect(page.getByRole('button', { name: '保存本条', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '重新读取保存记录', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('重新读取失败')
  await expect(page.getByRole('button', { name: /提交校准 Issue/ })).toBeDisabled()
  await expect(page.getByLabel('校准备注')).toHaveValue('损坏时仍可手动复制的草稿')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出原始保存数据', exact: true }).click()
  const stream = await (await downloadPromise).createReadStream()
  const chunks = []; for await (const chunk of stream) chunks.push(chunk)
  expect(Buffer.concat(chunks).toString('utf8')).toBe(raw)
})

test('an unreadable store blocks feedback without losing the draft and resumes after storage recovery', async ({ page }) => {
  await page.goto('/?view=calibration&entry=chart-implicit%3Aadj-crab-1')
  await page.getByLabel('建议中文').fill('已有记录')
  await page.getByRole('button', { name: '保存本条', exact: true }).click()
  await page.getByLabel('校准备注').fill('读取失败也要保留的备注')
  await page.evaluate(() => {
    const getItem = Storage.prototype.getItem
    Storage.prototype.getItem = function (key) {
      if (key === 'allflame.calibration.v1') throw new DOMException('无法读取浏览器保存记录', 'SecurityError')
      return getItem.call(this, key)
    }
    window.addEventListener('test-restore-storage', () => { Storage.prototype.getItem = getItem }, { once: true })
  })
  await page.getByRole('button', { name: '提交校准 Issue（1）', exact: true }).click()
  await expect(page.getByRole('dialog', { name: previewName })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('现有数据仍保留')
  await expect(page.getByRole('button', { name: /提交校准 Issue/ })).toBeDisabled()
  await expect(page.getByLabel('校准备注')).toHaveValue('读取失败也要保留的备注')
  await page.getByRole('button', { name: '重新读取保存记录', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('重新读取失败')
  await expect(page.getByRole('button', { name: /提交校准 Issue/ })).toBeDisabled()
  await expect(page.getByLabel('校准备注')).toHaveValue('读取失败也要保留的备注')
  // Restoring browser access does not notify the app or fire a storage event.
  await page.evaluate(() => window.dispatchEvent(new Event('test-restore-storage')))
  await page.getByRole('button', { name: '重新读取保存记录', exact: true }).click()
  await expect(page.getByLabel('校准备注')).toHaveValue('读取失败也要保留的备注')
  await page.getByRole('button', { name: '提交校准 Issue（1）', exact: true }).click()
  await page.getByRole('button', { name: '保存全部草稿并继续', exact: true }).click()
  await expect(page.getByRole('dialog', { name: previewName }).getByLabel('完整校准 JSON', { exact: true })).toContainText('读取失败也要保留的备注')
})

test('old backups and prototype records feed the same preview while newer records and unrelated drafts survive imports', async ({ page }) => {
  await page.goto('/?view=calibration&entry=chart-implicit%3Aadj-crab-1')
  await page.getByLabel('建议中文').fill('较新保存的建议')
  await page.getByRole('button', { name: '保存本条', exact: true }).click()
  await page.getByLabel('校准备注').fill('导入时保留的未保存备注')
  const oldBackup = { format: 'allflame-calibration', version: 1, records: [{ key: 'chart-implicit:adj-crab-1', suggestion: '旧备份建议', note: '', status: 'pending', updatedAt: '2020-01-01T00:00:00.000Z', base: { english: 'Adjacent Areas contain (8-10) additional Packs of Crabs', chinese: '相邻区域包含 (8—10) 个额外的螃蟹群', evidence: 'confirmed', scope: 'adjacent' } }] }
  const importBackup = async (file: unknown) => page.getByLabel('导入校准记录').setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) })
  await importBackup(oldBackup)
  await expect(page.getByRole('status')).toContainText('保留 1 条较新记录')
  await expect(page.getByLabel('建议中文')).toHaveValue('较新保存的建议')
  const prototype = { prototype: true, variant: 'A', records: [{ 类别: '边界词缀', 标识: 'b-sulphdrop', 英文: "Rare Monsters in adjacent Areas drop Dead Man's Sulphur", 当前中文: '相邻区域的稀有怪物掉落死者硫磺', 审阅: { status: 'change', suggestion: '原型建议待核对', note: '原型校准备注' } }] }
  await importBackup(prototype)
  await expect(page.getByRole('status')).toContainText('已导入 1 条')
  await expect(page.getByLabel('校准备注')).toHaveValue('导入时保留的未保存备注')
  await importBackup({ ...oldBackup, records: [oldBackup.records[0], oldBackup.records[0]] })
  await expect(page.getByRole('status')).toContainText('导入失败')
  await expect(page.getByRole('status')).toContainText('重复条目')
  await page.getByRole('button', { name: '提交校准 Issue（2）', exact: true }).click()
  await page.getByRole('button', { name: '保存全部草稿并继续', exact: true }).click()
  const preview = page.getByRole('dialog', { name: previewName })
  const json = await preview.getByLabel('完整校准 JSON', { exact: true }).inputValue()
  const result = JSON.parse(json)
  expect(result.records).toHaveLength(2)
  expect(result.records).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: 'chart-implicit:adj-crab-1', suggestion: '较新保存的建议', note: '导入时保留的未保存备注' }),
    expect.objectContaining({ key: 'border:b-sulphdrop', suggestion: '原型建议待核对', note: '原型校准备注', status: 'change', base: expect.objectContaining({ evidence: 'conflict' }) }),
  ]))
  await preview.getByRole('button', { name: '返回编辑', exact: true }).click()
  await page.getByLabel('搜索词库').fill('border:b-sulphdrop')
  await expect(page.locator('.cal-inspector .cal-badge').first()).toHaveText('来源冲突')
  await expect(page.locator('.cal-comparison')).toContainText('相邻区域的稀有怪物掉落死者硫磺')
  await importBackup(result)
  await expect(page.getByRole('status')).toContainText('保留 2 条较新记录')
})

for (const theme of ['dark', 'light']) {
  for (const width of [1280, 390]) {
    test(`draft gate supports keyboard return and save in ${theme} theme at ${width}px`, async ({ page }, testInfo) => {
      await page.addInitScript(theme => localStorage.setItem('theme', theme), theme)
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/?view=calibration&entry=chart-implicit%3Aadj-crab-1')
      await page.getByLabel('建议中文').fill('键盘校准建议')
      await page.getByRole('button', { name: '保存本条', exact: true }).click()
      await page.getByLabel('校准备注').fill('键盘保存的最新备注')
      const submit = page.getByRole('button', { name: '提交校准 Issue（1）', exact: true })
      await submit.focus()
      await page.keyboard.press('Enter')
      const save = page.getByRole('button', { name: '保存全部草稿并继续', exact: true })
      await expect(save).toBeFocused()
      const gate = page.getByRole('alert')
      expect(await gate.evaluate(element => { const bounds = element.getBoundingClientRect(); return bounds.left >= 0 && bounds.right <= innerWidth && element.scrollWidth <= element.clientWidth })).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`draft-gate-${theme}-${width}.png`) })
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: '返回编辑', exact: true })).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page.getByLabel('校准备注')).toBeFocused()
      await submit.focus()
      await page.keyboard.press('Enter')
      await expect(save).toBeFocused()
      await page.keyboard.press('Enter')
      const preview = page.getByRole('dialog', { name: previewName })
      await expect(preview.getByLabel('完整校准 JSON', { exact: true })).toContainText('键盘保存的最新备注')
      await page.keyboard.press('Escape')
      await expect(submit).toBeFocused()
    })
  }
}

test('submission compares retained edits with freshly loaded records before deciding whether drafts need saving', async ({ page }) => {
  await page.goto('/?view=calibration&entry=chart-implicit%3Aadj-crab-1')
  await page.getByLabel('建议中文').fill('编辑器保留的建议')
  await page.getByRole('button', { name: '保存本条', exact: true }).click()
  await page.getByLabel('校准备注').fill('临时修改')
  await page.getByLabel('校准备注').fill('')
  await expect(page.getByRole('button', { name: '保存本条', exact: true })).toBeDisabled()
  // Revalidate a changed storage snapshot without a storage notification.
  await page.evaluate(() => {
    const file = JSON.parse(localStorage.getItem('allflame.calibration.v1')!)
    file.records[0].suggestion = '稍后写入浏览器存储的建议'
    file.records[0].note = '编辑器中未显示的存储备注'
    localStorage.setItem('allflame.calibration.v1', JSON.stringify(file))
  })
  await page.getByRole('button', { name: '提交校准 Issue（1）', exact: true }).click()
  await expect(page.getByRole('dialog', { name: previewName })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('1 条未保存草稿')
  await page.getByRole('button', { name: '返回编辑', exact: true }).click()
  await expect(page.getByLabel('建议中文')).toHaveValue('编辑器保留的建议')
  await expect(page.getByLabel('校准备注')).toHaveValue('')
  await page.getByRole('button', { name: '提交校准 Issue（1）', exact: true }).click()
  await page.getByRole('button', { name: '保存全部草稿并继续', exact: true }).click()
  const records = JSON.parse(await page.getByRole('dialog', { name: previewName }).getByLabel('完整校准 JSON', { exact: true }).inputValue()).records
  expect(records[0]).toMatchObject({ suggestion: '编辑器保留的建议', note: '' })
})
