import { encodeCalibrationRecords, type CalibrationRecords } from './calibrationRecords'

const ISSUE_TARGET = 'https://github.com/ren2019/allflame-voyage-cn/issues/new'

/** The encoded source is captured once when opening the preview, including exportedAt. */
export function calibrationSubmissionSource(records: CalibrationRecords): string {
  return encodeCalibrationRecords(records)
}

export function calibrationSubmission(source: string, keys: readonly string[]) {
  const file = JSON.parse(source)
  file.records = file.records.filter((record: { key: string }) => keys.includes(record.key))
  const json = JSON.stringify(file, null, 2)
  const count = file.records.length
  const title = `中文校准：${count} 条记录${count === 1 ? `（${file.records[0].key}）` : ''}`
  // A fence longer than any user-provided tilde run keeps arbitrary notes inside the JSON block.
  let fenceLength = 3
  for (const match of json.matchAll(/~+/g)) fenceLength = Math.max(fenceLength, match[0].length + 1)
  const fence = '~'.repeat(fenceLength)
  const body = [
    '## 中文校准反馈',
    `本次提交 ${count} 条已保存的校准记录，供维护者核对原文、版本与作用范围。`,
    ...file.records.map((record: { key: string; position: string }) => `- ${record.key} · ${record.position}`),
    '建议和人工审阅结果不改变正式译文或来源证据；备注由提交者填写并公开。',
    '## 完整校准 JSON（版本 1）',
    `${fence}json\n${json}\n${fence}`,
  ].join('\n\n')
  const shortUrl = new URL(ISSUE_TARGET)
  shortUrl.searchParams.set('title', title)
  const prefilledUrl = new URL(shortUrl)
  prefilledUrl.searchParams.set('body', body)
  const encodedUrl = prefilledUrl.toString()
  return { title, json, body, shortUrl: shortUrl.toString(), prefilledUrl: encodedUrl.length <= 6000 ? encodedUrl : null,
    byteLength: new TextEncoder().encode(body).length }
}
