import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../scripts/check-release-notes.mjs', import.meta.url))
const roots: string[] = []
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })))
const first = { date: '2026-10-16', tag: 'new', title: '首次发布', detail: '已提供库存导入。' }
const next = { ...first, title: '紧凑边界选择', detail: '提供分类及通货图标。' }

function check(entries: object[], baseSource = `export const UPDATES = ${JSON.stringify([first])}`) {
  const root = mkdtempSync(join(tmpdir(), 'voyage-release-'))
  roots.push(root)
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' }).toString().trim()
  git('init', '-q'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Release test')
  mkdirSync(join(root, 'src/data'), { recursive: true })
  const notes = join(root, 'src/data/updates.ts')
  writeFileSync(notes, baseSource)
  git('add', '.'); git('commit', '-qm', 'Baseline')
  const base = git('rev-parse', 'HEAD')
  writeFileSync(notes, `export const UPDATES = ${JSON.stringify(entries)}; export const UPSTREAM_UPDATES = [{ title: '原版历史也有修改' }]`)
  return spawnSync(process.execPath, [script, '--base', base], { cwd: root, encoding: 'utf8' })
}

it('blocks a new release with unchanged local notes, even if upstream history changed', () => {
  const result = check([first])
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('新增')
})
it('accepts a real prepended entry on the same day', () => {
  expect(check([next, first]).status).toBe(0)
})
it('blocks rewriting the old top entry without a new record', () => {
  expect(check([{ ...first, detail: '仅修改旧说明。' }]).status).toBe(1)
})
it('blocks a new record appended below the previous release', () => {
  expect(check([first, next]).status).toBe(1)
})
it.each([
  { ...next, detail: '  ' },
  { ...next, date: '2026-02-30' },
  { ...next, date: '2026-10-15' },
  { ...next, tag: 'unknown' },
])('blocks invalid or backdated release notes: %j', entry => {
  expect(check([entry, first]).status).toBe(1)
})
it('fails closed if baseline local release notes cannot be read', () => {
  expect(check([next, first], 'export const UPSTREAM_UPDATES = []').status).toBe(1)
})
