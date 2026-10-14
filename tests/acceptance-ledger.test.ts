import { expect, it } from 'vitest'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateAcceptanceCoverage } from '../scripts/acceptance-ledger.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
it('reports missing execution evidence instead of declaring a covered contract passed', () => {
  const reports = mkdtempSync(join(tmpdir(), 'allflame-absent-evidence-'))
  try {
    const result = validateAcceptanceCoverage(root, reports)
    expect(result.ok).toBe(false)
    expect(result.issues.join('\n')).toContain('Missing execution report')
  } finally { rmSync(reports, { recursive: true, force: true }) }
})
it('reports absent required fixtures rather than skipping the affected scenario', () => {
  const emptyRoot = mkdtempSync(join(tmpdir(), 'allflame-absent-fixtures-'))
  try {
    mkdirSync(join(emptyRoot, 'docs/acceptance'), { recursive: true })
    for (const file of ['coverage.json', 'port.feature']) copyFileSync(join(root, 'docs/acceptance', file), join(emptyRoot, 'docs/acceptance', file))
    const result = validateAcceptanceCoverage(emptyRoot, emptyRoot)
    expect(result.ok).toBe(false)
    expect(result.issues.join('\n')).toContain('Missing required fixture/test: tests/fixtures/acceptance/strategy-alc.json')
  } finally { rmSync(emptyRoot, { recursive: true, force: true }) }
})
