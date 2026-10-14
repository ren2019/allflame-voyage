// Verify the real deployed static site. Trust is limited to this Node/Chromium
// process; no OS trust store is edited and no blanket TLS bypass is enabled.
import assert from 'node:assert/strict'
import https from 'node:https'
import { X509Certificate, createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const site = resolve(process.env.VOYAGE_SITE_DIR ?? '.local-site')
const url = `https://${process.env.VOYAGE_IP ?? '192.168.1.8'}:${process.env.VOYAGE_PORT ?? 8443}`
const ca = readFileSync(resolve(site, 'ca.crt'))
await new Promise((done, reject) => {
  const request = https.get(url, { ca, agent: false }, (response) => {
    assert.equal(response.socket.authorized, true)
    assert.equal(response.statusCode, 200)
    response.resume()
    response.on('end', done)
  })
  request.on('error', reject)
})
// macOS Chromium has no supported per-context custom CA store. Pin only this
// server's public key for this disposable browser process, while strict Node
// TLS above independently validates its project CA, dates and IP SAN.
const cert = new X509Certificate(readFileSync(resolve(site, 'server.crt')))
const pin = createHash('sha256').update(cert.publicKey.export({ type: 'spki', format: 'der' })).digest('base64')
const browser = await chromium.launch({ args: [`--ignore-certificate-errors-spki-list=${pin}`] })
try {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await context.newPage()
  const failedResources = []
  page.on('requestfailed', (request) => failedResources.push(`${request.url()}: ${request.failure()?.errorText}`))
  await page.goto(url, { waitUntil: 'networkidle' })
  assert.equal(await page.evaluate(() => window.isSecureContext), true)
  assert.equal(await page.evaluate(() => typeof navigator.clipboard?.writeText), 'function')
  await page.locator('.onboard-actions button').last().click()
  const samples = readFileSync(new URL('../../samples/charted.zh-CN.txt', import.meta.url), 'utf8')
  await page.locator('.import-panel textarea').fill(samples)
  await page.locator('.import-actions button').first().click()
  await page.locator('.chart-grid .chart-sq').nth(1).waitFor()
  assert.equal(await page.locator('.chart-grid .chart-sq').count(), 2)
  // The existing share button exercises a real clipboard write at this origin.
  await page.locator('header button').last().click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  assert.ok(copied.startsWith(`${url}/#`), 'Share must actually write the stable HTTPS origin to the system clipboard')
  await page.locator('.chart-grid .chart-sq').first().click()
  await page.locator('.tile').first().click()
  await page.locator('.copy-into-game').click()
  await page.locator('.copyseq-go').click()
  const chartSearch = await page.evaluate(() => navigator.clipboard.readText())
  assert.ok(chartSearch.length > 0 && !chartSearch.startsWith('https://'), 'The actual placement guide must write a chart search string')
  // Existing autosave is debounced; allow its scheduled save before navigation.
  await page.waitForTimeout(1000)
  await page.reload({ waitUntil: 'networkidle' })
  assert.equal(await page.locator('.chart-grid .chart-sq').count(), 2)
  assert.deepEqual(failedResources, [])
  console.log(JSON.stringify({ url, strictTls: 'project CA and IP SAN verified', secureContext: true, importedRealCharts: 2, actualClipboardWrite: true, placementGuideClipboard: chartSearch, refreshedInventory: 2, failedResources: 0, browserTrust: 'this process, exact server SPKI only', targetWindows: 'pending' }, null, 2))
  await context.close()
} finally { await browser.close() }
