import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

/** Portable fingerprint of executable/data/contract inputs, excluding generated
 * reports, local certificates and unrelated user files. */
export function verificationInputDigest(root) {
  const files = []
  const walk = (relative) => {
    for (const name of readdirSync(resolve(root, relative)).sort()) {
      const path = `${relative}/${name}`
      if (statSync(resolve(root, path)).isDirectory()) walk(path)
      else files.push(path)
    }
  }
  for (const directory of ['src', 'tests', 'scripts', 'samples']) walk(directory)
  files.push('package.json', 'package-lock.json', 'playwright.config.ts', 'vitest.config.ts', 'vite.config.ts', 'index.html', 'docs/acceptance/coverage.json', 'docs/acceptance/port.feature')
  const hash = createHash('sha256')
  for (const file of files.sort()) hash.update(file).update('\0').update(readFileSync(resolve(root, file))).update('\0')
  return hash.digest('hex')
}
