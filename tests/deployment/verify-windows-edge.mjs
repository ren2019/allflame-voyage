// Requires explicit authorization to operate this Windows desktop over SSH.
// Uses its installed Edge and OS certificate trust; no certificate bypass.
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { once } from 'node:events'
import { chromium } from '@playwright/test'

const alias = process.env.WINDOWS_SSH_ALIAS ?? 'opensonic-windows-runner'
const url = process.env.WINDOWS_SITE_URL ?? 'https://192.168.1.8:8443'
const port = Number(process.env.WINDOWS_CDP_PORT ?? 19383)
assert.ok(Number.isInteger(port) && port > 1024 && port < 65536)
const name = `AllflameEdgeAcceptance-${randomUUID().replaceAll('-', '')}`
const remote = (script) => {
  const encoded = Buffer.from(`[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); $ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; ${script}`, 'utf16le').toString('base64')
  return execFileSync('ssh', ['-o', 'BatchMode=yes', alias, `powershell.exe -NoProfile -EncodedCommand ${encoded}`], { encoding: 'utf8', timeout: 30000 }).trim()
}
let browser
let tunnel
let info
const report = { url, startedUtc: new Date().toISOString(), targetWindows: true, certificateBypass: false }
try {
  info = JSON.parse(remote(`
    $edge = @("\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe", "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (!$edge) { throw 'Installed Microsoft Edge not found' }
    if (Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue) { throw 'Requested CDP port is already in use' }
    $profile = Join-Path $env:TEMP '${name}'
    $arguments = '--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1 --user-data-dir="' + $profile + '" --no-first-run --no-default-browser-check --new-window about:blank'
    $action = New-ScheduledTaskAction -Execute $edge -Argument $arguments
    $principal = New-ScheduledTaskPrincipal -UserId (whoami) -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName '${name}' -Action $action -Principal $principal | Out-Null
    Start-ScheduledTask -TaskName '${name}'
    $version = $null
    for ($i=0; $i -lt 40; $i++) {
      Start-Sleep -Milliseconds 250
      try { $version = Invoke-RestMethod -Uri 'http://127.0.0.1:${port}/json/version'; break } catch {}
    }
    if (!$version) { throw 'Temporary Edge CDP did not start' }
    $addresses = @(Get-NetTCPConnection -LocalPort ${port} -State Listen | ForEach-Object { $_.LocalAddress })
    if (@($addresses | Where-Object { $_ -ne '127.0.0.1' -and $_ -ne '::1' }).Count) { throw 'CDP is not restricted to loopback' }
    @{ Edge=$version.Browser; UserAgent=$version.'User-Agent'; Loopback=$addresses } | ConvertTo-Json -Compress
  `))
  tunnel = spawn('ssh', ['-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes', '-N', '-L', `127.0.0.1:${port}:127.0.0.1:${port}`, alias], { stdio: ['ignore', 'ignore', 'pipe'] })
  let tunnelError = ''
  tunnel.stderr.on('data', (data) => { tunnelError += data })
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((done) => setTimeout(done, 250))
    if (tunnel.exitCode !== null) throw Error(`SSH tunnel exited: ${tunnelError}`)
    try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 1500 }); break } catch { /* wait for tunnel */ }
  }
  assert.ok(browser, 'Unable to connect to the isolated Windows Edge')
  const context = browser.contexts()[0]
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: url })
  const page = context.pages()[0] ?? await context.newPage()
  const failures = []
  const badResponses = []
  page.on('requestfailed', (request) => failures.push(`${request.url()}: ${request.failure()?.errorText}`))
  page.on('response', (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`) })
  const response = await page.goto(url, { waitUntil: 'networkidle' })
  assert.equal(response.status(), 200)
  const environment = await page.evaluate(() => ({ origin: location.origin, secureContext: window.isSecureContext, clipboardWrite: typeof navigator.clipboard?.writeText, userAgent: navigator.userAgent }))
  assert.equal(environment.origin, url)
  assert.equal(environment.secureContext, true)
  assert.equal(environment.clipboardWrite, 'function')
  assert.match(environment.userAgent, /Windows NT.*Edg\//)
  await page.locator('.onboard-actions button').last().click()
  const samples = readFileSync(new URL('../../samples/charted.zh-CN.txt', import.meta.url), 'utf8')
  await page.locator('.import-panel textarea').fill(samples)
  await page.locator('.import-actions button').first().click()
  await page.locator('.chart-grid .chart-sq').nth(1).waitFor()
  assert.equal(await page.locator('.chart-grid .chart-sq').count(), 2)
  await page.locator('.chart-grid .chart-sq').first().click()
  await page.locator('.tile').first().click()
  await page.locator('.copy-into-game').click()
  await page.locator('.copyseq-go').click()
  const chartSearch = await page.evaluate(() => navigator.clipboard.readText())
  assert.match(chartSearch, /航海 (?:冒险 珊瑚暗礁|深入 金沙海床)海图/)
  assert.ok(chartSearch.includes('相邻区域') || chartSearch.includes('所有航行区域'))
  assert.match(chartSearch, /区域等级\s*[:：]?\s*83/, 'The deployed placement search must use the mainland level field')
  await page.waitForTimeout(1000)
  await page.reload({ waitUntil: 'networkidle' })
  assert.equal(await page.locator('.chart-grid .chart-sq').count(), 2)
  assert.deepEqual(failures, [])
  assert.deepEqual(badResponses, [])
  Object.assign(report, { edge: info.Edge, userAgent: environment.userAgent, cdpLoopbackOnly: info.Loopback, secureContext: true, importedRealCharts: 2, actualWindowsClipboardWrite: true, placementGuideClipboard: chartSearch, refreshedInventory: 2, failedResources: 0, gameSearch: 'not exercised' })
} finally {
  if (browser) await browser.close().catch(() => {})
  if (tunnel && tunnel.exitCode === null && tunnel.signalCode === null) {
    const stopped = once(tunnel, 'exit')
    tunnel.kill('SIGTERM')
    await stopped
  }
  const cleanup = JSON.parse(remote(`
    Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${name}') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    if (Get-ScheduledTask -TaskName '${name}' -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName '${name}' -Confirm:$false }
    $profile = Join-Path $env:TEMP '${name}'
    for ($i=0; $i -lt 20 -and (Test-Path -LiteralPath $profile); $i++) {
      try { Remove-Item -LiteralPath $profile -Recurse -Force } catch { Start-Sleep -Milliseconds 250 }
    }
    @{ TaskRemoved=!(Get-ScheduledTask -TaskName '${name}' -ErrorAction SilentlyContinue); ProfileRemoved=!(Test-Path -LiteralPath $profile); RemainingOwnProcesses=@(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${name}') }).Count } | ConvertTo-Json -Compress
  `))
  assert.equal(cleanup.TaskRemoved, true)
  assert.equal(cleanup.ProfileRemoved, true)
  assert.equal(cleanup.RemainingOwnProcesses, 0)
  report.cleanup = cleanup
  report.cleanup.SshTunnelClosed = true
}
console.log(JSON.stringify(report, null, 2))
