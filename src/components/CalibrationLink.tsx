import { calibrationUrl, modifierCalibrationKey } from '../logic/calibrationLinks'

export function CalibrationLink({ id, slot }: { id: string; slot?: number }) {
  return <a className="calibration-link" href={calibrationUrl(modifierCalibrationKey(id), slot)}
    target="_blank" rel="noopener noreferrer" aria-label="校准该词缀" title="打开此词缀的中文校准记录"
    onClick={event => event.stopPropagation()}>校准 ↗</a>
}
