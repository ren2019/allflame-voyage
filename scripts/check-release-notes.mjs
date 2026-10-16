import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const notesPath = 'src/data/updates.ts'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

// Read literal local-edition records without executing repository code or
// mistaking changes to the separately maintained upstream history for a release.
function readNotes(source) {
  const file = ts.createSourceFile(notesPath, source, ts.ScriptTarget.Latest, true)
  const declaration = file.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(declaration => declaration.name.getText(file) === 'UPDATES')
  const array = declaration?.initializer
  if (!array || !ts.isArrayLiteralExpression(array) || !array.elements.length) throw Error('找不到国服 UPDATES 字面量列表')
  const entries = array.elements.map(element => {
    if (!ts.isObjectLiteralExpression(element)) throw Error('更新记录必须是字面量对象')
    const entry = {}
    for (const property of element.properties) {
      if (!ts.isPropertyAssignment(property) || !ts.isStringLiteralLike(property.initializer)) throw Error('更新记录字段必须为文本')
      entry[property.name.getText(file).replace(/^['"]|['"]$/g, '')] = property.initializer.text
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date ?? '') || new Date(`${entry.date}T00:00:00Z`).toISOString().slice(0, 10) !== entry.date) throw Error('更新日期必须是有效的 YYYY-MM-DD')
    if (!['new', 'reworked'].includes(entry.tag) || !entry.title?.trim() || !entry.detail?.trim()) throw Error('每条更新须有类型、标题和具体说明')
    return entry
  })
  if (entries.some((entry, index) => index > 0 && entry.date > entries[index - 1].date)) throw Error('更新记录须按日期倒序排列')
  const keys = entries.map(key)
  if (new Set(keys).size !== keys.length) throw Error('更新记录的日期与标题须唯一')
  return entries
}

const key = entry => `${entry.date}:${entry.title}`

try {
  if (process.argv.length !== 4 || process.argv[2] !== '--base') throw Error('用法: npm run check:release-notes -- --base <上次发布提交或 PR 基线>')
  const base = git('rev-parse', '--verify', `${process.argv[3]}^{commit}`)
  const previous = readNotes(git('show', `${base}:${notesPath}`))
  const current = readNotes(readFileSync(notesPath, 'utf8'))
  const previousKeys = previous.map(key)
  const added = current.findIndex(entry => previousKeys.includes(key(entry)))
  if (added <= 0 || JSON.stringify(current.slice(added).map(key)) !== JSON.stringify(previousKeys)) {
    throw Error('发布前须在国服更新记录顶部新增条目并保留历史；仅修改旧记录、原版历史或文件格式不能通过')
  }
  console.log(`更新记录检查通过：相对 ${base.slice(0, 7)} 新增 ${added} 条国服记录。`)
} catch (error) {
  console.error(`更新记录检查失败：${error.message}`)
  process.exitCode = 1
}
