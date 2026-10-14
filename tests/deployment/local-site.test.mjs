import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import https from 'node:https'
import net from 'node:net'

const root = mkdtempSync(join(tmpdir(), 'voyage-https-test-'))
const site = join(root, 'site')
const build = join(root, 'build')
mkdirSync(build)
writeFileSync(join(build, 'index.html'), '<html>静态海图站点 v1</html>')
const reservation = net.createServer()
await new Promise((done) => reservation.listen(0, '127.0.0.1', done))
const port = reservation.address().port
await new Promise((done) => reservation.close(done))
const env = { ...process.env, VOYAGE_SITE_DIR: site, VOYAGE_BUILD_DIR: build, VOYAGE_PORT: String(port) }
const cli = new URL('../../scripts/local-site.mjs', import.meta.url)
const run = (command) => execFileSync(process.execPath, [cli.pathname, command], { env, encoding: 'utf8' })
const request = (path, ca, method = 'GET') => new Promise((resolve, reject) => {
  const req = https.request(`https://127.0.0.1:${port}${path}`, { ca, agent: false, method }, (res) => {
    let body = ''
    res.on('data', (data) => { body += data })
    res.on('end', () => resolve({ status: res.statusCode, body }))
  })
  req.on('error', reject)
  req.end()
})
after(() => {
  spawnSync(process.execPath, [cli.pathname, 'stop'], { env })
  rmSync(root, { recursive: true, force: true })
})

test('operator initializes, starts and stops a static site verified by its project CA', async () => {
  run('init')
  run('start')
  const ca = readFileSync(join(site, 'ca.crt'))
  const result = await request('/', ca)
  assert.equal(result.status, 200)
  assert.equal(result.body, '<html>静态海图站点 v1</html>')
  assert.ok(run('status').includes(`https://192.168.1.8:${port}`))
  run('stop')
  await assert.rejects(request('/', ca), /ECONNREFUSED/)
})

test('the static site serves assets and refuses secrets, traversal and writes', async () => {
  writeFileSync(join(build, 'app.js'), 'console.log("静态资源")')
  run('start')
  const ca = readFileSync(join(site, 'ca.crt'))
  assert.equal((await request('/app.js', ca)).body, 'console.log("静态资源")')
  assert.equal((await request('/.local-site/ca.key', ca)).status, 404)
  assert.equal((await request('/%2e%2e%2fca.key', ca)).status, 404)
  assert.equal((await request('/not-present', ca)).status, 404)
  assert.equal((await request('/', ca, 'POST')).status, 405)
  run('stop')
})

test('a release update keeps its URL and project CA', async () => {
  run('start')
  const ca = readFileSync(join(site, 'ca.crt'))
  writeFileSync(join(build, 'index.html'), '<html>静态海图站点 v2</html>')
  run('update')
  assert.deepEqual(readFileSync(join(site, 'ca.crt')), ca)
  assert.ok(run('status').includes(`https://192.168.1.8:${port}`))
  assert.equal((await request('/', ca)).body, '<html>静态海图站点 v2</html>')
  run('stop')
})
