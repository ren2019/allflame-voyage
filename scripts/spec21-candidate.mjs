#!/usr/bin/env node
// Isolated review server: never calls local-site init/start/update/stop or edits trust.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import https from 'node:https'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('../', import.meta.url))
const build = resolve(process.argv[2] ?? join(repo, 'dist'))
const certificates = process.env.CANDIDATE_CERT_DIR
assert.ok(certificates, 'Set CANDIDATE_CERT_DIR to the existing trusted certificate directory (read only)')
const port = Number(process.env.CANDIDATE_PORT ?? 9443)
assert.ok(Number.isInteger(port) && port > 1024 && port < 65536 && port !== 8443, 'Use an isolated non-production port')
assert.ok(existsSync(join(build, 'index.html')), 'Build candidate first')
const reservation = net.createServer()
await new Promise((done, reject) => { reservation.once('error', reject); reservation.listen(port, '0.0.0.0', done) })
await new Promise(done => reservation.close(done))
export function buildManifest(directory) {
  const files = {}
  const visit = (path, relative = '') => {
    for (const name of readdirSync(path).sort()) {
      const file = join(path, name), key = relative ? `${relative}/${name}` : name
      if (statSync(file).isDirectory()) visit(file, key)
      else files[key] = createHash('sha256').update(readFileSync(file)).digest('hex')
    }
  }
  visit(directory)
  return { files, sha256: createHash('sha256').update(JSON.stringify(files)).digest('hex') }
}
const manifest = buildManifest(build)
const site = mkdtempSync(join(tmpdir(), 'allflame-spec21-candidate-'))
chmodSync(site, 0o700)
let child
let stopping = false
const cleanup = () => rmSync(site, { recursive: true, force: true })
try {
  cpSync(build, join(site, 'www'), { recursive: true })
  for (const file of ['server.crt', 'server.key']) {
    cpSync(join(certificates, file), join(site, file))
    chmodSync(join(site, file), 0o600)
  }
  child = spawn(process.execPath, [join(repo, 'scripts/local-site.mjs'), 'serve', site], { env: { ...process.env, VOYAGE_PORT: String(port) }, stdio: ['ignore', 'inherit', 'inherit'] })
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { stopping = true; child.kill('SIGTERM') })
  let ready = false
  for (let i = 0; i < 40; i++) {
    if (child.exitCode !== null) throw Error('Candidate server exited before readiness')
    try {
      await new Promise((done, reject) => {
        const request = https.get(`https://127.0.0.1:${port}/`, { ca: readFileSync(join(certificates, 'ca.crt')), agent: false }, response => { response.resume(); response.on('end', () => response.statusCode === 200 ? done() : reject(Error(`HTTP ${response.statusCode}`))) })
        request.on('error', reject)
      })
      ready = true; break
    } catch { await new Promise(done => setTimeout(done, 100)) }
  }
  assert.ok(ready, 'Candidate strict CA/SAN readiness failed')
  console.log(JSON.stringify({ candidateUrl: `https://192.168.1.8:${port}`, ownPid: child.pid, temporarySite: site, buildSha256: manifest.sha256, files: Object.keys(manifest.files).length, strictCaSanProbe: true }))
  const exit = await new Promise(done => child.once('exit', done))
  if (!stopping && exit !== 0) process.exitCode = 1
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = new Promise(done => child.once('exit', done))
    child.kill('SIGTERM'); await exited
  }
  cleanup()
  console.log('Owned candidate server stopped; temporary certificate copies removed.')
}
