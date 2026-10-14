import library from '../../samples/text-library/library.json' with { type: 'json' }

// Candidate wording and audit status are independent of the game's existing
// scoring definitions. No reward conflicts or unsupported mechanisms enter
// the chart-implicit matcher.
export const TEXT_LIBRARY = library

function normalizeImplicit(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[—–]/g, '-')
    .replace(/-数值不可调整$/u, '')
    .replace(/(\d+)\((\d+)-(\d+)\)/g, (_match, roll: string, low: string, high: string) =>
      Number(roll) >= Number(low) && Number(roll) <= Number(high) ? `${low}-${high}` : 'invalid-roll',
    )
    .replace(/\((\d+-\d+)\)/g, '$1')
    .replace(/\s+/g, '')
}

/** Match only acquired, semantically reviewed chart implicits. */
export function matchChineseChartImplicit(text: string): string | null {
  const key = normalizeImplicit(text)
  const records = TEXT_LIBRARY.records.filter((record) =>
    record.kind === 'chart-implicit' &&
    (record.status === 'confirmed' || record.status === 'source-only') &&
    record.cnText !== null && normalizeImplicit(record.cnText) === key,
  )
  return records.length === 1 ? records[0].internalId : null
}
