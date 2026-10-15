import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { verificationInputDigest } from './verification-inputs.mjs'
import { validateAcceptanceCoverage } from './acceptance-ledger.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const reports = resolve(root, 'verification-results')
const contract = JSON.parse(readFileSync(resolve(root, 'docs/acceptance/coverage.json'), 'utf8'))
for (const file of contract.requiredFixtures) if (!existsSync(resolve(root, file))) throw Error(`Missing required fixture: ${file}`)
rmSync(reports, { recursive: true, force: true })
mkdirSync(reports, { recursive: true })
const evidence = { inputSha256: verificationInputDigest(root), startedUtc: new Date().toISOString(), offlineBrowser: true, externalOriginsBlocked: true, stages: [] }
const save = () => writeFileSync(resolve(reports, 'stages.json'), JSON.stringify(evidence, null, 2) + '\n')
save()
async function stage(name, command, args, extra = {}) {
  const record = { name, command: [command, ...args], status: 'running', startedUtc: new Date().toISOString() }
  evidence.stages.push(record); save()
  console.log(`\n[verify] ${name}`)
  const child = spawn(command, args, { cwd: root, env: { ...process.env, CI: '1', ...extra }, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (data) => { output += data; process.stdout.write(data) })
  const code = await new Promise((done, reject) => { child.on('error', reject); child.on('exit', done) })
  record.exitCode = code; record.status = code === 0 ? 'passed' : 'failed'; record.finishedUtc = new Date().toISOString()
  if (name === 'deployment' && /(?:#|ℹ)\s*(?:skipped|todo|cancelled)\s+[1-9]/.test(output)) record.status = 'failed'
  record.testCount = Number(output.match(/(?:#|ℹ)\s*tests\s+(\d+)/)?.[1] ?? 0)
  record.log = `${name}.log`; writeFileSync(resolve(reports, record.log), output); save()
  if (record.status !== 'passed') throw Error(`Verification stage failed: ${name}`)
}
try {
  await stage('unit', process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--reporter=json', `--outputFile=${resolve(reports, 'unit.json')}`])
  await stage('border-ocr', process.execPath, ['tests/border-ocr-regression.cjs'])
  await stage('text-library-audit', 'python3', ['scripts/check-text-library.py'])
  await stage('deployment', process.execPath, ['--test', 'tests/deployment/local-site.test.mjs'])
  await stage('build', 'npm', ['run', 'build'])
  await stage('browser', process.execPath, ['node_modules/playwright/cli.js', 'test', '--workers=1', '--reporter=line,json'], { OFFLINE_ACCEPTANCE: '1', PLAYWRIGHT_PORT: process.env.PLAYWRIGHT_PORT ?? '4179', PLAYWRIGHT_JSON_OUTPUT_FILE: resolve(reports, 'browser.json') })
  const coverage = validateAcceptanceCoverage(root, reports)
  writeFileSync(resolve(reports, 'coverage.json'), JSON.stringify(coverage, null, 2) + '\n')
  if (!coverage.ok) throw Error(coverage.issues.join('\n'))
  console.log(`\n27/27 scenario groups and 7/7 story classes have passing execution evidence. ${coverage.status}`)
  console.log('Reports: verification-results/coverage.json (game fieldwork remains pending).')
} catch (error) {
  evidence.status = 'failed'; evidence.failure = error.message; save()
  console.error(error.message); process.exitCode = 1
}
