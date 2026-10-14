import { TEXT_LIBRARY, matchChineseChartImplicit } from './textLibrary'
import { borderModById, voyageModById } from './mods'
import { localizedBorder } from './borderLocale'
import { voyageModShort, voyageModText } from './localization'
import originalSamples from '../../samples/charted.zh-CN.txt?raw'
import extraSamples from '../../samples/charted-extra-shapes.zh-CN.txt?raw'

export const CALIBRATION_KINDS = {
  border: '边界词缀', 'chart-implicit': '航行词缀', reward: '奖励词缀',
  destination: '目的地', base: '海图基底', shape: '连接形状', field: '复制字段',
} as const
export type CalibrationKind = keyof typeof CALIBRATION_KINDS
export const EVIDENCE_LABELS: Record<string, string> = {
  conflict: '来源冲突', missing: '资料缺失', 'source-only': '仅来源',
  confirmed: '客户端已校准', unmatched: '未匹配',
}
export const CALIBRATION_SCOPES: Record<string, string> = {
  self: '本区域', adjacent: '相邻区域', global: '全航程', border: '直接相邻边格',
}
interface SourceRecord {
  kind: string; internalId: string; cnText: string | null; enText: string | null;
  repositoryEnText?: string; scope: string | null; sourceScope?: string; status: string;
  sourceVersion: string; retrievedAt: string; numericRange: number[][];
  sources: { sourceId: string; url: string | null; locator: string }[];
  clientSampleRefs: string[]; sourceObservations?: { cn?: string[] };
}
export interface CalibrationRow {
  key: string; kind: CalibrationKind; id: string; place: string;
  english: string; englishBasis: string; chinese: string; short: string;
  priority: number; source: SourceRecord;
}
const positions: Record<CalibrationKind, string> = {
  border: '摆盘 → 十二边界 → 词缀选择器', 'chart-implicit': '海图库 → 海图详情／词缀浏览',
  reward: '海图详情 → 奖励／权重', destination: '海图库 → 目的地／策略材料',
  base: '导入文本 → 海图基底', shape: '海图库 → 连接图标／导入字段',
  field: '高级复制原文 → 导入识别',
}
const englishFields: Record<string, string> = {
  itemClass: 'Item Class: Chart', rarity: 'Rarity: Rare', areaLevel: 'Area Level:',
  itemLevel: 'Item Level:', quantity: 'Item Quantity:', sulphur: "Dead Man's Sulphur:",
  packsize: 'Pack Size:', implicitSection: '{ Implicit Modifier }',
  shape: 'Chart Shape:', itemRarity: 'Item Rarity:',
}
const kindOrder = Object.keys(CALIBRATION_KINDS)
export const CALIBRATION_ROWS: readonly CalibrationRow[] = (TEXT_LIBRARY.records as SourceRecord[]).map(source => {
  const kind = source.kind as CalibrationKind
  const id = source.internalId
  const mod = kind === 'border' ? borderModById.get(id) : voyageModById.get(id)
  const english = source.repositoryEnText || mod?.text || source.enText ||
    (kind === 'shape' ? id : englishFields[id]) || ''
  const englishBasis = source.repositoryEnText || mod ? '原工具词条' : source.enText ? '采集的英文来源'
    : kind === 'shape' ? '原工具形状名称' : englishFields[id] ? '原工具字段，尚无配对英文实采' : '缺少英文对应'
  const chinese = ['chart-implicit', 'reward'].includes(kind) ? voyageModText(id)
    : kind === 'border' ? localizedBorder(id)?.text || '' : source.cnText || ''
  const short = kind === 'border' ? localizedBorder(id)?.short || ''
    : ['chart-implicit', 'reward'].includes(kind) ? voyageModShort(id) : ''
  const priority = ['conflict', 'missing'].includes(source.status) ? 0 : source.status === 'confirmed' ? 2 : 1
  return { key: kind + ':' + id, kind, id, place: positions[kind], english, englishBasis, chinese, short, priority, source }
}).sort((a, b) => a.priority - b.priority || kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) || a.id.localeCompare(b.id))
const byKey = new Map(CALIBRATION_ROWS.map(row => [row.key, row]))
export const calibrationRow = (key: string | null) => key ? byKey.get(key) : undefined
export const normalizeCalibrationQuery = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\s+/g, '').replace(/[—–]/g, '-')
export function searchCalibrationRows(query: string): readonly CalibrationRow[] {
  const exact = calibrationRow(query.trim())
  if (exact) return [exact]
  const text = normalizeCalibrationQuery(query)
  const implicitId = matchChineseChartImplicit(query)
  return CALIBRATION_ROWS.filter(row => !text || row.id === implicitId ||
    normalizeCalibrationQuery([row.key, row.place, row.english, row.chinese, row.source.cnText, row.source.enText, CALIBRATION_KINDS[row.kind]].join(' ')).includes(text))
}
export function calibrationSample(ref: string): string {
  const [path, marker] = ref.split('#')
  const corpus = path === 'samples/charted.zh-CN.txt' ? originalSamples
    : path === 'samples/charted-extra-shapes.zh-CN.txt' ? extraSamples : ''
  const index = Number(marker?.replace('sample-', '')) - 1
  return corpus.split(/(?=^物品类别\s*[:：])/m).filter(text => text.trim())[index] || '未取得对应原文'
}
