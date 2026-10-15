import { createContext, useContext } from 'react'
import { calibrationUrl, modifierCalibrationKey } from '../logic/calibrationLinks'

// Temporary display preference; deliberately separate from planning persistence.
export const CalibrationMode = createContext(false)

export function CalibrationLink({ id, slot }: { id: string; slot?: number }) {
  const enabled = useContext(CalibrationMode)
  if (!enabled) return null
  return <a className="calibration-link" href={calibrationUrl(modifierCalibrationKey(id), slot)}
    target="_blank" rel="noopener noreferrer" aria-label="校准该词缀" title="打开此词缀的中文校准记录"
    onClick={event => event.stopPropagation()}>✎</a>
}
