import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const audit = (directory = root) => execFileSync('python3', ['scripts/check-text-library.py', '--root', directory], { cwd: root, encoding: 'utf8', stdio: 'pipe' })

describe('offline acquisition audit', () => {
  it('checks all source digests and live repository ID denominators offline', () => {
    expect(audit()).toContain('141/141 mod IDs investigated')
  })
  it('rejects altered evidence instead of trusting its copied digest', () => {
    const directory = mkdtempSync(join(tmpdir(), 'allflame-library-audit-'))
    try {
      cpSync(join(root, 'samples'), join(directory, 'samples'), { recursive: true })
      cpSync(join(root, 'src/data'), join(directory, 'src/data'), { recursive: true })
      const snapshot = join(directory, 'samples/text-library/snapshots/maiden-voyage.cn.html')
      writeFileSync(snapshot, readFileSync(snapshot, 'utf8') + 'altered evidence')
      expect(() => audit(directory)).toThrow(/Snapshot digest mismatch/)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
  it('replays identical records from saved sources with no network', () => {
    const files = ['library.json', 'sources.json', 'coverage.json', 'observed-tables.cn.json', 'observed-tables.us.json', 'conflicts.json']
    const before = files.map((file) => readFileSync(join(root, 'samples/text-library', file), 'utf8'))
    execFileSync('python3', ['scripts/replay-text-library.py'], { cwd: root, stdio: 'pipe' })
    expect(files.map((file) => readFileSync(join(root, 'samples/text-library', file), 'utf8'))).toEqual(before)
  })
})
