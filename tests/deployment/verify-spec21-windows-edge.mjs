// Requires explicit authorization to operate this Windows desktop over SSH.
// Uses its installed Edge and OS certificate trust; no certificate bypass.
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { resolve } from 'node:path'
import { fullCycle, visualTargets, keeperExpressions, keeper, setBackupReader, visualCalibration } from '../browser/spec21-flow.mjs'
import { once } from 'node:events'
import { chromium } from '@playwright/test'

const alias = process.env.WINDOWS_SSH_ALIAS ?? 'opensonic-windows-runner'
const url = process.env.WINDOWS_SITE_URL
assert.ok(url && new URL(url).protocol === 'https:' && new URL(url).port !== '8443', 'Explicit isolated HTTPS candidate URL required; production8443 is forbidden')
assert.ok(process.env.CANDIDATE_SHA && process.env.BUILD_SHA256, 'Candidate source SHA and build digest required')
const output = resolve(process.env.ACCEPTANCE_OUTPUT ?? 'verification-results/spec21-windows')
mkdirSync(output, { recursive: true })
const port = Number(process.env.WINDOWS_CDP_PORT ?? 19393)
assert.ok(Number.isInteger(port) && port > 1024 && port < 65536)
const name = `AllflameEdgeAcceptance-${randomUUID().replaceAll('-', '')}`
const remote = (script) => {
  const wrapper = `[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); $ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; Invoke-Expression ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([Console]::In.ReadToEnd())))`
  const encoded = Buffer.from(wrapper, 'utf16le').toString('base64')
  return execFileSync('ssh', ['-o', 'BatchMode=yes', alias, `powershell.exe -NoProfile -EncodedCommand ${encoded}`], { input: Buffer.from(script, 'utf8').toString('base64'), encoding: 'utf8', timeout: 30000 }).trim()
}
const portProbe = net.createServer()
await new Promise((done, reject) => { portProbe.once('error', reject); portProbe.listen(port, '127.0.0.1', done) })
await new Promise(done => portProbe.close(done))
let browser
let tunnel
let info
const report = { candidateSha: process.env.CANDIDATE_SHA, buildSha256: process.env.BUILD_SHA256, runnerSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'), url, startedUtc: new Date().toISOString(), targetWindows: true, certificateBypass: false }
try {
  info = JSON.parse(remote(`
    $edge = @("\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe", "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (!$edge) { throw 'Installed Microsoft Edge not found' }
    if (Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue) { throw 'Requested CDP port is already in use' }
    $edgeProfileDir = Join-Path $env:TEMP '${name}'
    $arguments = '--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1 --user-data-dir="' + $edgeProfileDir + '" --no-first-run --no-default-browser-check --new-window about:blank'
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
    @{ Edge=$version.Browser; UserAgent=$version.'User-Agent'; Loopback=$addresses; Profile=$edgeProfileDir } | ConvertTo-Json -Compress
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
  // CDP's default download folder is a Mac path. Keep exported fixture backups in
  // this owned Windows profile and read only those completed exports over SSH.
  const downloadFolder = `${info.Profile}\\Downloads`
  remote(`New-Item -ItemType Directory -Path '${downloadFolder}' -Force | Out-Null`)
  const downloadSession = await browser.newBrowserCDPSession()
  const downloads = []
  downloadSession.on('Browser.downloadWillBegin', event => downloads.push({ guid: event.guid, state: 'pending' }))
  downloadSession.on('Browser.downloadProgress', event => {
    const download = downloads.find(item => item.guid === event.guid)
    if (download) download.state = event.state
  })
  await downloadSession.send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: downloadFolder, eventsEnabled: true })
  setBackupReader(page, async () => {
    const started = Date.now()
    while (!downloads.length || downloads[0].state === 'pending' || downloads[0].state === 'inProgress') {
      if (Date.now() - started > 15000) throw Error('Owned Windows planning export did not complete')
      await new Promise(done => setTimeout(done, 100))
    }
    const download = downloads.shift()
    assert.equal(download.state, 'completed')
    assert.match(download.guid, /^[a-z0-9-]+$/i)
    const path = `${downloadFolder}\\${download.guid}`
    return JSON.parse(remote(`try { Get-Content -LiteralPath '${path}' -Raw -Encoding UTF8 } finally { Remove-Item -LiteralPath '${path}' -Force }`))
  })

  const failures = []
  const badResponses = []
  const externalRequests = []
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  context.on('page', popup => popup.on('pageerror', error => pageErrors.push(error.message)))
  await context.route('**/*', route => {
    const target = new URL(route.request().url())
    if (['http:', 'https:'].includes(target.protocol) && target.origin !== url) { externalRequests.push(target.origin); return route.abort() }
    return route.continue()
  })
  context.on('requestfailed', (request) => failures.push(`${request.url()}: ${request.failure()?.errorText}`))
  context.on('response', (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`) })
  const response = await page.goto(url, { waitUntil: 'networkidle' })
  assert.equal(response.status(), 200)
  const environment = await page.evaluate(() => ({ origin: location.origin, secureContext: window.isSecureContext, clipboardWrite: typeof navigator.clipboard?.writeText, userAgent: navigator.userAgent }))
  assert.equal(environment.origin, url)
  assert.equal(environment.secureContext, true)
  assert.equal(environment.clipboardWrite, 'function')
  assert.match(environment.userAgent, /Windows NT.*Edg\//)
  await context.addInitScript(() => {
    window.clipboardNativeBeforeProbe = navigator.clipboard.writeText.toString().includes('[native code]') && navigator.clipboard.readText.toString().includes('[native code]')
    const original = navigator.clipboard.writeText.bind(navigator.clipboard)
    window.clipboardAcknowledgement = { state: 'not-called' }
    Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: (text) => {
      const attempt = { text, state: 'pending', focused: document.hasFocus() }
      window.clipboardAcknowledgement = attempt
      const result = original(text)
      result.then(() => { attempt.state = 'fulfilled' }, (error) => { attempt.state = 'rejected'; attempt.error = `${error.name}: ${error.message}` })
      return result
    } })
  })
  await page.reload({ waitUntil: 'networkidle' })
  assert.equal(await page.evaluate(() => window.clipboardNativeBeforeProbe), true, 'Clipboard reads and writes must use the real native API')
  await page.bringToFront()
  console.error('[spec21] Windows native environment ready; starting integrated cycle')
  report.integratedCycle = await fullCycle(page)
  console.error('[spec21] Integrated cycle passed; checking themes and target details')
  await visualTargets(page, (name, target) => target.screenshot({ path: resolve(output, `${name}.png`) }))
  await visualCalibration(page, (name, target) => target.screenshot({ path: resolve(output, `${name}.png`) }))
  report.perStrategyNativeClipboard = []
  await keeper(page, async (name, expression) => {
    const actual = await page.evaluate(() => navigator.clipboard.readText())
    assert.equal(actual, expression, `${name}: exact full native clipboard readback`)
    report.perStrategyNativeClipboard.push({ strategy: name, expression, utf16Length: expression.length, matchesExpected: true })
  })
  console.error('[spec21] All six full expressions copied with native readback')
  await page.getByText('留图助手', { exact: true }).click()
  const assistant = page.getByRole('region', { name: '留图助手' })
  await page.bringToFront()
  await assistant.getByRole('button', { name: '复制稀有怪传说装留图搜索', exact: true }).click()
  await expectNativeSuccess()
  async function expectNativeSuccess() {
    await page.waitForFunction(() => window.clipboardAcknowledgement.state === 'fulfilled', { timeout: 5000 })
    const text = await assistant.getByRole('status').allTextContents()
    assert.ok(text.some(value => value.includes('已复制')), 'Native copy must have visible success acknowledgement')
  }
  await page.waitForFunction(() => ['fulfilled', 'rejected'].includes(window.clipboardAcknowledgement.state), { timeout: 3000 })
  const acknowledgement = await page.evaluate(() => window.clipboardAcknowledgement)
  assert.equal(acknowledgement.state, 'fulfilled', `Native clipboard write failed: ${acknowledgement.error ?? acknowledgement.state}`)
  assert.equal(acknowledgement.focused, true)
  const expectedSearch = keeperExpressions.find(([name]) => name === '稀有怪传说装')[1]
  assert.equal(acknowledgement.text, expectedSearch)
  let chartSearch = ''
  let readAttempts = 0
  for (; readAttempts < 30; readAttempts++) {
    chartSearch = await page.evaluate(() => navigator.clipboard.readText())
    if (chartSearch === expectedSearch) break
    await page.waitForTimeout(100)
  }
  assert.equal(chartSearch, expectedSearch, 'The real native browser read must return the exact independently expected text')
  const attemptedText = expectedSearch
  const taskProbeName = `${name}-ClipboardProbe`
  const probeFile = `${info.Profile.replaceAll('\\', '/')}/clipboard-probe.json`
  const expectedBase64 = Buffer.from(attemptedText, 'utf8').toString('base64')
  const nativeCode = String.raw`using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class ClipboardProbe {
 [DllImport("user32.dll")] static extern bool OpenClipboard(IntPtr owner);
 [DllImport("user32.dll")] static extern bool CloseClipboard();
 [DllImport("user32.dll")] static extern IntPtr GetClipboardData(uint format);
 [DllImport("user32.dll")] static extern IntPtr GetClipboardOwner();
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
 [DllImport("kernel32.dll")] static extern IntPtr GlobalLock(IntPtr memory);
 [DllImport("kernel32.dll")] static extern bool GlobalUnlock(IntPtr memory);
 static string J(string text) { return "\"" + text.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "\\r").Replace("\n", "\\n").Replace("\t", "\\t") + "\""; }
 [STAThread] static void Main(string[] args) {
  string file=args[1]; int session=Process.GetCurrentProcess().SessionId;
  File.WriteAllText(file,"{\"Stage\":\"started\",\"Session\":"+session+"}",new UTF8Encoding(false));
  try {
   string expected=Encoding.UTF8.GetString(Convert.FromBase64String(args[0]));
   bool opened=false; for(int i=0;i<20;i++) { if(OpenClipboard(IntPtr.Zero)) {opened=true;break;} System.Threading.Thread.Sleep(50); }
   if(!opened) throw new Exception("OpenClipboard busy");
   string text=""; uint ownerPid=0; string ownerName="";
   try {
    GetWindowThreadProcessId(GetClipboardOwner(),out ownerPid);
    if(ownerPid!=0) try { ownerName=Process.GetProcessById((int)ownerPid).ProcessName; } catch {}
    IntPtr handle=GetClipboardData(13);
    if(handle!=IntPtr.Zero) { IntPtr memory=GlobalLock(handle); if(memory!=IntPtr.Zero) { try {text=Marshal.PtrToStringUni(memory)??"";} finally {GlobalUnlock(handle);} } }
   } finally {CloseClipboard();}
   bool matches=text==expected;
   File.WriteAllText(file,"{\"Stage\":\"completed\",\"MatchesExpected\":"+(matches?"true":"false")+",\"Empty\":"+(text.Length==0?"true":"false")+",\"Length\":"+text.Length+",\"Session\":"+session+",\"OwnerPid\":"+ownerPid+",\"ClipboardOwner\":"+J(ownerName)+",\"OwnText\":"+(matches?J(text):"null")+"}",new UTF8Encoding(false));
  } catch(Exception error) { File.WriteAllText(file,"{\"Stage\":\"error\",\"ProbeError\":"+J(error.Message)+"}",new UTF8Encoding(false)); }
 }
}`
  const sourceBase64 = Buffer.from(nativeCode, 'utf8').toString('base64')
  const nativeExe = `${info.Profile}\\clipboard-probe.exe`
  const nativeCs = `${info.Profile}\\clipboard-probe.cs`
  console.error('[spec21] Probing Windows desktop OS clipboard')
  const desktopClipboard = JSON.parse(remote(`
    [IO.File]::WriteAllText('${nativeCs}', [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${sourceBase64}')))
    $compiler=Join-Path $env:SystemRoot 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
    $compileOutput=& $compiler '/nologo' '/target:winexe' '/out:${nativeExe}' '${nativeCs}'
    if ($LASTEXITCODE -ne 0) { throw ($compileOutput -join ' ') }
    $action=New-ScheduledTaskAction -Execute '${nativeExe}' -Argument '${expectedBase64} "${probeFile}"'
    $principal=New-ScheduledTaskPrincipal -UserId (whoami) -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName '${taskProbeName}' -Action $action -Principal $principal | Out-Null
    try {
      Start-ScheduledTask -TaskName '${taskProbeName}'
      $output='${probeFile}'
      for ($i=0; $i -lt 100; $i++) { Start-Sleep -Milliseconds 100; if (Test-Path -LiteralPath $output) { try { $progress=Get-Content -LiteralPath $output -Raw -Encoding UTF8 | ConvertFrom-Json; if ($progress.Stage -ne 'started') { break } } catch {} } }
      if (!(Test-Path -LiteralPath $output)) { @{ ProbeError='did not complete'; LastResult=(Get-ScheduledTaskInfo -TaskName '${taskProbeName}').LastTaskResult; State=(Get-ScheduledTask -TaskName '${taskProbeName}').State } | ConvertTo-Json -Compress }
      else { Get-Content -LiteralPath $output -Raw -Encoding UTF8 }
    } finally {
      Stop-ScheduledTask -TaskName '${taskProbeName}' -ErrorAction SilentlyContinue
      Get-CimInstance Win32_Process -Filter "Name='clipboard-probe.exe'" | Where-Object { $_.ExecutablePath -and $_.ExecutablePath -eq '${nativeExe}' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      Unregister-ScheduledTask -TaskName '${taskProbeName}' -Confirm:$false
      Remove-Item -LiteralPath '${probeFile}','${nativeExe}','${nativeCs}' -Force -ErrorAction SilentlyContinue
      if (Get-ScheduledTask -TaskName '${taskProbeName}' -ErrorAction SilentlyContinue) { throw 'Owned clipboard probe task remained' }
      if (Get-CimInstance Win32_Process -Filter "Name='clipboard-probe.exe'" | Where-Object { $_.ExecutablePath -eq '${nativeExe}' }) { throw 'Owned clipboard probe process remained' }
    }
  `))
  assert.equal(desktopClipboard.Stage, 'completed', 'The desktop clipboard probe must actually execute')
  assert.equal(desktopClipboard.MatchesExpected, true, 'The Windows OS clipboard must contain the exact expected text')
  assert.equal(desktopClipboard.OwnText, expectedSearch)
  assert.equal(desktopClipboard.ClipboardOwner, 'msedge')
  const clipboardOwner = JSON.parse(remote(`
    $owner=Get-CimInstance Win32_Process -Filter "ProcessId=${desktopClipboard.OwnerPid}"
    @{ OwnEdge=($owner.Name -eq 'msedge.exe' -and $owner.CommandLine.Contains('${name}')); Session=$owner.SessionId } | ConvertTo-Json -Compress
  `))
  assert.equal(clipboardOwner.OwnEdge, true, 'Clipboard ownership must belong to this temporary Edge, not another application')
  assert.equal(clipboardOwner.Session, desktopClipboard.Session)
  const { readdirSync } = await import('node:fs')
  const assetPaths = readdirSync(new URL('../../public/target-icons/', import.meta.url)).map(file => `/target-icons/${file}`)
  report.assetDecode = await page.evaluate(async (paths) => Promise.all(paths.map(async path => {
    const response = await fetch(path)
    const image = new Image()
    image.src = path
    await image.decode()
    return { path, status: response.status, mime: response.headers.get('content-type'), width: image.naturalWidth, height: image.naturalHeight }
  })), assetPaths)
  for (const asset of report.assetDecode) {
    assert.equal(asset.status, 200)
    assert.ok(asset.width > 0 && asset.height > 0)
    assert.equal(asset.mime, asset.path.endsWith('.webp') ? 'image/webp' : asset.path.endsWith('.jpeg') || asset.path.endsWith('.jpg') ? 'image/jpeg' : 'image/svg+xml')
  }
  assert.deepEqual(failures, [])
  assert.deepEqual(badResponses, [])
  assert.deepEqual(externalRequests, [])
  assert.deepEqual(pageErrors, [])
  report.externalOriginsRequested = externalRequests
  report.pageErrors = pageErrors
  Object.assign(report, { edge: info.Edge, userAgent: environment.userAgent, cdpLoopbackOnly: info.Loopback, secureContext: true, actualWindowsClipboardWrite: true, nativeClipboardImplementation: true, clipboardWriteAcknowledgement: acknowledgement.state, browserReadAttempts: readAttempts + 1, windowsDesktopClipboard: desktopClipboard, keeperClipboard: chartSearch, visibleSuccessAcknowledgement: true, failedResources: 0, gameSearch: 'not exercised; #24 remains human checkpoint', nativeClipboardFailure: 'not forced; controlled API rejection is separate offline browser evidence' })
} catch (error) {
  report.failure = error.message
  throw error
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
    $edgeProfileDir = Join-Path $env:TEMP '${name}'
    for ($i=0; $i -lt 20 -and (Test-Path -LiteralPath $edgeProfileDir); $i++) {
      try { Remove-Item -LiteralPath $edgeProfileDir -Recurse -Force } catch { Start-Sleep -Milliseconds 250 }
    }
    @{ TaskRemoved=!(Get-ScheduledTask -TaskName '${name}' -ErrorAction SilentlyContinue); ProfileRemoved=!(Test-Path -LiteralPath $edgeProfileDir); RemainingOwnProcesses=@(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${name}') }).Count } | ConvertTo-Json -Compress
  `))
  assert.equal(cleanup.TaskRemoved, true)
  assert.equal(cleanup.ProfileRemoved, true)
  assert.equal(cleanup.RemainingOwnProcesses, 0)
  report.cleanup = cleanup
  report.cleanup.SshTunnelClosed = true
  report.cleanup.NativeClipboardProbeRemoved = true
  report.finishedUtc = new Date().toISOString()
  report.clipboardPermissions = 'granted to isolated candidate origin; native implementation and OS clipboard independently checked'
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
console.log(JSON.stringify(report, null, 2))
