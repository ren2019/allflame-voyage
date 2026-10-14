import { BORDER_MODS, borderModById } from './mods'
import { TEXT_LIBRARY } from './textLibrary'

const statusLabels: Record<string, string> = {
  confirmed: '已客户端校准',
  'source-only': '仅来源，待客户端校准',
  conflict: '译名冲突，待客户端核对',
  missing: '缺少简中资料',
  unmatched: '未匹配',
}

// Compact UI summaries derived from source wording, never clipboard aliases or
// claims of a client-calibrated sentence. Full wording stays in the chooser.
function compactBorderText(text: string): string {
  return text
    .replace(/相邻区域(?:中|的|内)?/g, '')
    .replace(/怪物群规模提高 (\d+%)/, '$1 群规模')
    .replace(/稀有怪物数量提高 (\d+%)/, '$1 稀有怪')
    .replace(/词缀数值提高 (\d+%)/, '$1 词缀数值')
    .replace(/包含 (\d+) 个额外(?:的)?/g, '+$1 ')
    .replace(/稀有怪物掉落 1 个额外/g, '+1 ')
    .replace(/相邻海图在开始航行时有 (\d+%) 的几率不被消耗/, '$1 保留海图')
}

/** Presentation only: preserve canonical IDs and the complete acquired evidence. */
export const BORDER_CHOICES = BORDER_MODS.map((mod) => {
  const evidence = TEXT_LIBRARY.records.find((record) => record.kind === 'border' && record.internalId === mod.id)
  const status = evidence?.status ?? 'missing'
  const text = evidence?.cnText ?? `缺少简中资料：${mod.text}`
  return {
    id: mod.id,
    text,
    short: compactBorderText(text),
    englishText: mod.text,
    status,
    statusLabel: statusLabels[status] ?? status,
    evidence,
  }
})

const choicesById = new Map(BORDER_CHOICES.map((choice) => [choice.id, choice]))
export const localizedBorder = (id: string) => choicesById.get(id)

const searchKey = (text: string) => text.normalize('NFKC').toLowerCase().replace(/\s+/g, '')

/** Chinese source wording and existing English/legacy aliases find the same ID. */
export function matchesBorderQuery(id: string, query: string): boolean {
  const choice = localizedBorder(id)
  const original = borderModById.get(id)
  const key = searchKey(query)
  return !!choice && [choice.text, choice.englishText, original?.short ?? '', ...(original?.aliases ?? [])]
    .some((text) => searchKey(text).includes(key))
}
