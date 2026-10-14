#!/usr/bin/env node
// A project-local HTTPS wrapper around the built static files. No app API,
// inventory storage, operating-system trust edits, or external dependencies.
import https from 'node:https'
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, cpSync, rmSync, renameSync, realpathSync, statSync, openSync, closeSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join, extname, sep } from 'node:path'

const script = fileURLToPath(import.meta.url)
const repo = resolve(dirname(script), '..')
const command = process.argv[2]
const site = resolve(process.argv[3] ?? process.env.VOYAGE_SITE_DIR ?? join(repo, '.local-site'))
const build = resolve(process.env.VOYAGE_BUILD_DIR ?? join(repo, 'dist'))
const ip = process.env.VOYAGE_IP ?? '192.168.1.8'
const port = Number(process.env.VOYAGE_PORT ?? 8443)
const url = `https://${ip}:${port}`
const path = (name) => join(site, name)
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) || ip.split('.').some((n) => Number(n) > 255)) throw Error('VOYAGE_IP must be an IPv4 address')
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid VOYAGE_PORT')

function exec(executable, args) {
  const result = spawnSync(executable, args, { cwd: repo, encoding: 'utf8' })
  if (result.error || result.status !== 0) throw Error(`${executable} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`)
  return result.stdout
}

function ownedPid() {
  if (!existsSync(path('server.pid'))) return null
  const pid = Number(readFileSync(path('server.pid'), 'utf8'))
  if (!Number.isInteger(pid) || pid < 1) return null
  const result = spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' })
  // Never signal a recycled PID belonging to an unrelated program.
  return result.status === 0 && result.stdout.includes(`${script} serve ${site}`) ? pid : null
}

function init() {
  mkdirSync(site, { recursive: true, mode: 0o700 })
  chmodSync(site, 0o700)
  if (existsSync(path('ca.key')) !== existsSync(path('ca.crt'))) throw Error('Incomplete CA files; restore the original pair before continuing')
  if (!existsSync(path('ca.crt'))) {
    exec('openssl', ['req', '-x509', '-newkey', 'rsa:3072', '-sha256', '-nodes', '-days', '3650', '-subj', '/CN=Allflame Voyage Local CA', '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0', '-addext', 'keyUsage=critical,keyCertSign,cRLSign', '-keyout', path('ca.key'), '-out', path('ca.crt')])
  }
  exec('openssl', ['x509', '-in', path('ca.crt'), '-checkend', '2592000', '-noout'])
  const ext = `basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=IP:${ip},IP:127.0.0.1,DNS:localhost\n`
  const oldIp = existsSync(path('certificate-ip')) ? readFileSync(path('certificate-ip'), 'utf8') : ''
  const fresh = existsSync(path('server.crt')) && existsSync(path('server.key')) && oldIp === ip && spawnSync('openssl', ['x509', '-in', path('server.crt'), '-checkend', '2592000', '-noout']).status === 0
  if (!fresh) {
    writeFileSync(path('server.ext'), ext)
    exec('openssl', ['req', '-new', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-subj', `/CN=${ip}`, '-keyout', path('server.key'), '-out', path('server.csr')])
    exec('openssl', ['x509', '-req', '-sha256', '-days', '365', '-in', path('server.csr'), '-CA', path('ca.crt'), '-CAkey', path('ca.key'), '-CAcreateserial', '-extfile', path('server.ext'), '-out', path('server.crt')])
    writeFileSync(path('certificate-ip'), ip)
  }
  chmodSync(path('ca.key'), 0o600)
  chmodSync(path('server.key'), 0o600)
  // Windows imports only this public DER certificate, never private keys.
  exec('openssl', ['x509', '-in', path('ca.crt'), '-outform', 'DER', '-out', path('allflame-voyage-ca.cer')])
  console.log(`Public CA: ${path('allflame-voyage-ca.cer')}`)
  console.log(exec('openssl', ['x509', '-in', path('ca.crt'), '-noout', '-fingerprint', '-sha256']).trim())
}

function publish() {
  if (!existsSync(join(build, 'index.html'))) throw Error('No built site; run npm run build first')
  const stage = path('www-next')
  rmSync(stage, { recursive: true, force: true })
  cpSync(build, stage, { recursive: true })
  rmSync(path('www'), { recursive: true, force: true })
  renameSync(stage, path('www'))
}

async function probe() {
  return new Promise((done, reject) => {
    const request = https.get(`https://127.0.0.1:${port}/`, { ca: readFileSync(path('ca.crt')), agent: false, timeout: 1000 }, (res) => {
      res.resume()
      res.on('end', () => res.statusCode === 200 ? done() : reject(Error(`HTTP ${res.statusCode}`)))
    })
    request.on('timeout', () => request.destroy(Error('HTTPS readiness timeout')))
    request.on('error', reject)
  })
}

async function start() {
  if (ownedPid()) { console.log(`Already running: ${url}`); return }
  init()
  publish()
  const log = openSync(path('server.log'), 'a', 0o600)
  const child = spawn(process.execPath, [script, 'serve', site], { cwd: repo, detached: true, stdio: ['ignore', log, log], env: { ...process.env, VOYAGE_IP: ip, VOYAGE_PORT: String(port) } })
  closeSync(log)
  child.unref()
  writeFileSync(path('server.pid'), String(child.pid))
  let probeError
  for (let attempt = 0; attempt < 50; attempt++) {
    await sleep(100)
    if (!ownedPid()) throw Error(`Static server exited; inspect ${path('server.log')}`)
    try { await probe(); console.log(`Running: ${url}`); return } catch (error) { probeError = error.message }
  }
  await stop()
  throw Error(`Server did not become ready (${probeError}); inspect ${path('server.log')}`)
}

async function stop() {
  const pid = ownedPid()
  if (pid) {
    process.kill(pid, 'SIGTERM')
    for (let attempt = 0; attempt < 50 && ownedPid(); attempt++) await sleep(100)
    if (ownedPid()) throw Error('Server did not stop; inspect server.log')
  }
  rmSync(path('server.pid'), { force: true })
  console.log('Stopped')
}

function serve() {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' }
  const root = realpathSync(path('www'))
  const server = https.createServer({ key: readFileSync(path('server.key')), cert: readFileSync(path('server.crt')) }, (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'https://localhost').pathname)
      const file = realpathSync(resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`))
      if (!file.startsWith(root + sep) || !statSync(file).isFile()) { res.writeHead(404); res.end(); return }
      res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' })
      if (req.method === 'HEAD') res.end()
      else createReadStream(file).on('error', () => res.destroy()).pipe(res)
    } catch { res.writeHead(404); res.end() }
  })
  server.on('error', (error) => { console.error(error.message); process.exit(1) })
  server.listen(port, '0.0.0.0', () => console.log(`Static HTTPS: ${url}`))
  process.on('SIGTERM', () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 1000).unref() })
}

try {
  if (command === 'init') init()
  else if (command === 'start') await start()
  else if (command === 'stop') await stop()
  else if (command === 'status') console.log(ownedPid() ? `Running: ${url}` : 'Stopped')
  else if (command === 'update') {
    // A failed build leaves the running release and its inventory origin intact.
    exec('npm', ['run', 'build'])
    await stop()
    await start()
  }
  else if (command === 'serve') serve()
  else throw Error('Usage: node scripts/local-site.mjs init|start|stop|status|update')
} catch (error) { console.error(error.message); process.exitCode = 1 }
