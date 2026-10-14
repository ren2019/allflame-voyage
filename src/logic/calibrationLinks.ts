export function calibrationUrl(entry?: string, slot?: number): string {
  const params = new URLSearchParams({ view: 'calibration' })
  if (entry) params.set('entry', entry)
  if (slot !== undefined) params.set('slot', String(slot))
  return '?' + params.toString()
}
export const modifierCalibrationKey = (id: string) =>
  (id.startsWith('b-') ? 'border:' : id.startsWith('cm-') ? 'reward:' : 'chart-implicit:') + id
