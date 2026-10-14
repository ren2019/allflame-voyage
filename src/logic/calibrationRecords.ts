import { CALIBRATION_ROWS, CALIBRATION_KINDS, calibrationRow, type CalibrationRow } from '../data/calibrationCatalogue'

export const REVIEW_LABELS = { pending: '待审阅', approved: '审阅通过', change: '需要修改' } as const
export type ReviewStatus = keyof typeof REVIEW_LABELS
export interface CalibrationEdit { suggestion: string; note: string; status: ReviewStatus }
export interface CalibrationRecord extends CalibrationEdit {
  key: string; updatedAt: string;
  base: { english: string; chinese: string; evidence: string; scope: string | null };
}
export type CalibrationRecords = Record<string, CalibrationRecord>
const STORAGE_KEY = 'allflame.calibration.v1'
const FORMAT = 'allflame-calibration'
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const stringField = (value: unknown): value is string => typeof value === 'string'
function readRecord(value: unknown): CalibrationRecord {
  if (!isObject(value) || !stringField(value.key) || !calibrationRow(value.key) ||
    !stringField(value.suggestion) || !stringField(value.note) ||
    !stringField(value.status) || !Object.prototype.hasOwnProperty.call(REVIEW_LABELS, value.status) ||
    !stringField(value.updatedAt) || !Number.isFinite(Date.parse(value.updatedAt)) ||
    !isObject(value.base) || !stringField(value.base.english) || !stringField(value.base.chinese) ||
    !stringField(value.base.evidence) || !(value.base.scope === null || stringField(value.base.scope))) {
    throw new Error('校准记录包含未知条目或无效字段，未修改已有记录。')
  }
  return {
    key: value.key, suggestion: value.suggestion, note: value.note,
    status: value.status as ReviewStatus, updatedAt: value.updatedAt,
    base: { english: value.base.english, chinese: value.base.chinese,
      evidence: value.base.evidence, scope: value.base.scope as string | null },
  }
}
export function decodeCalibrationRecords(text: string): CalibrationRecords {
  let file: unknown
  try { file = JSON.parse(text) } catch { throw new Error('文件不是有效 JSON，未修改已有记录。') }
  if (isObject(file) && file.prototype === true && Array.isArray(file.records)) {
    const records = file.records.map(value => {
      if (!isObject(value) || !isObject(value['审阅'])) throw new Error('原型记录字段无效。')
      const row = CALIBRATION_ROWS.find(r => r.id === value['标识'] && CALIBRATION_KINDS[r.kind] === value['类别'])
      if (!row || typeof value['英文'] !== 'string' || typeof value['当前中文'] !== 'string') throw new Error('原型记录包含未知条目。')
      return { key: row.key, ...value['审阅'], updatedAt: new Date().toISOString(),
        base: { english: value['英文'], chinese: value['当前中文'], evidence: row.source.status, scope: row.source.scope } }
    })
    file = { format: FORMAT, version: 1, records }
  }
  if (!isObject(file) || file.format !== FORMAT || file.version !== 1 || !Array.isArray(file.records)) {
    throw new Error('请选择版本 1 的校准记录文件，未修改已有记录。')
  }
  const result: CalibrationRecords = {}
  for (const value of file.records) {
    const record = readRecord(value)
    if (Object.prototype.hasOwnProperty.call(result, record.key)) throw new Error('校准文件包含重复条目，未修改已有记录。')
    result[record.key] = record
  }
  return result
}
export function encodeCalibrationRecords(records: CalibrationRecords): string {
  return JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(),
    records: Object.values(records).sort((a, b) => a.key.localeCompare(b.key)).map(record => ({
      ...record, kind: calibrationRow(record.key)!.kind,
      id: calibrationRow(record.key)!.id, position: calibrationRow(record.key)!.place,
    })),
  }, null, 2)
}
export function loadCalibrationRecords(): { records: CalibrationRecords; error: string; raw: string | null } {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
    return { records: raw ? decodeCalibrationRecords(raw) : {}, error: '', raw }
  } catch (error) {
    return { records: {}, error: error instanceof Error ? error.message : '浏览器保存记录无法读取。', raw }
  }
}
export function saveCalibrationRecords(updates: CalibrationRecords): CalibrationRecords {
  const current = loadCalibrationRecords()
  if (current.error) throw new Error('现有保存数据无法读取，已保留原数据。请先导出原始数据备份。')
  const records = { ...current.records, ...updates }
  localStorage.setItem(STORAGE_KEY, encodeCalibrationRecords(records))
  return records
}
export function blankCalibrationEdit(row: CalibrationRow): CalibrationEdit {
  return { suggestion: row.chinese, note: '', status: 'pending' }
}
export function reviewedRecord(row: CalibrationRow, edit: CalibrationEdit): CalibrationRecord {
  return { key: row.key, ...edit, updatedAt: new Date().toISOString(),
    base: { english: row.english, chinese: row.chinese, evidence: row.source.status, scope: row.source.scope } }
}
export const sameCalibrationEdit = (a: CalibrationEdit, b: CalibrationEdit) =>
  a.suggestion === b.suggestion && a.note === b.note && a.status === b.status
export function calibrationBaseChanged(row: CalibrationRow, record: CalibrationRecord): boolean {
  return record.base.english !== row.english || record.base.chinese !== row.chinese ||
    record.base.evidence !== row.source.status || record.base.scope !== row.source.scope
}

export function importCalibrationRecords(text: string): { records: CalibrationRecords; imported: number; kept: number } {
  const incoming = decodeCalibrationRecords(text)
  const legacy = JSON.parse(text).prototype === true
  const current = loadCalibrationRecords()
  if (current.error) throw new Error('现有保存数据无法读取，已保留原数据。')
  const updates: CalibrationRecords = {}
  let kept = 0
  for (const record of Object.values(incoming)) {
    const old = current.records[record.key]
    if (old && (legacy || Date.parse(old.updatedAt) >= Date.parse(record.updatedAt))) kept++
    else updates[record.key] = record
  }
  return { records: saveCalibrationRecords(updates), imported: Object.keys(updates).length, kept }
}
